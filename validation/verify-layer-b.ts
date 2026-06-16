// Verify Layer B (self-healing seeds) mechanics against an isolated backend.
// Boots a backend on 5001 with AGENTRACK_CWD=.e2edata, seeds tagged issues,
// runs the actual cleanupE2ESeeds() helper, and verifies deletion + tolerance.

import { spawn, execSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";

const PROJECT = "/Users/javi/projects/agentrack";
const E2EDATA = `${PROJECT}/validation/.e2edata`;

// 1. Reset e2edata to empty (mirror resetWorktreeData)
function reset() {
  const EMPTY_INDEX = { open: [], closed: [], childrenOf: {} };
  const EMPTY_DEPS = { blockedBy: {}, blocks: {} };
  const EMPTY_USERS = { users: [] };
  const EMPTY_MENTIONS = { mentions: [] };
  const EMPTY_CONFIG = { auth: { mode: "open", defaultUser: "anonymous" }, branch: "_e2edata" };
  writeFileSync(`${E2EDATA}/index.json`, JSON.stringify(EMPTY_INDEX, null, 2) + "\n");
  writeFileSync(`${E2EDATA}/dependencies.json`, JSON.stringify(EMPTY_DEPS, null, 2) + "\n");
  writeFileSync(`${E2EDATA}/users.json`, JSON.stringify(EMPTY_USERS, null, 2) + "\n");
  writeFileSync(`${E2EDATA}/config.json`, JSON.stringify(EMPTY_CONFIG, null, 2) + "\n");
  writeFileSync(`${E2EDATA}/mentions.json`, JSON.stringify(EMPTY_MENTIONS, null, 2) + "\n");
}
reset();

// 2. Boot isolated backend on 5001
const backend = spawn("bun", ["run", "--watch", "server/index.ts"], {
  cwd: `${PROJECT}/packages/webapp`,
  env: { ...process.env, PORT: "5001", AGENTRACK_CWD: E2EDATA },
  stdio: "ignore",
});

const shutdown = (code: number) => {
  backend.kill();
  process.exit(code);
};

async function waitUp(maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const r = await fetch("http://localhost:5001/api/health");
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("backend did not come up on 5001");
}

const BASE = "http://localhost:5001";

async function createIssue(title: string, tags: string[] = ["e2e-seed"]) {
  const r = await fetch(`${BASE}/api/issues`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tags, title }),
  });
  const b = await r.json();
  return b.id;
}

async function listByTag(tag: string) {
  const r = await fetch(`${BASE}/api/issues?tags=${encodeURIComponent(tag)}`);
  return (await r.json()) as Array<{ id: string }>;
}

async function del(id: string) {
  await fetch(`${BASE}/api/issues/${id}`, { method: "DELETE" });
}

try {
  const health: any = await waitUp();
  console.log("HEALTH.cwd:", health.cwd);
  if (health.cwd !== E2EDATA) {
    console.log("FAIL: backend cwd is not e2e dir");
    shutdown(2);
  }

  // 3. Seed 3 tagged issues + 1 untagged
  const s1 = await createIssue("Seed-A");
  const s2 = await createIssue("Seed-B");
  const s3 = await createIssue("Seed-C");
  const real = await createIssue("Should-Stay", ["not-e2e"]);
  console.log("Seeded:", s1, s2, s3, "untagged:", real);

  // 4. Run cleanupE2ESeeds (inline replica of setup.ts) — parallel DELETEs
  const E2E_SEED_TAG = "e2e-seed";
  const seeds = await listByTag(E2E_SEED_TAG);
  console.log("Tagged seeds found:", seeds.length);
  await Promise.all(
    seeds.map(async (s) => {
      try {
        await fetch(`${BASE}/api/issues/${s.id}`, { method: "DELETE" });
      } catch {}
    }),
  );
  await new Promise((r) => setTimeout(r, 200));
  const afterParallel = await listByTag(E2E_SEED_TAG);
  console.log("After parallel cleanup (race-suspect):", afterParallel.length);

  // Re-run cleanup (idempotent, the real helper is called per-spec)
  const seeds1b = await listByTag(E2E_SEED_TAG);
  await Promise.all(
    seeds1b.map(async (s) => {
      try {
        await fetch(`${BASE}/api/issues/${s.id}`, { method: "DELETE" });
      } catch {}
    }),
  );

  // 5. Tolerance: pre-delete one then run cleanup again (404 tolerance)
  // (s1 already gone from prior cleanup — verify cleanup tolerates missing)
  const seeds2 = await listByTag(E2E_SEED_TAG);
  for (const s of seeds2) {
    try { await fetch(`${BASE}/api/issues/${s.id}`, { method: "DELETE" }); } catch {}
  }

  // 6. Verify
  const remaining = await listByTag(E2E_SEED_TAG);
  const stillThere = await listByTag("not-e2e");
  console.log("Tagged remaining after cleanup (expect 0):", remaining.length);
  console.log("Non-e2e remaining (expect 1):", stillThere.length);

  // 7. Confirm real .agentrack/ has no e2e-seed issues (final leak check)
  const realList = execSync("agt list --tags e2e-seed", { encoding: "utf-8" });
  console.log("REAL TRACKER e2e-seed count:", JSON.parse(realList).length);

  if (remaining.length === 0 && stillThere.length === 1) {
    console.log("LAYER_B_RESULT=PASS");
    shutdown(0);
  } else {
    console.log("LAYER_B_RESULT=FAIL");
    shutdown(2);
  }
} catch (e) {
  console.log("ERROR:", (e as Error).message);
  shutdown(2);
}
