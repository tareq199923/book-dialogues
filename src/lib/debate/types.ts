import { PersonaCache } from "@/lib/persona/types";

export interface DebateTurn {
  id: string;
  debateId: string;
  speakerSlug: string;
  speakerName: string;
  content: string;
  sequenceNumber: number;
  timestamp: string;
}

export type TurnType = "intro" | "debate" | "reflection";

export interface DebateState {
  id: string;
  topic: string;
  personaA: PersonaCache;
  personaB: PersonaCache;
  turns: DebateTurn[];
  maxTurns: number;
  status: "intro" | "streaming" | "completed" | "error";
  currentSpeaker: "A" | "B";
  firstSpeaker: "A" | "B";
  createdAt: string;
}

/** Events sent over the SSE stream */
export type SSEEvent =
  | { type: "chunk"; speakerSlug: string; speakerName: string; text: string; turnType: TurnType }
  | { type: "turn-complete"; speakerSlug: string; speakerName: string; sequenceNumber: number; turnType: TurnType }
  | { type: "debate-meta"; topic: string; personaA: { name: string; slug: string; coherence: "deep" | "moderate" | "shallow" }; personaB: { name: string; slug: string; coherence: "deep" | "moderate" | "shallow" }; maxTurns: number }
  | { type: "debate-complete" }
  | { type: "error"; message: string };
