# Story 13: Idea Needs Refinement — Manager Requests More Info

## Loop
Ideas Loop

## Description
An agent creates a vague `idea` issue. The PM routes it to the product-owner, who needs more information before deciding. The product-owner asks the creator for clarification via a comment on the idea. The PM sees the "needs refinement" decision and resets the idea for re-triage later.

## Initial Conditions

- **agentrack state:**
  - Issue #100: "Make the UI more responsive" — status: `idea`, created by `webapp-developer`, assignee: none
  - No other issues matching "responsive" or "UI" in status `idea`, `todo`, `in-progress`, or `closed` with `idea` tag

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Relevance |
|---|---|
| `product-owner` | **Product decision-maker** — reviews the idea and decides if it needs more info |
| `webapp-developer` | Source of the idea — the product-owner may ask them for specifics |

## User Story

1. The PM picks up Issue #100 from the ideas queue.
2. The PM checks for duplicates — none found.
3. The PM determines: this is a product-related idea (UI improvement) → route to product-owner.
4. The PM creates a review task for the product-owner + sync tracker for itself.
5. The product-owner needs more info and asks the creator for clarification.
6. The PM sees the "needs refinement" decision and resets the idea for future re-triage.

## Expected Output

### Phase 1: Routing

The PM should:

1. View Issue #100 and determine routing type (technical vs product, creator identity)
2. Search for duplicates: list issues with status `idea`, `todo`, `in-progress`, and `closed` with `idea` tag matching "responsive" or "UI" → no duplicates found
3. Determine routing: the idea is product-related (UI/UX improvement) → route to `product-owner`
4. Create review children:
   ```
   Issue #100: "Make the UI more responsive" (status: in-progress, assigned: project-manager)
   ├── Task: "Review: Make the UI more responsive" (tag: task, assigned: product-owner, status: todo)
   └── Task: "Check review decision on responsive UI idea" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by review task
   ```
5. Add a comment: "Routed to product-owner for product decision. This is a product/UX idea."

### Phase 2: Product Owner Reviews

6. Work loop picks up the review task, wakes `product-owner`
7. Product-owner reviews, finds it too vague
8. Product-owner adds comment mentioning the creator: "@webapp-developer I like the direction but need more specifics. Which pages need responsive improvements? Are we targeting mobile, tablet, or both? What's the expected user impact?"
9. Product-owner marks review task as `done` with decision: "needs refinement"
10. System auto-resolves blockage on sync tracker

### Phase 3: PM Acts on Decision

11. Work loop picks up sync tracker, wakes PM
12. PM reads product-owner's comment → decision: **needs refinement**
13. PM marks sync tracker as `done`
14. PM resets Issue #100:
    - Status → `idea` (so it can be picked up again in a future ideas loop cycle)
    - Keep assignee as `project-manager`
    - Add comment: "Product-owner needs more details from @webapp-developer. Resetting to `idea` status. Will re-triage once the creator responds with specifics."
15. PM does NOT create any implementation children

### What happens next (not part of this story)

16. `webapp-developer` responds to the product-owner's question with specifics (e.g., "Target: mobile breakpoints for the dashboard and issue list pages")
17. Next ideas loop cycle, PM picks up Issue #100 again (it's back in `idea` status)
18. PM checks for duplicates again → none found
19. PM routes to product-owner again for a fresh review with the new information
20. Product-owner can now make a decision: accept or discard

**Key behaviors:**
- The PM doesn't evaluate the idea or ask questions — it routes to the right manager
- The manager (not the PM) asks the creator for clarification via comments on the idea
- When a manager says "needs refinement", the PM resets the idea to `idea` status for re-triage later
- The idea will be re-triaged in a future ideas loop cycle after the creator responds
- The PM doesn't discard vague ideas — it gives them a chance to be refined

## Notes
- This is the middle ground between accepting (Story 11) and discarding (Story 12)
- The manager drives the refinement — the PM just routes and resets
- If the creator never responds, the idea stays in `idea` status indefinitely (the PM might eventually discard it after multiple stale cycles)
- The refinement cycle can repeat: manager asks → creator answers → PM re-routes → manager reviews again → accepts or discards
