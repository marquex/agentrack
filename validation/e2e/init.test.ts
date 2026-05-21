import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt } from "./helpers/setup";
import { assertSuccess, assertError, parseJson } from "./helpers/assertions";

describe("E2E: init", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestRepo("e2e-init");
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("init in a git repo creates worktree on _agentrack branch", async () => {
    const result = await runAgt(["init"], testDir);

    const output = assertSuccess(result);

    expect(output.result).toBe("OK");
    expect(output.scenario).toBe("fresh");
    expect(output.path).toContain(".agentrack");

    // Verify .agentrack directory exists as a worktree
    expect(existsSync(join(testDir, ".agentrack"))).toBe(true);
    expect(existsSync(join(testDir, ".agentrack", "config.json"))).toBe(true);
    expect(existsSync(join(testDir, ".agentrack", "index.json"))).toBe(true);
    expect(existsSync(join(testDir, ".agentrack", "dependencies.json"))).toBe(true);
    expect(existsSync(join(testDir, ".agentrack", "users.json"))).toBe(true);

    // Verify default config
    const config = JSON.parse(readFileSync(join(testDir, ".agentrack", "config.json"), "utf-8"));
    expect(config.auth.mode).toBe("open");
    expect(config.auth.defaultUser).toBe("anonymous");

    // Verify .gitignore has .agentrack entry
    const gitignore = readFileSync(join(testDir, ".gitignore"), "utf-8");
    expect(gitignore).toContain(".agentrack");
  });

  test("init when already initialized returns ALREADY_INITIALIZED", async () => {
    await initAgt(testDir);

    const result = await runAgt(["init"], testDir);

    expect(result.exitCode).toBe(0);
    const output = parseJson(result.stdout);
    expect(output.result).toBe("ALREADY_INITIALIZED");
    expect(output.path).toContain(".agentrack");
  });

  test("init creates gitignore if it does not exist", async () => {
    const gitignorePath = join(testDir, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(false);

    await runAgt(["init"], testDir);

    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, "utf-8");
    expect(content).toContain(".agentrack");
  });

  test("init appends to existing gitignore", async () => {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(testDir, ".gitignore"), "node_modules/\n");

    await runAgt(["init"], testDir);

    const content = readFileSync(join(testDir, ".gitignore"), "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".agentrack");
  });

  test("init in a directory that is not a git repo falls back to plain directory", async () => {
    const { mkdirSync } = await import("node:fs");
    const nonGitDir = join(testDir, "no-git");
    mkdirSync(nonGitDir, { recursive: true });

    const result = await runAgt(["init"], nonGitDir);

    expect(result.exitCode).toBe(0);
    const output = parseJson(result.stdout);
    expect(output.result).toBe("OK");
    expect(output.path).toContain(".agentrack");

    // Plain directory, not a worktree
    expect(existsSync(join(nonGitDir, ".agentrack", "config.json"))).toBe(true);
  });

  test("after init, create and list work correctly", async () => {
    await initAgt(testDir);

    // Create an issue
    const createResult = await runAgt(["create", "Post-init issue"], testDir);
    expect(createResult.exitCode).toBe(0);

    // List issues
    const listResult = await runAgt(["list"], testDir);
    expect(listResult.exitCode).toBe(0);
    const issues = parseJson(listResult.stdout);
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe("Post-init issue");
  });
});
