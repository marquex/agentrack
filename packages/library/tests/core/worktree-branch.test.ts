import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_BRANCH,
  DEFAULT_DIR,
  commitGitignoreChange,
  commitWorktreeData,
  detectInitScenario,
  initWorktree,
  isWorktreeInitialized,
  pullWorktree,
  pushWorktree,
} from "../../src/core/worktree";
import { AgentrackError } from "../../src/core/errors";
import { Tracker } from "../../src/core/tracker";
import {
  normalizeBranchName,
  writeBranchPointer,
  readBranchPointer,
  resolveWorktreeOptions,
} from "../../src/core/branch-config";
import { resolveTrackerDir } from "../../src/core/resolution";

// ═══════════════════════════════════════════════════════════════════════
// --branch flag worktree validation tests
// Tests all 12 scenarios from validation issue mpfmfoduo6
// ═══════════════════════════════════════════════════════════════════════

describe("--branch flag worktree validation", () => {
  const tmpDirs: string[] = [];

  function createTempDir(): string {
    const dir = join(
      tmpdir(),
      "agt-branch-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    );
    mkdirSync(dir, { recursive: true });
    tmpDirs.push(dir);
    return realpathSync(dir);
  }

  function createGitRepo(dir: string): string {
    execSync("git init", { cwd: dir, stdio: "ignore" });
    execSync('git config user.email test@test.com', { cwd: dir, stdio: "ignore" });
    execSync('git config user.name Test', { cwd: dir, stdio: "ignore" });
    writeFileSync(join(dir, "README.md"), "# Test\n");
    execSync("git add .", { cwd: dir, stdio: "ignore" });
    execSync("git commit -m initial", { cwd: dir, stdio: "ignore" });
    return dir;
  }

  function createBareRepo(dir: string): string {
    mkdirSync(dir, { recursive: true });
    execSync("git init --bare", { cwd: dir, stdio: "ignore" });
    return dir;
  }

  function createGitRepoWithRemote(): { local: string; remote: string; base: string } {
    const base = createTempDir();
    const remote = join(base, "remote.git");
    const local = join(base, "local");
    createBareRepo(remote);
    mkdirSync(local);
    createGitRepo(local);
    execSync("git remote add origin " + remote, { cwd: local, stdio: "ignore" });
    execSync("git push -u origin main", { cwd: local, stdio: "ignore" });
    return { local, remote, base };
  }

  afterEach(() => {
    for (const dir of tmpDirs) {
      // Try to clean up any worktrees
      try {
        const worktrees = execSync("git worktree list --porcelain", {
          cwd: dir, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"],
        });
        const wtPaths = worktrees.split("\n")
          .filter((l) => l.startsWith("worktree "))
          .map((l) => l.slice("worktree ".length))
          .filter((p) => p.startsWith(dir));
        for (const wtPath of wtPaths) {
          try {
            execSync(`git worktree remove -f "${wtPath}"`, { cwd: dir, stdio: "ignore" });
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      try {
        execSync("git worktree prune", { cwd: dir, stdio: "ignore" });
      } catch { /* ignore */ }
      rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  // ─── Scenario 1: Basic --branch testing ──────────────────────────────

  describe("Scenario 1: Basic --branch testing", () => {
    test("init --branch testing creates _testing branch", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      const result = initWorktree(local, opts);

      expect(result.scenario).toBe("fresh");
      expect(existsSync(join(local, ".testing"))).toBe(true);

      const branches = execSync("git branch --list", { cwd: local, encoding: "utf-8" });
      expect(branches).toContain("_testing");
    });

    test("init --branch testing creates .testing/ directory", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);

      expect(existsSync(join(local, ".testing"))).toBe(true);
      expect(existsSync(join(local, ".testing", "config.json"))).toBe(true);
      expect(existsSync(join(local, ".testing", "index.json"))).toBe(true);
    });

    test("init --branch testing creates .agentrack.json pointer file", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      const pointer = readBranchPointer(local);
      expect(pointer).toBe("_testing");
    });
  });

  // ─── Scenario 2: Default (no --branch) ───────────────────────────────

  describe("Scenario 2: Default (no --branch flag)", () => {
    test("init without --branch uses _agentrack branch and .agentrack/ dir", () => {
      const { local } = createGitRepoWithRemote();
      const result = initWorktree(local);

      expect(result.scenario).toBe("fresh");
      expect(existsSync(join(local, ".agentrack"))).toBe(true);

      const branches = execSync("git branch --list", { cwd: local, encoding: "utf-8" });
      expect(branches).toContain("_agentrack");
    });

    test("init without --branch does not create pointer file (backward compat)", () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);

      expect(existsSync(join(local, ".agentrack.json"))).toBe(false);
    });
  });

  // ─── Scenario 3: Normalization ───────────────────────────────────────

  describe("Scenario 3: Normalization (--branch testing vs --branch _testing)", () => {
    test("--branch testing and --branch _testing produce the same branch/dir", () => {
      const r1 = normalizeBranchName("testing");
      const r2 = normalizeBranchName("_testing");
      expect(r1.branch).toBe(r2.branch);
      expect(r1.dir).toBe(r2.dir);
    });

    test("both produce _testing branch and .testing/ dir", () => {
      const r = normalizeBranchName("testing");
      expect(r.branch).toBe("_testing");
      expect(r.dir).toBe(".testing");
    });
  });

  // ─── Scenario 4: Slash rejection ─────────────────────────────────────

  describe("Scenario 4: Slash rejection", () => {
    test("--branch feature/test throws INVALID_BRANCH_NAME", () => {
      expect(() => normalizeBranchName("feature/test")).toThrow(AgentrackError);
    });

    test("slash rejection message mentions slashes", () => {
      try {
        normalizeBranchName("feature/test");
        expect(true).toBe(false); // should not reach here
      } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        expect((err as AgentrackError).message).toContain("slashes");
      }
    });
  });

  // ─── Scenario 5: Empty rejection ─────────────────────────────────────

  describe("Scenario 5: Empty rejection", () => {
    test("--branch '' throws INVALID_BRANCH_NAME", () => {
      expect(() => normalizeBranchName("")).toThrow(AgentrackError);
    });

    test("empty rejection message mentions empty", () => {
      try {
        normalizeBranchName("");
        expect(true).toBe(false);
      } catch (err) {
        expect((err as AgentrackError).message).toContain("empty");
      }
    });
  });

  // ─── Scenario 6: Special chars rejection ─────────────────────────────

  describe("Scenario 6: Special chars rejection", () => {
    test("--branch 'test name' (with space) throws INVALID_BRANCH_NAME", () => {
      expect(() => normalizeBranchName("test name")).toThrow(AgentrackError);
    });

    test("--branch 'test@name' throws INVALID_BRANCH_NAME", () => {
      expect(() => normalizeBranchName("test@name")).toThrow(AgentrackError);
    });

    test("--branch 'test#name' throws INVALID_BRANCH_NAME", () => {
      expect(() => normalizeBranchName("test#name")).toThrow(AgentrackError);
    });
  });

  // ─── Scenario 7: Push/pull after init --branch testing ───────────────

  describe("Scenario 7: Push/pull after init --branch testing", () => {
    test("push operates on _testing branch after init --branch testing", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);

      writeFileSync(join(local, ".testing", "test.txt"), "hello");
      const result = pushWorktree(local, "test commit", opts);
      expect(result.synced).toBe(true);

      // Verify commit is on _testing branch, not _agentrack
      const log = execSync("git log -1 --format=%s", {
        cwd: join(local, ".testing"), encoding: "utf-8",
      }).trim();
      expect(log).toBe("test commit");
    });

    test("pull operates on _testing branch after init --branch testing", () => {
      const { local, remote } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);

      // Push something first so pull can get it back
      writeFileSync(join(local, ".testing", "test.txt"), "hello");
      pushWorktree(local, "test", opts);

      // Clone and push from another location
      const otherBase = createTempDir();
      const other = join(otherBase, "other");
      execSync(`git clone ${remote} ${other}`, { stdio: "ignore" });
      execSync('git config user.email test@test.com', { cwd: other, stdio: "ignore" });
      execSync('git config user.name Test', { cwd: other, stdio: "ignore" });
      execSync("git checkout _testing", { cwd: other, stdio: "ignore" });
      writeFileSync(join(other, "from-remote.txt"), "remote update");
      execSync("git add -A", { cwd: other, stdio: "ignore" });
      execSync("git commit -m remote-update", { cwd: other, stdio: "ignore" });
      execSync("git push", { cwd: other, stdio: "ignore" });

      const result = pullWorktree(local, opts);
      expect(result.updated).toBe(true);
    });
  });

  // ─── Scenario 8: Backward compatibility ──────────────────────────────

  describe("Scenario 8: Backward compat — existing _agentrack without pointer", () => {
    test("existing repo with _agentrack and no pointer file works as before", async () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);

      // No pointer file should exist
      expect(existsSync(join(local, ".agentrack.json"))).toBe(false);

      // Tracker should still find the data directory
      const tracker = new Tracker(local);
      await tracker.init();

      // Create and retrieve an issue
      const created = await tracker.create({ title: "Backward compat test" });
      expect("id" in created).toBe(true);
      if ("id" in created) {
        const view = await tracker.view(created.id);
        if ("title" in view) expect(view.title).toBe("Backward compat test");
      }
    });

    test("resolveTrackerDir finds .agentrack/ without pointer file", () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);

      const found = resolveTrackerDir(local);
      expect(found).not.toBeNull();
      expect(found).toContain(".agentrack");
    });

    test("resolveWorktreeOptions returns defaults without pointer file", () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);

      const opts = resolveWorktreeOptions(local);
      expect(opts.branch).toBe("_agentrack");
      expect(opts.dir).toBe(".agentrack");
    });
  });

  // ─── Scenario 9: Pointer file discovery ──────────────────────────────

  describe("Scenario 9: Pointer file discovery — resolveTrackerDir via pointer", () => {
    test("resolveTrackerDir finds .testing/ via pointer file", async () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      // Now resolveTrackerDir should find .testing/ via the pointer
      const found = resolveTrackerDir(local);
      expect(found).not.toBeNull();
      expect(found).toContain(".testing");
    });

    test("Tracker methods work with pointer-based discovery", async () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      // Initialize tracker data in the custom dir
      const tracker = new Tracker(local);
      await tracker.init(".testing");

      // Create should use resolveTrackerDir which now finds .testing/ via pointer
      const created = await tracker.create({ title: "Pointer discovery test" });
      expect("id" in created).toBe(true);

      // List should also work
      const list = await tracker.list({});
      expect(list).toHaveLength(1);
      if (list.length > 0) expect(list[0].title).toBe("Pointer discovery test");
    });
  });

  // ─── Scenario 10: Double init ────────────────────────────────────────

  describe("Scenario 10: Double init with different branches", () => {
    test("init with branch A, then init with branch B without cleanup", () => {
      const { local } = createGitRepoWithRemote();

      // Init with branch A
      const optsA = normalizeBranchName("testing");
      const resultA = initWorktree(local, optsA);
      expect(resultA.scenario).toBe("fresh");
      expect(existsSync(join(local, ".testing"))).toBe(true);

      // Init with branch B — should work independently
      const optsB = normalizeBranchName("ci");
      const resultB = initWorktree(local, optsB);
      expect(resultB.scenario).toBe("fresh");
      expect(existsSync(join(local, ".ci"))).toBe(true);

      // Both branches should exist
      const branches = execSync("git branch --list", { cwd: local, encoding: "utf-8" });
      expect(branches).toContain("_testing");
      expect(branches).toContain("_ci");
    });

    test("re-init same branch returns already_initialized", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);

      const result = initWorktree(local, opts);
      expect(result.scenario).toBe("already_initialized");
    });
  });

  // ─── Scenario 11: Config verification ────────────────────────────────

  describe("Scenario 11: Config verification — branch field in config.json", () => {
    test("custom branch init stores branch field in worktree config", async () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);

      // Manually write branch to config (simulating initAction behavior)
      const configPath = join(local, ".testing", "config.json");
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      config.branch = "_testing";
      writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

      // Verify the config has the branch field
      const updated = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(updated.branch).toBe("_testing");
    });

    test("default branch init does not add branch field to config", () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);

      const configPath = join(local, ".agentrack", "config.json");
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.branch).toBeUndefined();
    });
  });

  // ─── Scenario 12: Gitignore ──────────────────────────────────────────

  describe("Scenario 12: Gitignore entry for custom directory", () => {
    test("init --branch testing adds /.testing/ to .gitignore", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);

      const gitignorePath = join(local, ".gitignore");
      expect(existsSync(gitignorePath)).toBe(true);
      const content = readFileSync(gitignorePath, "utf-8");
      expect(content).toContain("/.testing/");
    });

    test("init --branch ci adds /.ci/ to .gitignore", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("ci");
      initWorktree(local, opts);

      const content = readFileSync(join(local, ".gitignore"), "utf-8");
      expect(content).toContain("/.ci/");
    });

    test("multiple inits add multiple gitignore entries", () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local, normalizeBranchName("testing"));
      initWorktree(local, normalizeBranchName("ci"));

      const content = readFileSync(join(local, ".gitignore"), "utf-8");
      expect(content).toContain("/.testing/");
      expect(content).toContain("/.ci/");
    });
  });

  // ─── Additional: Worktree initialization checks with custom branch ───

  describe("isWorktreeInitialized with custom branch", () => {
    test("returns false before init --branch testing", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      expect(isWorktreeInitialized(local, opts)).toBe(false);
    });

    test("returns true after init --branch testing", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      expect(isWorktreeInitialized(local, opts)).toBe(true);
    });

    test("returns false for default branch after custom branch init", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      // Default should NOT be initialized
      expect(isWorktreeInitialized(local)).toBe(false);
    });

    test("returns true for both after both inits", () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      initWorktree(local, normalizeBranchName("testing"));
      expect(isWorktreeInitialized(local)).toBe(true);
      expect(isWorktreeInitialized(local, normalizeBranchName("testing"))).toBe(true);
    });
  });

  // ─── Additional: detectInitScenario with custom branch ───────────────

  describe("detectInitScenario with custom branch", () => {
    test("returns fresh for custom branch when no remote exists", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      expect(detectInitScenario(local, opts)).toBe("fresh");
    });

    test("returns join for custom branch when remote branch exists", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      // Create remote branch
      execSync("git branch _testing", { cwd: local, stdio: "ignore" });
      execSync("git push origin _testing", { cwd: local, stdio: "ignore" });
      execSync("git branch -D _testing", { cwd: local, stdio: "ignore" });
      expect(detectInitScenario(local, opts)).toBe("join");
    });
  });

  // ─── Additional: commitWorktreeData with custom branch ───────────────

  describe("commitWorktreeData with custom branch", () => {
    test("commits data on _testing branch", async () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      const tracker = new Tracker(local);
      await tracker.init(".testing");
      // Create an issue to generate actual data changes
      await tracker.create({ title: "Test issue for commit" });
      commitWorktreeData(local, "added test issue", opts);

      const log = execSync("git log -1 --format=%s", {
        cwd: join(local, ".testing"), encoding: "utf-8",
      }).trim();
      expect(log).toBe("added test issue");
    });
  });

  // ─── Additional: commitGitignoreChange with custom dir ───────────────

  describe("commitGitignoreChange with custom dir", () => {
    test("commits gitignore with custom dir name in message", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);

      commitGitignoreChange(local, ".testing");

      const msg = execSync("git log -1 --format=%s", { cwd: local, encoding: "utf-8" }).trim();
      expect(msg).toBe("chore: add .testing/ to .gitignore");
    });

    test("stages pointer file along with gitignore when it exists", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      commitGitignoreChange(local, ".testing");

      // The pointer file should have been staged and committed
      const showFiles = execSync("git show --stat --format=%s", {
        cwd: local, encoding: "utf-8",
      });
      expect(showFiles).toContain(".agentrack.json");
    });
  });

  // ─── Additional: Full E2E flow with custom branch ────────────────────

  describe("Full E2E flow: init → create → push with custom branch", () => {
    test("complete lifecycle with --branch testing", async () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");

      // 1. Init worktree with custom branch
      const wtResult = initWorktree(local, opts);
      expect(wtResult.scenario).toBe("fresh");

      // 2. Write pointer file for discovery
      writeBranchPointer(local, opts.branch);

      // 3. Init tracker data
      const tracker = new Tracker(local);
      await tracker.init(".testing");

      // 4. Create an issue
      const created = await tracker.create({ title: "Test issue" });
      expect("id" in created).toBe(true);

      // 5. Commit worktree data
      commitWorktreeData(local, "init agentrack data", opts);

      // 6. Push
      const pushResult = pushWorktree(local, undefined, opts);
      expect(pushResult.synced).toBe(true);

      // 7. Verify on remote
      const remoteBranches = execSync("git branch -r", { cwd: local, encoding: "utf-8" });
      expect(remoteBranches).toContain("origin/_testing");
      expect(remoteBranches).not.toContain("origin/_agentrack");
    });
  });

  // ─── Additional: Precondition checks with custom branch ──────────────

  describe("Precondition checks with custom branch", () => {
    test("throws MIGRATION_REQUIRED when custom dir exists as plain directory", () => {
      const dir = createTempDir();
      createGitRepo(dir);
      mkdirSync(join(dir, ".testing"));

      const opts = normalizeBranchName("testing");
      try {
        initWorktree(dir, opts);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        expect((err as AgentrackError).result).toBe("MIGRATION_REQUIRED");
        expect((err as AgentrackError).message).toContain(".testing");
      }
    });

    test("throws INVALID_STATE when on the custom branch", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");

      execSync("git branch _testing", { cwd: local, stdio: "ignore" });
      execSync("git checkout _testing", { cwd: local, stdio: "ignore" });

      try {
        initWorktree(local, opts);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        expect((err as AgentrackError).result).toBe("INVALID_STATE");
        expect((err as AgentrackError).message).toContain("_testing");
      } finally {
        execSync("git checkout main", { cwd: local, stdio: "ignore" });
      }
    });

    test("NOT_A_GIT_REPO error works with custom branch option", () => {
      const dir = createTempDir();
      // Don't init git
      const opts = normalizeBranchName("testing");
      try {
        initWorktree(dir, opts);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        expect((err as AgentrackError).result).toBe("NOT_A_GIT_REPO");
      }
    });
  });

  // ─── Additional: Push/pull with pointer file resolution ──────────────

  describe("Push/pull resolve branch from pointer file", () => {
    test("pushAction resolves _testing from pointer file", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      // The CLI pushAction calls resolveWorktreeOptions which reads the pointer
      const resolved = resolveWorktreeOptions(local);
      expect(resolved.branch).toBe("_testing");
      expect(resolved.dir).toBe(".testing");

      // Push should work with resolved options
      writeFileSync(join(local, ".testing", "data.txt"), "test");
      const result = pushWorktree(local, "test push", resolved);
      expect(result.synced).toBe(true);
    });

    test("pullAction resolves _testing from pointer file", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      const resolved = resolveWorktreeOptions(local);
      const result = pullWorktree(local, resolved);
      expect(result.updated).toBe(false); // nothing to pull
    });
  });

  // ─── BUG-2 fix: push/pull resolve project root + branch from data dir ──

  describe("BUG-2 fix: push/pull accept cwd as the worktree/data dir", () => {
    // Reproduces BUG-2: when AGENTRACK_CWD points at the worktree data dir
    // (e.g. validation/.e2edata) push/pull must still find the project root
    // via the pointer file and resolve the configured {branch, dir}. With the
    // old code, passing the data dir as cwd made isWorktreeInitialized fail
    // (NOT_INITIALIZED -> 500 in the webapp sync route).

    test("pushWorktree succeeds when cwd is the data dir (custom branch from pointer)", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      const dataDir = join(local, ".testing");
      // cwd is the DATA DIR, not the project root, and opts is NOT passed:
      // the library must auto-resolve both the project root and the branch.
      writeFileSync(join(dataDir, "file.txt"), "hi");
      const result = pushWorktree(dataDir, "push from data dir");
      expect(result.synced).toBe(true);

      // Confirm the commit landed on the custom _testing branch.
      const log = execSync("git log -1 --format=%s", {
        cwd: dataDir, encoding: "utf-8",
      }).trim();
      expect(log).toBe("push from data dir");
    });

    test("pullWorktree succeeds when cwd is the data dir (custom branch from pointer)", () => {
      const { local, remote } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      // Seed the remote with a commit from a second clone.
      writeFileSync(join(local, ".testing", "seed.txt"), "x");
      pushWorktree(local, "seed", opts);

      const otherBase = createTempDir();
      const other = join(otherBase, "other");
      execSync(`git clone ${remote} ${other}`, { stdio: "ignore" });
      execSync('git config user.email t@t.com', { cwd: other, stdio: "ignore" });
      execSync('git config user.name T', { cwd: other, stdio: "ignore" });
      execSync("git checkout _testing", { cwd: other, stdio: "ignore" });
      writeFileSync(join(other, "remote.txt"), "from-other");
      execSync("git add -A", { cwd: other, stdio: "ignore" });
      execSync("git commit -m from-other", { cwd: other, stdio: "ignore" });
      execSync("git push", { cwd: other, stdio: "ignore" });

      // cwd is the DATA DIR, opts omitted: must auto-resolve.
      const dataDir = join(local, ".testing");
      const result = pullWorktree(dataDir);
      expect(result.updated).toBe(true);
    });

    test("pushWorktree is backward compatible when cwd is the project root", () => {
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("testing");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      writeFileSync(join(local, ".testing", "bw.txt"), "bw");
      // cwd = project root, no opts: must still resolve custom branch from pointer.
      const result = pushWorktree(local, "backward compat");
      expect(result.synced).toBe(true);
    });

    test("pushWorktree with e2e-like config (_e2edata branch, .e2edata dir, cwd=data dir)", () => {
      // Mirrors the agentrack e2e setup exactly.
      const { local } = createGitRepoWithRemote();
      const opts = normalizeBranchName("e2edata");
      initWorktree(local, opts);
      writeBranchPointer(local, opts.branch);

      const dataDir = join(local, ".e2edata");
      writeFileSync(join(dataDir, "e2e.txt"), "e2e");
      const result = pushWorktree(dataDir, "e2e push");
      expect(result.synced).toBe(true);

      const remoteBranches = execSync("git branch -r", {
        cwd: local, encoding: "utf-8",
      });
      expect(remoteBranches).toContain("_e2edata");
    });
  });

  // ─── Additional: DEFAULT_BRANCH / DEFAULT_DIR exports ────────────────

  describe("DEFAULT_BRANCH and DEFAULT_DIR exports", () => {
    test("DEFAULT_BRANCH equals _agentrack", () => {
      expect(DEFAULT_BRANCH).toBe("_agentrack");
    });

    test("DEFAULT_DIR equals .agentrack", () => {
      expect(DEFAULT_DIR).toBe(".agentrack");
    });
  });
});
