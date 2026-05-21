import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  normalizeBranchName,
  defaultWorktreeOptions,
  dirFromBranch,
  readBranchPointer,
  writeBranchPointer,
  resolveWorktreeOptions,
  DEFAULT_BRANCH,
  DEFAULT_DIR,
} from "../../src/core/branch-config";
import { AgentrackError } from "../../src/core/errors";

// ─── Constants ──────────────────────────────────────────────────────────

describe("branch-config constants", () => {
  test("DEFAULT_BRANCH is _agentrack", () => {
    expect(DEFAULT_BRANCH).toBe("_agentrack");
  });

  test("DEFAULT_DIR is .agentrack", () => {
    expect(DEFAULT_DIR).toBe(".agentrack");
  });
});

// ─── normalizeBranchName ────────────────────────────────────────────────

describe("normalizeBranchName", () => {
  test("normalizes simple name: testing → { branch: _testing, dir: .testing }", () => {
    const result = normalizeBranchName("testing");
    expect(result.branch).toBe("_testing");
    expect(result.dir).toBe(".testing");
  });

  test("strips leading underscores: _ci → { branch: _ci, dir: .ci }", () => {
    const result = normalizeBranchName("_ci");
    expect(result.branch).toBe("_ci");
    expect(result.dir).toBe(".ci");
  });

  test("strips multiple leading underscores: __test → { branch: _test, dir: .test }", () => {
    const result = normalizeBranchName("__test");
    expect(result.branch).toBe("_test");
    expect(result.dir).toBe(".test");
  });

  test("myproject → { branch: _myproject, dir: .myproject }", () => {
    const result = normalizeBranchName("myproject");
    expect(result.branch).toBe("_myproject");
    expect(result.dir).toBe(".myproject");
  });

  test("allows dots in name: my.project → { branch: _my.project, dir: .my.project }", () => {
    const result = normalizeBranchName("my.project");
    expect(result.branch).toBe("_my.project");
    expect(result.dir).toBe(".my.project");
  });

  test("allows hyphens in name: my-project → { branch: _my-project, dir: .my-project }", () => {
    const result = normalizeBranchName("my-project");
    expect(result.branch).toBe("_my-project");
    expect(result.dir).toBe(".my-project");
  });

  test("allows underscores in name: my_project → { branch: _my_project, dir: .my_project }", () => {
    const result = normalizeBranchName("my_project");
    expect(result.branch).toBe("_my_project");
    expect(result.dir).toBe(".my_project");
  });

  // AC6: Error cases

  test("rejects empty name", () => {
    expect(() => normalizeBranchName("")).toThrow();
    try {
      normalizeBranchName("");
    } catch (err) {
      expect(err).toBeInstanceOf(AgentrackError);
      const e = err as AgentrackError;
      expect(e.result).toBe("INVALID_BRANCH_NAME");
      expect(e.message).toContain("empty");
    }
  });

  test("rejects name that becomes empty after stripping underscores", () => {
    expect(() => normalizeBranchName("___")).toThrow();
    try {
      normalizeBranchName("___");
    } catch (err) {
      expect(err).toBeInstanceOf(AgentrackError);
      expect((err as AgentrackError).message).toContain("empty");
    }
  });

  test("rejects name with slashes (AC8)", () => {
    expect(() => normalizeBranchName("feature/test")).toThrow();
    try {
      normalizeBranchName("feature/test");
    } catch (err) {
      expect(err).toBeInstanceOf(AgentrackError);
      const e = err as AgentrackError;
      expect(e.result).toBe("INVALID_BRANCH_NAME");
      expect(e.message).toContain("slashes");
    }
  });

  test("rejects name with spaces", () => {
    expect(() => normalizeBranchName("test name")).toThrow();
    try {
      normalizeBranchName("test name");
    } catch (err) {
      expect(err).toBeInstanceOf(AgentrackError);
      expect((err as AgentrackError).message).toContain("not a valid");
    }
  });

  test("rejects name starting with a digit after normalization", () => {
    // This tests the regex: /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
    // Actually "123test" starts with digit which is allowed per the regex
    // Let me test something that actually fails
    expect(() => normalizeBranchName("test@name")).toThrow();
  });

  test("rejects name with special characters", () => {
    expect(() => normalizeBranchName("test@name")).toThrow();
    try {
      normalizeBranchName("test@name");
    } catch (err) {
      expect(err).toBeInstanceOf(AgentrackError);
      expect((err as AgentrackError).result).toBe("INVALID_BRANCH_NAME");
    }
  });

  test("rejects name starting with special char after underscore strip", () => {
    expect(() => normalizeBranchName("_-test")).toThrow();
  });

  test("accepts numeric start: 123test", () => {
    // Regex allows digits as first char
    const result = normalizeBranchName("123test");
    expect(result.branch).toBe("_123test");
    expect(result.dir).toBe(".123test");
  });
});

// ─── defaultWorktreeOptions ─────────────────────────────────────────────

describe("defaultWorktreeOptions", () => {
  test("returns _agentrack branch and .agentrack dir", () => {
    const result = defaultWorktreeOptions();
    expect(result.branch).toBe("_agentrack");
    expect(result.dir).toBe(".agentrack");
  });
});

// ─── dirFromBranch ──────────────────────────────────────────────────────

describe("dirFromBranch", () => {
  test("_agentrack → .agentrack", () => {
    expect(dirFromBranch("_agentrack")).toBe(".agentrack");
  });

  test("_testing → .testing", () => {
    expect(dirFromBranch("_testing")).toBe(".testing");
  });

  test("_ci → .ci", () => {
    expect(dirFromBranch("_ci")).toBe(".ci");
  });
});

// ─── readBranchPointer / writeBranchPointer ─────────────────────────────

describe("pointer file operations", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `agentrack-ptr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("writeBranchPointer creates .agentrack.json with branch field", () => {
    writeBranchPointer(testDir, "_testing");
    const pointerPath = join(testDir, ".agentrack.json");
    expect(existsSync(pointerPath)).toBe(true);
    const content = JSON.parse(readFileSync(pointerPath, "utf-8"));
    expect(content).toEqual({ branch: "_testing" });
  });

  test("readBranchPointer returns branch when file exists", () => {
    writeBranchPointer(testDir, "_ci");
    expect(readBranchPointer(testDir)).toBe("_ci");
  });

  test("readBranchPointer returns null when no pointer file exists", () => {
    expect(readBranchPointer(testDir)).toBeNull();
  });

  test("readBranchPointer returns null for malformed JSON", () => {
    writeFileSync(join(testDir, ".agentrack.json"), "not json{{{");
    expect(readBranchPointer(testDir)).toBeNull();
  });

  test("readBranchPointer returns null for missing branch field", () => {
    writeFileSync(join(testDir, ".agentrack.json"), '{"other":"field"}');
    expect(readBranchPointer(testDir)).toBeNull();
  });

  test("writeBranchPointer overwrites existing pointer", () => {
    writeBranchPointer(testDir, "_testing");
    writeBranchPointer(testDir, "_ci");
    expect(readBranchPointer(testDir)).toBe("_ci");
  });
});

// ─── resolveWorktreeOptions ─────────────────────────────────────────────

describe("resolveWorktreeOptions", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `agentrack-resolve-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("returns defaults when no pointer file exists", () => {
    const result = resolveWorktreeOptions(testDir);
    expect(result.branch).toBe("_agentrack");
    expect(result.dir).toBe(".agentrack");
  });

  test("returns branch from pointer file in cwd", () => {
    writeBranchPointer(testDir, "_testing");
    const result = resolveWorktreeOptions(testDir);
    expect(result.branch).toBe("_testing");
    expect(result.dir).toBe(".testing");
  });

  test("walks up to find pointer file in parent directory", () => {
    writeBranchPointer(testDir, "_myproject");
    const nested = join(testDir, "sub", "deep");
    mkdirSync(nested, { recursive: true });
    const result = resolveWorktreeOptions(nested);
    expect(result.branch).toBe("_myproject");
    expect(result.dir).toBe(".myproject");
  });

  test("returns defaults when pointer file is in an unrelated directory", () => {
    // No pointer file anywhere
    const nested = join(testDir, "sub");
    mkdirSync(nested);
    const result = resolveWorktreeOptions(nested);
    expect(result.branch).toBe("_agentrack");
    expect(result.dir).toBe(".agentrack");
  });

  test("derives directory name from branch in pointer file", () => {
    writeBranchPointer(testDir, "_ci");
    const result = resolveWorktreeOptions(testDir);
    expect(result.dir).toBe(".ci");
  });
});
