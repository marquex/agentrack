/**
 * E2E: users — Type B tests (tracker operations)
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertSuccess,
  createEphemeralDir,
  ensureE2EWorktree,
  initGitRepo,
  parseJson,
  resetWorktreeData,
  rmEphemeralDir,
  runAgt,
} from "./setup";

describe("E2E: users", () => {
  let dir: string;

  beforeAll(async () => {
    dir = createEphemeralDir();
    initGitRepo(dir);
    await ensureE2EWorktree(dir, E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(dir, E2E_DATA_BRANCH);
  });

  afterAll(() => {
    rmEphemeralDir(dir);
  });

  describe("users register", () => {
    test("creates a user and returns token", async () => {
      const result = await runAgt(["users", "register", "Alice"], dir);

      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.name).toBe("alice");
      expect(parsed.token).toMatch(/^tk_[a-z0-9]{8}$/);
    });

    test("rejects duplicate name", async () => {
      await runAgt(["users", "register", "alice"], dir);

      const result = await runAgt(["users", "register", "alice"], dir);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("USER_ALREADY_EXISTS");
    });

    test('rejects "anonymous" as reserved name', async () => {
      const result = await runAgt(["users", "register", "anonymous"], dir);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("USER_ALREADY_EXISTS");
    });
  });

  describe("users list", () => {
    test("shows registered users without tokens", async () => {
      await runAgt(["users", "register", "alice"], dir);
      await runAgt(["users", "register", "bob"], dir);

      const result = await runAgt(["users", "list"], dir);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");

      const parsed = parseJson(result.stdout);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("alice");
      expect(parsed[1].name).toBe("bob");
      // Tokens must not be present
      for (const user of parsed) {
        expect("token" in user).toBe(false);
        expect(user.registeredAt).toBeTruthy();
      }
    });
  });

  describe("users revoke", () => {
    test("removes a user", async () => {
      await runAgt(["users", "register", "alice"], dir);

      const result = await runAgt(["users", "revoke", "alice"], dir);

      assertSuccess(result);

      // Verify user is gone
      const listResult = await runAgt(["users", "list"], dir);
      const listParsed = parseJson(listResult.stdout);
      expect(listParsed).toHaveLength(0);
    });

    test("rejects non-existent user", async () => {
      const result = await runAgt(["users", "revoke", "nonexistent"], dir);

      expect(result.exitCode).toBe(1);

      const parsed = parseJson(result.stderr);
      expect(parsed.result).toBe("USER_NOT_FOUND");
    });
  });

  describe("users regenerate", () => {
    test("issues new token with own token via env var", async () => {
      const regResult = await runAgt(["users", "register", "alice"], dir);
      const oldToken = parseJson(regResult.stdout).token;

      const result = await runAgt(
        ["users", "regenerate", "alice"],
        dir,
        { AGT_USER_TOKEN: oldToken },
      );

      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.name).toBe("alice");
      expect(parsed.token).toMatch(/^tk_[a-z0-9]{8}$/);
      expect(parsed.token).not.toBe(oldToken);
    });

    test("rejects when different user tries to regenerate", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobResult = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobResult.stdout).token;

      const result = await runAgt(
        ["users", "regenerate", "alice"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      expect(result.exitCode).toBe(3);

      const parsed = parseJson(result.stderr);
      expect(parsed.result).toBe("INVALID_TOKEN");
    });
  });
});
