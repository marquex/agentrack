# Story 08: Parent In-Progress but No Children Being Worked

## Loop
Project Status Loop

## Description
A parent issue (Feature, Epic, or Initiative) is `in-progress` but none of its child issues are being actively worked on. The PM must investigate why by checking the active blockages on the children.

## Initial Conditions

- **agentrack state:**
  - Issue #50 (Feature): "Add user authentication" — status: `in-progress`, assignee: `project-manager`
  - Issue #51 (Task): "Plan auth system" — status: `done`, assignee: `library-architect`
  - Issue #52 (Task): "Implement auth system" — status: `todo`, assignee: `library-developer`, blocked by #51
  - Issue #53 (Task): "Validate auth system" — status: `todo`, assignee: `library-validator`, blocked by #52
  - Issue #54 (Task): "Release auth system" — status: `todo`, assignee: `library-releaser`, blocked by #53
  - Issue #51 was `done` hours ago
  - Issue #52 is `todo` but `library-developer` is available and not working on anything
  - The work loop should have picked up #52, but something went wrong

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Current state |
|---|---|
| `library-architect` | Idle — completed #51 |
| `library-developer` | Available but not picked up by work loop — should be working on #52 |
| `library-validator` | Blocked — waiting for #52 |
| `library-releaser` | Blocked — waiting for #53 |

## User Story

1. The PM checks in-progress parents and finds #50 has no children being actively worked.
2. The PM checks the children: which are `todo`, which are blocked, what are the blockages.
3. The PM determines if this is a real problem or just a timing gap.

## Expected Output

The PM should:

1. View Issue #50 and list its children
2. Find that NO child is `in-progress` — all are either `done` (#51) or `todo` (#52, #53, #54)
3. For each `todo` child, check its blockages:
   - #52 is blocked by #51 — but #51 is `done`. Blockage should be resolved. → **This is the problem.**
   - #53 is blocked by #52 — #52 is still `todo`. This is expected.
   - #54 is blocked by #53 — #53 is still `todo`. This is expected.
4. Check that #52's assignee (`library-developer`) is a valid agent and exists — yes, it does.
5. Conclusion: #52 is `todo`, blockages are resolved, assignee is valid. The work loop should pick it up. This may just be a timing gap — the PM should wait and check again next cycle.
6. If after another cycle #52 is still not picked up, the PM should investigate further (is the agent overloaded? is there a work loop issue?).

**Key behaviors:**
- The PM checks **blockages on children**, not phases or agent roles
- The decision logic is:
  - **No blockages + valid assignee** → OK, work loop should pick it up. Wait.
  - **Blockages that should be resolved** → Fix the blockages (see Story 09)
  - **All children blocked legitimately** → OK, waiting on upstream work. Nothing to do.
  - **Invalid assignee** (agent doesn't exist, removed, etc.) → Reassign.
  - **No blockages + valid assignee + still stuck after multiple checks** → Escalate, add a comment, or reassign.

## Notes
- The PM doesn't reason about phases — it just checks if children are blocked and if assignees are valid
- The PM should distinguish between "legitimately blocked" (upstream not done) and "stuck" (should be unblocked but isn't)
- If the issue persists across multiple status checks, the PM should add a comment and potentially reassign
- **Status loop context** — the PM may need to reassign or add comments to unblock, but should avoid directly changing statuses unless the issue is clearly stuck.
