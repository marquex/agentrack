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

### Gotcha: Temp files outside `packages/webapp/` are blocked

Writing scratch files for shell workflows (e.g. a heredoc body to pass into `agt comments add --content`) is restricted outside the webapp tree:

- `/tmp/anything` → "may not access path outside project".
- `.agentrack/_tmp_*.md` → "has no access rule covering '.agentrack/_tmp_*.md'".
- Project root paths that aren't under an allowed folder are also rejected.

**Workaround:** write the scratch file under `packages/webapp/` (e.g. `packages/webapp/_tmp_comment_<issueId>.md`), which this agent can access, then `cat` / read it into the command. Clean it up afterwards.

### Gotcha: The `timeout` command is not available

`timeout 5s ...` fails with `(eval):1: command not found: timeout` (macOS doesn't ship coreutils `timeout` by default). Drop the wrapper, or use a different mechanism, when running long-lived server processes for manual reproduction.

### Gotcha: Only `packages/webapp/` is readable — not the library source

Access rules cover `packages/webapp/` only. Reads of `packages/library/...` (e.g. `packages/library/dist/tracker.js`) and bare `packages/` paths are rejected with "has no access rule covering 'packages/library/...'". When a route delegates to the tracker (`tracker.usersRegenerate`, `pushWorktree`, `resolveAuthor`, etc.) and you need the library's behavior, you can't read it directly — infer from the call site or ask webapp-developer / library-developer.

### Gotcha: Playwright webServers survive a finished run and block the next

After `npx playwright test` completes, the spawned E2E backend (port **5001**) and `vite` frontend (port **5000**) sometimes keep running. The next invocation fails with a "port already used" error. (Before the 2026-06-16 port change these were 3001/5174; older notes may reference those.)

**Do NOT "fix" this by setting `reuseExistingServer: true`** — that could let Playwright grab a server pointed at the real `.agentrack/`. The flag must stay absent from the config.

**Workaround:** before re-running, kill leftovers:
```bash
pkill -f "bun run dev:server"; pkill -f "vite.*5000"
# then verify (prefer ps — lsof is unreliable in this sandbox, see below):
ps aux | grep -E "bun run dev|vite" | grep -v grep
```
Note: `lsof -i :5000,:5001` (comma syntax) is invalid on macOS — use `-iTCP:5001 -iTCP:5000`.

**Prefer `ps aux` over `lsof` to find leftover servers.** During the 2026-06-16 leak investigation, `lsof -nP -iTCP:3001 -iTCP:5174 -sTCP:LISTEN` returned **empty even while** a manual `bun run dev:server` (PID 88851) plus its frontend siblings were alive and squatting on those ports (visible in `ps aux`). `lsof` is an unreliable signal in this sandbox — always cross-check with `ps aux | grep -E "bun run dev|vite" | grep -v grep`. That manual dev server, running WITHOUT `AGENTRACK_CWD`, was the confirmed source of the `.agentrack/` seed-data leak — see [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md).

### Gotcha: Port 5000 (E2E frontend) is held by macOS AirPlay Receiver

The E2E frontend runs on port **5000** with `strictPort: true`, but **macOS AirPlay Receiver** (`AirPlayUIAgent` / ControlCenter) occupies port 5000 by default. When AirPlay is active, `npx playwright test` aborts before any test runs with `http://localhost:5000 is already used` (EADDRINUSE on 5000; 5001/3000/3001 are free). Verified 2026-06-16 via a Node `net.createServer` probe.

This is a **documented environment constraint**, not a code bug — the 5000 choice was deliberate (prescription `mqh2nfnt2o`; also captured in `webapp-developer`'s ports expertise). Vite uses `strictPort`, so it cannot fall back to another port.

**Workaround:** disable macOS AirPlay Receiver (System Settings → General → AirDrop & Handoff → AirPlay Receiver), or otherwise free port 5000, before running the E2E suite. Until 5000 is free, the full E2E regression cannot run — validate via code analysis + dev-mode checks + `npx playwright test --list` (config loads, 176 tests) instead. Verify port availability programmatically rather than trusting a failed Playwright boot:
```bash
node -e "const net=require('net'); for (const p of [5000,5001,3000,3001]) { const s=net.createServer(); s.once('error',e=>{console.log(p+' BUSY ('+e.code+')')}); s.once('listening',()=>{s.close();console.log(p+' FREE')}); s.listen(p); }"
```

### Gotcha: Phase 4 tests assert KNOWN-BUGGY behavior — green != working (and BUG-2 has flipped)

`e2e/phase4-validation.spec.ts` documents BUG-1 (regenerate → 401) and BUG-2 (sync push/pull → 500) and the tests `expect(...).toBe(401)` / `toBe(500)`. Originally the suite was green even though regenerate/sync didn't work end-to-end.

**BUG-2 has flipped:** as of 2026-06-16 (`mqguhe7eyw` full-suite run), sync push/pull now returns **200** instead of 500, so the BUG-2 sync tests now **FAIL** (`Expected 500, Received 200`). That means BUG-2 has likely been **fixed** and those tests are **stale** — they need rewriting to assert success. Do NOT interpret those 4 failures as a regression caused by your change; they are stale assertions. BUG-1 (regenerate 401) still asserts the buggy behavior and still passes against the bug. See issues `mqe162cmbi` (BUG-1) and `mqe162svv5` (BUG-2). Full root cause + reproduction steps are in [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md).

### Gotcha: Flaky Phase 1-3 tests from shared-state ordering

In a full-suite run, up to 3 Phase 2/3 tests can fail from shared-state ordering in the e2e worktree (e.g. "creates a new issue via the dialog", "deletes a comment and returns 200", "changes an existing parent"). They PASS in isolation (`--grep "<name>"`). This is tracked as Deliverable C in PM epic `mqdzlo4ia8`. **To tell a real regression from flakiness:** re-run the single test with `--grep`; if it passes alone, it's flakiness, not a regression.

### Gotcha: Manual `agt` CLI probing against `.e2edata` is unreliable — don't use it to verify behavior

When investigating backend semantics (e.g. "what statuses does `--status open` return?"), running ad-hoc `agt` commands against `validation/.e2edata/` by hand gives **inconsistent results**: the data appears to reset between calls (the worktree/branch-based pointer and possible concurrent processes make state churn), and you will leave stray test issues behind. During the 2026-06-16 session this led to confusing counts and a leftover `DoneTest` issue that had to be cleaned up.

**Prefer:** code analysis (read `frontend/src/api/*.ts` + `server/routes/*.ts`) and E2E tests for verification. Treat manual `agt` CLI output from `.e2edata/` as unreliable signal. If you do poke it, know that `e2e/global-setup.ts` resets the worktree before the next Playwright run, so leftover data is harmless to the suite — but avoid spending time manually "cleaning" `index.json` (it's error-prone and unnecessary).

### Gotcha: `$(cat <project-file>)` inside a Bash command can be denied even for readable files

Files under `packages/webapp/` that open fine with the `Read` tool (and with a direct `cat` in some CWDs) can still be rejected when accessed via shell command substitution, e.g. `agt comments add ... --content "$(cat packages/webapp/frontend/src/index.css)"` failed with:

> `(eval):1: permission denied: packages/webapp/frontend/src/index.css`

The access rules apply to the resolved path the shell tries to open, and command substitution can land on a denied resolution even when a plain `cat` of the same path would pass.

**Workarounds:**
- For multi-line content you need to pass into a CLI (e.g. `agt comments add --content`), inline the text directly in the command via a heredoc (`--content "$(cat <<'EOF' ... EOF )"`), or write a scratch file under `packages/webapp/` and read *that*.
- Prefer the `Read` tool when you just need to inspect the file yourself — don't pipe source files through `cat` just to include them in a command.

### Gotcha: The access-rule sandbox scans command ARGUMENTS for path/URL-like substrings

The sandbox doesn't only check the file a command reads — it scans the whole command string and rejects it if any argument token looks like a path or URL the agent can't access. This bites hard when passing descriptive text into `agt comments add --content "..."` / `agt create --description "..."`. Observed rejections during the 2026-06-16 pollution investigation:

- `--content "...leaked into the real \`.agentrack/\` tracker..."` → `has no access rule covering '.agentrack/'` (the backtick-wrapped path is treated as a path reference).
- `--content "...POSTs to http://localhost:3001/api/issues..."` → `has no access rule covering 'http:/localhost:3001/api/issues'`.
- `--description "...title pattern ... Date.now()-<random>..."` → `has no access rule covering 'Date.now'`.
- `--content "...close/delete of all 50 leaked issues..."` → `has no access rule covering '(close/delete'` (2026-06-16, fourth leak triage).

Tokens containing forward slashes, `http://`, backtick-wrapped paths, parenthesized slash-bearing prose like `(close/delete`, and even `Date.now` (looks like `Date/now`?) all trigger the checker. Anything with a slash inside a `--content` / `--description` string is suspect.

**Workaround:** rephrase the content to avoid path-like and URL-like substrings. Use plain prose: write `packages webapp e2e spec` instead of `packages/webapp/e2e/...`, `the local API on port 3001` instead of `http://localhost:3001/...`, `Date.now sample` instead of `Date.now()-...`, `close and delete` instead of `close/delete`, and drop backticks around paths. The comment/description text reads slightly less precisely but passes the sandbox. This is the only reliable way to embed evidence-rich comments via the CLI.

### Gotcha: `bunx playwright test` intermittently fails to load test files — use `npx playwright test`

`bunx playwright test` can intermittently fail to load test files (`Error: Only URLs with a scheme in file, data, and node are supported by the default ESM loader. Received protocol bun:` / `Error: Playwright Test did not expect test.describe to be called here` / `Error: No tests found`, exit 0 with zero tests run) after repeated invocations or a `Saved lockfile` re-save event. Use `npx playwright test` (or `npm run test:e2e`) for deterministic runs. Root cause: Bun's experimental `bun:` protocol ESM loader. The webapp **server** still runs under Bun; only the Playwright **test runner** invocation moves to `npx`. Playwright is an npm devDependency (`@playwright/test ^1.60.0`), so `npx` is the canonical runner and sidesteps the loader issue. Tracked in parent issue `mqe32t3er6` (decision: `mqgvczj5ua`).

### Gotcha: `agt list` output is truncated in the tool preview — a known issue can look missing

`agt list` (no filter) returns a payload large enough that the Bash tool-result preview truncates it, and the persisted full output goes to a `tool-results/*.txt` file. An issue that `agt view <id>` confirms exists can appear **absent** from `agt list` simply because its line fell past the preview window or didn't match a naive `grep` against the truncated slice. This bit during the 15th leak triage (`mqh11fqlw2`): the assigned issue didn't show in the preview, leading to a brief "is it even in the list?" detour.

**Workaround:** don't trust a "not found" result from grepping the previewed slice of a long `agt list`. Either:
- Filter the list up front (`agt list --assignee webapp-validator` or `--status <status>`) to shrink the payload, or
- Grep the **persisted full-output file** that the tool result points to (`/Users/.../<session-dir>/tool-results/<hash>.txt`), not the inline preview.

For recurring leak triage specifically, `agt list --assignee webapp-validator` plus a grep of the saved file for the issue's stamp/timestamp is the reliable way to confirm the canonical 5-sibling batch.
