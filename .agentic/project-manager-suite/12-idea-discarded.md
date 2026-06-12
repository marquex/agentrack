# Story 12: Idea Discarded — Product Idea Rejected by Product Owner

## Loop
Ideas Loop

## Description
A worker agent creates a product-related `idea` issue. The PM checks for duplicates, finds none, and routes it to the product-owner for approval. The product-owner rejects it. The PM closes the idea with documentation.

## Initial Conditions

- **agentrack state:**
  - Issue #90: "Replace agentrack with Jira integration" — status: `idea`, created by `library-developer`, assignee: none
  - No other issues matching "Jira" or "integration" in status `idea`, `todo`, `in-progress`, or `closed` with `idea` tag

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Relevance |
|---|---|
| `product-owner` | **Product decision-maker** — decides if product-related ideas align with product direction |
| `library-developer` | Source of the idea |

## User Story

1. The PM picks up Issue #90 from the ideas queue.
2. The PM checks for duplicates — none found.
3. The PM determines: this is a product-related idea (it proposes replacing the product itself) → route to product-owner.
4. The PM creates a review task for the product-owner + sync tracker for itself.
5. The product-owner rejects the idea.
6. The PM closes the idea with discarded tags and a comment.

## Expected Output

### Phase 1: Routing

The PM should:

1. View Issue #90 and determine routing type (technical vs product, creator identity)
2. Search for duplicates: list issues with status `idea`, `todo`, `in-progress`, and `closed` with `idea` tag matching "Jira" or "integration" → no duplicates found
3. Determine routing: the idea is product-related (it proposes changing what the product IS) → route to `product-owner`
4. Create review children:
   ```
   Issue #90: "Replace agentrack with Jira integration" (status: in-progress, assigned: project-manager)
   ├── Task: "Review: Replace agentrack with Jira integration" (tag: task, assigned: product-owner, status: todo)
   └── Task: "Check review decision on Jira idea" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by review task
   ```
5. Add a comment: "Routed to product-owner for product decision. This idea proposes changing the product direction."

### Phase 2: Product Owner Reviews

6. Work loop picks up the review task, wakes `product-owner`
7. Product-owner reviews, adds comment: "Discard. Agentrack exists because Jira and similar tools don't fit AI agent workflows. Replacing it contradicts the project's core purpose. However, the pain point is real — we should consider adding Jira export as a feature instead."
8. Product-owner marks review task as `done`
9. System auto-resolves blockage on sync tracker

### Phase 3: PM Acts on Decision

10. Work loop picks up sync tracker, wakes PM
11. PM reads product-owner's comment → decision: **discarded**
12. PM marks sync tracker as `done`
13. PM closes Issue #90:
    - Status → `closed`
    - Tags → `idea,discarded`
    - Comment: "Discarded per product-owner decision. The idea contradicts the project's core purpose. Product-owner suggests considering 'Add Jira export' as an alternative."
14. PM does NOT create any implementation children

**Key behaviors:**
- The PM does NOT evaluate the idea — it routes to the product-owner
- Product-related ideas go to `product-owner`; technical ideas go to team lead
- The PM creates a review task + sync tracker, same pattern as other work
- If discarded, the PM closes the issue with `idea,discarded` tags and a comment explaining why
- The closed issue stays searchable for future reference
- If the same idea comes up again, the PM can reference the previous decision

## Notes
- The PM doesn't make product decisions — that's the product-owner's job
- The product-owner's rejection includes useful context ("consider Jira export instead") — the PM doesn't act on this automatically but it's documented
- If `library-developer` later creates "Add Jira export" as a new idea, the PM would treat it as a fresh idea (route to product-owner for review)
- Ideas created by the product-owner are auto-accepted — no review needed
