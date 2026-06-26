# Book Dialogues — Complete Build Plan

## 1. Project Vision

### What the project is

Book Dialogues is a web application where two books debate each other live, as if they are real people. The debate streams in real time — each persona speaks, the other responds, and the audience watches two minds collide.

### Why it exists

Most AI "debate" tools treat books as position containers: extract the thesis, assign it to a side, let two chatbots argue. The result is sterile — two neutral summaries wearing masks. Book Dialogues exists because a book is not a thesis. A book is a *mind*. The Brothers Karamazov is not "the problem of evil" — it is Ivan Karamazov, tormented, unable to forgive the architecture of a world built on children's suffering. Beyond Good and Evil is not "will to power" — it is a voice that sees decay in every structure and can't stop looking, that dissects the unexamined assumptions of everyone it meets. These minds meeting in a room would produce something no summary could.

### Core philosophy

1. **The person is the book, not the author.** For a novel, the persona is its single most representative character — the one who most fully carries the book's central argument. For a philosophy or essay, the persona is the speaking voice the text itself performs — the "I" who writes the book. No knowledge of the real author's life, other works, or later beliefs. Bounded strictly to what's in this book.

2. **First-person interior, not third-person analysis.** Every extracted persona field reads as if the persona is describing itself from the inside ("I view opponents as symptoms of deeper pathologies") rather than being described by a literary critic from the outside ("Views opponents not as intellectual peers but as…"). This distinction is the difference between a living mind and a Wikipedia page wearing a costume.

3. **Emergent stance, not assigned positions.** The persona is never told "argue against X" or "your position is Y." It sees its own identity card (temperament, obsessions, speaking rules, voice samples) plus the literal transcript of what was said. Its stance emerges from who it is reacting to what it reads. If the persona is well-constructed, it will be naturally argumentative (or not — some personas might refuse to engage on certain terms, which is itself authentic).

4. **They have never met before.** Each character encounters the other for the first time. They are not rebutting "a position" — they are reacting, in real time, to a stranger's ideas, in their own true temperament. One might be cold and aphoristic, another raw and anguished. Tones should NOT be smoothed to match each other.

5. **Sharpening, not conversion.** The debate ends with reflections — "what do you now see more clearly about your own position?" — not "who won." These personas do not abandon their core worldview. Having been tested by a stranger, they see their own ground more clearly. If both happen to converge on something, that's a genuine synthesis — not an imposed one.

### What makes it different from AI debate apps

| Typical AI debate app | Book Dialogues |
|---|---|
| Extracts positions, assigns to sides | Extracts minds, lets them collide |
| "Argue against X" in the turn prompt | Persona reads the transcript, reacts through its temperament |
| Both sides speak in the same neutral tone | Each persona has its own distinct voice, unchanged across turns |
| Summarizes who won | Reflections sharpen conviction; synthesis is emergent |
| Third-person descriptions of characters | First-person interior voice — the persona describes itself |
| Works with any text | Honestly rejects texts that can't support a single coherent mind |
| Real author knowledge bleeds in | Strictly bounded: only what's inside the book |

---

## 2. User Experience

### User journey

```
Landing Page                    Debate Page
┌─────────────────────┐       ┌──────────────────────────────┐
│                     │       │  Topic: "Can the demand for   │
│  Book 1: [________] │       │  justice coexist with the      │
│  Book 2: [________] │       │  affirmation of suffering?"   │
│                     │       │                                │
│  [  Start Debate  ] │──────▶│  Ivan Karamazov ──────────     │
│                     │       │  I am Ivan. I find myself...   │
│                     │       │                                │
│                     │       │  The Free Spirit ─────────     │
│                     │       │  Ah, the familiar scent of...  │
│                     │       │                                │
│                     │       │  Ivan Karamazov ──────────     │
│                     │       │  A rather elegant framing...   │
│                     │       │                                │
│                     │       │  ... (streaming live)          │
│                     │       │                                │
│                     │       │  Reflection · Ivan Karamazov    │
│                     │       │  Having been tested...         │
│                     │       │                                │
│                     │       │  [New Debate]                  │
└─────────────────────┘       └──────────────────────────────┘
```

### Screen 1: Landing page

- Two text inputs for book titles (with placeholder text: "e.g., The Brothers Karamazov")
- A "Start Debate" button
- Optional maxTurns selector (default 12, range 6-20)
- No login, no account, no history — single-purpose

**Error states:**
- Empty title → inline "Title cannot be empty"
- Shallow coherence (e.g., "The Bible") → error message explaining the book can't produce a single coherent persona, with the coherence assessment's `why` field
- API failure → generic error banner with retry option

**Loading state:**
- After clicking "Start Debate," the button shows "Deriving personas..." (if uncached) or "Starting debate..." (if cached)
- Once the debate starts, user is taken to the debate page

### Screen 2: Debate page

**Layout:** Full-width scrollable chat view, centered content area.

**Chat bubbles:**
- Each persona gets a distinct visual identity: name label + color accent (warm for Persona A, cool for Persona B)
- Persona A's bubbles align left, Persona B's align right
- Bubbles contain markdown-rendered text
- Text streams in character-by-character as SSE chunks arrive (not all at once on turn-complete)

**Turn labels:** Each bubble has a small tag indicating the turn type:
- "Intro" — light gray tag
- "Debate" — no tag (default)
- "Reflection" — tinted tag, slightly different bubble background

**Topic banner:** The auto-generated topic appears as a centered banner at the top of the chat, styled distinctly from the bubbles.

**Streaming indicator:** While a persona is actively generating, a subtle typing indicator or pulse appears next to their name.

**Progress indicator:** Small counter showing turn progress (e.g., "3 / 12") in a header bar.

**Error display:** SSE error events shown as a small inline banner between turns: "Connection interrupted — continuing." Not a modal, not an alert.

**Coherence warning:** If either persona has `moderate` coherence, a muted warning banner appears below the topic: "⚠ [Book Title]'s voice is limited in emotional depth."

**End state:** After `debate-complete`, a centered "New Debate" button appears. No score, no winner declaration.

### Interactions

1. User enters two titles → clicks "Start Debate"
2. If either title isn't cached, persona derivation runs (~10-15s per title, shown as loading spinner)
3. If both cached, debate starts immediately
4. User is taken to debate page; SSE stream begins
5. User watches the debate stream in real time
6. User can scroll up to re-read earlier turns
7. When debate completes, user sees "New Debate" button
8. At any point, user can navigate away (stream aborts on page close)

### Expected reading experience

A 12-turn debate (2 intro + 8 debate + 2 reflection) takes approximately 7-10 minutes to read at natural pace. Streaming generation takes longer than reading — each Gemini call takes ~3-5 seconds to begin streaming, then ~5-10 seconds of active generation per turn. The total wall-clock time for a full debate is 2-4 minutes depending on API speed and rate limiting.

---

## 3. System Architecture

### High-level architecture

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐ │
│  │  Landing Page │    │     Debate Page         │ │
│  │  (title input)│    │  (SSE EventSource)      │ │
│  └──────┬───────┘    └──────────┬───────────────┘ │
│         │                       │                  │
└─────────┼───────────────────────┼──────────────────┘
          │ POST /api/debate/start│ GET /api/debate/stream
          │                       │
┌─────────▼───────────────────────▼──────────────────┐
│                Next.js App Router                    │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Persona      │  │ Debate       │  │ Debate     │ │
│  │ Derive Route │  │ Start Route  │  │ Stream     │ │
│  │ POST         │  │ POST         │  │ Route GET  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                  │                │        │
│  ┌──────▼──────────────────▼────────────────▼──────┐ │
│  │              Application Logic                    │ │
│  │                                                   │ │
│  │  ┌──────────┐  ┌───────────┐  ┌───────────────┐ │ │
│  │  │ Persona  │  │ Debate    │  │ Retry/Backoff │ │ │
│  │  │ Module   │  │ Orchestra-│  │ Utility       │ │ │
│  │  │          │  │ tor       │  │               │ │ │
│  │  └──────────┘  └───────────┘  └───────────────┘ │ │
│  │  ┌──────────┐  ┌───────────┐  ┌───────────────┐ │ │
│  │  │ Prompt   │  │ Topic     │  │ Ring Buffer   │ │ │
│  │  │ Builder  │  │ Generator │  │ (Memory Win.) │ │ │
│  │  └──────────┘  └───────────┘  └───────────────┘ │ │
│  └───────────────────┬──────────────────────────────┘ │
│                      │                                 │
│              ┌───────▼────────┐                         │
│              │  Gemini SDK   │                         │
│              │  (@google/genai│                        │
│              │   v2)         │                         │
│              └───────┬────────┘                         │
└──────────────────────┼─────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼─────────────────────────────────┐
│                  Google Gemini API                      │
│                  (gemini-2.5-flash)                     │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                 File System                             │
│                                                         │
│  data/personas/*.json    (persona cache, slug-keyed)    │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Frontend

**Framework:** Next.js 16 with App Router and React 19. Client components use `"use client"` directive for interactive pages (the debate form and streaming UI). The API routes are server-only.

**Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`). Utility-first, no component library. Dark mode supported (via user's system preference or browser extensions like Dark Reader).

**SSE consumption:** Browser's native `EventTarget` API (or a lightweight wrapper) opens a GET connection to `/api/debate/stream?id=<debateId>` and listens for named events (`chunk`, `turn-complete`, `debate-complete`, `error`).

**Why not WebSockets:** SSE is unidirectional (server→client), which is exactly right here. The frontend doesn't send data mid-debate — it just opens a stream and renders turns as they arrive. The client can abort the stream by closing the EventSource (navigating away). WebSockets add bidirectional complexity for zero benefit in this use case.

### Backend

**Framework:** Next.js API routes (App Router). Each route is a serverless-style function. No separate Express server.

**In-memory state:** A `Map<string, DebateState>` at module scope in the orchestrator module. This holds active debates. When the start route creates a debate, it inserts a seed state into this map. When the stream route is called, it reads the state, deletes it from the map (to prevent re-streaming), and runs the orchestrator.

**Why in-memory:** Debates are short-lived (2-4 minutes wall clock). No need for a database for transient state. A server restart kills active debates, which is acceptable for local dev. If persistence is needed later, a simple JSON file or SQLite would work.

### AI orchestration

**Model:** Google Gemini 2.5 Flash (free tier). Chosen for: good structured output support, fast streaming, sufficient quality for persona derivation and debate turns, and free tier availability.

**Orchestration pattern:** Async generator. The orchestrator (`runDebate`) is an `async function*` that yields SSEEvent objects. The stream route consumes this generator inside a ReadableStream's `start()` callback, encoding each event as SSE and enqueuing it. This pattern means:
- The orchestrator doesn't know about HTTP or SSE
- The stream route doesn't know about debate logic
- Testing the orchestrator is straightforward (consume the generator in a test)

**Prompt isolation:** Each persona only ever sees its own system prompt + the literal transcript. No cross-contamination. The system prompt is re-sent unchanged every turn. The only thing that varies is the user message content (the transcript grows).

### Database

**Currently: None.** Persona cache lives as JSON files on disk (`data/personas/<slug>.json`). Debate state lives in memory. No database.

**Why no database yet:** The app is local-dev-only. Personas are small JSON objects (~4-6KB each). Debates are transient. A database would add complexity with no current benefit. If the app moves to production, a lightweight option (SQLite via better-sqlite3, or Turso for edge deployment) would be the natural choice.

### Vector database

**Not used.** There is no RAG pipeline in the current architecture. The persona derivation step uses Gemini's parametric knowledge of the book (its training data) rather than ingesting the full text. This is a deliberate trade-off:

**Why no book ingestion:** Uploading full book texts would require PDF parsing, chunking, embeddings, a vector store, and a retrieval pipeline — all before the first line of debate code. It would also create copyright concerns and storage costs. Gemini 2.5 Flash's parametric knowledge of well-known books is sufficient for extracting personas. The model "knows" Ivan Karamazov well enough to reconstruct his mind without reading the full text.

**When RAG would be needed:** For obscure books the model doesn't know well, for ensuring faithfulness to specific passages, or for supporting citation. See section 7 for the future RAG design.

### Caching

**Persona cache:** JSON files on disk, keyed by slug. `data/personas/<slug>.json`. The slug is derived from the book title (lowercase, non-alphanumeric → hyphens). Cache is checked before calling Gemini — if the file exists, return it instantly without an API call.

**Why file-based caching:** Personas don't change once derived (same model, same prompt). They're small. File I/O is fast. No cache invalidation needed beyond manual deletion (when testing prompt changes). The cache is effectively permanent until a developer explicitly busts it.

**Cache busting:** Currently manual — delete the JSON file and re-derive. Could be automated by including `modelUsed` and `promptVersion` in the cache object and comparing against current values.

### File storage

```
data/
└── personas/
    ├── the-brothers-karamazov.json    (~5KB)
    ├── beyond-good-and-evil.json      (~5KB)
    ├── the-road.json                  (~5KB)
    ├── the-subtle-art-of-not-giving-a-f-ck.json  (~5KB)
    └── the-bible.json                 (~5KB)
```

Each file is a complete `PersonaCache` object. Created by `savePersona()`, read by `loadCachedPersona()`. Directory is created automatically by `fs.mkdir({ recursive: true })`.

---

## 4. Book Ingestion Pipeline

### Current approach: No ingestion

The current architecture does **not** ingest book text. Persona derivation relies entirely on Gemini's parametric knowledge — the model already "knows" the book from its training data. The user provides only the book title, and the model reconstructs the persona from memory.

**Why this approach:**
- Zero infrastructure: no PDF parser, no chunker, no vector store, no embedding model
- Fast: derivation takes ~10-15 seconds per title (single API call)
- Sufficient for well-known books: Gemini 2.5 Flash has strong knowledge of canonical literature, philosophy, and widely-read nonfiction
- No copyright issues: we never store or transmit book text

**Limitations:**
- The model may not know obscure or very recent books well enough to derive a coherent persona
- The model's knowledge of a book is compressed — it may miss nuance that a full-text reading would capture
- No citations or references to specific passages are possible
- The model could hallucinate details not in the book (partially mitigated by the structured prompt's constraints)

### Future RAG-based ingestion (not yet implemented)

If book ingestion were added, the pipeline would look like this:

**Upload:** User provides a PDF, EPUB, or plain text file. Stored temporarily on disk (not persisted long-term). Alternatively, the user pastes a URL and the server fetches the text.

**OCR (if needed):** For scanned PDFs, use an OCR service (Tesseract.js for local, Google Cloud Vision for production). Text-based PDFs skip this step.

**Cleaning:** Strip headers, footers, page numbers, publisher metadata. Normalize whitespace. Remove RTL markers, ligatures, and other encoding artifacts. Preserve paragraph structure — don't flatten into a single block.

**Chunking:** Fixed-size chunks of ~500 tokens with ~50-token overlap. Chunk boundaries align at paragraph breaks where possible (not mid-sentence). Each chunk gets metadata: book title, chapter/section name (if extractable), chunk index.

**Metadata extraction:** Book title, author name (for disambiguation, not for persona construction), publication year (for knowledge boundary enforcement), genre classification. This metadata does NOT feed into the persona — it's used for front-matter and to prevent the model from using out-of-scope knowledge.

**Embeddings:** Gemini's embedding model (`text-embedding-004` or equivalent). 768-dimensional vectors. Stored alongside the chunk text.

**Storage:** Vector database (local: ChromaDB or SQLite + vector extension; production: Pinecone or Turso). Chunks keyed by `{bookSlug}-{chunkIndex}`. Embedding + original text + metadata stored together.

**Validation:** After derivation, cross-check the extracted persona against the raw text. Sample 5-10 chunks and verify that the persona's claims about the book's content are consistent with the actual text. Flag contradictions for manual review.

**Why this is deferred:** The parametric-knowledge approach works well enough for the current scope (well-known books, local dev). RAG adds significant infrastructure complexity. The quality gate on persona derivation is the current focus — if personas are bad because the model doesn't know the book, *then* we add ingestion.

---

## 5. Character / Voice Extraction

### How the AI discovers the persona

The extraction happens inside a single Gemini API call with structured output (`responseMimeType: "application/json"` + `responseSchema`). The prompt is carefully designed to produce a coherent persona through three sequential phases:

### Phase 1: Coherence assessment

Before extracting anything, the model honestly evaluates whether the book can support a single coherent speaking self.

```
FIRST — ASSESS COHERENCE:
Before you attempt to extract a persona, honestly assess whether this book
supports rich interior depth. Some books have a clear, strong voice that can
be reconstructed faithfully. Others are compilations, anthologies, instruction
manuals, or texts with no consistent speaking self.

If this book does NOT have a coherent speaking persona, flag that honestly:
- level: "shallow" — anthology, reference work, multiple authors
- level: "moderate" — consistent but thin voice (self-help, technical manual)

Do NOT fabricate depth. If the book can only support a thin persona, say so.
If the book supports a deep, rich persona: "deep".
```

**Why this phase exists:** Without it, the model fabricates depth for every title. "The Bible" would get a "The Ancient Witness" persona as if it had a single voice. The coherence gate forces honesty.

**Alternative considered:** A separate pre-flight API call just for coherence. Rejected because it doubles the latency and cost. Structured output allows the model to assess coherence and extract in one pass.

**Trade-off:** The model might be wrong about coherence (calling something shallow that actually has depth, or vice versa). This is mitigated by the `why` field — the assessment is transparent and the user can judge for themselves.

### Phase 2: Classification

The model decides whether the book is character-driven or voice-driven:

```
SECOND — CLASSIFY:
- CHARACTER-DRIVEN: The book's argument is carried by a specific character.
  The persona should be that character — the ONE who most fully embodies
  the book's central question.
- VOICE-DRIVEN: The book's argument is carried by the speaking voice of
  the text itself — the "I" who narrates, argues, prophesies, or confesses.
```

**Why classification matters:** Without it, the model waffles. Asked "who speaks for The Brothers Karamazov?" without a forced decision, it blends Alyosha's saintliness, Ivan's torment, and Dostoevsky's biography. The classification gate forces commitment — either it's Ivan (character) or it's the textual voice (voice), not a blend.

### Phase 3: Mind extraction (six fields, all first-person)

The prompt shifts into the persona's interior perspective:

```
THIRD — RECONSTRUCT THE MIND:
Now BECOME that persona. Write every field below from your own interior —
first person, as if you are describing yourself from the inside, not being
described by a critic from the outside.
```

#### 5.1 Temperament (emotional weather, not opinions)

Four sub-fields, all written in first person:
- **primaryDisposition** — Not "pessimistic" but "I see decay in every structure and I can't stop looking." Not an adjective — a way of seeing.
- **emotionalRange** — Does the persona oscillate? Is it monochrome? "I oscillate between cold detachment and sudden fury."
- **baselineTone** — The default register of their voice. Not "formal" but "I write as if every sentence is being carved into stone."
- **whenCornered** — What they do under pressure. "I intellectualize rather than conceding." "I change the subject with surgical precision."

**Why first-person matters here:** The previous third-person framing produced output like "Views opponents not as intellectual peers but as symptoms of deeper pathologies." That's literary criticism. The first-person framing produces "I view opponents as symptoms — I need to find the pathology beneath what they're saying." Same content, but one reads like a person describing themselves, the other reads like a professor analyzing a character. When this text goes into the system prompt as "your temperament," the first-person version is far more effective at keeping the model in-character.

**Alternative considered:** Generating temperament as bullet-point adjectives. Rejected — adjectives are too abstract. "Sardonic" means nothing to a model. "I open with a disarmingly personal admission, then cut" is an instruction the model can follow.

#### 5.2 What they can't let go of (the obsession)

One thing. Not a list of themes. The thing that, if removed, this person wouldn't exist.

Example from the prompt:
> For Ivan Karamazov it is not "the problem of evil" — it is "I cannot forgive the architecture of a world built on children's suffering, and I will make that God's problem, not mine."

**Why one thing:** A list of themes produces a multi-topic debater. One obsession produces a mind that sees everything through a single lens — which is how real people actually argue. The monomaniacal quality is what makes a debate feel alive rather than comprehensive.

**Alternative considered:** Letting the model produce 2-3 obsessions. Rejected — it dilutes the persona. If the model can't identify one core wound, the persona will be diffuse. If the book genuinely has multiple equal obsessions, the model should pick the one most likely to produce collision with a debate partner.

#### 5.3 Argument style (argumentative physiology)

How the persona argues — not what positions it holds, but the *way* it argues:
- **mode** — "Socratic questioning" vs. "prophetic declaration" vs. "slow buildup"
- **relationshipToOpponent** — "tests the other's logic for hidden weakness" vs. "doesn't engage opponents, exposes their foundations as pathological"
- **rhetoricalSignature** — "opens with a disarmingly personal admission, then pivots to incision"

**Why this matters for the debate:** The prompt builder renders these into the system prompt. When the model reads "Relationship to your opponent: I view opponents as symptoms — I need to find the pathology beneath what they're saying," it produces dramatically different debate turns than "I build common ground slowly, then introduce my disagreement."

#### 5.4 Characteristic phrasing (6-8 voice fragments)

Invented phrases that sound like the persona could have said them. Critically: **NOT reworded versions of actual memorable lines from the book.**

The prompt includes explicit guidance:
```
These MUST be entirely original constructions that sound like you could have
said them — NOT reworded versions of actual lines from the book. You are
inventing plausible things you WOULD say in an encounter the book never
depicts. If you catch yourself paraphrasing a real memorable line from the
text, delete it and write something new.
```

With examples:
- ✅ Acceptable invention: "I don't reject God — I respectfully return his ticket." (plausible Ivan line, not in the book)
- ❌ Unacceptable paraphrase: "If God does not exist, everything is permitted." (actual line from the book)

**Why original phrasing matters:** When these phrases are injected into the system prompt as "Your Voice" samples, the model will imitate them. If they're paraphrases of real lines, the model will drift toward quoting the book rather than speaking in the persona's voice. Original phrases teach the model the *rhythm* of the voice without anchoring it to specific passages.

**Alternative considered:** Extracting actual quotes from the book. Rejected — the model would overfit to quoted lines and produce stilted "I am reminded of what I once said: ..." turns. Invented phrases are more generative.

#### 5.5 Speaking rules (concrete constraints)

5+ rules in two categories:
- **ALWAYS do** — "I never make a claim without immediately questioning its foundation."
- **NEVER do** — "I never use the word 'problematic' — I find that word cowardly."

These are the anti-drift guardrails. Over many turns, LLMs tend to regress to a "helpful debater" mean — polite, balanced, acknowledging both sides. Concrete rules prevent this.

**Why 5+ rules:** Fewer than 5 gives the model too much room to drift. More than 8 risks over-constraining and producing rigid responses. 5-7 is the sweet spot.

#### 5.6 Knowledge boundary (what they know and don't know)

**boundedKnowledge** — What's inside the book's world. For the persona, this describes the text's interior world, not the book's historical placement. Not "late 19th century European philosophy" (that's a historian's framing) but "the philosophical landscape as it appears from within the text — Kantian ethics, British utilitarianism, Christian morality as inherited structures."

**forbiddenKnowledge** — A list of things the persona must not know:
- The author's biography, other works, or later beliefs
- The other book or its ideas
- Anything about the world after the book's publication
- That they are a character in a book (unless metafictional)

**Why explicit forbidden knowledge:** Without this, the model will use its full parametric knowledge. Ivan Karamazov would suddenly reference Dostoevsky's later works, The Idiot, Demons. The Free Spirit would casually mention "my later breakdown in Turin." Explicit boundaries prevent this.

### Structured output schema

The Gemini API call uses `responseMimeType: "application/json"` and a `responseSchema` object that enforces the exact structure. This means:
- No parsing fragility — the output is guaranteed valid JSON
- No missing fields — the `required` array ensures all fields are present
- `coherence.level` is constrained to exactly `"deep" | "moderate" | "shallow"`
- Nullability is explicit (`caveat` is nullable)

### Cache structure

The derived persona is saved as JSON on disk with metadata stamps:

```ts
const persona: PersonaCache = {
  ...parsed,                  // from Gemini's structured output
  slug: slugify(title),      // deterministic slug from title
  title,                     // canonical title as user entered it
  cachedAt: new Date().toISOString(),
  modelUsed: DEFAULT_MODEL,  // "gemini-2.5-flash" for cache invalidation
};
```

**Why `modelUsed`:** If we switch models (e.g., from Flash to Pro), cached personas derived from the old model may differ in quality. The `modelUsed` field lets us detect this and re-derive if needed.

---

## 6. Debate Engine

### Overview

The debate engine is an async generator that yields SSE events. It runs through five stages: topic generation → intro round → debate turns → reflection turns → completion.

### 6.1 Topic generation

The topic is auto-generated from the two personas. A separate Gemini call reads both persona objects and proposes a topic that would force the two to collide at their deepest conviction level.

**The prompt:**
```
You are about to introduce two people who have never met.

Person A: Ivan Karamazov — I cannot forgive the architecture of a world
built on children's suffering, and I will make that God's problem, not mine.

Person B: The Free Spirit — The pervasive mediocrity, herd instinct, and
disguised weakness that masquerades as virtue and truth, stifling humanity's
potential for genuine greatness and self-overcoming.

Propose ONE topic or question that would force these two to collide at the
deepest level of their convictions. Not a generic debate topic — something
specific to who THEY are. One sentence. Only the topic, nothing else.
```

**Why auto-generation:** If the user provides the topic, it will likely be generic ("Is God real?"). An auto-generated topic that references the specific obsessions of both personas produces a much more personal collision.

**Alternative considered:** Let the user edit the auto-generated topic before the debate starts. Deferred — adds UI complexity for marginal benefit.

**Implementation:** `generateTopic()` in `lib/debate/topic.ts`. Wrapped in `withRetry()`. Returns a plain text string (no structured output needed for a single sentence).

### 6.2 Memory window (ring buffer)

Each debate turn sends context to the model. This context consists of:
1. The system prompt (persona identity, re-sent every turn, never modified)
2. The user message (the conversation transcript + turn instruction)

The transcript is windowed via `sliceTranscript()`:

```
Always included:
  - Intro turns (sequences 0, 1) — they set the stage
  - Reflection turns (last 2 turns) — they see the full arc

Sliding window:
  - Most recent 6 debate turns
  - Older debate turns are dropped

Result: [intro, intro, ...6 most recent debate turns..., reflection, reflection]
```

**Why windowing:** Without it, by turn 10 the model is reading a massive transcript and its own system prompt carries less weight relative to the conversation history. The persona starts drifting toward "helpful debate participant" rather than staying in character. Windowing re-anchors each turn to the system prompt by keeping the context short.

**Why 6 turns:** Each turn is roughly 150-250 words. 6 turns ≈ 1200-1500 words of transcript, plus the system prompt (~500 words) and the topic. Total context: ~2000 words. This is well within Gemini's context window and keeps the model focused on the recent flow rather than re-litigating settled points.

**Why intros are always included:** The intros establish who each persona is and how they frame themselves. If these are dropped, later turns lose the grounding of "who am I talking to."

**Alternative considered:** Infinite context (send all turns). Rejected — drift is a real problem in long conversations. The model's character degrades noticeably after ~8 turns with full history.

### 6.3 Turn generation

For each debate turn, the orchestrator:

1. Determines the current speaker (alternating A/B from the random start order)
2. Builds the system prompt (from the cached PersonaCache — identical every turn)
3. Builds the user message (from the windowed transcript + "Now it is your turn to respond.")
4. Calls `streamGenerateContent()` with the system prompt as `systemInstruction` and the user message as the user content
5. Yields each chunk as a `chunk` SSE event
6. On stream completion, saves the full turn content to the DebateState
7. Yields a `turn-complete` event

**What the system prompt contains (verbatim structure):**

```
You are {persona.name}.
Your world is: {persona.boundedKnowledge}

## Your Temperament
- Primary disposition: {temperament.primaryDisposition}
- Emotional range: {temperament.emotionalRange}
- Baseline tone: {temperament.baselineTone}
- When cornered: {temperament.whenCornered}

## What You Can't Let Go Of
{persona.whatTheyCantLetGoOf}

## How You Argue
- Mode: {argumentStyle.mode}
- Relationship to your opponent: {argumentStyle.relationshipToOpponent}
- Rhetorical signature: {argumentStyle.rhetoricalSignature}

## Your Voice
- "{phrase1}"
- "{phrase2}"
- ...

## Rules You Must Follow
- {rule1}
- {rule2}
- ...

## What You Do Not Know
- {forbidden1}
- {forbidden2}
- ...

---

You are now in conversation with a stranger. You have never met them before.
You know nothing about them except what they choose to reveal.
The topic at hand is: "{topic}"

Below is the conversation so far. When it is your turn, speak.
```

**What the user message contains:**

```
Ivan Karamazov: [intro text]

The Free Spirit: [intro text]

Ivan Karamazov: [debate turn text]

The Free Spirit: [debate turn text]

...

Now it is your turn to respond.
```

**What the user message NEVER contains:**
- ❌ "Your position is X, their position is Y"
- ❌ "Argue against what they just said"
- ❌ "You believe A, B, C"
- ❌ Summary of the other persona's book or ideas
- ❌ Debate-metaphor language ("rebut," "counter," "concede")
- ❌ Instruction to be "balanced" or "fair"

The persona's stance is emergent from temperament + what it can't let go of + what it literally reads in the transcript.

### 6.4 Intro round

Before the debate, each persona gets one turn to introduce themselves. The user message is:

```
A stranger approaches you. The topic at hand is: "{topic}"
Introduce yourself — who are you, and what brings you to this conversation?
```

**Why intros:** Without them, the first debate turn is blind — each persona speaks without knowing anything about who they're addressing. The intro turn gives them a chance to present themselves (in their own voice) and learn who they're talking to. This makes the first real debate turn more grounded.

**Why not "I am Ivan from The Brothers Karamazov":** The intro is in the character's own voice. Ivan wouldn't introduce himself by naming his book. He'd introduce himself by what preoccupies him. The Free Spirit wouldn't say "I am the voice of Beyond Good and Evil" — they'd say "I am one who has long been accustomed to living on the ice and high mountains."

### 6.5 Reflection round

After the last debate turn, each persona gets one short reflective turn. The user message is:

```
[full transcript]

The conversation is ending. Having been tested by this stranger, what do
you now see more clearly about your own position?
```

**Critical design constraint:** The reflection **sharpens conviction, never implies conversion.** These personas do not abandon their core worldview. They may agree on narrow points or judge the coherence of the other's argument, but they never undergo a transformation.

**Why "what do you now see more clearly" and not "what has this stranger left in you":** The original framing ("what has this stranger left in you that wasn't there when you arrived?") implies change — something new entered the persona. The revised framing implies sharpening — the persona sees its own ground more clearly after being tested. The difference is subtle but consequential: with the old framing, the model produces softening ("perhaps there is something to be said for..."). With the new framing, it produces hardening ("this encounter has only confirmed what I already knew — but with greater precision about why").

**Alternative considered:** A third-voice synthesis after the reflections. Rejected — a neutral narrator describing what happened produces exactly the kind of literary-criticism summarization we specifically designed against. Persona reflections keep the synthesis inside the minds.

### 6.6 Stopping conditions

The debate always ends at a fixed turn count. Default: 12 turns (2 intro + 8 debate + 2 reflection). Configurable via `maxTurns` parameter (range 6-20).

**Why fixed turns, not a timer:** A real-time timer creates a bad edge case — you'd have to cut off a persona mid-sentence when the timer expires, or implement "finish current turn then stop" logic that adds complexity for little gain. Turns are discrete units of speech. A fixed count produces a clean ending every time.

**Why 12 turns:** At ~150-250 words per turn and ~200 wpm reading speed, a 12-turn debate takes approximately 7 minutes to read. This is long enough for a genuine exchange (4 turns each, 4 rounds of debate) but short enough to prevent persona drift. The ring buffer at 6 turns means by the end, the model is only seeing the most recent half of the debate — which is the right balance for freshness vs. context.

**Why minimum 6:** 2 intro + 2 debate + 2 reflection is the absolute minimum for a recognizable debate structure. Fewer than 2 debate turns means each persona only speaks once in the debate phase — too short for any real exchange.

**Why maximum 20:** Beyond 20 turns, persona drift becomes severe. The model regresses toward neutral debater tone regardless of the system prompt. 20 turns (2+16+2) is the upper bound where quality is still acceptable.

### 6.7 Error handling

| Scenario | Behavior | Why |
|---|---|---|
| Stream init fails (503/rate limit) | Retry up to 3x with exponential backoff (2s → 4s → 8s) + random jitter | These failures are usually transient; retrying after a delay almost always succeeds |
| Mid-stream failure (some chunks already yielded) | Save partial content + append "[...connection lost mid-thought]", emit turn-complete, continue | What the user already saw streamed is real; can't replace it with a different generation. Partial text is honest; a re-generation would mismatch. |
| Complete failure (no chunks at all after retries) | Insert placeholder "[was unable to respond]", emit turn-complete, continue | Leaving a gap in the transcript breaks the next speaker's context. A placeholder keeps the sequence contiguous. |
| All turns fail (unlikely) | Debate still reaches debate-complete | The fixed loop count guarantees termination regardless of errors |

**Why mid-stream is not retried:** If the model generated 3 paragraphs and then the connection died, re-issuing the same prompt would produce a *completely different* 3 paragraphs. The user already saw the first 3 streaming in. They can't be unseen. Replacing them mid-stream would be jarring. The partial+suffix approach is honest: what you saw is what was said, and the gap is marked.

### 6.8 Turn structure (default 12 turns)

```
Turn  0: Persona A intro    ("Introduce yourself — who are you...")
Turn  1: Persona B intro
Turn  2: Persona X debate   ← alternating, 8 total
Turn  3: Persona Y debate
Turn  4: Persona X debate
Turn  5: Persona Y debate
Turn  6: Persona X debate
Turn  7: Persona Y debate
Turn  8: Persona X debate
Turn  9: Persona Y debate
Turn 10: Persona A reflection  ("Having been tested... what do you now see more clearly?")
Turn 11: Persona B reflection
```

The first speaker in the intro is randomized. The debate phase starts with the opposite speaker (so the second person to introduce is the first to make a debate argument). The reflection order is determined by who spoke last.

---

## 7. Retrieval (RAG)

### Current state: Not implemented

The current architecture does not use RAG. Persona derivation and debate turns rely entirely on Gemini's parametric knowledge. No book text is ingested, chunked, or stored.

### Why RAG is not implemented yet

1. **Parametric knowledge is sufficient for well-known books.** Gemini 2.5 Flash has strong knowledge of canonical literature. The persona it derives for The Brothers Karamazov is accurate enough for debate.

2. **RAG adds massive infrastructure cost.** PDF parsing, chunking, embedding, vector storage, retrieval, citation — each is a significant subsystem. Building and debugging all of this before the core debate loop works would delay the project by weeks.

3. **Copyright and storage concerns.** Storing book text, even temporarily, creates legal complexity. The parametric approach avoids this entirely.

4. **Quality gate focus.** The immediate priority is whether the personas *feel alive*. If they do, the debate works. If they don't, RAG won't fix it — a bad persona built on accurate text is still a bad persona.

### Future RAG design (if needed)

**When RAG would be needed:**
- A user submits a book the model doesn't know well (obscure, very recent, or non-English)
- We want to ground the persona in specific text rather than parametric knowledge
- We want citations — the persona references a specific passage from the book
- We want to prevent hallucination — ensure the persona only claims what the text actually says

**Embedding model:** Google's `text-embedding-004` (768 dimensions). Chosen for consistency with the Gemini ecosystem and free tier availability.

**Chunk strategy:**
- Size: ~500 tokens per chunk
- Overlap: ~50 tokens between adjacent chunks
- Boundary: align at paragraph breaks where possible, never mid-sentence
- Metadata per chunk: `{ bookSlug, sectionTitle, chunkIndex, startChar, endChar }`

**Retrieval flow:**
1. For each debate turn, extract the key claims and questions from the opponent's last statement
2. Embed these as a query
3. Retrieve top-10 chunks from the *persona's own book* (not the opponent's book — that's forbidden knowledge)
4. Rerank by relevance to the specific claim being addressed
5. Inject the top-5 chunks into the system prompt as "relevant passages from your book that may inform your response"
6. The persona can reference these passages but is not required to

**Citation rules:**
- If the persona directly references a retrieved passage, it should use its own words, not quote verbatim (to stay in character)
- Citations appear as subtle footnote-style references in the UI: "as I explored in Chapter 5..."
- No formal citation format — the persona speaks naturally, not academically

**Hallucination prevention:**
- After generation, verify that any specific claims about the book's content are consistent with the retrieved chunks
- If a claim contradicts the text, either the retrieval failed or the model hallucinated. Flag both.
- The persona's `forbiddenKnowledge` list already prevents most out-of-scope claims. RAG would add a grounding layer on top of this.

**Reranking:**
- Simple cosine similarity for initial retrieval
- Cross-encoder reranking (or Gemini-based reranking) for precision
- Could also use the persona's `whatTheyCantLetGoOf` as a query expansion — retrieve chunks most relevant to the persona's core obsession

---

## 8. Prompt Engineering

### 8.1 System prompts

There is exactly one system prompt template, used for every turn type (intro, debate, reflection). It is assembled by `buildSystemPrompt()` in `lib/debate/prompts.ts` from the cached PersonaCache object.

The system prompt has seven sections:
1. **Identity** — name + bounded knowledge
2. **Temperament** — four sub-fields as prose bullet points
3. **Obsession** — what they can't let go of
4. **Argument style** — three sub-fields as prose bullet points
5. **Voice samples** — 6-8 characteristic phrases as a bullet list
6. **Rules** — 5+ speaking rules as a bullet list
7. **Forbidden knowledge** — what they do not know

Plus a framing instruction at the bottom:

```
You are now in conversation with a stranger. You have never met them before.
You know nothing about them except what they choose to reveal.
The topic at hand is: "{topic}"

Below is the conversation so far. When it is your turn, speak.
```

**Why this exact structure:** Each section serves a specific anti-drift function:
- Temperament prevents tonal drift (the model remembers how it sounds)
- Obsession prevents thematic drift (the model stays focused on its core wound)
- Argument style prevents procedural drift (the model argues in character, not in generic debate mode)
- Voice samples provide rhythm — the model imitates the cadence and vocabulary
- Rules are hard constraints (ALWAYS/NEVER) that override the model's default helpful-debater tendencies
- Forbidden knowledge prevents out-of-scope claims

**Why the system prompt is sent every turn (not just once):** Each debate turn is a separate API call (we don't maintain a single conversation with Gemini). Since each call is stateless, the system prompt must be re-sent. This is actually beneficial — it re-anchors the model every turn.

### 8.2 Role prompts (turn-specific user messages)

There are three user message templates:

**Intro prompt:**
```
A stranger approaches you. The topic at hand is: "{topic}"
Introduce yourself — who are you, and what brings you to this conversation?
```

**Debate prompt:**
```
{transcript rendered as "Name: text" pairs}

Now it is your turn to respond.
```

**Reflection prompt:**
```
{full transcript}

The conversation is ending. Having been tested by this stranger, what do
you now see more clearly about your own position?
```

**Why no role assignment in the user message:** We never say "you are the opponent of X" or "you must challenge Y's claim." The persona's role is entirely defined by the system prompt. The user message only provides the stimulus (the transcript) and the instruction (speak / introduce / reflect).

### 8.3 Guardrails

The guardrails are split between the persona derivation step (soft) and the system prompt rules (hard):

**Soft guardrails (persona derivation):**
- Coherence assessment — rejects books that can't support a persona
- First-person voice instruction — prevents literary-criticism framing
- Original phrasing requirement — prevents book-quote drift
- Knowledge boundary — prevents out-of-scope claims
- `forbiddenKnowledge` array — explicit blocklist

**Hard guardrails (system prompt rules):**
- Concrete ALWAYS/NEVER rules the model must follow
- "What You Do Not Know" section reminds the model of its boundaries each turn
- "Your Voice" and "Your Temperament" sections anchor the model to its character

**Why two layers:** Soft guardrails shape the quality of the persona extraction. Hard guardrails keep the model in character during the debate. Neither alone is sufficient — a well-constructed persona + no rules still drifts; strong rules + a bad persona still produces flat output.

### 8.4 Citation rules

**Currently: None.** The debate does not reference specific passages from the books. The persona speaks from its interior knowledge of the book's world, not from retrieved text.

**If RAG were added (section 7):** Citations would be natural references in the persona's voice — "as I explored in the chapter on the Grand Inquisitor..." — not academic footnotes. The persona would reference its own content as if recalling it from memory, not as if citing a source.

**Why no citations currently:** The persona knows "everything in its book" — it doesn't need to cite. It speaks from within the book's world, not about the book from outside. Citations would implicitly acknowledge the book-as-text, undermining the "person from the book" framing.

### 8.5 Personality preservation

The biggest risk in a multi-turn conversation is **persona drift** — the model gradually losing its distinctive voice and regressing to a generic "helpful AI debater" tone. This is mitigated by three mechanisms:

1. **System prompt re-injection.** The full system prompt (identity, temperament, voice, rules) is sent with every turn. The model re-reads its own character description before each response.

2. **Ring buffer windowing.** The transcript context is limited to 6 recent turns + intros. This means the system prompt carries proportionally more weight relative to the conversation history. With full history, the system prompt is ~500 words against ~2000+ words of transcript. With windowing, it's ~500 words against ~1200 words — a much stronger anchor.

3. **Concrete speaking rules.** The ALWAYS/NEVER rules in the persona cache give the model hard constraints that override its default tendencies. "Never use the word 'problematic'" is more enforceable than "maintain your distinctive voice."

**Known limitation:** After ~10 turns, some drift is still visible. The persona may become slightly more polite, slightly less distinctive, than in its first few turns. The reflection round often partially restores intensity (because the prompt is fresh and directly engages the persona's core obsession). This is an acceptable trade-off — perfect persona consistency across 12+ turns remains an open research problem.

---

## 9. Memory System

### 9.1 Short-term memory (per-turn context)

Each turn's API call receives:
- The full system prompt (persona identity)
- The windowed transcript (ring buffer slice)
- The turn-specific instruction (debate / intro / reflection)

This context is the persona's "working memory." It does not persist between turns — each API call starts fresh with the assembled prompt. The only state that carries forward is the accumulating transcript stored in the orchestrator's `DebateState.turns` array.

**Why no persistent conversation ID with Gemini:** We don't use Gemini's multi-turn chat API. Each turn is a standalone `generateContentStream` call with the system instruction + full context assembled by our code. This gives us explicit control over what the model sees, which is critical for the ring buffer and the strict prompt isolation requirements.

### 9.2 Debate history (transcript)

The orchestrator maintains the full transcript in `DebateState.turns`. This is an array of `DebateTurn` objects, one per turn. Each turn records:
- `id` — unique identifier
- `debateId` — which debate this turn belongs to
- `speakerSlug` — which persona spoke
- `speakerName` — display name
- `content` — the full text of what they said (markdown)
- `sequenceNumber` — 0-indexed position in the debate
- `timestamp` — ISO instant

**Why maintain the full transcript:** The ring buffer reads from this array. Even though the model only sees a windowed slice, the full transcript is needed for:
- Rendering the full debate in the UI
- Computing the ring buffer slice
- Providing full context to reflection turns (which see everything, not just the window)

**Where the transcript lives:** In-memory only, in the `DebateState` object. The state is stored in a module-scoped `Map<string, DebateState>` in the orchestrator. When the SSE stream ends, the state is still in memory but there's no mechanism to retrieve it after the fact (no persistence). See Phase 4 for transcript persistence.

### 9.3 Conversation state

The `DebateState` object tracks:
- `currentSpeaker` — which persona speaks next ("A" or "B")
- `status` — "intro" | "streaming" | "completed" | "error"
- `maxTurns` — the fixed turn count for this debate
- `topic` — the auto-generated debate topic

The orchestrator uses `status` for internal bookkeeping. The `currentSpeaker` field is updated after each turn. The `maxTurns` and `topic` are set at initialization and never change.

**Why no "paused" or "user input" state:** The debate is fully automated once started. The user is an audience, not a participant. There's no mechanism for the user to inject a comment, ask a follow-up, or redirect the conversation. This is by design — the personas are talking to each other, not to the user.

### 9.4 Long-term memory

**Currently: None.** There is no cross-debate memory. Each debate is independent. If Ivan Karamazov debates The Free Spirit and then debates The Man from The Road, the second debate has no knowledge of the first.

**Why no long-term memory:** The persona is a static extraction from the book. It doesn't learn or grow from debate to debate. Adding memory would mean Ivan "remembers" his debate with The Free Spirit, which violates the knowledge boundary (he shouldn't know about other books). If we wanted serialized debates, we'd need a separate mechanism that doesn't compromise knowledge boundaries.

**Future possibility:** A "character across debates" mode where personas accumulate experience but with strict compartmentalization — they might remember *that* they debated someone, but not *what* that someone believed. This would require careful design to avoid knowledge leakage.

---

## 10. Tech Stack

### Runtime & Framework

**Next.js 16 (App Router)**
- **Why:** Full-stack framework with API routes, server components, and built-in SSE support. The App Router's route handlers (exporting `GET`/`POST` functions) are perfect for our API design. No need for a separate Express server.
- **Alternative considered:** Remix. Good SSE story, but smaller ecosystem and less familiar. Next.js has better tooling and more predictable deployment.
- **Trade-off:** Next.js API routes are serverless-style (stateless by default). Our in-memory debate state is a departure from this model — it doesn't survive deploys or server restarts. This is acceptable for local dev but would need rethinking for production.

**React 19**
- **Why:** Ships with Next.js 16. Server components for static rendering, client components for the interactive debate UI.
- **Alternative:** None — React is the standard for Next.js.

**TypeScript 5**
- **Why:** Type safety across the persona cache, debate state, API contracts, and SSE events. The strict types prevent mismatches between the Gemini response schema and our data structures.
- **Alternative considered:** Plain JS with JSDoc. Rejected — the type contracts between the API routes, the orchestrator, and the frontend are complex enough that type safety is worth the overhead.

### AI Model

**Google Gemini 2.5 Flash (via @google/genai SDK v2)**
- **Why:** Good structured output support (responseSchema), streaming API, fast generation, free tier with reasonable rate limits, and strong parametric knowledge of canonical books.
- **Alternative considered:** OpenAI GPT-4o-mini. Better prompt following, but no free tier and API costs would add up across 12+ calls per debate.
- **Alternative considered:** Claude via Anthropic API. Best at character voice, but no free tier and higher per-call cost.
- **Alternative considered:** Local model (Llama 3 via Ollama). Free, no rate limits, but weaker persona extraction quality and no structured output.
- **Trade-off:** Gemini Flash is a speed-quality compromise. It's fast enough for real-time streaming but may produce slightly less distinctive personas than a larger model. The free tier's rate limits (~60 rpm) mean we need retry logic from day one.

**SDK version:** `@google/genai` v2.9+. Uses `GoogleGenAI` constructor (not the deprecated `GoogleGenerativeAI`). Streaming uses `genAI.models.generateContentStream()`. Non-streaming uses `genAI.models.generateContent()` with structured output config.

### Styling

**Tailwind CSS v4**
- **Why:** Utility-first, fast iteration, zero runtime cost. The debate UI needs responsive chat bubbles, color accents per persona, and streaming text — all straightforward in Tailwind.
- **Alternative considered:** CSS Modules. More explicit scoping but slower to iterate. Tailwind's `@apply` takes care of reuse.
- **Trade-off:** Tailwind utility strings in JSX can be long. Mitigated by grouping utilities logically and extracting component patterns.

### Streaming

**Server-Sent Events (SSE)**
- **Why:** Unidirectional server→client. The frontend opens a stream and receives events. No need for the client to send data mid-debate.
- **Alternative considered:** WebSockets. Bidirectional, but we never use the client→server direction. Adds complexity (connection management, ping/pong, reconnection) for zero benefit.
- **Alternative considered:** Long polling. Simpler but higher latency and no real-time streaming.
- **Trade-off:** SSE is heavier than WebSockets for very high throughput, but our event rate is low (one chunk every ~100ms during generation, idle between turns). SSE handles this easily.

### Storage

**File system (JSON files)**
- **Why:** Personas are small (~5KB each), rarely written, frequently read. File I/O is fast enough. No migration, no connection pooling, no schema management.
- **Alternative considered:** SQLite. Better for concurrent access and queries, but overkill for a hash-map-shaped cache.
- **Alternative considered:** Redis. Fast, good for production, but adds a dependency for local dev that provides no benefit over files.
- **Trade-off:** File-based cache doesn't scale to concurrent writes or multi-instance deployment. Fine for local dev; would need replacing for production.

### Package versions

```json
{
  "dependencies": {
    "@google/genai": "^2.9.0",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 11. Folder Structure

```
book-dialogues/
├── .env.local                              # GEMINI_API_KEY=<your-key>
├── .gitignore
├── AGENTS.md                               # Auto-generated by create-next-app
├── BUILD_PLAN.md                           # This document
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tsconfig.json
│
├── data/
│   └── personas/                           # Cached persona JSON files
│       ├── the-brothers-karamazov.json      #   keyed by slugified title
│       ├── beyond-good-and-evil.json
│       ├── the-road.json
│       ├── the-subtle-art-of-not-giving-a-f-ck.json
│       └── the-bible.json
│
├── public/
│   └── favicon.ico                         # (default)
│
└── src/
    ├── app/
    │   ├── globals.css                     # Tailwind base styles
    │   ├── layout.tsx                      # Root layout (fonts, metadata)
    │   ├── page.tsx                        # Landing page / derivation tool
    │   │
    │   └── api/
    │       ├── persona/
    │       │   └── derive/
    │       │       └── route.ts            # POST: derive or retrieve persona
    │       │
    │       └── debate/
    │           ├── start/
    │           │   └── route.ts            # POST: create debate, resolve personas
    │           └── stream/
    │               └── route.ts            # GET: SSE stream from orchestrator
    │
    └── lib/
        ├── gemini.ts                       # GoogleGenAI init + streamGenerateContent()
        │
        ├── persona/
        │   ├── types.ts                    # PersonaCache, Temperament, ArgumentStyle, CoherenceAssessment
        │   ├── derive.ts                   # derivePersona(title) — structured Gemini call
        │   └── cache.ts                    # loadCachedPersona(), savePersona(), slugify()
        │
        ├── debate/
        │   ├── types.ts                    # DebateTurn, DebateState, SSEEvent, TurnType
        │   ├── prompts.ts                  # buildSystemPrompt, buildUserMessage, buildIntroPrompt, buildReflectionPrompt
        │   ├── ring-buffer.ts             # sliceTranscript() — windowed conversation slice
        │   ├── topic.ts                    # generateTopic() — one-sentence collision topic
        │   └── orchestrator.ts             # runDebate() — async generator, full debate loop
        │
        └── utils/
            └── retry.ts                    # withRetry() — exponential backoff + jitter
```

### Module dependency graph

```
page.tsx ──────────► api/persona/derive/route.ts
                         │
                         ▼
                    persona/derive.ts ──► gemini.ts
                         │                    │
                         ▼                    ▼
                    persona/cache.ts     Google Gemini API
                         │
                         ▼
                    data/personas/*.json


api/debate/start/route.ts ──► persona/cache.ts
       │                    ──► persona/derive.ts
       │
       ▼
api/debate/stream/route.ts ──► debate/orchestrator.ts
                                    │
                                    ├──► debate/topic.ts ──► gemini.ts
                                    ├──► debate/prompts.ts
                                    ├──► debate/ring-buffer.ts
                                    │
                                    └──► gemini.ts (streamGenerateContent)
                                              │
                                              ▼
                                        Google Gemini API
```

---

## 12. API Design

### POST /api/persona/derive

Derive a persona from a book title, or retrieve from cache.

**Request:**
```json
{
  "title": "The Brothers Karamazov"
}
```

**Response (200, derived fresh):**
```json
{
  "fromCache": false,
  "persona": { ...PersonaCache object }
}
```

**Response (200, from cache):**
```json
{
  "fromCache": true,
  "persona": { ...PersonaCache object }
}
```

**Response (400, missing title):**
```json
{
  "error": "Missing or invalid 'title' field"
}
```

**Response (500, Gemini failure):**
```json
{
  "error": "Error message from Gemini SDK"
}
```

**Idempotency:** Calling this endpoint multiple times with the same title returns the cached result after the first call. Cache is slug-based: "The Brothers Karamazov" and "the brothers karamazov" produce the same cache key.

**Latency:** ~10-15 seconds for fresh derivation (Gemini call). <10ms for cache hit.

---

### POST /api/debate/start

Create a new debate between two book titles. Resolves personas from cache (or derives them first). Generates the topic. Returns a debate ID for streaming.

**Request:**
```json
{
  "personaA": "The Brothers Karamazov",
  "personaB": "Beyond Good and Evil",
  "maxTurns": 12
}
```

`maxTurns` is optional (default 12, range 6-20). Represents total turns including intros and reflections.

**Response (200):**
```json
{
  "debateId": "debate-1782128564221-e5ngr5",
  "personaA": {
    "name": "Ivan Karamazov",
    "slug": "the-brothers-karamazov",
    "coherence": "deep"
  },
  "personaB": {
    "name": "The Free Spirit",
    "slug": "beyond-good-and-evil",
    "coherence": "deep"
  },
  "maxTurns": 12
}
```

**Response (422, shallow coherence):**
```json
{
  "error": "\"The Bible\" cannot produce a single coherent persona: The Bible is an anthology of diverse texts, written by numerous authors over millennia...",
  "coherence": {
    "level": "shallow",
    "why": "...",
    "caveat": "..."
  }
}
```

**Response (400, missing titles):**
```json
{
  "error": "Both personaA and personaB titles are required"
}
```

**Latency:** ~1-30 seconds depending on cache state (1ms if both cached, 10-15s per uncached persona, plus ~2s for topic generation).

**Side effects:** Creates an entry in the in-memory `debates` Map. The entry is consumed (deleted) by the stream endpoint.

---

### GET /api/debate/stream?id=\<debateId\>

Open an SSE connection to stream a debate in real time.

**Request:** GET with query parameter `id` (the debateId from /start).

**Response:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`.

**SSE event format:**
```
event: <event-type>
data: <JSON payload>

```

(Double newline separates events.)

**Event types:**

| Event type | Payload | When it fires |
|---|---|---|
| `chunk` | `{ type: "chunk", speakerSlug, speakerName, text }` | During streaming generation — each text fragment |
| `turn-complete` | `{ type: "turn-complete", speakerSlug, speakerName, sequenceNumber, turnType }` | After a turn finishes generating. `turnType` is "intro", "debate", or "reflection" |
| `error` | `{ type: "error", message }` | On non-fatal errors (rate limit, connection loss). Debate continues. |
| `debate-complete` | `{ type: "debate-complete" }` | After all turns (including reflections) are done. Stream closes. |

**Error handling on the endpoint:**
- If the debateId doesn't exist: returns HTTP 404 (not an SSE event)
- If the debateId is missing: returns HTTP 400 (not an SSE event)
- Mid-stream errors: `error` SSE event + debate continues with placeholders
- Fatal errors (topic generation fails): `error` SSE event + stream closes

**One-shot consumption:** The debateId is deleted from the in-memory map when the stream starts. Calling the same endpoint twice with the same ID returns 404. This prevents re-streaming a completed debate.

**Latency:** ~2-5 seconds before the first chunk (topic generation + first intro turn init). Each subsequent turn has ~1-3 seconds of latency before its first chunk.

---

## 13. Database Schema

### Current: No database

There is no database in the current architecture. Persona cache is file-based (JSON on disk). Debate state is in-memory (module-scoped Map).

### Persona cache file schema

Each file in `data/personas/<slug>.json`:

```json
{
  "slug": "the-brothers-karamazov",
  "title": "The Brothers Karamazov",
  "cachedAt": "2025-06-24T03:55:00.000Z",
  "modelUsed": "gemini-2.5-flash",

  "coherence": {
    "level": "deep",
    "why": "The novel presents a singular, deep, and complex character in Ivan...",
    "caveat": null
  },

  "personaType": "character-driven",
  "name": "Ivan Karamazov",

  "temperament": {
    "primaryDisposition": "I see decay in every structure...",
    "emotionalRange": "I oscillate between cold detachment and sudden fury...",
    "baselineTone": "I write as if every sentence is being carved into stone...",
    "whenCornered": "I intellectualize rather than conceding..."
  },

  "whatTheyCantLetGoOf": "I cannot forgive the architecture of a world built on children's suffering...",

  "argumentStyle": {
    "mode": "I build slowly, then strike with surgical precision",
    "relationshipToOpponent": "I test the other's logic for hidden weakness...",
    "rhetoricalSignature": "I open with a disarmingly personal admission, then pivot to the incision..."
  },

  "characteristicPhrasing": [
    "I don't reject God — I respectfully return his ticket.",
    "Your harmony demands a price I refuse to authorize.",
    "..."
  ],

  "speakingRules": [
    "I never make a claim without immediately questioning its foundation.",
    "I never use the word 'problematic' — I find that word cowardly.",
    "..."
  ],

  "boundedKnowledge": "The philosophical landscape of 19th-century Russia as depicted within the text...",
  "forbiddenKnowledge": [
    "Anything about Fyodor Dostoevsky's biography, other works, or later beliefs",
    "Anything about other books or their ideas",
    "Anything about the world after the novel's publication",
    "That I am a character in a novel"
  ]
}
```

### If a database were added

**Table: personas**
| Column | Type | Notes |
|---|---|---|
| slug | TEXT PRIMARY KEY | e.g. "the-brothers-karamazov" |
| title | TEXT NOT NULL | canonical title as entered |
| cache_data | JSON NOT NULL | full PersonaCache object |
| model_used | TEXT NOT NULL | e.g. "gemini-2.5-flash" |
| prompt_version | INTEGER NOT NULL DEFAULT 1 | for cache invalidation |
| created_at | DATETIME NOT NULL | derivation timestamp |
| updated_at | DATETIME NOT NULL | last re-derivation |

**Table: debates**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | debate-UUID |
| persona_a_slug | TEXT REFERENCES personas(slug) | |
| persona_b_slug | TEXT REFERENCES personas(slug) | |
| topic | TEXT NOT NULL | auto-generated topic |
| max_turns | INTEGER NOT NULL DEFAULT 12 | |
| status | TEXT NOT NULL | intro/streaming/completed/error |
| created_at | DATETIME NOT NULL | |

**Table: turns**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PRIMARY KEY | turn-UUID |
| debate_id | TEXT REFERENCES debates(id) | |
| sequence_number | INTEGER NOT NULL | 0-indexed |
| speaker_slug | TEXT REFERENCES personas(slug) | |
| speaker_name | TEXT NOT NULL | |
| turn_type | TEXT NOT NULL | intro/debate/reflection |
| content | TEXT NOT NULL | full markdown text |
| created_at | DATETIME NOT NULL | |

**Why two approaches are documented:** The file-based approach is what's built. The database schema is what we'd migrate to if we needed persistence, queries, or multi-instance deployment.

---

## 14. Development Phases

### Phase 1 — Persona Derivation (✅ COMPLETE)

**Goal:** Take a book title, produce a living persona.

**Deliverables:**
- [x] `src/lib/persona/types.ts` — PersonaCache interface with all sub-types
- [x] `src/lib/persona/derive.ts` — `derivePersona(title)` using Gemini structured output
- [x] `src/lib/persona/cache.ts` — `loadCachedPersona()`, `savePersona()`, `slugify()`
- [x] `src/lib/gemini.ts` — GoogleGenAI init with v2 SDK
- [x] `src/app/api/persona/derive/route.ts` — POST endpoint with cache-first logic
- [x] `src/app/page.tsx` — Minimal derivation UI (input + raw JSON)
- [x] `.env.local` — GEMINI_API_KEY configuration

**Quality gate (PASSED):**
- [x] The Brothers Karamazov → character-driven, deep, Ivan
- [x] Beyond Good and Evil → voice-driven, deep, The Free Spirit
- [x] The Road → passed
- [x] The Subtle Art of Not Giving a F\*ck → moderate coherence with caveat
- [x] The Bible → shallow, rejected with honest assessment

**Key iterations during this phase:**
- Fixed SDK import from deprecated `GoogleGenerativeAI` to v2 `GoogleGenAI`
- Rewrote derivation prompt from third-person to first-person interior voice
- Added explicit originality constraint for characteristic phrasing
- Added coherence assessment with shallow=reject behavior

### Phase 2 — Debate Engine (✅ COMPLETE)

**Goal:** Take two cached personas, run a full streaming debate.

**Deliverables:**
- [x] `src/lib/debate/types.ts` — DebateTurn, DebateState, SSEEvent, TurnType
- [x] `src/lib/debate/ring-buffer.ts` — `sliceTranscript()` with windowing
- [x] `src/lib/utils/retry.ts` — `withRetry()` with exponential backoff + jitter
- [x] `src/lib/debate/prompts.ts` — Four prompt builders (system, debate, intro, reflection)
- [x] `src/lib/debate/topic.ts` — `generateTopic()` from two personas
- [x] `src/lib/gemini.ts` — Added `streamGenerateContent()` with stream-init retry
- [x] `src/lib/debate/orchestrator.ts` — `runDebate()` async generator, full loop
- [x] `src/app/api/debate/start/route.ts` — POST: resolve personas, reject shallow, return debateId
- [x] `src/app/api/debate/stream/route.ts` — GET: SSE stream consuming orchestrator

**Quality gate (TESTED):**
- [x] Live debate: Brothers Karamazov vs Beyond Good and Evil
- [x] SSE streaming works end-to-end (chunks, turn-complete, debate-complete)
- [x] Autogenerated topic is personal to the pair
- [x] Personas stay in character across turns
- [x] 503 error handling: partial text preserved, placeholders inserted, debate completes
- [x] Stream init retry with exponential backoff confirmed

**Key iterations during this phase:**
- Added reflection prompt (initially "what has this stranger left in you" → changed to "what do you now see more clearly" to sharpen conviction, not imply conversion)
- Added stream-init retry to `streamGenerateContent()` after 503 failures during testing
- Added placeholder insertion for completely-failed turns to maintain transcript coherence
- Changed default from 10 turns to 12 turns (2 intro + 8 debate + 2 reflection)

### Phase 3 — Debate UI (⬜ NOT STARTED)

**Goal:** Replace the raw-JSON page with a real debate experience.

**Deliverables:**
- [ ] Two-book-title input form on landing page
- [ ] SSE EventSource consumption in the browser
- [ ] Chat bubble layout (left-aligned for A, right-aligned for B)
- [ ] Streaming text rendering (character-by-character as chunks arrive)
- [ ] Color accent per persona (warm for A, cool for B)
- [ ] Turn labels (Intro / Debate / Reflection)
- [ ] Reflection bubble styling (slightly distinct from debate bubbles)
- [ ] Progress indicator (turn N / 12)
- [ ] Auto-generated topic banner at top of chat
- [ ] Coherence warning for moderate-depth personas
- [ ] Error display for SSE error events (inline, not modal)
- [ ] "New Debate" button at end
- [ ] Loading states (deriving personas / starting debate)

**Implementation notes:**
- Use browser `EventTarget` or `eventsource` package for SSE consumption
- React state: array of `Turn` objects, each with `speakerName`, `content` (accumulated from chunks), `turnType`, `isStreaming` flag
- As `chunk` events arrive, append text to the current turn's `content` and re-render
- On `turn-complete`, mark the turn as complete and start the next bubble
- On `debate-complete`, show "New Debate" button
- Markdown rendering for turn content (use `react-markdown` or similar)

### Phase 4 — Polish & Robustness (⬜ NOT STARTED)

**Goal:** Make the app feel finished and handle edge cases gracefully.

**Deliverables:**
- [ ] Transcript persistence — save completed debates to disk/DB for review
- [ ] Model fallback — if gemini-2.5-flash is overloaded, try gemini-2.5-pro or gemini-1.5-flash
- [ ] Cache invalidation — auto-bust personas when prompt version changes
- [ ] Debate history UI — browse previously completed debates
- [ ] Rate limit status indicator — show the user when we're approaching Gemini's free tier limits
- [ ] Mobile-responsive layout — verify chat bubbles work on small screens
- [ ] Error recovery — if the page refreshes mid-debate, allow reconnecting to an active stream
- [ ] Production deployment config — Vercel or Docker setup
- [ ] Loading skeleton for the debate page while personas resolve

### Phase 5 — Advanced Features (⬜ NOT STARTED)

**Goal:** Features beyond the core debate loop.

**Deliverables:**
- [ ] Book upload (PDF/EPUB) with text extraction for obscure books
- [ ] RAG pipeline for persona grounding (see section 7)
- [ ] User-provided topics (allow editing the auto-generated topic)
- [ ] Multi-persona debates (3+ books)
- [ ] "Audience question" mode — user can inject a question mid-debate
- [ ] Citation support — persona references specific passages from its book
- [ ] Persona gallery — browse and compare derived personas
- [ ] API key management — support multiple Gemini keys for higher throughput
- [ ] Streaming to file — save the debate transcript as it generates

---

## 15. Future Improvements

### Research directions

**Fine-tuned persona extraction.** Instead of using Gemini's parametric knowledge, fine-tune a smaller model on a corpus of literary criticism and character analysis. This would produce more accurate and nuanced personas, especially for books the base model doesn't know well. Cost: significant training data and compute. Benefit: better personas for obscure books.

**Persona consistency scoring.** After each debate, run an automated check: does the persona's voice in the debate match its cached `characteristicPhrasing`, `speakingRules`, and `temperament`? A consistency score would quantify drift and help us tune the ring buffer window size, voice re-injection frequency, and speaking rules.

**Multi-book personas.** Some books span a series (e.g., The Lord of the Rings is three volumes). The coherence assessment could handle "a single story told across multiple volumes" differently from "an anthology of unrelated works." The persona would be derived from the full arc, not from one volume.

**Debate summarization.** After a debate completes, generate a one-paragraph summary of the key moments — not "who won" but where the collision was most intense. This would help users decide whether to read the full transcript. Must be done carefully to avoid the third-voice summarization trap.

**Persona voice re-injection.** Every N turns, re-inject a voice sample into the system prompt with a note: "Remember, this is how you sound." This could reduce drift without increasing the prompt size. Research needed on optimal frequency (every 3 turns? every 4?) and whether it helps or creates jarring discontinuities.

**Dynamic window sizing.** Instead of a fixed ring buffer of 6 turns, adapt the window based on the conversation's dynamics. If the personas are building on each other's arguments (high cross-reference), a larger window preserves the thread. If they're making disconnected points, a smaller window keeps things fresh.

### Advanced features

**Real-time audience reactions.** Allow viewers to react to specific turns (e.g., highlight a passage, mark a moment as "intense"). These reactions don't feed back into the debate (the personas shouldn't know they're being watched) but could be displayed to other viewers in a multi-user setting.

**Debate branching.** At any turn, allow the user to fork the conversation — "what if The Free Spirit had responded differently?" This would require saving the full debate state at each turn and re-running from that point. The architecture (async generator + in-memory state) makes this feasible but not trivial.

**Persona evolution across debates.** If Ivan Karamazov debates three different opponents, does he learn anything about his own position? A "long-term memory" mode would let the persona accumulate insights without violating its knowledge boundary. The key design challenge: how to let Ivan "grow" without letting him learn things he shouldn't know.

**Collaborative debate authoring.** Allow a human to co-write a persona alongside the AI derivation — tweaking the temperament, adding rules, adjusting the speaking style. This would let users who know a book deeply produce more accurate personas than the parametric approach alone.

**Audio narration.** After a debate completes, generate an audio version using text-to-speech with distinct voices for each persona. Would require voice selection per persona type (gravelly for Ivan, measured and cool for The Free Spirit).

**Debate tournament.** Set up a bracket of 8+ books. Winners are determined not by "who won" but by audience vote on which debate produced the most compelling exchange. This shifts the focus from contest to spectacle.
