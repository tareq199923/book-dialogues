import { PersonaCache } from "@/lib/persona/types";
import { streamGenerateContent } from "@/lib/gemini";
import { withRetry } from "@/lib/utils/retry";
import { generateTopic } from "./topic";
import {
  buildSystemPrompt,
  buildUserMessage,
  buildIntroPrompt,
  buildReflectionPrompt,
} from "./prompts";
import { sliceTranscript } from "./ring-buffer";
import { SSEEvent, DebateState, DebateTurn, TurnType } from "./types";
import { saveDebate } from "./persistence";

// In-memory store for active debates
export const debates = new Map<string, DebateState>();

let debateCounter = 0;

function uuid(): string {
  debateCounter++;
  return `debate-${Date.now()}-${debateCounter}`;
}

function turnId(): string {
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPersona(state: DebateState, speaker: "A" | "B"): PersonaCache {
  return speaker === "A" ? state.personaA : state.personaB;
}

/**
 * Result of attempting to stream one turn.
 * `succeeded` = got at least some content from the model.
 * `failed` = all retries exhausted, no content at all.
 */
type TurnResult =
  | { succeeded: true; content: string }
  | { succeeded: false; error: string };

/**
 * Run a full debate and yield SSE events as they happen.
 *
 * This is an async generator — the SSE route consumes it
 * and forwards each event to the client.
 *
 * If `existingState` is provided (reconnection after page refresh),
 * the generator skips already-completed turns and continues
 * streaming from where it left off.
 *
 * Flow:
 *   1. Generate topic (or reuse from existingState)
 *   2. Intro round (or skip if already done)
 *   3. Debate turns (alternating, up to maxTurns)
 *   4. Reflection turns
 *   5. Debate complete
 */
export async function* runDebate(
  personaA: PersonaCache,
  personaB: PersonaCache,
  maxTurns: number = 12,
  debateId?: string,
  existingState?: DebateState
): AsyncGenerator<SSEEvent> {
  // Derive the topic — either fresh or from existing state
  let topic: string;
  if (existingState?.topic) {
    topic = existingState.topic;
  } else {
    try {
      topic = await generateTopic(personaA, personaB);
    } catch (err) {
      yield { type: "error", message: `Failed to generate topic: ${err instanceof Error ? err.message : err}` };
      return;
    }
  }

  const firstSpeaker: "A" | "B" = existingState?.firstSpeaker ?? (Math.random() < 0.5 ? "A" : "B");
  const secondSpeaker: "A" | "B" = firstSpeaker === "A" ? "B" : "A";

  const state: DebateState = existingState ?? {
    id: debateId ?? uuid(),
    topic,
    personaA,
    personaB,
    turns: [],
    maxTurns,
    status: "intro",
    currentSpeaker: firstSpeaker,
    firstSpeaker,
    createdAt: new Date().toISOString(),
  };

  debates.set(state.id, state);

  // If this is a fresh start, send the meta event
  if (!existingState) {
    yield {
      type: "debate-meta",
      topic,
      personaA: {
        name: personaA.name,
        slug: personaA.slug,
        coherence: personaA.coherence.level,
      },
      personaB: {
        name: personaB.name,
        slug: personaB.slug,
        coherence: personaB.coherence.level,
      },
      maxTurns,
    };
  }

  const existingTurnCount = state.turns.length;

  /**
   * Attempt to stream one turn from a persona.
   *
   * - The stream init is retried internally by streamGenerateContent.
   * - If the entire stream fails (all retries exhausted), we insert
   *   a placeholder turn so the conversation stays coherent for the
   *   next speaker.
   */
  async function* streamTurn(
    speaker: "A" | "B",
    turnType: TurnType,
    userMessageBuilder: (turns: DebateTurn[], name: string) => string
  ): AsyncGenerator<SSEEvent> {
    const persona = getPersona(state, speaker);
    const systemPrompt = buildSystemPrompt(persona, topic);
    const windowedTurns = turnType === "debate"
      ? sliceTranscript(state.turns, 6)
      : state.turns;
    const userMessage = userMessageBuilder(windowedTurns, persona.name);

    let fullContent = "";
    let streamStarted = false;

    try {
      const stream = streamGenerateContent(systemPrompt, userMessage);

      for await (const chunk of stream) {
        streamStarted = true;
        fullContent += chunk;
        yield {
          type: "chunk",
          speakerSlug: persona.slug,
          speakerName: persona.name,
          text: chunk,
          turnType,
        };
      }

      const turn: DebateTurn = {
        id: turnId(),
        debateId: state.id,
        speakerSlug: persona.slug,
        speakerName: persona.name,
        content: fullContent,
        sequenceNumber: state.turns.length,
        timestamp: new Date().toISOString(),
      };
      state.turns.push(turn);

      yield {
        type: "turn-complete",
        speakerSlug: persona.slug,
        speakerName: persona.name,
        sequenceNumber: turn.sequenceNumber,
        turnType,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);

      if (streamStarted && fullContent) {
        const turn: DebateTurn = {
          id: turnId(),
          debateId: state.id,
          speakerSlug: persona.slug,
          speakerName: persona.name,
          content: fullContent + "\n\n[...connection lost mid-thought]",
          sequenceNumber: state.turns.length,
          timestamp: new Date().toISOString(),
        };
        state.turns.push(turn);

        yield {
          type: "turn-complete",
          speakerSlug: persona.slug,
          speakerName: persona.name,
          sequenceNumber: turn.sequenceNumber,
          turnType,
        };
      } else {
        const placeholder: DebateTurn = {
          id: turnId(),
          debateId: state.id,
          speakerSlug: persona.slug,
          speakerName: persona.name,
          content: "[was unable to respond]",
          sequenceNumber: state.turns.length,
          timestamp: new Date().toISOString(),
        };
        state.turns.push(placeholder);

        yield {
          type: "turn-complete",
          speakerSlug: persona.slug,
          speakerName: persona.name,
          sequenceNumber: placeholder.sequenceNumber,
          turnType,
        };
      }

      yield {
        type: "error",
        message: `${persona.name} encountered an error: ${errMsg}. The debate continues.`,
      };
    }

    state.currentSpeaker = speaker === "A" ? "B" : "A";
  }

  // Helper to skip turns that were already generated (from a previous stream)
  function shouldSkip(expectedSeq: number): boolean {
    return existingTurnCount > expectedSeq;
  }

  // Regular debate turns (excluding the 2 intros and 2 reflections)
  const debateTurnCount = maxTurns - 4;
  const speakOrder: { speaker: "A" | "B"; type: TurnType; builder: (turns: DebateTurn[], name: string) => string }[] = [];

  // Build the full sequence
  speakOrder.push({ speaker: firstSpeaker, type: "intro", builder: (_turns, _name) => buildIntroPrompt(getPersona(state, firstSpeaker), topic) });
  speakOrder.push({ speaker: secondSpeaker, type: "intro", builder: (_turns, _name) => buildIntroPrompt(getPersona(state, secondSpeaker), topic) });

  for (let i = 0; i < debateTurnCount; i++) {
    const speaker: "A" | "B" = i % 2 === 0 ? secondSpeaker : firstSpeaker;
    speakOrder.push({ speaker, type: "debate", builder: buildUserMessage });
  }

  const reflectFirst: "A" | "B" = debateTurnCount % 2 === 0 ? secondSpeaker : firstSpeaker;
  const reflectSecond: "A" | "B" = reflectFirst === "A" ? "B" : "A";
  speakOrder.push({ speaker: reflectFirst, type: "reflection", builder: buildReflectionPrompt });
  speakOrder.push({ speaker: reflectSecond, type: "reflection", builder: buildReflectionPrompt });

  // Run the sequence, skipping already-completed turns
  for (let seq = 0; seq < speakOrder.length; seq++) {
    if (shouldSkip(seq)) continue;
    const { speaker, type, builder } = speakOrder[seq];
    state.status = type === "intro" ? "intro" : type === "reflection" ? "streaming" : "streaming";
    yield* streamTurn(speaker, type, builder);
    // Persist progressively so page refresh preserves partial progress
    saveDebate(state).catch(() => {});
  }

  state.status = "completed";
  debates.delete(state.id);
  yield { type: "debate-complete" };
}
