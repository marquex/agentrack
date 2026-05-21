import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveTrackerDir } from "../../src/core/resolution";
import { writeBranchPointer } from "../../src/core/branch-config";

describe("resolveTrackerDir with pointer file discovery", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `agentrack-res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("finds directory via pointer file: .agentrack.json → .testing/", () => {
    writeBranchPointer(testDir, "_testing");
    mkdirSync(join(testDir, ".testing"));
    const result = resolveTrackerDir(testDir);
    expect(result).toBe(join(testDir, ".testing").replace(/\/$/, ""));
  });

  test("finds directory via pointer file in parent directory", () => {
    writeBranchPointer(testDir, "_ci");
    mkdirSync(join(testDir, ".ci"));
    const nested = join(testDir, "sub", "deep");
    mkdirSync(nested, { recursive: true });
    const result = resolveTrackerDir(nested);
    expect(result).toContain(".ci");
  });

  test("falls back to .agentrack/ when pointer file does not exist", () => {
    mkdirSync(join(testDir, ".agentrack"));
    const result = resolveTrackerDir(testDir);
    expect(result).toContain(".agentrack");
  });

  test("returns null when pointer file exists but directory does not", () => {
    writeBranchPointer(testDir, "_testing");
    // Don't create .testing/ directory
    const result = resolveTrackerDir(testDir);
    expect(result).toBeNull();
  });

  test("prefers pointer file over .agentrack/ when both exist", () => {
    writeBranchPointer(testDir, "_custom");
    mkdirSync(join(testDir, ".custom"));
    mkdirSync(join(testDir, ".agentrack"));
    const result = resolveTrackerDir(testDir);
    expect(result).toContain(".custom");
    expect(result).not.toContain(".agentrack");
  });

  test("falls back to .agentrack/ when pointer file exists but directory is missing", () => {
    writeBranchPointer(testDir, "_testing");
    // Only .agentrack/ exists, not .testing/
    mkdirSync(join(testDir, ".agentrack"));
    const result = resolveTrackerDir(testDir);
    // Pointer file points to _testing but .testing/ doesn't exist,
    // so it should fall through to checking .agentrack/
    expect(result).toContain(".agentrack");
  });

  test("returns null when neither pointer file nor .agentrack/ exist", () => {
    const result = resolveTrackerDir(testDir);
    expect(result).toBeNull();
  });
});
