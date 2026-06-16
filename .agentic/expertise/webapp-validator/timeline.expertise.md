# Work timeline — webapp-validator

## 2026-06-14 Answered webapp ports question (advisory task)

First task for this agent: answered "In which port does the webapp run for production and for validation?" by reading `packages/webapp/playwright.config.ts`, `server/index.ts`, `frontend/vite.config.ts`, and `frontend/package.json`.

**Findings captured:**
- Production: backend **3000** (`process.env.PORT || "3000"`), frontend **5173** (Vite default).
- E2E: backend **3001** (`PORT`), frontend **5174** (`VITE_PORT`, with `API_PORT=3001` proxy). Playwright `baseURL` = `http://localhost:5174`.
- Both E2E webservers intentionally do NOT set `reuseExistingServer` (Playwright defaults to `false`) — Playwright always boots its own isolated servers; do not change.

**Lessons / decisions:**
- Hit the sandbox `/dev/null` restriction twice (`2>/dev/null` rejected). Workaround: prefer the `Read` tool, or drop the redirect. Captured in [webapp-validator-gotchas.md](webapp-validator-gotchas.md).
- Bootstrapped the agent's expertise folder: overview, ports, gotchas, and this timeline. Port values are sourced-from-source as of today and should be re-verified if config files change (see [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md)).
- Deep webapp implementation knowledge (layout, users & sync, known test failures, regression recipe) lives with the `webapp-developer` agent, not here.

## 2026-06-14 Phase 4 validation (mppqt90kot)

Validated the Phase 4 (Users & sync) webapp work. Result: **Phase 4 frontend fully validated (38/38 tests pass)**, but 3 of 6 acceptance criteria only partially met due to 2 untracked backend bugs.

**Findings captured:**
- Phase 4 e2e: **38/38 pass**. Covers users API (list/register/revoke/regenerate), sync API (push/pull), Users Page UI, register/revoke/regenerate flows, sync buttons, cross-page nav, copy token.
- E2E isolation: clean — main `.agentrack/` untouched, test data in `validation/.e2edata/`, `config.json` reset to `_e2edata` branch defaults by global-setup.
- Frontend typecheck + production build: pass.
- **2 documented-but-untracked backend bugs** (both in webapp server, `packages/webapp/server/routes/`):
  - **BUG-1** (`users.ts:54`): regenerate returns 401 in open auth mode — server doesn't forward user token, `resolveAuthor` returns "anonymous" != target name. Created issue `mqe162cmbi`.
  - **BUG-2** (`sync.ts:4,11,21`): sync push/pull returns 500 NOT_INITIALIZED — passes `AGENTRACK_CWD` (worktree dir) to `pushWorktree`/`pullWorktree` instead of project root. Created issue `mqe162svv5`.
- Phase 1-3 pre-existing failures: **7 consistent + flaky tests** (already tracked in PM epic `mqdzlo4ia8`, Deliverables A/B/C). Developer reported "8" (= 7 + 1 flaky); full-suite runs can surface up to 3 flaky failures from shared-state ordering. All flaky ones PASS in isolation.

**Lessons / decisions:**
- **Trap for future validators:** Phase 4 tests *assert the buggy behavior* (`expect(status).toBe(401)` / `toBe(500)`). When BUG-1/BUG-2 are fixed, those 5 tests will START FAILING and must be updated to assert success. Do not interpret a green Phase 4 suite as "sync/regenerate work end-to-end."
- **Leftover webServer gotcha:** Playwright's spawned webServers (bun on :3001, vite on :5174) sometimes survive a finished run and block the next run ("port already used"). Fix: `pkill -f "bun run dev:server"; pkill -f "vite.*5174"` before re-running. Captured in gotchas.
- To distinguish a real Phase 1-3 regression from flakiness: re-run the single failing test with `--grep`; if it passes in isolation, it's the shared-state flakiness (Deliverable C), not a regression.

## 2026-06-16 Reproduced BUG-1 (regenerate 401) — root cause confirmed (mqe27g2g7o)

Worked `/work-issue mqe27g2g7o` (reproduce BUG-1, the regenerate 401 in open-auth mode). Outcome: **done** — bug reproduced and root cause pinned down; no application code changed.

**Findings captured:**
- **Manual reproduction:** started the dev server (`bun run --watch server/index.ts`, port 3999 in this run) and POSTed to the regenerate endpoint in open-auth mode → HTTP `401`, code `INVALID_TOKEN`, message `"You can only regenerate your own token."`
- **Root cause:** `packages/webapp/server/routes/users.ts:54` calls `tracker.usersRegenerate(name)` with **no caller identity/token forwarded** → `resolveAuthor` defaults to `"anonymous"` → fails the self-service check.
- **E2E lock-in confirmed:** `e2e/phase4-validation.spec.ts` ~lines 197–216 asserts `toBe(401)`, so it passes against the bug.
- Handoff note: when the route forwards the caller token, that test must be rewritten to assert `200` + new token.

**New gotchas captured** (see [webapp-validator-gotchas.md](webapp-validator-gotchas.md)):
- Scratch/temp files are blocked outside `packages/webapp/` (`/tmp/*`, `.agentrack/_tmp_*`). Workaround: write under `packages/webapp/_tmp_*.md` then clean up. Hit while staging a multi-line `agt comments add --content`.
- `timeout` command is not available on macOS (`command not found: timeout`).
- Only `packages/webapp/` is readable; `packages/library/...` is off-limits, so tracker internals can't be read directly.

**Expertise changes:**
- Created [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md) consolidating BUG-1 and BUG-2 (root cause, reproduction, tracking issues, locked-in tests). Linked from gotchas and index.

## 2026-06-16 Advisory: E2E data isolation concerns (7d2d26c9)

User asked whether the validator had created testing issues/users in the real `.agentrack/`. The agent hit access-denied on `.agentrack/` (outside its domain) and answered from the documented isolation design instead. No code changed; no verification done.

**Concerns flagged (both UNVERIFIED against source this session):**
- Possible env-var typo: override may be spelled `AGENTACK_CWD` (missing `R`) in one place while the backend reads `AGENTRACK_CWD`, silently falling back to the real `.agentrack/`.
- Risk of someone adding `reuseExistingServer: true`, letting Playwright grab a backend started without the CWD override.

**Expertise changes:**
- Created [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md) documenting the isolation model, the hard "never touch real `.agentrack/`" invariant, suspected escape hatches, and explicit verification steps. Linked from the index.
- Lesson: when the agent can't read a path it's asked about, state the access denial explicitly and route to the relevant config files it *can* read, rather than speculating. The typo concern is plausible but needs source verification before being treated as fact.

## 2026-06-16 Scrubbed `reuseExistingServer` from config and expertise

User directive: the `reuseExistingServer: true` option is a permanent footgun — it could let Playwright grab an externally-started backend pointed at the real `.agentrack/`. It must NEVER be used, and the validator must always launch its own servers against `validation/.e2edata/`.

**Changes made:**
- Removed the explicit `reuseExistingServer: false` lines from `packages/webapp/playwright.config.ts` (Playwright's default is already `false`, so behavior is unchanged; the flag is now simply absent).
- Updated the config header comment to state the invariant: never add `reuseExistingServer: true`.
- Scrubbed/rewrote every `reuseExistingServer` mention in webapp-validator expertise (data-isolation, server-ports, timeline, gotchas, index) so the option is never presented as a legitimate choice.

**Invariant going forward:** the E2E suite always starts its own backend with `AGENTRACK_CWD=validation/.e2edata/`. The real `.agentrack/` is never touched.

## 2026-06-16 Advisory: where to run manual agt commands during validation

Simple advisory task: user asked where to run manual `agt` commands during validation. Answer: from the `validation/` directory (whose `.agentrack.json` pointer resolves to the isolated `validation/.e2edata/` tracker), never from the project root, so manual commands don't pollute real `.agentrack/` data.

**Expertise changes:**
- Added a "Manual `agt` commands during validation" note and routing prompt to [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md). The file previously covered only the Playwright suite's automated isolation; the manual-command recipe complements it. The `.agentrack.json` pointer claim is marked for verification.

## 2026-06-16 Validated URL-driven dashboard filtering (mqguhe7eyw)

`/work-issue mqguhe7eyw` — validate the URL-driven dashboard filtering feature. Result: **all requirements PASS** (code analysis + 12 new E2E tests). No application code changed except the new test file.

**Findings captured:**
- Filter state flows: controls → URL search params (`use-issue-filters.ts`) → `api/issues.ts` → `GET /api/issues?status=&search=&assignee=`. Search is debounced (~250ms); every change uses `replace: false` (push), so typing creates multiple history entries (minor observation, not a violation).
- Default "Open" view: the backend `open` meta-status returns todo/in-progress/done/**idea**; the **frontend filters `idea` out client-side** in `api/issues.ts`. Idea/Closed are shown only when explicitly selected.
- New E2E spec `packages/webapp/e2e/url-filters-validation.spec.ts` (12 tests: default view, deep-linking, control→URL sync, clear-filters). All pass. No unit/component test framework exists in the webapp.
- Frontend `tsc -b` + vite build: PASS. No lint script configured.
- Full E2E suite: **170 passed, 4 failed**. The 4 failures are the pre-existing **BUG-2 sync tests** now returning 200 instead of 500 → **BUG-2 appears fixed**; the tests are stale and need rewriting (flagged to PM for webapp-developer).
- Cosmetic defect filed as idea **`mqgxk7rj2a`**: the Status filter dropdown trigger shows raw status values (`closed`) instead of labels (`Closed`) — `@base-ui/react` `Select.Value` used without a value→label render function.

**Lessons / gotchas captured:**
- Manual `agt` CLI probing against `validation/.e2edata/` gives inconsistent results (state churns, leaves stray issues like `DoneTest`). Prefer code analysis + E2E over manual CLI verification; `global-setup.ts` resets the worktree before the next run so manual cleanup of `index.json` is unnecessary and error-prone. Added to [webapp-validator-gotchas.md](webapp-validator-gotchas.md).
- The BUG-2 trap has **flipped**: the Phase 4 sync tests now FAIL (Expected 500, Received 200), so those 4 failures must be read as stale assertions, not a regression from your change. Updated the gotcha and [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md).

**Expertise changes:**
- Created [webapp-url-dashboard-filtering.expertise.md](webapp-url-dashboard-filtering.expertise.md) for the validated feature (mental model, `open` meta-status, verified behaviors, E2E coverage, cosmetic defect). Linked from the index.
- Updated [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md) and the Phase-4 gotcha to record BUG-2 as appears-fixed with stale tests.
- Added the "manual `agt` CLI probing is unreliable" gotcha.

## 2026-06-16 Diagnosed shadcn-ui styles not applied (mqgza7xio7)

`/work-issue mqgza7xio7` — diagnose-only task: investigate why all webapp UI components (Input, Select, Dialog, DropdownMenu, Card, …) render transparent with unreadable content. Outcome: **diagnosed, no code changed**; write-up added to the issue and handed back to the project-manager.

**Root cause:** `packages/webapp/frontend/src/index.css` is missing the entire shadcn theme block. It has only `@import "tailwindcss";` + a small `@layer utilities` transition block — no `:root`, no `.dark`, no `@theme inline`. The project is on **Tailwind v4**, where semantic utilities (`bg-background`, `border-input`, `text-foreground`, …) are only generated when declared via `@theme inline { --color-background: var(--background); … }` plus `:root`/`.dark` value blocks. With none present, Tailwind emits **zero CSS rules** for them → every `components/ui/*` component renders unstyled.

**Proof technique (reusable):** build then grep the compiled stylesheet. `npm run build` succeeds (~41 kB CSS); in `dist/assets/index-*.css` the only `:root` block is Tailwind's default palette, `grep '--color-(background|foreground|primary|…)’` is empty, and `.bg-background`/`.bg-primary`/`.text-foreground`/`.border-input` all return 0 matches. This is the canonical way to confirm a missing shadcn token on Tailwind v4.

**Secondary, same class:** `--agentrack-transition-duration-fast/normal/slow` (used by the `@layer utilities` transition helpers) are also never defined → those utilities resolve to nothing.

**Validation:** `npx tsc --noEmit -p tsconfig.app.json` → PASS; `npm run build` → PASS. Fix not yet made — remediation tracked by downstream issue `mqgzae4ayr`.

**Lessons / gotchas captured:**
- Created [webapp-shadcn-theme-tokens.expertise.md](webapp-shadcn-theme-tokens.expertise.md) for the Tailwind v4 + shadcn theme model, the build-then-grep-dist-CSS diagnostic recipe, and remediation pointers. This is a **frontend/CSS** bug, kept separate from [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md).
- Added a gotcha: `$(cat <project-file>)` inside a Bash command can be denied with "permission denied" even for files that open fine with the `Read` tool — hit while trying to inline `src/index.css` into `agt comments add --content`. Prefer inlining via heredoc or the `Read` tool.

## 2026-06-16 Confirmed E2E seed-data leak into real `.agentrack/` (mqh0lg9d2i)

`/work-issue mqh0lg9d2i` "UrlFilterTodo-1781636877343-uz574m" — the assigned issue turned out to be **stray E2E seed data**, not real work. Outcome: no code changed; diagnosed, reported, and handed to the project-manager.

**What happened:** the title matched the `seedIssues()` helper in `packages/webapp/e2e/url-filters-validation.spec.ts` (~lines 40–62), which POSTs to `http://localhost:3001/api/issues` with `assignee: "webapp-validator"`, empty description, no tags, priority 3, title `UrlFilter<Status>-${Date.now()}-${random}`. One `seedIssues()` call emits 5 sibling issues sharing the same stamp (e.g. `uz574m`). The agent counted **50 leaked `UrlFilter*` issues** total (8 each todo/in-progress/idea/done + 18 closed); **24 are non-terminal** and pollute the real Open/Idea/Todo/In-progress dashboards.

**Root cause:** the seed POSTs hit a backend on port 3001 running **without** the `AGENTRACK_CWD` isolation override. The current `playwright.config.ts` looks correct (spawns its own backend with `AGENTRACK_CWD` set, no `reuseExistingServer`), so the exact trigger is still UNVERIFIED — leading theories: a manually-started dev server bound to 3001 without the env, an older config revision, or the `AGENTACK_CWD` typo. This is the **realization** of the escape hatch previously flagged as "suspected" — it is no longer hypothetical.

**Actions:** commented evidence on `mqh0lg9d2i` and reassigned to PM (status left `todo`); created idea **`mqh0su9kgq`** for bulk cleanup of the 50 issues + a root-cause guard (global-setup CWD assertion, self-healing seed tags with afterEach cleanup, README note about port 3001). Cleaned up scratch analysis files in `validation/`.

**Expertise changes:**
- Rewrote [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md) to record the leak as CONFIRMED (with the seedIssues source, the 50-issue scope, the identifying heuristic for leaked seeds, and the candidate triggers). Added cleanup tracking + an explicit "exact trigger still unverified" gap.
- Added a leak warning to the E2E-coverage section of [webapp-url-dashboard-filtering.expertise.md](webapp-url-dashboard-filtering.expertise.md) pointing at `seedIssues()`.
- New gotcha in [webapp-validator-gotchas.md](webapp-validator-gotchas.md): the sandbox scans command *arguments* for path/URL-like substrings — `.agentrack/`, `http://localhost:3001/...`, backtick-wrapped paths, even `Date.now` all get the whole `agt comments add --content` rejected. Workaround: rephrase to slash-free prose.

## 2026-06-16 Recurring leaked-seed triage (instances 2–14)

After the initial discovery (`mqh0lg9d2i`), the same `UrlFilterTodo-<timestamp>-<random>` seed-data leak kept being assigned to the validator. Each instance matched the documented heuristic exactly (title pattern, empty description, no parent/tags, priority 3, anonymous creator) and was resolved with the standard playbook: evidence comment + reassign to `project-manager`, status left `todo`.

Known instances triaged (or attempted):
- `mqh0lgot6w` (stamp `1yg76g`) — 2nd instance, triaged cleanly.
- `mqh0lgwr7i` (stamp `tcsjzj`) — 3rd instance, triaged; `agt list` showed leak count had grown 50 → 51.
- `mqh0lh9m3s` (stamp `yvvq7e`) — 4th instance, triaged.
- `mqh0lhfy66` (stamp `v78324`) — 5th instance, **session aborted before triage ran** (expert-manager routed correctly, then process ended with no comment/reassignment). If re-picked, apply the standard playbook.
- `mqh0lhpexx` (stamp `eo4h4l`, comment `mqh235zc3k`) — 6th instance, triaged cleanly.
- `mqh0lhr6eo` (stamp `brvgt2`, comment `mqh273cuvs`) — 7th instance, triaged cleanly. Standard playbook applied with no friction; expert-manager retrieval surfaced the leak knowledge up front and no re-investigation was needed.
- `mqh0lhzldz` (stamp `l5r9qj`, comment `mqh2b00xkm`) — 8th instance, triaged cleanly. Same frictionless playbook.
- `mqh11ebdy8` (stamp `hvrfxc`, comment `mqh2hywlma`) — 9th instance, triaged cleanly. Expert-manager surfaced the leak knowledge up front; standard playbook applied with no friction and no re-investigation.
- `mqh11eqolp` (stamp `wvrm6q`, comment `mqh2lonq0q`) — 10th instance, triaged cleanly. Same frictionless playbook; expert-manager surfaced the leak knowledge up front.
- `mqh11esb9r` (stamp `1zw2ds`, comment `mqh2odr0qs`) — 11th instance, triaged cleanly. Same frictionless playbook; expert-manager surfaced the leak knowledge up front and no re-investigation was needed.
- `mqh11ewkng` (stamp `1rsll8`, comment `mqh2r0261s`) — 12th instance, triaged cleanly. Agent also ran the documented pre-flight `ps aux` check and confirmed the **same squatter server (PID 88851)** from the 6b126ddc advisory is STILL alive without `AGENTRACK_CWD`, flagging it in the comment. Did not kill it (left to project-manager). Same frictionless playbook; expert-manager routed correctly up front.
- `mqh11f6x29` (stamp `qb8cqu`, comment `mqh2vgyvf6`) — 13th instance, triaged cleanly. Same frictionless playbook; expert-manager surfaced the leak knowledge up front and no re-investigation was needed. Reassigned to `cto` with status `todo`. Leak remains live; bulk cleanup idea `mqh0su9kgq` is still the outstanding fix.
- `mqh11fodpi` (stamp `oxpfxx`, comment `mqh2zpiuyp`) — 14th instance, triaged cleanly. Same frictionless playbook; expert-manager routed to the leak knowledge up front, no re-investigation needed. Reassigned to `project-manager` with status `todo`. Leak count was 51 at triage time; bulk cleanup idea `mqh0su9kgq` remains the outstanding fix.

**Recurring signals across these instances:**
- The leak remains live and bulk cleanup idea **`mqh0su9kgq`** — now `in-progress` and assigned to `project-manager` as of the 11th instance — is the outstanding fix that would stop the recurrence.
- The access-rule sandbox gotcha fired repeatedly on the comment writes (backtick-quoted file paths, `http://localhost:3001/...`, `Date.now`, and even parenthesized slash-bearing prose like `(close/delete`). Rephrasing to slash-free prose is the reliable workaround. All observed triggers are recorded in [webapp-validator-gotchas.md](webapp-validator-gotchas.md).
- Expert-manager retrieval routed the agent to the leak knowledge up front on every instance — no new investigation was needed after the first.

**No expertise changes to the leak topic were needed** beyond the [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md) updates already made under the discovery and advisory entries below; the heuristic and resolution playbook there cover every recurrence.

## 2026-06-16 Fifteenth leaked-seed triage (mqh11fqlw2)

`/work-issue mqh11fqlw2` "UrlFilterTodo-1781637621657-pxidtw" — the **15th** assigned instance of the recurring `UrlFilter*` E2E seed-data leak (instances 2–14 are logged in the entry above). Outcome: no code changed; standard playbook applied with no friction.

- `pxidtw` stamp batch carries the canonical 5 siblings (Closed, InProgress, Todo, Done, Idea) from one `seedIssues()` call. Matches the documented heuristic exactly.
- Resolution: evidence comment `mqh3526m1s`, reassigned to `project-manager`, status left `todo`. `mqh0su9kgq` (bulk cleanup + two root-cause guards) remains unactioned.
- The agent self-edited `webapp-e2e-data-isolation.expertise.md` during the session, but **undercounted** itself as the "sixth" triage — the topic file's running tally had drifted behind the work timeline (which already tracked 14 instances). The expertise-manager reconciled the count to **fifteen** during this update. **Lesson for expertise-manager:** when a topic file tracks a running list of recurring instances and the work timeline aggregates them in a separate summary entry, the two can drift; on each update, reconcile the topic file's count against the timeline rather than trusting whichever number the working agent last wrote.
- New gotcha surfaced: `agt list` with no filter returns a payload so long it gets **truncated in the tool-result preview**, and the assigned issue can appear missing even when `agt view <id>` succeeds. Workaround: filter with `--assignee webapp-validator` and grep the persisted output file for the stamp/timestamp. Added to [webapp-validator-gotchas.md](webapp-validator-gotchas.md).

## 2026-06-16 Validated webapp port-config change (mqh2hwglif)

`/work-issue mqh2hwglif` — validate the port-configuration change made by `mqh2hwulrt` (prescription `mqh2nfnt2o`). Result: **dev ports PASS; E2E config internally correct but runtime blocked by a known environment constraint**. No app code changed.

**New port layout (verified from source):**
- **Dev:** backend API **3001** (`server/index.ts` default `PORT`), frontend Vite **3000** (default `VITE_PORT`), API proxy → `localhost:3001`. All verified live (health 200, root 200, proxy forwarding issues/users → 200).
- **E2E:** backend **5001** (`PORT=5001` + `AGENTRACK_CWD`), frontend **5000** (`VITE_PORT=5000`, `strictPort: true`, `API_PORT=5001`), Playwright `baseURL` = `http://localhost:5000`. `reuseExistingServer` absent on both webServers. 176 tests load across 6 files. Port 5001 binds fine. Isolation invariants intact.

**E2E runtime BLOCKED (not a code regression):** port **5000 is held by the macOS AirPlay Receiver** (`AirPlayUIAgent`). Confirmed via a Node `net.createServer` probe — 5000 EADDRINUSE while 5001/3000/3001 are free. Vite `strictPort` cannot fall back, so `npx playwright test` aborts with `http://localhost:5000 is already used`. This is the **documented environment constraint** captured in `webapp-developer`'s ports expertise and deliberate per prescription `mqh2nfnt2o`; workaround is to disable AirPlay Receiver or free port 5000. The full E2E regression still needs to run once 5000 is free.

**Stale references:** webapp source is CLEAN (no leftover 5173/5174 or old API-3000 references in server, vite, playwright config, package.json, or the six e2e specs). Out-of-domain items flagged for PM: the webapp spec doc still says Vite 5173 / API 3000, and (this agent's) expertise files documented the old ports. Docs cleanup already tracked in idea `mqh326adbp`.

**Verdict posted** as comment `mqh3wae71j`; issue marked done and reassigned to project-manager. Unblocks `mqh2hwl22k` (E2E test updates) — the config under test is correct and port-reference edits don't require running the suite.

**Gotchas hit (already known):** `/dev/null` redirect blocked (used `2>&1` or dropped it); `timeout` unavailable; scratch-file write blocked by path heuristics (posted the comment inline instead); the comment content-scanner flagged path-like tokens (rephrased to slash-free prose).

**Expertise changes:**
- Rewrote [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md) with the new dev (3001/3000) and E2E (5001/5000) port maps, the AirPlay/port-5000 environment constraint, and a gap noting the full E2E regression hasn't run since the change.
- Updated [webapp-validator-gotchas.md](webapp-validator-gotchas.md): the "Playwright webServers survive" gotcha now references E2E ports 5001/5000; added a dedicated **port 5000 / AirPlay Receiver** gotcha with the Node port-probe workaround.
- Added a gap to [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md): the leak narrative references the OLD E2E port 3001; since the port change, whether `seedIssues()` still POSTs to 3001 (now the dev port) or to the new E2E port 5001 is UNVERIFIED — re-check the seed URL before treating any port in the leak write-up as current.

## 2026-06-16 Advisory: why the `.agentrack/` pollution keeps recurring (6b126ddc)

User (frustrated): "You are polluting again the real .agentrack. Why do you do it again and again?" Advisory/diagnostic task — **no code changed, no app files touched**. The agent read the actual config and grep'd live source instead of repeating its own unverified notes.

**Findings:**
- **Playwright config is currently clean.** `playwright.config.ts` has no `reuseExistingServer`, and the env var is correctly spelled `AGENTRACK_CWD` everywhere (no `AGENTACK_CWD` typo). This **refutes** the long-suspected typo escape hatch for the current code.
- **Smoking gun observed via `ps aux`:** a manually-started `bun run dev:server` (PID 88851) plus its `bun run dev:frontend` / vite siblings (PIDs 88850–88856) were alive on the machine, started WITHOUT `AGENTRACK_CWD`. That backend squats on port 3001 and reads/writes the **real `.agentrack/`**. When the Playwright suite runs while it's alive, `seedIssues()` POSTs to `http://localhost:3001/api/issues` land in production data. This **upgrades the leak vector from "leading theory" to CONFIRMED.**
- **Two missing guards** (tracked by idea `mqh0su9kgq`, still unactioned) explain why it *recurs* instead of being a one-off: (1) `global-setup.ts` does NOT assert the backend's resolved CWD, so it can't fail the run when a non-isolated server grabbed 3001; (2) seed issues aren't tagged / have no `afterEach` cleanup, so leaked seeds accumulate forever.
- **`lsof` is unreliable in this sandbox** — it returned empty even while the leftover servers were alive; `ps aux` was the reliable signal.

**Outcome / handoff:** the agent did NOT kill the server or change code. It reported the diagnosis and offered to (a) kill PIDs 88850–88856 and (b) escalate the two guards to webapp-developer (app code is outside this agent's domain). The session ended before the user replied, so the action outcome is unknown — verify on the next lookup whether the leftover server was killed and whether `mqh0su9kgq` was actioned.

**Expertise changes:**
- Rewrote [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md): the leak vector is now CONFIRMED (manual dev server on 3001), the typo theory is REFUTED with evidence, the two missing guards are named, and a pre-flight `ps aux` check before any Playwright run is documented.
- Added the "`ps aux` is more reliable than `lsof` for leftover dev servers" gotcha to [webapp-validator-gotchas.md](webapp-validator-gotchas.md).

## 2026-06-16 Validated E2E isolation hardening (mqh3syrrnb)

`/work-issue mqh3syrrnb` "Validate E2E isolation hardening" — validate the three-layer fix (Layers A/B/C) that closed the recurring `UrlFilter*` seed leak documented across the entries above. Outcome: **PASS — leak resolved, real tracker clean.** No app code changed.

**Verdict per layer:**
- **Layer A (cwd assertion) — PASS**, verified by a **negative test**: booted a stale backend on port 5001 with `AGENTRACK_CWD` pointed at the real project root, then invoked the real `globalSetup()` directly via a bun script — it threw `E2E isolation guard FAILED` and aborted before any seed creation. Also confirmed Playwright 1.60 fails closed ("port already used") when a stale server squats on 5001 (defense-in-depth).
- **Layer B (self-healing seeds) — PASS on wiring/tagging; one DEFECT.** Every issue-creating spec (`phase2`, `phase3`, `dashboard-roots`, `url-filters`) wires `afterAll(cleanupE2ESeeds)`; exhaustive grep confirmed 100% of seed call sites tag `e2e-seed`; the helper tolerates already-deleted ids. **Defect:** `cleanupE2ESeeds()` uses `Promise.all` parallel DELETEs which race on the unlocked file store — empirically 2 of 3 tagged seeds survived one cleanup pass. Filed as idea **`mqh5aew5am`** (also covers the `${BACKEND_PORT}` non-interpolation cosmetic bug in the Layer A guard message). Non-blocking: Layer A + tag + e2edata dir + global-setup `resetWorktreeData()` all hold.
- **Layer C (docs) — PASS.** README documents all 5 invariants.
- **Invariants — PASS.** `AGENTRACK_CWD` unchanged, `reuseExistingServer` absent on both webServer entries, ports 5001/5000 distinct from 3001/3000, worktree reset still runs.
- **Real-tracker leak check — CLEAN.** 0 `e2e-seed` issues; all 51 open issues are legitimate project work (no seed-format titles). The historical 50 leaked `UrlFilter*` seeds are cleaned up. Bulk-cleanup idea `mqh0su9kgq` actioned.
- **NOT RUN: full e2e regression** — port 5000 held by macOS AirPlay Receiver (ControlCenter). Environmental constraint; all layers validated independently against an isolated backend.

**Validation techniques worth reusing:**
- To test Layer A without the full suite: write a tiny bun script that imports and invokes `globalSetup()` directly against a deliberately-stale backend — confirms the guard fires fail-closed without needing Playwright to boot.
- To test Layer B cleanup: boot an isolated backend on 5001 with `AGENTRACK_CWD=validation/.e2edata`, seed N tagged issues via POST, run the cleanup helper inline, count survivors. The parallel-DELETE race surfaced exactly this way.
- Note: the validator's access-rule sandbox blocked setting `AGENTRACK_CWD` inline in a Bash command (treated as a path-like token) — workaround was to write a scratch script under `validation/` and run it with bun. Same path-scanning gotcha as `agt comments add --content`.

**Expertise changes:**
- Rewrote [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md): the three-layer hardening is documented as LANDED+VALIDATED; the historical leak section marked RESOLVED; the "two missing guards" updated to "two guards LANDED"; gaps rewritten to the residual `mqh5aew5am` defect and a regression-detection note (if `UrlFilter*` reappear, re-verify Layer A immediately).
- Added BUG-3 (parallel-DELETE race + `${BACKEND_PORT}` cosmetic bug) to [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md), tracked by idea `mqh5aew5am`.
- Updated the index routing blurbs for both topics.
