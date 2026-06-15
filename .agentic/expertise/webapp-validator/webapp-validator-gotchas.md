# Webapp validator gotchas

## When To Use This

"permission denied /dev/null", "bash redirect blocked", "cannot access outside project", "agent may not access path", or any time a shell command inside a validation workflow fails with an access error.

## Mental Model

The webapp-validator agent runs in a sandbox that forbids paths outside the project tree. This blocks common shell idioms that reach for the filesystem's special files.

### Gotcha: `/dev/null` is off-limits

Redirections like `2>/dev/null` (and any command that touches `/dev/null`) are rejected with:

> agent 'webapp-validator' may not access path outside project: /dev/null

This was hit twice in a single session when trying to silence errors with `cat file 2>/dev/null`.

**Workarounds:**
- Use the `Read` tool instead of `cat` to inspect files (preferred — also gives line numbers).
- If you must use Bash and want to suppress stderr, redirect to `2>&1` (merge into stdout) or simply drop the `2>/dev/null` — the tool result will surface the real error, which is usually more useful.
- For "find this string across files", use the `Grep` tool rather than `grep ... 2>/dev/null`.

## Timeline

- 2026-06-14: Discovered the `/dev/null` restriction while reading webapp config files; switched to the `Read` tool to complete the task.

## Gaps And Validation Needs

- Other sandbox-restricted paths may exist beyond `/dev/null`; if an access error names a different path, capture it here.

### Gotcha: Playwright webServers survive a finished run and block the next

After `npx playwright test` completes, the spawned `bun run dev:server` (port 3001) and `vite` (port 5174) sometimes keep running. The next invocation fails with:

> Error: http://localhost:3001 is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true

**Workaround:** before re-running, kill leftovers:
```bash
pkill -f "bun run dev:server"; pkill -f "vite.*5174"
# then verify:
lsof -nP -iTCP:3001 -iTCP:5174 -sTCP:LISTEN
```
Note: `lsof -i :3000,:3001` (comma syntax) is invalid on macOS — use `-iTCP:3001 -iTCP:5174`.

### Gotcha: Phase 4 tests assert KNOWN-BUGGY behavior — green != working

`e2e/phase4-validation.spec.ts` documents BUG-1 (regenerate → 401) and BUG-2 (sync push/pull → 500) and the tests `expect(...).toBe(401)` / `toBe(500)`. So the suite is green even though regenerate/sync don't work end-to-end. **When those backend bugs are fixed, these 5 tests will start FAILING and must be rewritten to assert success (201 with token / 200).** See issues `mqe162cmbi` (BUG-1) and `mqe162svv5` (BUG-2).

### Gotcha: Flaky Phase 1-3 tests from shared-state ordering

In a full-suite run, up to 3 Phase 2/3 tests can fail from shared-state ordering in the e2e worktree (e.g. "creates a new issue via the dialog", "deletes a comment and returns 200", "changes an existing parent"). They PASS in isolation (`--grep "<name>"`). This is tracked as Deliverable C in PM epic `mqdzlo4ia8`. **To tell a real regression from flakiness:** re-run the single test with `--grep`; if it passes alone, it's flakiness, not a regression.
