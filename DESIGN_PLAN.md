# Book Dialogues — Visual Identity & Redesign Plan

## Overview

This document defines the visual identity system for Book Dialogues. It is the result of a deliberate design process: audit before designing, produce a compact token system, self-critique for generic answers, then build. No token here is a default.

---

## 1. Audit Summary

### Surfaces & data shapes

| Surface | Key states | Data flowing through |
|---|---|---|
| **Home form** (`page.tsx`) | `idle` → `resolving` → `previewed` → `starting` | 2 book titles, topic string, maxTurns number, history list (personaA vs personaB, topic, turnCount), preview modal (personaA/B name, slug, coherence level, topic, topicGenerated) |
| **Preview modal** (same file) | shown, error, confirming | PersonaInfo[] (name, slug, coherence), topic string, editable textarea |
| **Debate stream** (`debate/[id]/page.tsx`) | loading skeleton → streaming → complete | SSE events: `debate-meta` (persona names, topic, maxTurns), `chunk` (text, speakerName, turnType), `turn-complete`, `debate-complete`, `error`. Turns typed: intro / debate / reflection. Per-turn: id, speakerName, content, sequenceNumber, isStreaming |
| **Persona Gallery** (`personas/page.tsx`) | loading skeleton → empty → error → grid | PersonaListItem[] (name, title, slug, coherence: level+why+caveat, personaType, cachedAt) |
| **History viewer** (`history/[id]/page.tsx`) | loading → found → not-found | Full DebateState (personaA/B with name+slug, turns with sequenceNumber, maxTurns, createdAt) |
| **Root layout** (`layout.tsx`) | static | nav link to `/personas`, children outlet |

### Existing visual baseline

- **Fonts:** Geist (sans) + Geist Mono — already loaded via next/font/google
- **Palette:** zinc-50/100/200/300/400/500/600/700/800/900/950, amber (persona A), sky (persona B), emerald (deep badge), red (errors)
- **RateIndicator:** already polished — rounded pill, colored dot, semantic states — match its quality bar, don't redo it
- **Markdown:** bare — no custom styling on debate content
- **Dark mode:** CSS variables exist but never used (all classes hardcode light colors) — intentionally deferred (see 7.)

---

## 2. Token System

### 2.1 Color

A warm paper-and-ink palette. Not cream-terracotta, not black-neon, not newspaper hairlines.

| Token | Hex | Usage |
|---|---|---|
| `paper` | `#F7F6F2` | Page background — warm natural paper |
| `surface` | `#FFFFFF` | Card/chrome backgrounds |
| `ink` | `#1C1817` | Body text — near-black, warm trace |
| `muted` | `#8A8480` | Secondary text, metadata, timestamps |
| `rule` | `#D8D4CD` | Borders, dividers, HRs |
| `mark` | `#C73A2B` | Accent red — coherence warnings, turn counter marks, emphasis only |

**Speaker differentiation:**
- NOT two accent colors. Sidedness is encoded via **position** (left/right) + **typographic weight** (Persona A name slightly heavier than Persona B).
- Bubble backgrounds are nearly identical: Persona A on `paper` (page color), Persona B on `#F0F2F0` (subtly cooler off-white). Barely perceptible — enough to anchor when scrolling fast, not enough to compete with reading.
- **Contingency:** If position + weight isn't enough for quick scanning, add a thin vertical colored bar to the left edge of each bubble — warm for A, cool for B — without coloring the whole bubble.

### 2.2 Typography

| Role | Face | Weight | Why |
|---|---|---|---|
| **Display** | Spectral (Google Fonts, serif) | 400 / 600 / 700 | Literary without being algorithmic-cliché. Sharp, etched quality. Expressive italic for reflective moments. |
| **Body** | Geist (already loaded) | 400 / 500 | Already in the project. Clean, legible at small sizes. |
| **Utility** | Geist Mono (already loaded) | 400 | Timestamps, slugs, badges, turn count metadata. |

**Where Spectral appears:**
- "Book Dialogues" wordmark in header
- Persona names (bubbles, gallery cards, modal)
- Turn counter numerals (ledger marks)
- Topic banner
- "Debate complete" heading

**Everything else** — form labels, button text, debate body, error messages, nav links — is Geist or Geist Mono.

### 2.3 Spacing

Based on a 4px grid, applied as Tailwind spacing scale equivalents:
- Bubble padding: `px-5 py-3.5` (20px horizontal, 14px vertical)
- Surface gaps: `space-y-5` between bubbles
- Page margins: `px-6 sm:px-8` (max-width 4xl / 56rem)
- Section separation: `mt-10`, `mb-8`

---

## 3. Layout: Surface Wireframes

### 3.1 Home form

```
┌─────────────────────────────────────────────┐
│  Book Dialogues                  [Personas]  │  nav
├─────────────────────────────────────────────┤
│                                             │
│  Two books debate each other,                │
│  as if they were real people.                │
│                                             │
│  ┌─ Book 1 ──────────────────────────────┐  │
│  │  e.g., The Brothers Karamazov          │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  ┌─ Book 2 ──────────────────────────────┐  │
│  │  e.g., Beyond Good and Evil            │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  ┌─ Topic (optional) ────────────────────┐  │
│  │                                       │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  Max turns: [12]  (6–20)                    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │        Start Debate                 │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ───────── Past debates ─────────           │
│  Ivan Karamazov vs The Free Spirit · 12     │
│  Ivan Karamazov vs The Absurdist · 12       │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### 3.2 Preview modal

```
┌──────────────────────────────────────────────┐
│  Preview & Confirm                          ✕ │
│                                              │
│  ┌─────────┐          ┌─────────┐            │
│  │ Ivan    │          │ Free    │            │
│  │ Karama- │          │ Spirit  │            │
│  │ zov     │          │         │            │
│  │ [Deep]  │          │ [Deep]  │            │
│  └─────────┘          └─────────┘            │
│                                              │
│  ┌─ Debate topic ────────────────────────┐   │
│  │ Can justice coexist with...           │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  [Regenerate]  [Cancel]  [Confirm & Start]    │
└──────────────────────────────────────────────┘
```

### 3.3 Debate streaming view (core surface)

```
┌──────────────────────────────────────────────┐
│  Book Dialogues          Turn Counter  VIII/XII│  header
├──────────────────────────────────────────────┤
│                                              │
│  "Can the demand for justice coexist with    │  topic banner
│   the affirmation of suffering?"             │
│                                              │
│  ─ ╎ ╎ ╎ ╎ ╎ ╎ ╎ ╎╎ ╎ ╎ ─  ╎ ╎ ╎ ╎       │  ← ruled turn ledge
│                                              │
│  ┌─ Ivan Karamazov ──────────────────────┐   │
│  │  intro                                │   │  left-aligned (Persona A)
│  │                                       │   │
│  │  I find myself troubled by the...     │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ──────────────────── The Free Spirit ────┐   │
│  │  intro                                │   │  right-aligned (Persona B)
│  │                                       │   │
│  │  Ah, the familiar scent of...         │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ Ivan Karamazov ──────────────────────┐   │
│  │  A rather elegant framing...  ●       │   │  (streaming pulse)
│  └───────────────────────────────────────┘   │
│                                              │
│  [streaming indicator at bottom]              │
└──────────────────────────────────────────────┘
```

### 3.4 Persona gallery

```
┌──────────────────────────────────────────────┐
│  Book Dialogues                  [Personas]  │
├──────────────────────────────────────────────┤
│                                              │
│  Persona Gallery              ← Back to Home  │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Ivan     │ │ The Free │ │ The      │      │
│  │ Karamazov│ │ Spirit   │ │ Absurdist│      │
│  │          │ │          │ │          │      │
│  │ ● Deep   │ │ ● Deep   │ │ ● Deep   │      │
│  │ Char-dr. │ │ Voice-dr.│ │ Voice-dr.│      │
│  │ 3d ago   │ │ 5d ago   │ │ 3d ago   │      │
│  │          │ │          │ │          │      │
│  │ [Bk 1]   │ │ [Bk 1]   │ │ [Bk 1]   │      │
│  │ [Bk 2]   │ │ [Bk 2]   │ │ [Bk 2]   │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                              │
└──────────────────────────────────────────────┘
```

### 3.5 History viewer

Same chat-bubble layout as the debate stream (left/right alignment, same colors, same markdown). Differences:
- No streaming indicator
- No turn ledge (replaced by "Viewing completed debate" label)
- Export buttons (MD, JSON, Copy Link) in the header bar alongside a back button
- Persona names shown in subtitle below topic banner

---

## 4. Signature Element: The Turn Ledger

**The one aesthetic risk.** A ruled horizontal line across the debate page beneath the topic banner, marked with vertical ticks — one per turn in the debate. Completed ticks are filled (using `mark` red). The current turn is indicated by a small roman numeral in Spectral above its tick.

This makes the structured 12-turn format *legible as a format*. It says: *this is a formal encounter with a known architecture, not an infinite chat.*

**Failure mode:** If it reads as a styled progress bar, it gets reduced to a simple "Turn VIII / XII" in Spectral in the header — still distinctive, still communicates the format, but without the visual architecture. The risk is contained to one element and one CSS refactor.

---

## 5. Motion

Only where earned:

| Element | Animation | Timing | Trigger |
|---|---|---|---|
| Turn counter tick fill | Scale-in (0 → 1) on the vertical mark | 300ms ease-out | `turn-complete` SSE event |
| New bubble arrival | Fade + translateY(40px → 0) | 400ms ease-out | First appearance of each bubble (not streaming chunks) |
| Error banner | Slide up from below | 200ms ease-out | SSE error event or fetch failure |
| Preview modal entry | Fade + scale(0.97 → 1.0) | 250ms ease-out | Preview data received |

**No motion on:** RateIndicator state changes, skeleton loaders (keep current pulse), streaming chunk updates within a bubble. Respect `prefers-reduced-motion` — set `transition: none` for all animations when the user's system preference requests reduced motion.

---

## 6. Markdown Styling

Debate turn content passes through `Markdown.tsx` (react-markdown with remark-gfm). Currently bare. Apply these styles:

- **Bold / italic:** Geist bold / italic at the same size — no separate font loading needed (Geist has these weights natively)
- **Blockquotes:** Left border using `rule` color + `muted` text + italic. Compact padding (pl-4, py-1)
- **Inline code:** Geist Mono at 0.875em, `#F0EFEA` background, `mark` text, no border radius change from current
- **Code blocks:** Same as inline but block-level with `#F0EFEA` background and 12px horizontal padding
- **Lists:** Standard indent with `mark`-colored bullet markers
- **Paragraphs within bubbles:** `leading-relaxed` (already set) with `text-[15px]` at desktop, `text-sm` on mobile

---

## 7. Explicitly Deferred

| Item | Rationale |
|---|---|
| **Dark mode** | The warm paper-and-ink palette is inherently light-mode. Dark mode would need a separate color pass with cooled-down surfaces and inverted ink values. Doing it now would mean either (a) a half-assed `dark:` variant that looks worse than light, or (b) a full second identity that doubles the design surface. Both block progress on the light identity. Deferred to a dedicated second pass. |
| **Multi-persona debates (Feature 4)** | Out of scope. The linked "colors.ts" palette utility is not needed for 2-persona. Color differentiation is handled via position + typographic weight, not palette arrays. |

---

## 8. Build Order

1. **`globals.css`** — Replace zinc palette with `paper`, `ink`, `muted`, `rule`, `mark` CSS variables. Add base Spectral import.
2. **`layout.tsx`** — Add Spectral font loading via next/font/google. Apply new colors to nav header.
3. **`page.tsx`** (home) — Apply new color tokens, Spectral to wordmark, restyle form inputs, update past debates list.
4. **`debate/[id]/page.tsx`** — Add turn ledger component. Restyle bubbles (position/weight differentiation, paper/surface backgrounds). Add slide-in animation. Restyle topic banner.
5. **`personas/page.tsx`** — Apply new color tokens, Spectral to persona names, restyle cards.
6. **`history/[id]/page.tsx`** — Apply new colors, Spectral where appropriate, sync with debate page styling.
7. **`Markdown.tsx`** — Add custom styles for blockquotes, code, lists.
8. **Verify** — Navigate every surface, test streaming flow, check responsive, check reduced-motion.

---

## 9. Verification

Before declaring done:
- Run `npm run build` — zero errors
- Navigate each surface: home, preview modal, debate stream (in-progress and complete), persona gallery, history viewer
- Check responsive at 375px, 768px, 1024px
- Enable `prefers-reduced-motion` in dev tools — confirm no unwanted animations
- Take a screenshot of each surface. Review critically: does anything look like an unstyled default? Is there a moment that's actually memorable? Fix what doesn't hold up.
