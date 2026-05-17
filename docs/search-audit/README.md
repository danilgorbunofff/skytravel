# Search Page Audit — Implementation Docs

These documents implement the audit defined in [`SEARCH_PAGE_AUDIT_PROMPT.md`](../../SEARCH_PAGE_AUDIT_PROMPT.md). They are written for the senior engineer who will pick up the work — every item has a problem statement, root cause, approach, concrete steps, verification recipe, and known risks.

## Phases

| # | Phase | Focus | Ship before next phase? |
|---|---|---|---|
| 1 | [Critical Blockers](./phase-1-critical-blockers.md) | Pagination, race conditions, mobile drawer, validation, reset state, silent failures | **Yes** |
| 2 | [High-Impact UX & Accessibility](./phase-2-high-impact-ux.md) | Chips, presets, focus trap, slider feel, full i18n | **Yes** |
| 3 | [Code Quality & Polish](./phase-3-code-quality.md) | Dedup helpers, memoization, empty states, dead code | **Yes** |
| 4 | [Enhancements & Nice-to-Haves](./phase-4-nice-to-haves.md) | Share button, responsive images, mobile pager, sort options | Opt-in |

## Working agreement

- One PR per phase. Phases are atomic — don't cherry-pick items across PRs.
- Every PR description links the phase doc and copies the "Verification" checklist into a task list.
- No new runtime dependencies without explicit approval from the maintainer (see [.github/copilot-instructions.md](../../.github/copilot-instructions.md)).
- All file links here are workspace-relative; clicking them in VS Code jumps directly to the target.

## Architectural decisions (locked)

These were debated in the planning round and are not re-litigated inside individual phase docs:

1. **Component-local state** for public search remains. The Zustand `searchStore` and `useProviderTours` hook are reserved for admin flows. (Documented in Phase 3 #20.)
2. **i18n scope** for this audit is *only* `/search`. Other public pages are translated in separate workstreams.
3. **No focus-trap library**. We implement the trap with native event handling (Phase 2 #9).
4. **Bootstrap cache TTL** stays at 5 min — out of scope to change without telemetry.
5. **Number formatting** stays on `cs-CZ` regardless of UI language; this matches market convention.

## Verification baseline

Before starting Phase 1, capture these metrics on `main`:

- Lighthouse Accessibility score on `/search` (desktop + mobile).
- Performance score and LCP value on `/search`.
- Manual smoke-test recording of: search → filter → paginate → open detail → close → reset.

Re-run after each phase and compare. Targets:

- Phase 1: no regression in metrics; manual flow no longer broken.
- Phase 2: a11y score ≥ baseline + 5.
- Phase 3: no regression; ESLint warnings → 0.
- Phase 4: LCP improvement after item 22.
