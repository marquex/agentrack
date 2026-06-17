# Agentrack Webapp Specification

> Version: 1.0 | Date: 2026-05-22 | Author: CTO
> Status: Draft for implementation

## 1. Overview

A web-based UI for managing agentrack issues. The app provides a modern, responsive interface to create, view, edit, and organize issues stored in an agentrack-enabled git repository.

### Architecture

```
Browser (React SPA)
    |
    | HTTP/REST
    v
Hono Server (Bun)
    |
    | Tracker JS API
    v
Agentrack (reads/writes .agentrack/ via git worktree)
```

- **Frontend**: React 19 + TypeScript + Vite + shadcn/ui (Tailwind CSS v4). 100% client-side SPA.
- **Backend**: Bun + Hono server. Thin REST layer over the agentrack JavaScript API.
- **Data source**: The git repository's `.agentrack/` worktree. No separate database.
- **No init**: The webapp assumes the tracker is already initialized (`agt init` was run). The `init` command is not exposed via the webapp.

### Constraints

- The webapp operates on a single git repository (the one where the server is started).
- The webapp runs on the default `_agentrack` branch only. Custom branches (`--branch`) are out of scope for v1.
- Authentication in the webapp is handled by passing an author name with API requests. The server does not manage agentrack tokens -- it either runs in `open` auth mode or uses a configured token. This is a simplification for v1.
- Concurrent writes from multiple webapp users are possible. The server serializes writes to the worktree.

---

## 2. REST API Design

### Base path

All API endpoints are under `/api`.

### Response format

All responses return JSON. Success responses wrap data directly. Error responses follow this shape:

```json
{
  "error": true,
  "code": "NOT_FOUND",
  "message": "Issue mpgqhukyki not found"
}
```

### HTTP status codes

| Status | Usage |
|--------|-------|
| 200 | Success (GET, PATCH, DELETE) |
| 201 | Created (POST) |
| 400 | Validation error in request |
| 404 | Resource not found |
| 500 | Internal server error (agentrack errors) |

### Endpoints

#### 2.1 Issues

##### `GET /api/issues`

List issues with optional filters. Maps to `tracker.list()`.

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status. Use `"open"` for all non-closed. Values: `idea`, `todo`, `in-progress`, `done`, `closed`, `open` |
| `assignee` | string | Filter by assignee name |
| `tags` | string | Comma-separated tags (AND match) |
| `parentId` | string | Filter by parent ID. Use `"null"` for top-level issues |
| `search` | string | Search issue titles (case-insensitive substring match, server-side) |

**Response:** `200`

```json
[
  {
    "id": "mpgqhukyki",
    "title": "Write webapp specification",
    "status": "in-progress",
    "assignee": "cto",
    "parentId": null,
    "tags": ["webapp", "spec"],
    "priority": 1
  }
]
```

> Note: The `search` parameter is not natively supported by agentrack's `list()`. The server calls `tracker.list()` with other filters and then filters the result by title substring. For large issue sets, this is acceptable for v1.

##### `POST /api/issues`

Create a new issue. Maps to `tracker.create()`.

**Request body:**

```json
{
  "title": "Implement login page",
  "description": "Build the login page with email/password form",
  "status": "todo",
  "assignee": "alice",
  "tags": ["frontend", "auth"],
  "priority": 2,
  "parentId": null,
  "author": "alice"
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `title` | string | Yes | -- |
| `description` | string | No | `""` |
| `status` | string | No | `"idea"` |
| `assignee` | string or null | No | `null` |
| `tags` | string[] | No | `[]` |
| `priority` | number (1-5) | No | `3` |
| `parentId` | string or null | No | `null` |
| `author` | string | No | server default |

**Response:** `201`

```json
{
  "id": "mpgqhukyki"
}
```

##### `GET /api/issues/:id`

View full issue details. Maps to `tracker.view()`.

**Response:** `200`

```json
{
  "id": "mpgqhukyki",
  "title": "Write webapp specification",
  "description": "Create a comprehensive spec...",
  "status": "in-progress",
  "assignee": "cto",
  "parentId": null,
  "tags": ["webapp", "spec"],
  "priority": 1,
  "createdAt": "2026-05-22T10:00:00.000Z",
  "createdBy": "cto",
  "updatedAt": "2026-05-22T10:30:00.000Z"
}
```

##### `PATCH /api/issues/:id`

Update an issue. Maps to `tracker.update()`. At least one field must be provided.

**Request body:**

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "done",
  "assignee": "bob",
  "tags": ["bug", "critical"],
  "priority": 1,
  "parentId": "abc123",
  "author": "bob"
}
```

All fields are optional (but at least one must be present).

**Response:** `200`

```json
{ "result": "OK" }
```

##### `GET /api/issues/:id/history`

Get the raw event log. Maps to `tracker.history()`.

**Response:** `200`

```json
[
  { "timestamp": "2026-05-22T10:00:00.000Z", "type": "creation", "author": "cto" },
  {
    "timestamp": "2026-05-22T10:00:00.000Z",
    "type": "update",
    "author": "cto",
    "content": { "title": "Write spec", "status": "todo", "priority": 1 }
  }
]
```

##### `GET /api/issues/next/:assignee`

Get the recommended next issue for a user. Maps to `tracker.next()`.

**Response:** `200` -- same shape as `GET /api/issues/:id`, or:

```json
{ "result": "NO_ISSUES_AVAILABLE", "message": "No unblocked issues found for alice" }
```

#### 2.2 Comments

##### `GET /api/issues/:id/comments`

List comments for an issue. Maps to `tracker.commentsList()`.

**Response:** `200`

```json
[
  {
    "id": "c1a2b3d4",
    "author": "alice",
    "content": "Found the root cause",
    "timestamp": "2026-05-22T10:30:00.000Z",
    "editedAt": null
  }
]
```

##### `POST /api/issues/:id/comments`

Add a comment. Maps to `tracker.commentsAdd()`.

**Request body:**

```json
{
  "content": "This looks good to me",
  "author": "alice"
}
```

**Response:** `201`

```json
{ "result": "OK", "commentId": "c1a2b3d4" }
```

##### `PATCH /api/issues/:id/comments/:commentId`

Edit a comment. Maps to `tracker.commentsUpdate()`.

**Request body:**

```json
{
  "content": "Updated comment text",
  "author": "alice"
}
```

**Response:** `200`

```json
{ "result": "OK" }
```

##### `DELETE /api/issues/:id/comments/:commentId`

Delete a comment. Maps to `tracker.commentsDelete()`.

**Response:** `200`

```json
{ "result": "OK" }
```

#### 2.3 Blockages

##### `GET /api/issues/:id/blockages`

List blockages for an issue. Maps to `tracker.blockagesList()`.

**Response:** `200`

```json
{
  "issueId": "mpgqhukyki",
  "blockedBy": [
    { "blockerId": "mpgqi2gu3j", "status": "active" }
  ],
  "blocks": [
    { "blockedId": "mpgqi2sll9", "status": "active" }
  ]
}
```

##### `POST /api/issues/:id/blockages`

Add blockages. Maps to `tracker.blockagesAdd()`.

**Request body:**

```json
{
  "blockerIds": ["mpgqi2gu3j", "mpgqi2sll9"],
  "author": "alice"
}
```

**Response:** `200`

```json
{ "result": "OK" }
```

##### `PATCH /api/issues/:id/blockages/resolve`

Resolve blockages. Maps to `tracker.blockagesResolve()`.

**Request body:**

```json
{
  "blockerIds": ["mpgqi2gu3j"],
  "author": "alice"
}
```

**Response:** `200`

```json
{ "result": "OK" }
```

##### `DELETE /api/issues/:id/blockages`

Delete blockages. Maps to `tracker.blockagesDelete()`.

**Request body:**

```json
{
  "blockerIds": ["mpgqi2gu3j"],
  "author": "alice"
}
```

**Response:** `200`

```json
{ "result": "OK" }
```

#### 2.4 Users

##### `GET /api/users`

List registered users. Maps to `tracker.usersList()`.

**Response:** `200`

```json
[
  { "name": "alice", "registeredAt": "2026-05-22T10:00:00.000Z" }
]
```

##### `POST /api/users`

Register a new user. Maps to `tracker.usersRegister()`.

**Request body:**

```json
{
  "name": "alice"
}
```

**Response:** `201`

```json
{ "result": "OK", "name": "alice", "token": "tk_k7x2m9p4" }
```

##### `DELETE /api/users/:name`

Revoke a user. Maps to `tracker.usersRevoke()`.

**Response:** `200`

```json
{ "result": "OK" }
```

##### `POST /api/users/:name/regenerate`

Regenerate a user's token. Maps to `tracker.usersRegenerate()`.

**Response:** `200`

```json
{ "result": "OK", "name": "alice", "token": "tk_r5t1y8u2" }
```

#### 2.5 Sync

##### `POST /api/sync/push`

Push local changes to remote. Maps to `pushWorktree()`.

**Response:** `200`

```json
{ "synced": true, "commitCount": 1 }
```

##### `POST /api/sync/pull`

Pull remote changes. Maps to `pullWorktree()`.

**Response:** `200`

```json
{ "updated": true }
```

#### 2.6 Health

##### `GET /api/health`

Health check. Verifies the server can reach agentrack.

**Response:** `200`

```json
{
  "status": "ok",
  "tracker": "initialized"
}
```

If not initialized:

```json
{
  "status": "ok",
  "tracker": "not_initialized"
}
```

---

## 3. Frontend Design

### 3.1 Technology stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool, dev server, proxy |
| shadcn/ui | latest | Component library (Button, Dialog, Badge, etc.) |
| Tailwind CSS | 4.x | Utility-first styling |
| React Router | 7.x | Client-side routing |
| TanStack Query | 5.x | Server state management, caching, refetching |

### 3.2 Page structure

```
/ (Issues List)
/issues/:id (Issue Detail)
```

Just two routes. The app is intentionally minimal -- a list view and a detail view.

### 3.3 Layout

```
+-------------------------------------------+
| Header: "agentrack" logo + Sync buttons   |
+-------------------------------------------+
| Sidebar (optional)   |  Main content      |
| - Quick filters       |                    |
| - Assignees           |  [Issues table]    |
| - Tags                |  or                |
|                       |  [Issue detail]    |
+-------------------------------------------+
```

- On desktop: sidebar + main content side by side.
- On mobile: sidebar collapses into a hamburger menu / bottom sheet.
- Header is always visible with the app name and sync controls.

### 3.4 Issues List view (`/`)

The main view. Shows a flat list of top-level issues with expandable sub-issues.

#### Layout

```
+-------------------------------------------+
| [Search bar]  [Status v] [Assignee v]     |
|               [Tag v] [Sort v]            |
+-------------------------------------------+
| v mpgqhukyki | Write webapp spec | in-pro |
|   v mpgqi2gu | Plan roadmap      | todo   |
|     mpgqi2sl | Create issues     | todo   |
| > mprother01 | Fix login bug     | idea   |
+-------------------------------------------+
```

#### Features

1. **Filter bar** at the top:
   - Search input (free text, filters by title)
   - Status dropdown (multi-select: idea, todo, in-progress, done, closed)
   - Assignee dropdown (populated from registered users)
   - Tags dropdown (multi-select, populated from existing tags across all issues)
   - Clear filters button

2. **Issue rows**: Each row shows:
   - Expand/collapse chevron (if the issue has children)
   - Issue ID (clickable, navigates to detail)
   - Title
   - Status badge (color-coded)
   - Priority indicator (1-5, visual)
   - Assignee avatar/name
   - Tags (as small chips)
   - Blockage indicator (icon if blocked)

3. **Tree expansion**: Clicking the chevron expands to show children inline, indented. Children can also be expanded (infinite nesting). Expand state is client-side only.

4. **Sorting**: Sort by priority (default), status, assignee, updated date, created date. Click column headers to toggle sort direction.

5. **Create button**: Opens a dialog/modal to create a new issue.

6. **Empty states**: Friendly messages when no issues exist or filters return no results.

### 3.5 Issue Detail view (`/issues/:id`)

Full view of a single issue. Navigated to by clicking an issue row or ID.

#### Layout

```
+-------------------------------------------+
| <- Back to list     mpgqhukyki            |
+-------------------------------------------+
| Title: Write webapp specification    [Edit]|
| Status: [in-progress v] Priority: [1 v]   |
| Assignee: [cto v]                          |
| Tags: [webapp] [spec] [+ Add tag]          |
| Parent: none [Set parent]                  |
| Created: May 22, 2026 by cto              |
| Updated: May 22, 2026                     |
+-------------------------------------------+
| Description                                |
| Create a comprehensive spec for the        |
| agentrack webapp covering...               |
+-------------------------------------------+
| Blockages                                  |
| Blocked by: infra-setup (active) [Resolve] |
| Blocks: feature-y (active)                 |
| [+ Add blockage]                           |
+-------------------------------------------+
| Sub-issues (3)                             |
| [Create sub-issue]                         |
| > Plan roadmap (todo)                      |
| > Create issues (todo)                     |
| > Write tests (idea)                       |
+-------------------------------------------+
| Activity                                   |
| > Comments (2) [Add comment]               |
|   alice: "Looks good" - May 22, 10:30     |
|   bob: "Needs more detail" - May 22, 11:00|
| > History (5)                              |
|   Created by cto - May 22, 10:00           |
|   Status changed to todo - May 22, 10:00   |
|   ...                                      |
+-------------------------------------------+
```

#### Features

1. **Inline editing**: Click "Edit" to make fields editable. Status, priority, assignee, tags, and parent are always dropdowns/inputs. Title and description use inline editing (click to edit).

2. **Status badge**: Click to change status. Shows a dropdown with the 5 statuses. Color-coded:
   - idea: gray
   - todo: blue
   - in-progress: yellow/amber
   - done: green
   - closed: red/dark

3. **Priority indicator**: Visual display (colored dots, P1-P5). Click to change.

4. **Assignee selector**: Dropdown populated from registered users. Can clear to unassign.

5. **Tags**: Displayed as chips. Can add (type + enter) or remove (x button) tags.

6. **Parent selector**: Shows current parent with a link to navigate to it. Can set/change parent via issue ID input. Can clear parent.

7. **Blockages section**:
   - Shows "Blocked by" list (blockers of this issue) with status (active/resolved)
   - Shows "Blocks" list (issues this blocks) with links
   - "Add blockage" button opens a dialog to search and select issues to block by
   - "Resolve" button on active blockages

8. **Sub-issues section**:
   - Lists children of this issue (compact rows, clickable)
   - "Create sub-issue" button (pre-fills parentId)
   - Shows child count

9. **Comments**:
   - Thread of comments, newest last
   - Each comment shows author, content, timestamp, edited indicator
   - Add comment via text input at the bottom
   - Edit/delete own comments (hover actions)

10. **History**:
    - Collapsible timeline of all events
    - Each event shows type, author, timestamp, and content diff
    - Read-only (no editing history)

### 3.6 Create Issue dialog

A modal/dialog for creating new issues. Used from both the list view and the detail view (as sub-issue).

**Fields:**
- Title (required)
- Description (textarea, optional)
- Status (dropdown, default: idea)
- Assignee (dropdown from users, optional)
- Tags (multi-input, optional)
- Priority (1-5 selector, default: 3)
- Parent (auto-filled if creating from sub-issue button)

### 3.7 Color scheme and styling

- **Theme**: Light mode only for v1. Clean, minimal.
- **Primary color**: Neutral/slate palette with accent blue for actions.
- **Status colors**:
  - idea: `bg-gray-100 text-gray-700`
  - todo: `bg-blue-100 text-blue-700`
  - in-progress: `bg-amber-100 text-amber-700`
  - done: `bg-green-100 text-green-700`
  - closed: `bg-red-100 text-red-700`
- **Priority colors**:
  - P1: red dot
  - P2: orange dot
  - P3: yellow dot
  - P4: blue dot
  - P5: gray dot
- **Font**: System font stack (default from Tailwind/shadcn)
- **Spacing**: Consistent use of shadcn/ui spacing tokens

### 3.8 Responsive behavior

| Breakpoint | Layout |
|------------|--------|
| Desktop (>= 1024px) | Sidebar visible, full table, side-by-side panels |
| Tablet (768-1023px) | Sidebar collapsed, full table |
| Mobile (< 768px) | No sidebar, card-based issue list instead of table |

On mobile, the issue list switches from a table to a card layout where each issue is a card showing title, status badge, and key info.

---

## 4. Backend Design

### 4.1 Project structure

```
webapp/
  server/
    index.ts          # Entry point, starts Bun + Hono server
    routes/
      issues.ts       # Issue endpoints
      comments.ts     # Comment endpoints
      blockages.ts    # Blockage endpoints
      users.ts        # User endpoints
      sync.ts         # Sync endpoints
      health.ts       # Health check
    middleware/
      error-handler.ts # Global error handling
    utils/
      tracker.ts      # Tracker singleton initialization
    types.ts          # Shared types
  frontend/           # Vite React app (separate build)
```

### 4.2 Server configuration

```typescript
// server/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";

const app = new Hono();

// Middleware
app.use("/api/*", cors());
app.use("/api/*", logger());

// API routes
app.route("/api/issues", issueRoutes);
app.route("/api/users", userRoutes);
app.route("/api/sync", syncRoutes);
app.route("/api/health", healthRoute);

// Serve frontend static files (production)
app.use("/*", serveStatic({ root: "./frontend/dist" }));

const port = process.env.PORT || 3001;
console.log(`Server running on http://localhost:${port}`);
export default { port, fetch: app.fetch };
```

### 4.3 Tracker initialization

The server creates a single `Tracker` instance on startup:

```typescript
// server/utils/tracker.ts
import { Tracker } from "agentrack";

// Tracker targets the repository root (cwd of the server process)
export const tracker = new Tracker(process.cwd());
```

### 4.4 Error handling

All agentrack errors are caught and mapped to HTTP responses:

```typescript
function handleAgentrackError(error: AgentrackError, c: Context) {
  const statusMap: Record<string, number> = {
    NOT_FOUND: 404,
    NOT_INITIALIZED: 500,
    TOKEN_REQUIRED: 403,
    INVALID_TOKEN: 401,
  };
  const status = statusMap[error.result] || 500;
  return c.json({ error: true, code: error.result, message: error.message }, status);
}
```

### 4.5 Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `AGENTACK_CWD` | `process.cwd()` | Repository root (overrides tracker cwd) |
| `AGENTACK_AUTHOR` | `"anonymous"` | Default author for operations without explicit author |

### 4.6 Dev server setup

During development, the Vite dev server runs on port 3000 and proxies `/api` requests to the Hono server on port 3001:

```typescript
// frontend/vite.config.ts
const apiPort = process.env.API_PORT || "3001";
const port = process.env.VITE_PORT ? Number(process.env.VITE_PORT) : 3000;

export default defineConfig({
  server: {
    port,
    proxy: {
      "/api": `http://localhost:${apiPort}`,
    },
  },
});
```

---

## 5. Frontend Architecture

### 5.1 Project structure

```
webapp/frontend/
  src/
    main.tsx              # Entry point
    App.tsx               # Router setup
    api/
      client.ts           # Fetch wrapper (base URL, error handling)
      issues.ts           # Issue API calls
      comments.ts         # Comment API calls
      blockages.ts        # Blockage API calls
      users.ts            # User API calls
      sync.ts             # Sync API calls
    hooks/
      use-issues.ts       # TanStack Query hooks for issues
      use-issue.ts        # Single issue hook
      use-comments.ts     # Comments hook
      use-blockages.ts    # Blockages hook
      use-users.ts        # Users hook
    components/
      layout/
        Header.tsx
        Sidebar.tsx
        AppLayout.tsx
      issues/
        IssueList.tsx       # Main list component
        IssueRow.tsx        # Single row in the list
        IssueTree.tsx       # Recursive tree expansion
        IssueFilters.tsx    # Filter bar
        CreateIssueDialog.tsx
      issue-detail/
        IssueDetail.tsx     # Main detail page
        IssueHeader.tsx     # Title, status, priority, assignee
        IssueDescription.tsx
        BlockagesSection.tsx
        SubIssuesSection.tsx
        CommentsSection.tsx
        HistorySection.tsx
        TagInput.tsx
      shared/
        StatusBadge.tsx
        PriorityIndicator.tsx
        AssigneeSelector.tsx
        EmptyState.tsx
    pages/
      IssuesPage.tsx
      IssueDetailPage.tsx
    types/
      index.ts             # TypeScript interfaces matching API shapes
    lib/
      utils.ts             # shadcn/ui utility (cn function)
```

### 5.2 State management

- **Server state**: TanStack Query manages all API data (issues, comments, users, etc.)
  - Automatic refetching on window focus
  - Optimistic updates for status changes, assignee changes
  - Cache invalidation after mutations
- **UI state**: React useState/useReducer for:
  - Filter selections
  - Expanded rows in tree view
  - Edit mode toggles
- No global state store (no Redux/Zustand needed for v1)

### 5.3 Key TanStack Query patterns

```typescript
// List issues with filters
const useIssues = (filters: IssueFilters) =>
  useQuery({
    queryKey: ["issues", filters],
    queryFn: () => api.issues.list(filters),
  });

// Update issue with optimistic update
const useUpdateIssue = () =>
  useMutation({
    mutationFn: (params: { id: string; data: UpdateIssueData }) =>
      api.issues.update(params.id, params.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issue", variables.id] });
    },
  });
```

---

## 6. API Endpoint Summary

| Method | Path | Agentrack method | Description |
|--------|------|-----------------|-------------|
| GET | `/api/health` | `isWorktreeInitialized()` | Health check |
| GET | `/api/issues` | `list()` | List issues |
| POST | `/api/issues` | `create()` | Create issue |
| GET | `/api/issues/next/:assignee` | `next()` | Next issue for user |
| GET | `/api/issues/:id` | `view()` | View issue |
| PATCH | `/api/issues/:id` | `update()` | Update issue |
| GET | `/api/issues/:id/history` | `history()` | Issue history |
| GET | `/api/issues/:id/comments` | `commentsList()` | List comments |
| POST | `/api/issues/:id/comments` | `commentsAdd()` | Add comment |
| PATCH | `/api/issues/:id/comments/:commentId` | `commentsUpdate()` | Edit comment |
| DELETE | `/api/issues/:id/comments/:commentId` | `commentsDelete()` | Delete comment |
| GET | `/api/issues/:id/blockages` | `blockagesList()` | List blockages |
| POST | `/api/issues/:id/blockages` | `blockagesAdd()` | Add blockages |
| PATCH | `/api/issues/:id/blockages/resolve` | `blockagesResolve()` | Resolve blockages |
| DELETE | `/api/issues/:id/blockages` | `blockagesDelete()` | Delete blockages |
| GET | `/api/users` | `usersList()` | List users |
| POST | `/api/users` | `usersRegister()` | Register user |
| DELETE | `/api/users/:name` | `usersRevoke()` | Revoke user |
| POST | `/api/users/:name/regenerate` | `usersRegenerate()` | Regenerate token |
| POST | `/api/sync/push` | `pushWorktree()` | Push to remote |
| POST | `/api/sync/pull` | `pullWorktree()` | Pull from remote |

---

## 7. Out of scope for v1

These features are explicitly excluded from the first version:

- **Init command** -- The webapp requires `agt init` to have been run already.
- **Custom branches** -- Only the default `_agentrack` branch is supported.
- **Authentication UI** -- The webapp does not manage tokens. It sends a configurable `author` name.
- **Real-time updates** -- No WebSockets. Users refresh or refetch manually.
- **File attachments** -- No file upload support.
- **Markdown rendering** -- Description and comments are plain text for v1.
- **Batch operations** -- No multi-select on the issue list.
- **Keyboard shortcuts** -- Nice to have but not in v1.
- **Dark mode** -- Light mode only.
- **Internationalization** -- English only.
