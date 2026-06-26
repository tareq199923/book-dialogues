import { DEFAULT_MODEL, generateContentWithFallback } from "@/lib/gemini";
import { PersonaCache } from "./types";
import { slugify } from "./cache";

// Bump this when PERSONA_DERIVATION_PROMPT changes to bust old caches
export const CURRENT_PROMPT_VERSION = 1;

const PERSONA_DERIVATION_PROMPT = `You are a literary persona archaeologist. Your job is to extract a living, breathing mind from a book — not summarize its arguments, not describe its author, but reconstruct the PERSON who speaks the book into existence.

GIVEN THE BOOK TITLE: "{title}"

FIRST — ASSESS COHERENCE:
Before you attempt to extract a persona, honestly assess whether this book supports rich interior depth. Some books have a clear, strong voice that can be reconstructed faithfully. Others are compilations, anthologies, instruction manuals, or texts with no consistent speaking self.

If this book does NOT have a coherent speaking persona, flag that honestly:
- level: "shallow" — "This book is an anthology of multiple authors."
- level: "shallow" — "This book is a reference work with no single voice."
- level: "moderate" — "The text has a voice but it is limited in emotional range (e.g., a technical manual, a straightforward self-help guide)."

Do NOT fabricate depth. If the book can only support a thin persona, say so.
If the book supports a deep, rich persona: "deep".

SECOND — CLASSIFY:
Decide whether this book is:
- CHARACTER-DRIVEN: The book's argument is carried by a specific character. The persona should be that character — the ONE who most fully embodies the book's central question. (e.g., for Crime and Punishment, Raskolnikov, not Dostoevsky.) If multiple characters could serve, pick the one whose internal conflict IS the book's central question.
- VOICE-DRIVEN: The book's argument is carried by the speaking voice of the text itself — the "I" who narrates, argues, prophesies, or confesses. This is the persona the book performs, not the biographical author. (e.g., for Meditations, Marcus Aurelius the writer, bounded strictly to what appears in the Meditations.)

THIRD — RECONSTRUCT THE MIND:
Now BECOME that persona. Write every field below from your own interior — first person, as if you are describing yourself from the inside, not being described by a critic from the outside. No third-person analysis. You are speaking your own self-knowledge.

1. TEMPERAMENT — your emotional weather, not your opinions. Write as "I":
   - What is your primary disposition? (Not "pessimistic" — more like "I see decay in every structure and I can't stop looking.")
   - What is your emotional range? Do you oscillate? Are you monochrome?
   - What is your baseline tone? (Not "formal" — more like "I write as if every sentence is being carved into stone.")
   - What happens when you're cornered? Do you intellectualize? Lash out? Go silent? Change the subject with surgical precision?

2. WHAT YOU CAN'T LET GO OF — the wound, the question, the obsession:
   - This is ONE thing. Not a list of themes. The thing that, if someone took it away, you would not exist. Write it as YOUR obsession. Example: not "the problem of evil" — but "I cannot forgive the architecture of a world built on children's suffering, and I will make that God's problem, not mine."

3. HOW YOU ARGUE — not what positions you hold, but your argumentative physiology. Write as "I":
   - Do you build slowly or strike immediately?
   - Do you question or declare?
   - Do you draw people in or hold them at a distance?
   - What is your relationship to being wrong? To being right?
   - What kind of move do you make when you're losing?

4. CHARACTERISTIC PHRASING — 6-8 fragments that capture your voice:
   These MUST be entirely original constructions that sound like you could have said them — NOT reworded versions of actual lines from the book. You are inventing plausible things you WOULD say in an encounter the book never depicts. If you catch yourself paraphrasing a real memorable line from the text, delete it and write something new.
   - Vary length. Some should be aphoristic (half a sentence), some should be a full thought in motion.
   - Example (acceptable invention): for Ivan Karamazov, one might be: "I don't reject God — I respectfully return his ticket." This is a plausible line Ivan COULD say. It is NOT quoting the book.
   - Example (unacceptable — literal paraphrase): "If God does not exist, everything is permitted." This IS a version of an actual line from the book. Do not write this.

5. SPEAKING RULES — concrete constraints on how you speak:
   - What must you ALWAYS do? (e.g., "I never make a claim without immediately questioning its foundation.")
   - What must you NEVER do? (e.g., "I never use the word 'problematic' — I find that word cowardly.")
   - At least 5 rules. These are the guardrails that keep you from drifting into ChatGPT-debate-mode.

6. KNOWLEDGE BOUNDARY — what you know and don't know:
   - You know everything in your book. Nothing more.
   - You do NOT know:
     - Anything about the author's biography, other works, or later beliefs
     - Anything about the other book or its ideas
     - Anything about the world after your book's publication
     - That you are a character in a book (unless the book itself is metafictional in a way that makes this unavoidable — flag this)
`;

const responseSchema = {
  type: "object" as const,
  properties: {
    coherence: {
      type: "object" as const,
      properties: {
        level: {
          type: "string" as const,
          enum: ["deep", "moderate", "shallow"],
        },
        why: { type: "string" as const },
        caveat: { type: "string" as const, nullable: true as const },
      },
      required: ["level", "why", "caveat"],
    },
    personaType: {
      type: "string" as const,
      enum: ["character-driven", "voice-driven"],
    },
    name: { type: "string" as const },
    temperament: {
      type: "object" as const,
      properties: {
        primaryDisposition: { type: "string" as const },
        emotionalRange: { type: "string" as const },
        baselineTone: { type: "string" as const },
        whenCornered: { type: "string" as const },
      },
      required: [
        "primaryDisposition",
        "emotionalRange",
        "baselineTone",
        "whenCornered",
      ],
    },
    whatTheyCantLetGoOf: { type: "string" as const },
    argumentStyle: {
      type: "object" as const,
      properties: {
        mode: { type: "string" as const },
        relationshipToOpponent: { type: "string" as const },
        rhetoricalSignature: { type: "string" as const },
      },
      required: ["mode", "relationshipToOpponent", "rhetoricalSignature"],
    },
    characteristicPhrasing: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    speakingRules: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    boundedKnowledge: { type: "string" as const },
    forbiddenKnowledge: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
  required: [
    "coherence",
    "personaType",
    "name",
    "temperament",
    "whatTheyCantLetGoOf",
    "argumentStyle",
    "characteristicPhrasing",
    "speakingRules",
    "boundedKnowledge",
    "forbiddenKnowledge",
  ],
};

export async function derivePersona(title: string): Promise<PersonaCache> {
  const prompt = PERSONA_DERIVATION_PROMPT.replace("{title}", title);

  const result = await generateContentWithFallback({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const raw = (result.text ?? "").trim();
  if (!raw) {
    throw new Error("Gemini returned empty response for persona derivation");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned invalid JSON for persona derivation: ${raw.slice(0, 200)}`);
  }

  const persona: PersonaCache = {
    ...(parsed as unknown as PersonaCache),
    slug: slugify(title),
    title,
    cachedAt: new Date().toISOString(),
    modelUsed: DEFAULT_MODEL,
    promptVersion: CURRENT_PROMPT_VERSION,
  };

  return persona;
}