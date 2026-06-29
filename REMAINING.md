# Remaining Work — Book Dialogues

> Tracking everything not yet implemented. This is a reference for future sessions.

---

## Priority 1: Multi-Persona Debates

The largest remaining feature — support 3+ books debating simultaneously. Build order from `PHASE_5.md`:

| Step | File(s) | What to do |
|------|---------|------------|
| **4.1** | `src/lib/debate/types.ts` | Add `personas: PersonaCache[]` to `DebateState`, update `SSEEvent.debate-meta`, deprecate `personaA`/`personaB` |
| **4.2** | `src/lib/debate/persistence.ts` | Backward-compat migration: old files without `personas` → extract from `personaA`/`personaB`. Update `DebateSummary.personaNames` |
| **4.3** | `src/lib/debate/orchestrator.ts` | N-persona turn logic: shuffled intro order, cycling debate turns, N reflections. Signature changes to accept `personas: PersonaCache[]` |
| **4.4** | `src/app/api/debate/start/route.ts` | Accept `{ personas: string[] }` (backward-compat with old `personaA`/`personaB`). Validate 2-5 titles, resolve in parallel |
| **4.5** | `src/app/api/debate/stream/route.ts` | Forward `state.personas` array to `runDebate()` instead of A/B |
| **4.6** | `src/app/api/debate/state/route.ts` | Return `personas` array alongside deprecated A/B fields |
| **4.7** | `src/app/api/debate/history/route.ts` | Return `personaNames: string[]` in summaries |
| **4.8** | `src/app/page.tsx` | Dynamic book inputs: "+ Add Book" button (max 5), per-input remove, re-numbering, N-title submission |
| **4.9** | `src/lib/colors.ts` (NEW) | Palette utility: amber, sky, emerald, violet, rose palettes with `getPalette(index)` |
| **4.10** | `src/app/debate/[id]/page.tsx` | N-persona bubble rendering — `personas` array, palette map, alignment logic (2 = left/right, 3+ = all left + color accent) |
| **4.11** | `src/app/history/[id]/page.tsx` | N-persona rendering, same palette approach as 4.10, backward-compat for old debates |

**Dependencies:** 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.9 → 4.10 → 4.8 → 4.11

---

## Priority 2: Dark Mode

Deferred in `DESIGN_PLAN.md` §7. The warm paper-and-ink palette (`#F7F6F2` paper, `#1C1817` ink) is inherently light-mode. Dark mode needs:

- Cooled-down surfaces (dark grays instead of warm paper)
- Inverted ink values (light text on dark backgrounds)
- A full `@media (prefers-color-scheme: dark)` block in `globals.css`
- `dark:` variants for all custom tokens (`dark:bg-paper-dark`, `dark:text-ink-dark`, etc.)
- Review every surface for dark-mode contrast

**Why deferred:** Doing it alongside the light redesign would double the design surface. The light identity needs to be locked first before inverting it.

---

## Priority 3: RAG Pipeline (Book Ingestion)

Described in `BUILD_PLAN.md` §4 and §7. Not started.

- PDF/EPUB upload → text extraction
- Chunking (500 tokens, 50-token overlap, paragraph-bound)
- Embeddings via `text-embedding-004` → vector storage
- Retrieval during debate turns to ground responses in actual text
- Citation support in UI

**When needed:** For obscure books the model doesn't know, or when citation faithfulness is required. Current parametric-knowledge approach works for well-known books.

---

## Appendix: Design Plan Deferrals (DESIGN_PLAN.md §7)

- Dark mode (→ Priority 2 above)
- Multi-persona debates (→ Priority 1 above)
- `src/lib/colors.ts` palette utility (covered in 4.9 above)
