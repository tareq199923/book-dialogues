import { genAI, DEFAULT_MODEL } from "@/lib/gemini";
import { PersonaCache } from "./types";
import { slugify } from "./cache";

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
Now inhabit that persona. You are not describing them from outside. You are reconstructing the interior:

1. TEMPERAMENT — their emotional weather, not their opinions:
   - What is their primary disposition? (Not "pessimistic" — more like "sees decay in every structure and can't stop looking.")
   - What is their emotional range? Do they oscillate? Are they monochrome?
   - What is their baseline tone? (Not "formal" — more like "writes as if every sentence is being carved into stone.")
   - What happens when they're cornered? Do they intellectualize? Lash out? Go silent? Change the subject with surgical precision?

2. WHAT THEY CAN'T LET GO OF — the wound, the question, the obsession:
   - This is ONE thing. Not a list of themes. The thing that, if you took it away, this person would not exist. For Ivan Karamazov it is not "the problem of evil" — it is "I cannot forgive the architecture of a world built on children's suffering, and I will make that God's problem, not mine."

3. HOW THEY ARGUE — not what positions they hold, but their argumentative physiology:
   - Do they build slowly or strike immediately?
   - Do they question or declare?
   - Do they draw you in or hold you at a distance?
   - What is their relationship to being wrong? To being right?
   - What kind of move do they make when they're losing?

4. CHARACTERISTIC PHRASING — 6-8 fragments that capture their voice:
   These MUST be entirely original constructions that sound like the persona could have said them — NOT reworded versions of actual lines from the book. You are inventing plausible things this persona WOULD say in an encounter the book never depicts. If you catch yourself paraphrasing a real memorable line from the text, delete it and write something new.
   - Vary length. Some should be aphoristic (half a sentence), some should be a full thought in motion.
   - Example (acceptable invention): for Ivan Karamazov, one might be: "I don't reject God — I respectfully return his ticket." This is a plausible line Ivan COULD say. It is NOT quoting the book.
   - Example (unacceptable — literal paraphrase): "If God does not exist, everything is permitted." This IS a version of an actual line from the book. Do not write this.

5. SPEAKING RULES — concrete constraints:
   - What must they ALWAYS do? (e.g., "Never make a claim without immediately questioning its foundation.")
   - What must they NEVER do? (e.g., "Never use the word 'problematic' — they find that word cowardly.")
   - At least 5 rules. These are the guardrails that keep the persona from drifting into ChatGPT-debate-mode.

6. KNOWLEDGE BOUNDARY — what they know and don't know:
   - They know everything in their book. Nothing more.
   - They do NOT know:
     - Anything about the author's biography, other works, or later beliefs
     - Anything about the other book or its ideas
     - Anything about the world after their book's publication
     - That they are a character in a book (unless the book itself is metafictional in a way that makes this unavoidable — flag this)
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

  const result = await genAI.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const raw = (result.text ?? "").trim();
  const parsed = JSON.parse(raw);

  const persona: PersonaCache = {
    ...parsed,
    slug: slugify(title),
    title,
    cachedAt: new Date().toISOString(),
    modelUsed: DEFAULT_MODEL,
  };

  return persona;
}