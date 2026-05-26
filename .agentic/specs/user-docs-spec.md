# User-Friendly Documentation Overhaul

**Status: DRAFT**

## Summary

Replace the current auto-generated TypeDoc documentation with hand-written, user-friendly markdown documentation in `docs/markdown/`. The current docs (`docs/html/`, `docs/md/`, and standalone markdown files in `docs/`) expose internal implementation details that aren't useful to users. The new documentation will be organized into 8 sections covering the library's features, usage patterns, and reference material. TypeDoc tooling will be removed entirely.

## Motivation

- **Current docs are internals-focused**: TypeDoc generates API docs from JSDoc, producing reference pages for every internal function (resolution, index-manager, dependency-manager, etc.). Users don't need to see these.
- **No user onboarding**: There's no getting started guide, no conceptual explanations, no examples.
- **Wrong audience**: The docs serve developers of the library, not users of it. We need docs that help someone go from "never used agentrack" to "productive with it" in minutes.
- **Future Docusaurus site**: Markdown files in `docs/markdown/` will later be fed into Docusaurus (or similar) to produce a proper documentation website.

## Requirements

### AC1: Remove TypeDoc tooling
- Remove `typedoc` and `typedoc-plugin-markdown` from devDependencies in `packages/library/package.json`
- Delete `packages/library/typedoc.json`
- Remove scripts from `packages/library/package.json`: `docs:html`, `docs:md`, `docs`, `docs:check`
- Verify `quality` script (`bun run typecheck && bun run lint && bun run test:coverage`) is unaffected (it does not reference docs)
- Verify `prepublishOnly` script (`bun run quality`) is unaffected
- Run `bun install` to update lockfile after removing deps

### AC2: Remove old documentation content
- Delete `docs/html/` directory (TypeDoc HTML output)
- Delete `docs/md/` directory (TypeDoc Markdown output)
- Delete `docs/introduction.md`
- Delete `docs/hierarchy.md`
- Delete `docs/commands.md`
- Delete `docs/issue-blockages.md`
- Delete `docs/user-auth.md`
- The `docs/` directory should be empty after cleanup (except for the new `markdown/` subdirectory)

### AC3: Create `docs/markdown/` with 8 documentation files
Create the following files, each written for users (not library developers). Use clear language, code examples, and practical guidance.

#### 3a. `docs/markdown/overview.md`
- Brief introduction: what agentrack is and why it exists
- Key features in bullet points: file-backed, event-sourced, git-friendly, designed for AI agents, zero infrastructure, CLI + JavaScript API
- Two ways to use it: CLI (`agt` command) and JavaScript library
- Quick 3-line example to create an issue (both CLI and JS)
- Link/mention of other doc sections for details

#### 3b. `docs/markdown/getting-started.md`
- Prerequisites: Node.js >= 20
- Installation: `npm install agentrack`
- Global CLI: `npm link` or `npx agt`
- Step-by-step first session:
  1. `agt init` — initialize tracker in a repo
  2. `agt create "My first issue"` — create an issue
  3. `agt list` — see your issues
  4. `agt view <id>` — inspect an issue
  5. `agt update <id> --status in-progress` — change status
  6. `agt history <id>` — see the event log
- JavaScript equivalent of the same workflow using `Tracker` class
- Where to go next (links to other sections)

#### 3c. `docs/markdown/authentication.md`
- Auth modes: `open` (no token needed), `read-only` (reads free, writes need token), `strict` (everything needs token)
- Default mode is `open`
- Configuration in `.agentrack/config.json`
- Token-based authentication: how it works, `AGT_USER_TOKEN` environment variable
- User management: `agt users register <name>`, `agt users list`, `agt users revoke <name>`, `agt users regenerate <name>`
- JavaScript API: how to pass tokens programmatically
- Example: setting up auth for a multi-agent team

#### 3d. `docs/markdown/issue-object.md`
- Issue properties: id (10-char, time-sortable), title, description, status, assignee, parentId, tags, priority (1-5)
- Computed fields: createdAt, createdBy, updatedAt
- Status lifecycle: idea → todo → in-progress → done → closed
- Event sourcing model: issues are append-only event logs, state is computed by replay
- Example: full JSON output of `agt view <id>`
- Priority guide: 1=critical, 2=important, 3=normal, 4=low, 5=trivial

#### 3e. `docs/markdown/hierarchy-and-blockages.md`
**Hierarchy section:**
- Parent-child relationships via `--parentId`
- Status constraints: can't close parent with open children, child starting work auto-promotes parent
- Downward cascade: closing parent auto-closes done children
- Auto-promotion cap: parents auto-promote up to `in-progress` (not to done/closed)
- Example: epic with stories

**Blockages section:**
- Adding blockages: `agt blockages add <id> --by <blocker-id>`
- Bidirectional: blockedBy (what blocks me) and blocks (what I block)
- Lifecycle: added → active → resolved/deleted
- Auto-resolution: completing an issue auto-resolves its blockages
- Cycle detection: circular dependencies are prevented
- Impact score: issues that unblock the most work surface first
- Example: feature blocked by infrastructure work

#### 3f. `docs/markdown/storing-issues-in-git.md`
- The `.agentrack/` directory structure: config.json, index.json, dependencies.json, users.json, issues/*.json
- Independent git branch: issues stored on orphan branch `_agentrack` via git worktree
- Why: branch-independent issue access, no merge conflicts with code
- Commands: `agt push` (auto-commit + sync to remote), `agt pull` (sync from remote)
- Init scenarios: fresh setup (creates orphan branch) vs. joining existing (fetches remote branch)
- `.agentrack/` is in `.gitignore` on the code branch — issues live on their own branch
- Example: team workflow with push/pull

#### 3g. `docs/markdown/cli-reference.md`
Complete reference for all `agt` commands. For each command: syntax, description, flags, and at least one example.

Commands to document:
- `agt init` — initialize tracker
- `agt create <title>` — create issue (flags: --description, --assignee, --tags, --status, --priority, --parentId)
- `agt update <id>` — update issue (flags: --title, --description, --status, --assignee, --tags, --priority, --parentId)
- `agt list` — list issues (flags: --status, --assignee, --tags, --parentId)
- `agt view <id>` — view computed issue state
- `agt history <id>` — view event log
- `agt next <user>` — recommend next issue for a user
- `agt comments add <id> --content <text>` — add comment
- `agt comments update <id> --comment-id <cid> --content <text>` — update comment
- `agt comments delete <id> --comment-id <cid>` — delete comment
- `agt comments list <id>` — list comments
- `agt blockages add <id> --by <blocker-id>` — add blockage
- `agt blockages resolve <id> --by <blocker-id>` — resolve blockage
- `agt blockages delete <id> --by <blocker-id>` — delete blockage
- `agt blockages list <id>` — list blockages
- `agt users register <name>` — register user
- `agt users list` — list users
- `agt users revoke <name>` — revoke user access
- `agt users regenerate <name>` — regenerate user token
- `agt push` — sync issues to remote
- `agt pull` — sync issues from remote

All commands output JSON to stdout. Errors go to stderr with non-zero exit code.

#### 3h. `docs/markdown/javascript-reference.md`
Programmatic API reference. Only document the public exports (what `index.ts` re-exports), NOT internal modules.

**Tracker class:**
- Constructor: `new Tracker()` — resolves `.agentrack/` by walking up from cwd
- Methods (group by category):
  - Setup: `init()`
  - Issues: `create(title, options?)`, `update(id, options?)`, `list(filters?)`, `view(id)`, `history(id)`, `next(userName)`
  - Comments: `addComment(id, content)`, `updateComment(id, commentId, content)`, `deleteComment(id, commentId)`, `listComments(id)`
  - Blockages: `addBlockage(id, blockerId)`, `resolveBlockage(id, blockerId)`, `deleteBlockage(id, blockerId)`, `listBlockages(id)`
  - Users: `registerUser(name)`, `listUsers()`, `revokeUser(name)`, `regenerateToken(name)`
  - Sync: `push()`, `pull()`
- Each method: signature, parameters, return type, example

**Exported types:**
- `IssueProperties`, `ComputedIssue`, `IssueId`, `IssueStatus`
- `CreateIssueOptions`, `UpdateIssueOptions`, `ListFilters`
- `CommentEvent`, `BlockageInfo`, `UserInfo`
- `NextResult`
- `AgentrackError`

### AC4: Update project configuration
- Update `docs:check` removal from any CI/release workflow references
- Update `.gitignore`: remove `docs-html/` entry (no longer relevant), ensure `docs/html/` is not ignored (we may generate Docusaurus output there later)
- Update release workflow (`.github/workflows/release.yml`): remove TypeDoc generation and GitHub Pages deployment steps (Docusaurus deployment will be a separate future task)

### AC5: Quality gates
- `bun run quality` passes (typecheck, lint, tests) — removing typedoc must not break anything
- `bun run build` still produces working `dist/` artifacts
- `bun install` succeeds after removing typedoc deps
- All 8 markdown files exist in `docs/markdown/` with non-trivial content (>100 lines each)
- No broken internal cross-references between doc files

## Implementation Notes

### File locations

**Cleanup targets:**
- `packages/library/typedoc.json` — delete
- `docs/html/` — delete directory
- `docs/md/` — delete directory
- `docs/introduction.md` — delete
- `docs/hierarchy.md` — delete
- `docs/commands.md` — delete
- `docs/issue-blockages.md` — delete
- `docs/user-auth.md` — delete

**New files:**
- `docs/markdown/overview.md`
- `docs/markdown/getting-started.md`
- `docs/markdown/authentication.md`
- `docs/markdown/issue-object.md`
- `docs/markdown/hierarchy-and-blockages.md`
- `docs/markdown/storing-issues-in-git.md`
- `docs/markdown/cli-reference.md`
- `docs/markdown/javascript-reference.md`

**Modified files:**
- `packages/library/package.json` — remove typedoc deps and scripts
- `.github/workflows/release.yml` — remove TypeDoc/Pages steps
- `.gitignore` — remove `docs-html/` entry

### Agent assignments

- **library-developer**: Remove typedoc tooling from `packages/library/` (deps, config, scripts). Run `bun install` and verify quality gates.
- **library-release**: Remove old docs content from `docs/`. Write all 8 new markdown files. This is the main content work.
- **CTO**: Update `.github/workflows/release.yml` and `.gitignore` (these are in CTO's access domain).

library-developer and library-release tasks can run in **parallel** — they touch different directories.

### Writing guidelines

- **Audience**: Developers and AI agent operators who want to use agentrack. NOT library contributors.
- **Tone**: Clear, concise, practical. Avoid marketing language.
- **Code examples**: Always show both CLI and JavaScript API where applicable.
- **Cross-references**: Link between doc files where relevant (e.g., "See [Authentication](./authentication.md) for token setup").
- **Format**: Standard markdown. No frontmatter or Docusaurus-specific syntax yet (that will be added when we set up Docusaurus).

## Out of scope

- **Docusaurus setup**: Choosing, installing, and configuring a documentation site generator is a separate future task.
- **Documentation deployment**: GitHub Pages or other hosting will be set up with Docusaurus.
- **README.md changes**: The root README already covers quick start. We can update it to link to the new docs later.
- **Generated API docs**: We're not replacing TypeDoc with another auto-generation tool. The JavaScript reference will be hand-written, covering only the public API surface.
- **Search, versioning, i18n**: These are Docusaurus concerns for later.
- **Content for `packages/ui/`**: The UI package doesn't exist yet.

## Design decision update

This replaces DD-016 ("TypeDoc HTML for API documentation"). The new approach:
- Hand-written user guides in markdown (docs/markdown/)
- Only public API surface documented (Tracker class + exported types)
- Future Docusaurus site will serve these markdown files
- No auto-generated API docs from source code
