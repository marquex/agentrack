/**
 * E2E: users — Type B tests (tracker operations)
 */
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertSuccess,
  ensureE2EWorktree,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: users", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  describe("users register", () => {
    test("creates a user and returns token", async () => {
      const result = await runAgt(["users", "register", "Alice"]);

      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.name).toBe("alice");
      expect(parsed.token).toMatch(/^tk_[a-z0-9]{8}$/);
    });

    test("rejects duplicate name", async () => {
      await runAgt(["users", "register", "alice"]);

      const result = await runAgt(["users", "register", "alice"]);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("USER_ALREADY_EXISTS");
    });

    test('rejects "anonymous" as reserved name', async () => {
      const result = await runAgt(["users", "register", "anonymous"]);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("USER_ALREADY_EXISTS");
    });
  });

  describe("users list", () => {
    test("shows registered users without tokens", async () => {
      await runAgt(["users", "register", "alice"]);
      await runAgt(["users", "register", "bob"]);

      const result = await runAgt(["users", "list"]);

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
      await runAgt(["users", "register", "alice"]);

      const result = await runAgt(["users", "revoke", "alice"]);

      assertSuccess(result);

      // Verify user is gone
      const listResult = await runAgt(["users", "list"]);
      const listParsed = parseJson(listResult.stdout);
      expect(listParsed).toHaveLength(0);
    });

    test("rejects non-existent user", async () => {
      const result = await runAgt(["users", "revoke", "nonexistent"]);

      expect(result.exitCode).toBe(1);

      const parsed = parseJson(result.stderr);
      expect(parsed.result).toBe("USER_NOT_FOUND");
    });
  });

  describe("users regenerate", () => {
    test("issues new token with own token via env var", async () => {
      const regResult = await runAgt(["users", "register", "alice"]);
      const oldToken = parseJson(regResult.stdout).token;

      const result = await runAgt(
        ["users", "regenerate", "alice"],
        undefined,
        { AGT_USER_TOKEN: oldToken },
      );

      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.name).toBe("alice");
      expect(parsed.token).toMatch(/^tk_[a-z0-9]{8}$/);
      expect(parsed.token).not.toBe(oldToken);
    });

    test("rejects when different user tries to regenerate", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobResult = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobResult.stdout).token;

      const result = await runAgt(
        ["users", "regenerate", "alice"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      expect(result.exitCode).toBe(3);

      const parsed = parseJson(result.stderr);
      expect(parsed.result).toBe("INVALID_TOKEN");
    });
  });
});
