# Story 18: Empty Work Queue — Nothing to Do

## Loop
Work Loop

## Description
The PM is awakened but there's nothing to do — no `todo` issues, no `idea` issues, no stuck issues. Everything is either `done` or `closed`.

## Initial Conditions

- **agentrack state:**
  - All existing issues are `done` or `closed`
  - No `idea` or `todo` issues
  - No `in-progress` issues that need attention

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

All agents are available — no work pending.

## User Story

1. The PM is awakened for a work loop check.
2. The PM finds nothing to do.
3. The PM reports the idle state and waits.

## Expected Output

The PM should:

1. Report: "All work is complete. No pending issues, ideas, or stuck tasks. All 7 team agents are available and idle. Standing by for new requests."
2. Do NOT create busywork or unnecessary issues
3. Do NOT invent features or tasks that nobody asked for

**Key behaviors:**
- The PM gracefully handles idle states
- It doesn't invent work when there's nothing to do
- It reports the state clearly so stakeholders know the system is idle
- It waits for new input (a feature request, an idea, etc.)

## Notes
- This tests that the PM doesn't loop infinitely or crash when idle
- A healthy idle state means the team is well-coordinated — all work is flowing
- The PM might note that the full team is available — useful context for when new work arrives
- If the PM has expertise about common next steps or pending roadmap items, it might suggest them (but not create issues for them)
