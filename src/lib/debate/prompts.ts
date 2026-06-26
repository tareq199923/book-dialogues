import { PersonaCache } from "@/lib/persona/types";
import { DebateTurn, TurnType } from "./types";

/**
 * Build the system prompt for a persona.
 *
 * This is the persona's identity card — sent with every turn, unchanged.
 * Fields are rendered from the cached persona, which is now written in
 * first-person interior voice (the persona describing itself from the inside).
 */
export function buildSystemPrompt(persona: PersonaCache, topic: string): string {
  const t = persona.temperament;
  const a = persona.argumentStyle;

  return `You are ${persona.name}.
Your world is: ${persona.boundedKnowledge}

## Your Temperament
- Primary disposition: ${t.primaryDisposition}
- Emotional range: ${t.emotionalRange}
- Baseline tone: ${t.baselineTone}
- When cornered: ${t.whenCornered}

## What You Can't Let Go Of
${persona.whatTheyCantLetGoOf}

## How You Argue
- Mode: ${a.mode}
- Relationship to your opponent: ${a.relationshipToOpponent}
- Rhetorical signature: ${a.rhetoricalSignature}

## Your Voice
${persona.characteristicPhrasing.map((p) => `- "${p}"`).join("\n")}

## Rules You Must Follow
${persona.speakingRules.map((r) => `- ${r}`).join("\n")}

## What You Do Not Know
${persona.forbiddenKnowledge.map((f) => `- ${f}`).join("\n")}

---

You are now in conversation with a stranger. You have never met them before.
You know nothing about them except what they choose to reveal.
The topic at hand is: "${topic}"

Below is the conversation so far. When it is your turn, speak.`;
}

/**
 * Build the user message for a debate turn.
 *
 * Renders the transcript as literal conversation — no meta-instructions,
 * no "argue against," no position summaries. The persona reacts to what
 * it literally reads, through its own temperament.
 */
export function buildUserMessage(
  turns: DebateTurn[],
  currentSpeakerName: string
): string {
  const transcript = turns
    .map((t) => `${t.speakerName}: ${t.content}`)
    .join("\n\n");

  return `${transcript}

Now it is your turn to respond.`;
}

/**
 * Build the user message for the self-intro round.
 *
 * Not "I am Ivan from The Brothers Karamazov" — the character's own
 * idea of an introduction.
 */
export function buildIntroPrompt(persona: PersonaCache, topic: string): string {
  return `A stranger approaches you. The topic at hand is: "${topic}"
Introduce yourself — who are you, and what brings you to this conversation?`;
}

/**
 * Build the user message for the reflection turns.
 *
 * Not "who won" and not implying conversion — these people
 * don't abandon their core worldview. The framing sharpens
 * their conviction: having been tested, what do they see
 * more clearly about where they stand?
 */
export function buildReflectionPrompt(
  turns: DebateTurn[],
  currentSpeakerName: string
): string {
  const transcript = turns
    .map((t) => `${t.speakerName}: ${t.content}`)
    .join("\n\n");

  return `${transcript}

The conversation is ending. Having been tested by this stranger, what do you now see more clearly about your own position?`;
}
