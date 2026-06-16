# Story 16: Agent Creates Out-of-Scope Idea While Working

## Loop
Ideas Loop (triggered during Work Loop)

## Description
While working on an issue, an agent creates a new `idea` issue for work they noticed needs doing but is outside their current scope. The PM picks this up in the ideas loop, checks for duplicates, and routes it to the product-owner for a decision — this is a product/UX idea, not a backend architecture idea.

## Initial Conditions

- **agentrack state:**
  - Issue #130: "Implement checkout screen" — status: `in-progress`, assignee: `android-developer` (active work)
  - Issue #131: "Add screen reader support to all screens" — status: `idea`, created by `android-developer`, no assignee
    - Comment from developer: "While implementing the checkout screen, I noticed none of our screens have proper content descriptions for screen readers. Adding accessibility support across the app would make it usable for visually impaired users."
  - No other issues matching "screen reader" or "accessibility" in status `idea`, `todo`, `in-progress`, or `closed` with `idea` tag

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Relevance |
|---|---|
| `android-developer` | Source of the idea — currently working on #130, has first-hand knowledge of the missing accessibility support |
| `product-owner` | **Product decision-maker** — decides if this UX/product idea aligns with product direction |
| `android-validator` | Would test accessibility — thorough accessibility testing across screens requires specialized validation |

## User Story

1. The PM is awakened for ideas triage.
2. The PM finds the new `idea` Issue #131.
3. The PM checks for duplicates → none found.
4. The PM determines: this is a product/UX idea (accessibility is a product decision affecting all users) → route to `product-owner`.
5. The product-owner decides whether to accept, park, or discard.

## Expected Output

### Phase 1: Routing

The PM should:

1. View Issue #131 and determine routing type (technical vs product, creator identity)
2. Search for duplicates: list issues with status `idea`, `todo`, `in-progress`, and `closed` with `idea` tag matching "screen reader" or "accessibility" → no duplicates found
3. Determine routing: the idea is a product/UX decision (accessibility affects all users, changes scope across the entire app) → route to `product-owner`
4. Create review children:
   ```
   Issue #131: "Add screen reader support to all screens" (status: in-progress, assigned: project-manager)
   ├── Task: "Review: Add screen reader support to all screens" (tag: task, assigned: product-owner, status: todo)
   └── Task: "Check review decision on screen reader accessibility idea" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by review task
   ```
5. Add a comment: "Routed to product-owner for product decision. This is a product/UX idea — accessibility affects all users and changes scope across the entire app."

### Phase 2: Product Owner Reviews

6. Work loop picks up the review task, wakes `product-owner`
7. Product-owner reviews, adds comment: "Good idea — accessibility is important and we should support it. However, adding screen reader support to ALL screens is a large effort. Accept as low priority. Recommend starting with the most-used screens (home, product list, checkout) and expanding from there."
8. Product-owner marks review task as `done`

### Phase 3: PM Acts on Decision

9. Work loop picks up sync tracker, wakes PM
10. PM reads product-owner's comment → decision: **accepted, low priority**
11. PM marks sync tracker as `done`
12. PM tags Issue #131 as `chore` (technical improvement, no new user-facing feature — accessibility is an enhancement to existing features)
13. PM creates implementation children:
    ```
    Issue #131: "Add screen reader support to all screens" (tag: chore, status: in-progress, assigned: project-manager)
    ├── Task: "Review: ..." (status: done)
    ├── Task: "Check review decision" (status: done)
    ├── Task: "Plan screen reader support for priority screens" (tag: task, assigned: android-developer, status: todo, phase: planning)
    ├── Task: "Implement screen reader support for priority screens" (tag: task, assigned: android-developer, status: todo, phase: development)
    │   └── Blocked by "Plan" task
    ├── Task: "Polish screen reader labels and announcements" (tag: task, assigned: android-designer, status: todo, phase: styling)
    │   └── Blocked by "Implement" task
    ├── Task: "Validate screen reader support across screens" (tag: task, assigned: android-validator, status: todo, phase: validation)
    │   └── Blocked by "Polish" task
    ```
14. The agent who created the idea (`android-developer`) continues with their original work (#130) undisturbed — the accessibility tasks are queued behind existing work

**Key behaviors:**
- The PM does NOT evaluate the idea — it routes to the product-owner
- The PM encourages agents to capture ideas by routing them promptly
- The product-owner (not the PM) assesses scope, priority, and product alignment
- The idea is tagged `chore` (not `feature`) because it enhances existing screens rather than adding a new capability
- The original work (#130) continues — the new tasks are queued and won't interrupt
- The routing decision is important: while the developer noticed this during implementation, accessibility is a product decision (affects all users), not a backend architecture decision — route to `product-owner`, not `backend-architect`

**Assignment rationale:**
- **Planning → `android-developer`**: The developer plans which screens to prioritize and how to add content descriptions and TalkBack support. No backend architect needed — this is purely frontend.
- **Development → `android-developer`**: Implements accessibility support (content descriptions, semantic roles, focus ordering).
- **Styling → `android-designer`**: Polishes screen reader announcements, ensures proper labeling and navigation flow.
- **Validation → `android-validator`**: Tests accessibility across screens with TalkBack enabled, verifies content descriptions and navigation order.

## Notes
- This is a common pattern — developers notice improvements while working
- The PM acknowledges and routes the idea promptly — agents should feel encouraged to create ideas
- The product-owner's "low priority" assessment means this gets queued behind more important work
- The key routing insight: even though a developer noticed this during technical work, the decision about whether to do it is a product decision → route to `product-owner`
- If the idea had been discarded by the product-owner, the PM would close with `idea,discarded` tags and a comment
