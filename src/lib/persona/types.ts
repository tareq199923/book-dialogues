export interface Temperament {
  primaryDisposition: string;
  emotionalRange: string;
  baselineTone: string;
  whenCornered: string;
}

export interface ArgumentStyle {
  mode: string;
  relationshipToOpponent: string;
  rhetoricalSignature: string;
}

export interface CoherenceAssessment {
  level: "deep" | "moderate" | "shallow";
  why: string;
  caveat: string | null;
}

export interface PersonaCache {
  slug: string;
  title: string;
  cachedAt: string;
  modelUsed: string;

  coherence: CoherenceAssessment;

  personaType: "character-driven" | "voice-driven";

  name: string;
  temperament: Temperament;
  whatTheyCantLetGoOf: string;
  argumentStyle: ArgumentStyle;
  characteristicPhrasing: string[];
  speakingRules: string[];
  boundedKnowledge: string;
  forbiddenKnowledge: string[];
}
