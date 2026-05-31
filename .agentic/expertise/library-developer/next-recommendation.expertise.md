# Next Issue Recommendation

## When To Use This

Tasks involving the `next` command or Tracker.next() method. "Recommend next issue", "change next algorithm", "next command output", "NO_ISSUES_AVAILABLE".

## Mental Model

`Tracker.next(assignee)` recommends the best issue to work on for a given user. The algorithm:

1. **Filter** index.open by assignee match + actionable statuses (idea, todo, in-progress)
2. **Exclude** issues with any active blockages
3. **Sort** by priority ASC → impact DESC → id ASC
4. **Take** top candidate, replay events, return ComputedIssue

If no candidates match, returns `{ result: 'NO_ISSUES_AVAILABLE', message: string }`.

The `NextResult` type is a discriminated union: `ComputedIssue | { result: 'NO_ISSUES_AVAILABLE'; message: string }`. Check for the `'title'` property to distinguish.

The sort comparator needs synchronous access to impact scores, which requires `readDependenciesSync()` (a private sync helper in tracker.ts that reads dependencies.json via readFileSync).

## Code Map

- `src/core/tracker.ts` — next(assignee) method, readDependenciesSync private helper
- `src/types/api.ts` — NextResult type
- `src/cli/commands/next.ts` — CLI action handler
- `src/index.ts` — barrel export of NextResult
- `tests/core/tracker/tracker-next.test.ts` — unit tests
- `tests/e2e/next.test.ts` — e2e tests

## Related Topics

- [dependencies-blockages.expertise.md](dependencies-blockages.expertise.md): blockage filtering and impact score
- [hierarchy-status.expertise.md](hierarchy-status.expertise.md): status ordering used in filtering

## Business Rules And Invariants

- Only issues with statuses: idea, todo, in-progress are considered "actionable"
- Blocked issues are always excluded from candidates
- Priority ASC means lower number = higher priority = recommended first
- Impact DESC means higher blocked-issue count = recommended first (unblock more people)

## Gaps And Validation Needs

- next-todo-only spec reviewed but NOT implemented — current behavior includes idea and in-progress statuses. Spec proposed restricting to todo only. See spec-reviews.
- Default create status is "idea" — newly created issues won't appear in next if restricted to todo only
