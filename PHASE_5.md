# Phase 5 — Advanced Features

## Priority Order

1. **Topic Control** — optional user topic + preview-and-edit auto-generated topic
2. **Persona Gallery** — browse cached personas and pick them for debates
3. **Export & Sharing** — download debate as Markdown/JSON, copy share link
4. **Multi-Persona Debates** — support 3+ books in a single debate

RAG pipeline, book upload, audience questions, citation support — deferred.

# Phase 5 — Advanced Features

## Status Overview

| Feature | Status |
|---------|--------|
| **1. Topic Control** | ✅ **Done** |
| **2. Persona Gallery** | ✅ **Done** |
| **3. Export & Sharing** | ✅ **Done** |
| **4. Multi-Persona Debates** | ❌ **Not started — next up** |

RAG pipeline, book upload, audience questions, citation support — deferred.

---

## ✅ Feature 1: Topic Control (Complete)

### Goal

Users can optionally provide their own debate topic. If omitted, the auto-generated topic is previewed and editable before the debate starts.

### Changes

#### Step 1.1 — Orchestrator: accept pre-provided topic

**File:** `src/lib/debate/orchestrator.ts`

Add optional `topic` parameter to `runDebate()`:

```ts
export async function* runDebate(
  personaA: PersonaCache,
  personaB: PersonaCache,
  maxTurns: number = 12,
  debateId?: string,
  existingState?: DebateState,
  topic?: string   // NEW
): AsyncGenerator<SSEEvent>
```

Skip `generateTopic()` if `topic` is provided and non-empty. Precedence:
1. Explicit `topic` param
2. `existingState.topic`
3. Auto-generate

**Edge case:** Empty/whitespace `topic` → treat as not provided → auto-generate.

#### Step 1.2 — Start route: accept and persist topic

**File:** `src/app/api/debate/start/route.ts`

Accept optional `topic?: string` in request body. If provided, store it in the seed `DebateState`. The orchestrator will read it from `existingState` when the stream route fires.

#### Step 1.3 — Preview API route (NEW)

**File:** `src/app/api/debate/preview/route.ts`

```
POST /api/debate/preview
Body: { personaA: string, personaB: string, topic?: string }
```

- Resolves both personas (cache-first, Gemini fallback)
- If `topic` not provided by user: calls `generateTopic()`
- Returns `{ personaA, personaB, topic, topicGenerated: boolean }`
- Does NOT create debate state — purely a preview
- **Error states:** 400 empty titles, 422 shallow coherence, 500 API failure

#### Step 1.4 — Landing page: topic input + preview modal

**File:** `src/app/page.tsx`

**Phase 1 — Topic input:**
- Add "Topic (optional)" text input between maxTurns selector and the button
- Placeholder: "e.g., Can justice coexist with suffering?"

**Phase 2 — Preview modal:**
- After clicking "Start Debate":
  1. Call `POST /api/debate/preview` with book titles
  2. Show a centered overlay modal with:
     - Auto-generated topic in an editable `<textarea>` (or the user's provided topic)
     - Persona names + coherence badges side by side
     - "Regenerate" button (only if auto-generated — calls preview again)
     - "Confirm & Start" button
     - "Cancel" button (returns to form)
  3. On confirm: `POST /api/debate/start` with `{ personaA, personaB, topic, maxTurns }` → navigate to `/debate/[id]`

**Loading states:**
- Button shows "Resolving personas..." during preview call
- After preview returns, modal shows immediately (no separate loading)
- "Confirm & Start" shows "Starting debate..." while the start call is in flight

**Edge cases:**
- User-provided topic is whitespace → treat as "not provided"
- Preview fails (coherence rejection) → error in modal, no retry for coherence (book can't debate)
- Preview fails (API error) → error banner with retry button
- User closes modal → abort, reset to idle
- Both books cached → preview is near-instant
- Modal backdrop click → close modal, reset

#### Step 1.5 — Stream route: forward state (no change needed)

**File:** `src/app/api/debate/stream/route.ts`

The seed state in the in-memory map already has `topic` set from Step 1.2. The orchestrator reads `existingState.topic` and skips generation. No code change needed — verified by tracing the data flow.

---

## ✅ Feature 2: Persona Gallery (Complete)

### Goal

Browse all cached personas, view their metadata, and quickly start debates with them.

### Changes

#### Step 2.1 — Persona list API route (NEW)

**File:** `src/app/api/persona/list/route.ts`

```
GET /api/persona/list
```

Returns:
```ts
{
  name: string;
  title: string;
  slug: string;
  coherence: CoherenceAssessment;
  personaType: "character-driven" | "voice-driven";
  cachedAt: string;
}[]
```

Sorted by `cachedAt` descending (newest first).

**Edge cases:** Directory doesn't exist yet → return `[]`. Corrupted JSON file → skip it (log warning, don't crash).

#### Step 2.2 — Gallery page (NEW)

**File:** `src/app/personas/page.tsx`

**Layout:** Full-width page with centered content (max-w-5xl).

**Features:**
- Header: "Persona Gallery" title + "Back to Home" link
- Grid of persona cards (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- Each card:
  - Persona name (large, bold)
  - Book title (subtitle, muted)
  - Coherence badge: green dot + "Deep" / amber dot + "Moderate"
  - Persona type tag: "Character-driven" or "Voice-driven"
  - Cached date (relative: "3 days ago")
  - "Use as Book 1" / "Use as Book 2" buttons

**Loading state:** Skeleton grid (pulsing rectangles matching card dimensions)

**Empty state:** "No personas cached yet. Start a debate to generate one." + link back to home

**Error state:** "Failed to load personas" + retry button

#### Step 2.3 — Landing page: persona selection from gallery

**File:** `src/app/page.tsx`

On mount, check URL params:
- `?selectA=<slug>` → fetch persona list, resolve slug to title, prefill Book 1 input
- `?selectB=<slug>` → same for Book 2
- `?select=<slug>&side=a` or `?select=<slug>&side=b` — same effect

This enables the gallery to "push" a persona back to the landing page as a pre-selection.

**Edge cases:** Invalid slug → silently ignore. Both `selectA` and `selectB` in URL → fill both.

#### Step 2.4 — Layout: navigation link to gallery

**File:** `src/app/layout.tsx`

Add "Personas" link in the header navigation (shown on all pages). Subtle styling — secondary link, not main CTA.

---

## ✅ Feature 3: Export & Sharing (Complete)

### Goal

Download debate transcripts as Markdown or JSON. Share a permanent link to any completed debate.

### Changes

#### Step 3.1 — Export utility (NEW)

**File:** `src/lib/export.ts`

```ts
export function formatDebateAsMarkdown(state: DebateState): string
```

Generates:
```markdown
# Book Dialogues: {personaA.name} vs {personaB.name}

**Topic:** "{topic}"
**Date:** {createdAt}
**Turns:** {turns.length}

---

## {speakerName} — Intro

{content}

---

## {speakerName}

{content}

---

## {speakerName} — Reflection

{content}
```

```ts
export function formatDebateAsJson(state: DebateState): string
```
Returns `JSON.stringify(state, null, 2)`.

#### Step 3.2 — Debate-complete screen: export buttons

**File:** `src/app/debate/[id]/page.tsx`

On the debate-complete screen, alongside "New Debate":
- "Download Markdown" — builds markdown string, triggers download via `Blob` + `URL.createObjectURL` + hidden `<a>` click
- "Download JSON" — same mechanism with json content type
- "Copy Link" — copies `/history/{debateId}` URL to clipboard

**File download implementation:**
```ts
const blob = new Blob([content], { type: "text/markdown" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `debate-${debateId}.md`;
a.click();
URL.revokeObjectURL(url);
```

**Clipboard implementation:**
```ts
await navigator.clipboard.writeText(shareUrl);
// Show "Copied!" toast for 2s
```

**Edge cases:**
- `navigator.clipboard` unavailable → fallback to `document.execCommand("copy")` with hidden input
- Long filenames → use `debate-{slugA}-vs-{slugB}.md` format

#### Step 3.3 — History viewer: export buttons

**File:** `src/app/history/[id]/page.tsx`

Same three buttons (Markdown, JSON, Copy Link) in the header bar, next to the back button.

#### Step 3.4 — "Copied!" toast component

**File:** `src/app/debate/[id]/page.tsx` and `src/app/history/[id]/page.tsx`

Small inline toast that appears after clicking "Copy Link":
- "Link copied to clipboard" / "Copied!" text
- Auto-dismisses after 2 seconds
- Simple state: `showCopiedToast: boolean` → render conditional element with transition

---

## ❌ Feature 4: Multi-Persona Debates (Remaining — not yet started)

### Goal

Support 3+ books debating simultaneously. This is the most architecturally significant change.

### Changes (build order: 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.9 → 4.10 → 4.8 → 4.11)

#### Step 4.1 — Types: N-persona DebateState

**File:** `src/lib/debate/types.ts`

Add `personas` field alongside deprecated `personaA`/`personaB`:

```ts
export interface DebateState {
  id: string;
  topic: string;
  personas: PersonaCache[];          // NEW — primary field
  personaA?: PersonaCache;           // DEPRECATED — backward compat
  personaB?: PersonaCache;           // DEPRECATED — backward compat
  turns: DebateTurn[];
  maxTurns: number;
  status: "intro" | "streaming" | "completed" | "error";
  currentSpeaker: number;            // was "A" | "B", now index into personas
  firstSpeakerOrder: number[];       // NEW — randomized order of speaker indices
  createdAt: string;
}
```

Update `SSEEvent.debate-meta`:
```ts
{ type: "debate-meta"; topic: string; personas: PersonaInfo[]; maxTurns: number }
```

#### Step 4.2 — Persistence: backward compat migration

**File:** `src/lib/debate/persistence.ts`

When reading old files (detect via `!state.personas`):
- Set `state.personas = [state.personaA, state.personaB]`
- Set `state.currentSpeaker = 0`
- Set `state.firstSpeakerOrder = [0, 1]`

Update `DebateSummary`:
```ts
export type DebateSummary = {
  id: string;
  personaNames: string[];    // was personaA + personaB strings
  topic: string;
  turnCount: number;
  createdAt: string;
};
```

When writing new files:
- Include both `personas` and `personaA`/`personaB` for transition period
- After all old data is migrated (future cleanup), remove deprecated fields

#### Step 4.3 — Orchestrator: N-persona turn logic

**File:** `src/lib/debate/orchestrator.ts`

**Signature change:**
```ts
export async function* runDebate(
  personas: PersonaCache[],
  maxTurns: number = 12,
  debateId?: string,
  existingState?: DebateState,
  topic?: string
): AsyncGenerator<SSEEvent>
```

**Randomization:**
- Generate `firstSpeakerOrder: number[]` — shuffled array of persona indices (e.g., `[2, 0, 1]` for 3 personas)
- This determines the intro order

**Intro phase:**
- Each persona in `firstSpeakerOrder` gets an intro turn
- N intros total

**Debate phase:**
- `debateTurnCount = maxTurns - 2 * personas.length`
- Cycle through personas: index `(turnNumber % personas.length)` — provides natural alternation
- For 2 personas with shuffled intro, the debate order starts with whoever introduced second (maintains existing behavior)

**Reflection phase:**
- Last N turns in reverse order of who spoke last in the debate phase
- Each persona reflects

**Internal helpers:**
- `streamTurn(speakerIndex: number, ...)` — replaces `streamTurn("A" | "B", ...)`
- `getPersona(state, speakerIndex)` — returns `state.personas[speakerIndex]`
- `state.currentSpeaker` is now a number index, toggled by `(currentSpeaker + 1) % N`

**Edge cases:**
- 2 personas → behavior identical to current (backward compat guaranteed)
- 3+ personas → each turn cycles, no speaker repeats consecutively
- Odd number of personas means some will speak more often than others in the debate phase (acceptable — it's a group conversation, not a tournament)
- Topic generation: still uses only the first two personas' `whatTheyCantLetGoOf` (or use all N for a richer topic)

#### Step 4.4 — Start route: accept N titles

**File:** `src/app/api/debate/start/route.ts`

Accept both old and new formats:
```ts
// Old (backward compat)
{ personaA: string, personaB: string, maxTurns?: number, topic?: string }
// New
{ personas: string[], maxTurns?: number, topic?: string }
```

Validate:
- At least 2 titles
- No duplicates (by slug)
- Max 5 (to prevent unwieldy debates)

Resolve all personas in parallel via `resolvePersona()`. Check coherence on all. Create seed state with N personas.

**Response (200):**
```ts
{
  debateId: string;
  personas: PersonaInfo[];    // { name, slug, coherence }
  maxTurns: number;
}
```

Also include `personaA`/`personaB` in response for backward compat with older frontend instances.

#### Step 4.5 — Stream route: forward N personas

**File:** `src/app/api/debate/stream/route.ts`

Update to pass `state.personas` array to `runDebate()` instead of `state.personaA`/`state.personaB`.

#### Step 4.6 — State route: return N personas

**File:** `src/app/api/debate/state/route.ts`

Return `personas` array alongside deprecated `personaA`/`personaB`:

```ts
{
  id: string;
  topic: string;
  personas: PersonaInfo[];
  maxTurns: number;
  turns: DebateTurn[];
  status: string;
  createdAt: string;
  // Also include for backward compat:
  personaA: PersonaInfo;
  personaB: PersonaInfo;
}
```

#### Step 4.7 — History route: N-persona summaries

**File:** `src/app/api/debate/history/route.ts`

Return `personaNames: string[]` in summaries. Backward compat: old files without `personas` field → extract names from `personaA`/`personaB`.

#### Step 4.8 — Landing page: dynamic book inputs

**File:** `src/app/page.tsx`

**Current:** 2 fixed inputs (Book 1, Book 2).

**New:** Dynamic list of inputs:
- Starts with 2 inputs
- "+ Add Book" button (max 5)
- Each input has "×" remove button (min 2, remove is disabled or hidden for last 2)
- Inputs are numbered "Book 1", "Book 2", "Book 3", etc.
- Input indices shift when one is removed (re-numbering)

**On submit:**
- Collect all non-empty titles as an array
- Send `{ personas: string[] }` to the preview API
- Preview modal shows all persona cards in a horizontal row
- Topic remains single editable text field

**Edge cases:**
- Drag-to-reorder? Not needed for v1 — order is randomized in the orchestrator
- Duplicate titles at the form level: show inline error before submission
- Empty input in the middle of the list: skip that entry (don't count it)

#### Step 4.9 — Color palette utility (NEW)

**File:** `src/lib/colors.ts`

```ts
export const PALETTES = [
  { headerBg: "bg-amber-100", headerText: "text-amber-900", bubbleBg: "bg-amber-50", border: "border-amber-100", pulse: "bg-amber-500" },
  { headerBg: "bg-sky-100", headerText: "text-sky-900", bubbleBg: "bg-sky-50", border: "border-sky-100", pulse: "bg-sky-500" },
  { headerBg: "bg-emerald-100", headerText: "text-emerald-900", bubbleBg: "bg-emerald-50", border: "border-emerald-100", pulse: "bg-emerald-500" },
  { headerBg: "bg-violet-100", headerText: "text-violet-900", bubbleBg: "bg-violet-50", border: "border-violet-100", pulse: "bg-violet-500" },
  { headerBg: "bg-rose-100", headerText: "text-rose-900", bubbleBg: "bg-rose-50", border: "border-rose-100", pulse: "bg-rose-500" },
];

export function getPalette(index: number): typeof PALETTES[0] {
  return PALETTES[index % PALETTES.length];
}
```

#### Step 4.10 — Debate page: N-persona visual identity

**File:** `src/app/debate/[id]/page.tsx`

**Replace `personaA`/`personaB` state:**
```ts
personas: PersonaInfo[];     // array instead of two nullable fields
paletteMap: Map<string, number>;  // persona name → palette index
```

**Color assignment:**
- On `SET_META`, build a `paletteMap` assigning each persona a palette index by their position in the `personas` array
- Use `getPalette(paletteMap.get(speakerName) ?? 0)` for bubble colors

**Turn alignment:**
- 2 personas: left (persona 0) / right (persona 1) — unchanged from current behavior
- 3+ personas: all left-aligned, differentiated by color accent in the header

**Coherence warnings:**
- Show banner for ALL personas with moderate coherence (not just A/B)
- Message: "{name}'s voice is limited in emotional depth." (one per moderate persona)

**Streaming indicator:**
- Pulse dot uses the persona's assigned color from palette map

**Debate-complete screen:**
- Show all persona names in the completion message
- "New Debate" button unchanged

**Existing behavior preserved:**
- For 2-persona debates, the amber/sky palette and left/right alignment remain identical
- The `debate-meta` SSE event now includes `personas` array; old events from memory don't exist (they're generated fresh)

#### Step 4.11 — History viewer: N-persona rendering

**File:** `src/app/history/[id]/page.tsx`

Same color palette approach as 4.10. Build `paletteMap` from `debate.personas`.

**Turn alignment:**
- 2 personas: left/right alternating
- 3+: all left-aligned

**Header:**
- Show all persona names: "{name1} · {name2} · {name3}"
- Turn count: `{turns.length} turns` (unchanged)

**Backward compat:**
- Old debates stored with `personaA`/`personaB` (no `personas` field) → handled by persistence migration in step 4.2
- Build palette map from the migrated personas array

---

## Summary: Files Created

| # | File | Feature | Status |
|---|------|---------|--------|
| 1 | `src/app/api/debate/preview/route.ts` | Topic Control | ✅ Done |
| 2 | `src/app/api/persona/list/route.ts` | Persona Gallery | ✅ Done |
| 3 | `src/app/personas/page.tsx` | Persona Gallery | ✅ Done |
| 4 | `src/lib/export.ts` | Export & Sharing | ✅ Done |
| 5 | `src/lib/colors.ts` | Multi-Persona | ❌ Not started |

## Summary: Files Modified

| # | File | Features | Status |
|---|------|----------|--------|
| 1 | `src/lib/debate/orchestrator.ts` | Topic Control, Multi-Persona | 🔶 Feature 1 done, Feature 4 pending |
| 2 | `src/app/api/debate/start/route.ts` | Topic Control, Multi-Persona | 🔶 Feature 1 done, Feature 4 pending |
| 3 | `src/app/page.tsx` | Topic Control, Persona Gallery, Multi-Persona | 🔶 Features 1-2 done, Feature 4 pending |
| 4 | `src/lib/debate/types.ts` | Multi-Persona | ❌ Pending |
| 5 | `src/lib/debate/persistence.ts` | Multi-Persona | ❌ Pending |
| 6 | `src/app/api/debate/stream/route.ts` | Multi-Persona | ❌ Pending |
| 7 | `src/app/api/debate/state/route.ts` | Multi-Persona | ❌ Pending |
| 8 | `src/app/api/debate/history/route.ts` | Multi-Persona | ❌ Pending |
| 9 | `src/app/debate/[id]/page.tsx` | Export & Sharing, Multi-Persona | 🔶 Feature 3 done, Feature 4 pending |
| 10 | `src/app/history/[id]/page.tsx` | Export & Sharing, Multi-Persona | 🔶 Feature 3 done, Feature 4 pending |
| 11 | `src/app/layout.tsx` | Persona Gallery | ✅ Done |

## Build Order for Feature 4

```
4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.9 → 4.10 → 4.8 → 4.11
```

Note: 4.8 (landing page dynamic inputs) is intentionally after 4.10 (debate page rendering) so the debate page can handle N personas before the landing page lets users create them.
