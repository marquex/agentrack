# Webapp known gaps (pre-existing failures)

## When To Use This

"phase 1 header test fails", "phase 2 detail page test fails", "phase 3 comments test fails", "pre-existing failures", investigating a failing webapp test that is not caused by the current task.

## Mental Model

As of 2026-06-14, **7 e2e failures** were documented on a clean baseline (no Phase 4 changes applied) — Phase 1-3 issues, not Phase 4 — discovered and proven pre-existing via a `git stash` baseline comparison while completing Phase 4. A separate set of **intermittent frontend flaky tests** also existed (different root cause, now resolved — see below).

> ⚠️ **"Consistent" claim is now in doubt:** during the `mqe1uwxw8c` flake-stabilization work (2026-06-14), the full serial suite was run 4 times and **all 152 tests passed every run** — including the 7 listed below, with zero failures. So these 7 are likely **not truly consistent**; they may be intermittent/environment-dependent rather than always-failing. Re-verify their current status before assuming they will fail (see Gaps below).

Tracking issues:
- **`mqdzlo4ia8`** ("Fix pre-existing Phase 1-3 e2e test failures", status `idea`, assigned to project-manager, priority 3, tags `webapp,bug`) — the 7 consistent failures below.
- **`mqe1drwrck`** ("Investigate flaky frontend e2e tests", status `idea`, assigned to project-manager, priority 3) — the intermittent frontend flaky tests below.

> Note: the previous "8th flaky backend test" (defaults status to 'idea' / search is case-insensitive) was **resolved** on 2026-06-14 by serializing the suite (`workers: 1`). It is no longer a gap. See [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md).

## The consistent failures

1. **phase1: `renders the agentrack header`** — test calls `getByRole("heading", { name: /agentrack/i })`, but `agentrack` is rendered as a `link` in the Header, not a heading. The only `<h1>` on the issues page is the page title ("Issues").
2. **phase2: `navigates from list to detail page`** — expects `getByText("Back to issues")` visible; `IssueDetailPage` only renders that link in the error/not-found branch, not the main render path.
3. **phase2: `navigates back from detail to list`** — same "Back to issues" issue.
4. **phase2: `displays issue title and ID`** — detail-page rendering.
5. **phase2: `inline edit title`** — detail-page rendering.
6. **phase3: `displays empty state when no comments`** — comments section.
7. **phase3: `adds a comment via the form`** — comments section.

(Previously an 8th — a flaky backend POST test — was listed here. It is now **resolved** by serialization; see the note in the Mental Model above.)

## Intermittent frontend flaky tests (RESOLVED 2026-06-14)

These pass in isolation and surfaced only variably across full-suite runs. Different root cause than the (now-fixed) backend concurrency flakiness — these were frontend timing/interaction issues. Tracked in **`mqe1drwrck`** → implementation child **`mqe1uwxw8c`**. **Both are now fixed and verified stable across 4 full serial-suite runs (152 passing each).**

- **phase3: `Frontend: Parent Selector › changes an existing parent`** (`phase3-validation.spec.ts:~1287`) — **fixed.** Root cause confirmed: the `waitForResponse` was attached AFTER `searchInput.fill()` with a loose matcher (`url.includes("search=")`), a classic attach-order race that could miss an already-fired response or latch onto a stale/unrelated search response (worse once >100 issues clutter the index). Fix: set up `waitForResponse` BEFORE the fill, and scope the matcher to the exact search term via `new URL(resp.url()).searchParams.get("search") === "New Parent"` (also pins the method to GET).
- **phase3: `Frontend: Parent Selector › sets a parent via search and selection`** (`phase3-validation.spec.ts:~1235`) — **same defect, fix in progress.** This *second* sibling test in the same describe was missed by the `mqe1uwxw8c` fix. Confirmed in plan task **`mqgzjnns95`** (2026-06-16): identical attach-order anti-pattern (fill first, `waitForResponse` after, loose matcher). Dev fix tracked in **`mqgzjuwgpw`** — mechanical: hoist the response promise above `searchInput.fill("Set Parent Target")`, scope matcher to GET + `/api/issues` + `searchParams.get("search") === "Set Parent Target"`. Once `mqgzjuwgpw` lands, this entry can be marked resolved.
- **phase4: `Frontend: Copy Token › copy button changes to check icon after register`** (`phase4-validation.spec.ts:~748`) — **fixed.** Root cause confirmed: the suite granted NO clipboard permission, so `handleCopyToken`'s unguarded `navigator.clipboard.writeText()` could throw under headless Chromium and abort before `setTokenCopied(true)`, so the check icon never appeared (compounded by a short 3000ms assertion timeout). Fix: `test.use({ permissions: ["clipboard-read", "clipboard-write"] })` on the describe, and bumped the check-icon assertion timeout 3000ms → 5000ms.

## Likely root causes (to verify in code when working on this)

- `IssueDetailPage` is missing a "Back to issues" link in its main render path (only present in the error branch). Several Phase 2/3 failures trace back to the detail page.
- The Header wordmark is a link, not a heading; Phase 1 expects a heading. Either the test or the Header needs to align.

## Related Topics

- [webapp-frontend-layout.expertise.md](webapp-frontend-layout.expertise.md): the "Back to issues" / AppLayout conventions these tests enforce.
- [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md): how to reproduce/compare these failures.

## Timeline

- 2026-06-14: Identified during Phase 4 validation. Proven pre-existing via `git stash` baseline comparison (same 7-8 failures with and without Phase 4 changes). Follow-up issue `mqdzlo4ia8` created.
- 2026-06-14: Backend flaky test (the old "8th" failure) resolved by serializing the suite (`mqe0745gy7`). Remaining consistent failures drop to 7. Separately discovered two intermittent frontend flaky tests (parent-selector, copy-token) — filed `mqe1drwrck`.
- 2026-06-14: Both intermittent frontend flaky tests resolved in implementation `mqe1uwxw8c` (attach-order + clipboard-permission fixes). Verified stable across 4 full serial-suite runs (152 passing each). The `mqe1drwrck` family is complete.
- 2026-06-16: Plan task `mqgzjnns95` confirmed the `mqe1uwxw8c` parent-selector fix only covered ONE of two sibling tests. The other ("sets a parent via search and selection", `phase3-validation.spec.ts:~1235`) has the same unfixed anti-pattern. Dev fix tracked in `mqgzjuwgpw`. Added as a new gap entry above (in progress).

## Gaps And Validation Needs

- These root-cause notes were inferred from test names and error context during the Phase 4 session; they were not fixed there (out of scope). Verify against the actual `IssueDetailPage.tsx` and `Header.tsx` code before implementing fixes.
- ~~The intermittent frontend flaky tests' root causes were inferred from error output during the `mqe0745gy7` validation runs — verify in code before fixing.~~ **Done — verified and fixed in `mqe1uwxw8c` (2026-06-14).** Root causes confirmed against the actual code (`ParentSelector.tsx`, `UsersPage.tsx`, `use-issues.ts`, `api/issues.ts`).
- **Re-verify the "7 consistent failures"** before acting on them: the `mqe1uwxw8c` validation ran the full serial suite 4× (2026-06-14) and **all 152 tests passed every run**, including the 7 below. They were "consistent" in the Phase 4 baseline comparison but did not reproduce later — so they may be intermittent or sensitive to e2e-data state/order. If they fail again, capture the specific run conditions; if they keep passing, consider closing `mqdzlo4ia8` or downgrading it.
- When issue `mqdzlo4ia8` is resolved, update or remove the consistent-failures section. The intermittent section is resolved — no longer a gap.
