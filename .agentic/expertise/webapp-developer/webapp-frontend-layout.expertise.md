# Webapp frontend pages and layout

## When To Use This

"add a page", "change the header", "layout is broken", "duplicate header", "AppLayout", "breadcrumbs", "page title", "Back to issues link", strict-mode Playwright violations on header elements.

## Mental Model

**Layout convention: each page renders its own `<AppLayout>`.** Pages pass `pageTitle` and optional `breadcrumbs` props to `AppLayout`, which renders the shared `Header` (nav links, sync Push/Pull controls, last-sync timestamp) plus the page title/breadcrumbs around the page's children.

`App.tsx` wires routing only:

```tsx
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<IssuesPage />} />
      <Route path="/issues/:id" element={<IssueDetailPage />} />
      <Route path="/users" element={<UsersPage />} />
    </Routes>
  </BrowserRouter>
</QueryClientProvider>
```

Pages: `IssuesPage`, `IssueDetailPage`, `UsersPage`. Each returns `<AppLayout pageTitle="..." breadcrumbs={...}>...</AppLayout>`.

## Critical invariant: do not double-wrap AppLayout

`App.tsx` must NOT wrap `<Routes>` in `<AppLayout>`. Every page already renders its own `AppLayout`. Wrapping at both levels nests two `AppLayout`s and produces:

- Two `agentrack` title links → Playwright `getByRole("link", { name: /agentrack/i })` strict-mode violation.
- Two sets of sync Push/Pull buttons → `getByRole("button", { name: /Push/ })` strict-mode violation.

This was a real bug fixed in the Phase 4 session (2026-06-14): the redundant `<AppLayout>` wrapper was removed from `App.tsx`. If a future change re-introduces a global layout wrapper, page-level `AppLayout`s must be removed at the same time — pick one level, not both. Prefer the per-page pattern because `pageTitle`/`breadcrumbs` differ per route.

## Cross-page navigation links

Cross-page navigation tests expect explicit "Back to issues" links on secondary pages. `UsersPage` must render a link to `/` with text matching `/Back to issues/` (pattern: `<Link to="/">…Back to issues</Link>` with an `ArrowLeft` icon). Do not rely on breadcrumbs alone for this — the tests look for the literal "Back to issues" link.

`IssueDetailPage` is expected to show a "Back to issues" link in its main render path too (see known gaps — it currently only renders it in the error/not-found branch).

## Related Topics

- [webapp-overview.expertise.md](webapp-overview.expertise.md): where files live and how to build.
- [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md): tests that enforce these conventions.
- [webapp-known-gaps.expertise.md](webapp-known-gaps.expertise.md): pre-existing detail-page/header test failures.

## Timeline

- 2026-06-14: Removed redundant `AppLayout` wrapper from `App.tsx` and added "Back to issues" link to `UsersPage` while completing Phase 4. Root cause of 10 Phase 4 e2e failures was the double-`AppLayout` nesting.

## Gaps And Validation Needs

- `IssueDetailPage` only renders "Back to issues" in the error branch; the main render path is missing it (Phase 2 tests expect it). Tracked in [webapp-known-gaps.expertise.md](webapp-known-gaps.expertise.md).
- The `agentrack` wordmark is a link, not a heading; Phase 1 expects a heading (see known gaps).
