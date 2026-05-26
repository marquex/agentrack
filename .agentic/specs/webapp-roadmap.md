# Webapp Development Roadmap

> Version: 1.0 | Date: 2026-05-22 | Author: CTO
> Dependency: webapp-spec.md must be read before this document

## Phased approach

The webapp is built in 5 phases. Each phase produces a working, testable increment. Phases are sequential -- each builds on the previous.

```
Phase 1: Foundation     (server + project setup)
Phase 2: Core issues     (list + CRUD)
Phase 3: Rich detail     (comments, blockages, hierarchy, history)
Phase 4: Users & sync    (user management, push/pull)
Phase 5: Polish          (responsive, empty states, error handling)
```

---

## Phase 1: Foundation

**Goal:** A running Hono server with health check, and a Vite React app that renders a hello-world page.

### Backend tasks

1. **Project scaffolding**
   - Create `webapp/` directory at repo root
   - Create `webapp/server/` with Hono + Bun setup
   - Create `webapp/frontend/` with Vite + React + TypeScript + Tailwind + shadcn/ui
   - Add `webapp/package.json` with scripts:
     - `dev:server` -- runs the backend with Bun
     - `dev:frontend` -- runs Vite dev server
     - `dev` -- runs both concurrently
     - `build` -- builds frontend + starts server
   - Configure Vite proxy for `/api` -> `http://localhost:3000`

2. **Health check endpoint**
   - `GET /api/health` that checks if agentrack is initialized
   - Returns `{ status: "ok", tracker: "initialized" | "not_initialized" }`

3. **Tracker utility**
   - `server/utils/tracker.ts` -- singleton Tracker instance
   - Configurable via `AGENTACK_CWD` env var
   - Error handling middleware for agentrack errors

4. **shadcn/ui setup**
   - Initialize shadcn/ui in the frontend
   - Install core components: Button, Input, Badge, Dialog, DropdownMenu, Select, Textarea, Card, Separator, ScrollArea, Skeleton, Tooltip, Sheet

### Validation criteria
- [ ] `bun run dev:server` starts without error
- [ ] `GET /api/health` returns 200 with correct JSON
- [ ] Frontend renders a page with the agentrack header
- [ ] Vite proxy successfully hits `/api/health`

---

## Phase 2: Core issues (list + CRUD)

**Goal:** The main issues list view and issue creation. Users can see issues, create new ones, and change their basic properties.

### Backend tasks

5. **Issue list endpoint** -- `GET /api/issues`
   - Implement all query params: status, assignee, tags, parentId, search
   - Server-side search filter (post-filter on title substring)

6. **Issue create endpoint** -- `POST /api/issues`
   - Validate required fields
   - Return 201 with issue ID

7. **Issue view endpoint** -- `GET /api/issues/:id`
   - Return full computed issue

8. **Issue update endpoint** -- `PATCH /api/issues/:id`
   - Validate at least one field provided
   - Map agentrack errors to HTTP responses

9. **Users list endpoint** -- `GET /api/users`
   - Needed for assignee dropdowns in the frontend

### Frontend tasks

10. **API client layer**
    - `api/client.ts` -- fetch wrapper with error handling
    - `api/issues.ts` -- issue API functions
    - `api/users.ts` -- user API functions
    - TypeScript types for all API shapes

11. **App layout**
    - Header with app name and sync placeholder
    - AppLayout component with sidebar placeholder
    - React Router setup (`/` and `/issues/:id`)

12. **Issues list page**
    - TanStack Query setup and `useIssues` hook
    - IssueList component fetching and displaying issues
    - IssueRow component showing: ID, title, status badge, priority, assignee, tags
    - StatusBadge and PriorityIndicator shared components
    - Basic filtering: status and assignee dropdowns
    - Search input filtering by title

13. **Create issue dialog**
    - CreateIssueDialog modal with form fields
    - Title (required), description, status, assignee, tags, priority
    - Uses `POST /api/issues` on submit
    - Refreshes issue list on success

14. **Issue detail page (basic)**
    - IssueDetailPage component at `/issues/:id`
    - Shows all issue fields in read-only mode
    - Back navigation to list
    - Editable status (dropdown), priority (dropdown), assignee (dropdown)
    - Editable title (click to edit inline)
    - Editable description (click to edit inline)

### Validation criteria
- [ ] Issue list loads and displays real data from agentrack
- [ ] Can create a new issue via the dialog
- [ ] Can view an issue's full details
- [ ] Can change status, priority, assignee, title, description
- [ ] Filters work (status, assignee, search)
- [ ] Navigation between list and detail works

---

## Phase 3: Rich detail (comments, blockages, hierarchy, history)

**Goal:** Full issue detail with comments, blockages, sub-issues, and history.

### Backend tasks

15. **Comment endpoints**
    - `GET /api/issues/:id/comments` -- list comments
    - `POST /api/issues/:id/comments` -- add comment
    - `PATCH /api/issues/:id/comments/:commentId` -- edit comment
    - `DELETE /api/issues/:id/comments/:commentId` -- delete comment

16. **Blockage endpoints**
    - `GET /api/issues/:id/blockages` -- list blockages
    - `POST /api/issues/:id/blockages` -- add blockages
    - `PATCH /api/issues/:id/blockages/resolve` -- resolve blockages
    - `DELETE /api/issues/:id/blockages` -- delete blockages

17. **History endpoint**
    - `GET /api/issues/:id/history` -- return event log

18. **Next issue endpoint**
    - `GET /api/issues/next/:assignee` -- recommended next issue

### Frontend tasks

19. **Comments section**
    - CommentsSection component in issue detail
    - Comment list with author, content, timestamp
    - Add comment form (textarea + submit)
    - Edit comment (inline edit)
    - Delete comment (with confirmation)

20. **Blockages section**
    - BlockagesSection component
    - "Blocked by" list with status indicators
    - "Blocks" list with links to blocked issues
    - Add blockage dialog (search/select issues)
    - Resolve button for active blockages

21. **Sub-issues section**
    - SubIssuesSection component
    - List children of current issue
    - "Create sub-issue" button (pre-fills parentId)
    - Clickable child rows navigating to their detail

22. **Tree view in list**
    - IssueTree component for expandable sub-issues in list view
    - Recursive expansion (infinite depth)
    - Expand/collapse chevrons
    - Indentation for child issues

23. **History timeline**
    - HistorySection component
    - Collapsible timeline of events
    - Each event shows type icon, author, timestamp, content summary
    - Read-only

24. **Tag management**
    - TagInput component (add tags by typing + enter)
    - Remove tags with x button
    - Display tags as chips with colors

25. **Parent management**
    - Parent selector in issue detail
    - Set/change parent by typing issue ID
    - Clear parent (set to null)
    - Clickable parent link

### Validation criteria
- [ ] Can add, edit, delete comments on an issue
- [ ] Can add, resolve, and delete blockages
- [ ] Sub-issues display in both the list (tree) and detail views
- [ ] Can create sub-issues with parentId pre-filled
- [ ] History timeline displays correctly
- [ ] Tag input works (add/remove)
- [ ] Parent can be set, changed, and cleared
- [ ] Blockage indicators show on issue list rows

---

## Phase 4: Users & sync

**Goal:** User management UI and git sync functionality.

### Backend tasks

26. **User registration endpoint** -- `POST /api/users`
27. **User revoke endpoint** -- `DELETE /api/users/:name`
28. **User token regenerate** -- `POST /api/users/:name/regenerate`
29. **Sync push endpoint** -- `POST /api/sync/push`
30. **Sync pull endpoint** -- `POST /api/sync/pull`

### Frontend tasks

31. **User management UI**
    - Users section in sidebar or settings page
    - List registered users with registration date
    - Register new user dialog (name input)
    - Revoke user with confirmation
    - Regenerate token (shows new token)

32. **Sync controls**
    - Sync buttons in header: Push, Pull
    - Visual feedback (loading spinner, success/error toast)
    - Last sync timestamp display

### Validation criteria
- [ ] Can register a new user via the UI
- [ ] Can revoke a user
- [ ] Can regenerate a token
- [ ] Push button syncs changes to remote
- [ ] Pull button fetches remote changes
- [ ] Sync status feedback is clear

---

## Phase 5: Polish

**Goal:** Responsive design, error handling, loading states, and overall UX refinement.

### Tasks

33. **Responsive design**
    - Mobile card layout for issue list (< 768px)
    - Sidebar collapse on tablet/mobile
    - Touch-friendly interactions
    - Proper viewport meta tag

34. **Loading and error states**
    - Skeleton loaders for issue list and detail
    - Error boundaries for failed API calls
    - Toast notifications for mutations (success/error)
    - Retry buttons on failed requests

35. **Empty states**
    - No issues yet -- friendly onboarding message
    - No search results -- clear message with filter reset
    - No comments -- prompt to add first comment
    - No blockages -- prompt to add dependencies

36. **Sorting**
    - Sort issue list by: priority, status, assignee, updated date, created date
    - Click column headers to toggle sort direction
    - Persist sort preference in localStorage

37. **Filter improvements**
    - Tag filter (multi-select from existing tags)
    - Combined filters (all filters work together)
    - Active filter chips with clear button
    - URL query params for shareable filter state

### Validation criteria
- [ ] App works well on mobile (tested at 375px, 768px, 1024px)
- [ ] Loading states show skeletons, not empty space
- [ ] Errors display user-friendly messages
- [ ] Empty states guide the user
- [ ] Sorting works correctly
- [ ] All filters combine properly

---

## Agent assignments

| Agent | Responsibility |
|-------|---------------|
| webapp-developer | Implements all backend and frontend code. Works through phases sequentially. |
| webapp-validator | Tests each phase's validation criteria. Reviews code quality. Reports issues. |

## Dependencies between phases

```
Phase 1 (Foundation)
  |
  v
Phase 2 (Core issues)
  |
  v
Phase 3 (Rich detail)
  |
  +-> Phase 4 (Users & sync) -- can run parallel with Phase 5
  |
  v
Phase 5 (Polish)
```

Phases 1-3 are strictly sequential. Phase 4 can start after Phase 3. Phase 5 starts after Phase 3 and ideally after Phase 4.
