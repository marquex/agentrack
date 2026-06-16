# URL-driven dashboard filtering

## When To Use This

"validate URL filtering", "dashboard filter URL params", "deep-link filters", "status search assignee URL", "open meta-status", "bookmark issue filters", "url-filters-validation spec".

## Mental Model

The Issues dashboard reads its filters from the browser URL (search params) so that every filter state is bookmarkable and shareable. Routing/state lives in `frontend/src/hooks/use-issue-filters.ts` (built on React Router's `useSearchParams`); the filter controls live in `frontend/src/components/issues/IssueFilters.tsx`; the API call is assembled in `frontend/src/api/issues.ts`.

### How filter state flows

- Filter controls (status, search, assignee) → update URL search params via `use-issue-filters.ts` → the issues query reads params → calls `GET /api/issues?status=...&search=...&assignee=...`.
- **Search is debounced** (~250ms) before hitting the API / URL.
- Every filter change uses `replace: false` (push), so debounced search typing creates multiple history entries (minor UX note, not a spec violation).

### The `open` meta-status (default view)

- The default view (no `?status=` param) shows **Open** issues.
- The backend `open` meta-status is **not** a clean "todo + in-progress + done" set: it returns `todo`, `in-progress`, `done`, AND `idea` in some configurations. The **frontend filters `idea` out client-side** in `api/issues.ts`, so the visible default view excludes idea and closed.
- `idea` and `closed` are only shown when the user explicitly selects those statuses via `?status=idea` / `?status=closed`.

### Verified behaviors (2026-06-16 validation, issue mqguhe7eyw)

All PASS via code analysis + E2E:
- Default view (no params) → Open only (todo/in-progress/done); idea & closed excluded.
- Selecting Idea / Closed / Todo writes the corresponding `?status=` value and shows only those issues.
- Status, search, and assignee controls all update URL params.
- Bookmarking a URL with params applies filters on load (including combined `status` + `search`).
- Clearing filters strips all params and returns to the default Open state in the URL.

### E2E coverage

- Spec: `packages/webapp/e2e/url-filters-validation.spec.ts` — **12 tests** covering default view, deep-linking, control→URL sync, and clear-filters. All pass.
- No unit/component test framework exists in the webapp; coverage lives at the E2E layer.
- **Leak warning:** the `seedIssues()` helper in this spec (around lines 40–62) POSTs directly to `http://localhost:3001/api/issues` with `assignee: "webapp-validator"` and title `UrlFilter<Status>-${Date.now()}-${random}`. If those POSTs ever hit a backend without the `AGENTRACK_CWD` isolation override, they write into the **real** `.agentrack/` tracker. This is exactly what happened on 2026-06-16 — 50 leaked `UrlFilter*` issues were found in production data. See [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md) for the full incident and the cleanup/prevention guard (idea `mqh0su9kgq`).

## Known Defect (cosmetic, reported separately)

- Idea `mqgxk7rj2a`: the **Status filter dropdown trigger** renders the RAW status value (e.g. `closed`, `in-progress`, `todo`) instead of the human-readable label (`Closed`, `In Progress`, `Todo`). The `STATUS_OPTIONS` labels are defined correctly but the `@base-ui/react` `Select.Value` is used without a children render/matcher to map value→label. Filtering behavior is correct; impact is cosmetic only.

## Related Topics

- [webapp-overview.expertise.md](webapp-overview.expertise.md): webapp stack, build/test commands, e2e spec layout.
- [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md): the pre-existing BUG-2 sync test failures that surfaced during this validation's full-suite run.
- [webapp-validator-gotchas.md](webapp-validator-gotchas.md): manual `agt` CLI testing against `.e2edata` is unreliable — rely on code analysis + E2E instead.

## Timeline

- 2026-06-16: Validated URL-driven dashboard filtering (mqguhe7eyw). All requirements PASS. Added `url-filters-validation.spec.ts` (12 tests). Filed cosmetic dropdown-label defect as idea `mqgxk7rj2a`. Full-suite run showed 170 passed / 4 failed; the 4 failures are the stale BUG-2 sync tests, indicating BUG-2 has likely been fixed.
- 2026-06-16: The `seedIssues()` helper in this spec was confirmed as the source of 50 leaked `UrlFilter*` issues in the real `.agentrack/` (assigned issue `mqh0lg9d2i` was one of them). Cleanup + prevention tracked in idea `mqh0su9kgq`. See [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md).

## Gaps And Validation Needs

- The `open` meta-status membership was inferred from CLI/API probing and reading `api/issues.ts`; the library-side definition of `open` lives in `packages/library/` which this agent cannot read. If the exact `open` status set matters, re-verify in `api/issues.ts` and the library source.
- The `replace: false` history-entry observation is not a tracked issue; if it becomes one, link it here.
