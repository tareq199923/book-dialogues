# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Book Dialogues** — a web app where two books debate each other live. Each book is distilled into a persona (a living mind, not a position container), and those personas collide in real-time via SSE streaming. Built on Next.js 16 (App Router) + Gemini 2.5 Flash API.

## Development Commands

```bash
npm run dev      # Start dev server (next dev)
npm run build    # Production build (next build)
npm run lint     # ESLint check
npm run start    # Production server (next start)
```

No test framework is installed. `test-persona.ts` at root is a standalone CLI test for persona derivation (run with `npx tsx test-persona.ts`).

**Required env:** `GEMINI_API_KEY` in `.env.local`

## Architecture

### Path Alias

`@/*` → `./src/*`

### Two-Module Core: Persona + Debate

**Persona pipeline** (`src/lib/persona/`):
- `derive.ts` — Single Gemini structured-output call. Three-phase prompt: coherence assessment → classification (character- vs voice-driven) → mind extraction (6 first-person fields)
- `cache.ts` — File-based cache in `data/personas/<slug>.json`. Slug = lowercase title, non-alphanumeric → hyphens. Checked before any Gemini call
- `types.ts` — `PersonaCache`, `Temperament`, `ArgumentStyle`, `CoherenceAssessment`

**Debate engine** (`src/lib/debate/`):
- `orchestrator.ts` — `runDebate()` is an `async function*` yielding SSE events. State held in an in-memory `Map<string, DebateState>` (ephemeral, ~2-4 min lifespan). No database
- `prompts.ts` — System/user/intro/reflection prompt builders. Persona stance is **emergent** from temperament + transcript — never "argue against X"
- `topic.ts` — Auto-generates debate topic from two personas
- `ring-buffer.ts` — `sliceTranscript()` keeps intro + reflection turns intact, sliding window of 6 most recent debate turns for context

**Gemini client** (`src/lib/gemini.ts`):
- Exports `genAI` (SDK instance) and `streamGenerateContent()` (async generator with built-in retry)
- Model: `gemini-2.5-flash` (free tier)
- Mid-stream failures save partial content with `"[...connection lost mid-thought]"`; complete failures insert `"[was unable to respond]"` placeholder turns

**Retry utility** (`src/lib/utils/retry.ts`): `withRetry()` — exponential backoff + jitter

### API Routes (App Router)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/persona/derive` | POST | Derive persona from book title (or return cached) |
| `/api/debate/start` | POST | Resolve both personas, reject shallow-coherence books, create in-memory debate state, return debate ID |
| `/api/debate/stream` | GET | SSE stream — `chunk`, `turn-complete`, `debate-complete`, `error` events |

### Frontend Status

- `src/app/page.tsx` — Landing page (Phase 1 persona derivation only, displays raw JSON)
- `src/app/debate/[id]/` — **Empty directory** — debate streaming UI not yet implemented

## Design Philosophy (from BUILD_PLAN.md)

These are non-negotiable constraints that shape all prompt and persona work:

1. **The person is the book, not the author.** For novels: the single most representative character. For essays: the speaking voice of the text. Bounded strictly to what's in this book
2. **First-person interior voice** — personas describe themselves from the inside, not as literary criticism from the outside
3. **Emergent stance** — never "argue against X" in turn prompts; stance emerges from temperament reacting to transcript
4. **First encounter** — personas have never met; they react to a stranger's ideas in real time
5. **Sharpening, not conversion** — reflections clarify conviction ("what do you now see more clearly"), never declare a winner
6. **Shallow coherence rejection** — anthologies, reference works, and other texts that can't support a single coherent mind are rejected outright, not given fabricated personas

## Next.js 16 Warning

This Next.js version has breaking changes from what training data may cover. Read `node_modules/next/dist/docs/` before writing Next.js-specific code. Check deprecation notices.
