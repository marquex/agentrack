import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Tracker } from "../../../src/core/tracker";

describe("Tracker", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `agentrack-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // ─── User Management Tests ───────────────────────────────────────

  describe("user management", () => {
    let tracker: Tracker;
    let savedToken: string | undefined;

    beforeEach(async () => {
      savedToken = process.env.AGT_USER_TOKEN;
      delete process.env.AGT_USER_TOKEN;
      tracker = new Tracker(testDir);
      await tracker.init();
    });

    afterEach(() => {
      if (savedToken !== undefined) {
        process.env.AGT_USER_TOKEN = savedToken;
      } else {
        delete process.env.AGT_USER_TOKEN;
      }
    });

    describe("usersRegister", () => {
      test("creates user and returns token with lowercased name", async () => {
        const result = await tracker.usersRegister("Alice");

        expect(result.result).toBe("OK");
        if (result.result === "OK") {
          expect(result.name).toBe("alice");
          expect(result.token).toMatch(/^tk_[a-z0-9]{8}$/);
        }
      });

      test("rejects duplicate name with USER_ALREADY_EXISTS", async () => {
        await tracker.usersRegister("alice");
        const result = await tracker.usersRegister("alice");

        expect(result.result).toBe("USER_ALREADY_EXISTS");
        if (result.result === "USER_ALREADY_EXISTS") {
          expect(result.message).toContain("alice");
        }
      });

      test('rejects "anonymous" as reserved name', async () => {
        const result = await tracker.usersRegister("anonymous");

        expect(result.result).toBe("USER_ALREADY_EXISTS");
        if (result.result === "USER_ALREADY_EXISTS") {
          expect(result.message).toContain("anonymous");
        }
      });

      test("persists user to users.json", async () => {
        await tracker.usersRegister("alice");

        const usersData = JSON.parse(
          readFileSync(join(testDir, ".agentrack", "users.json"), "utf-8"),
        );
        expect(usersData.users).toHaveLength(1);
        expect(usersData.users[0].name).toBe("alice");
        expect(usersData.users[0].token).toMatch(/^tk_[a-z0-9]{8}$/);
        expect(usersData.users[0].registeredAt).toBeTruthy();
      });

      test("rejects duplicate regardless of casing", async () => {
        await tracker.usersRegister("Alice");
        const result = await tracker.usersRegister("ALICE");

        expect(result.result).toBe("USER_ALREADY_EXISTS");
      });
    });

    describe("usersList", () => {
      test("returns users without tokens", async () => {
        await tracker.usersRegister("alice");
        await tracker.usersRegister("bob");

        const result = await tracker.usersList();
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          name: "alice",
          registeredAt: expect.any(String),
        });
        expect(result[1]).toEqual({
          name: "bob",
          registeredAt: expect.any(String),
        });
        // Tokens must NOT be included
        for (const user of result) {
          expect("token" in user).toBe(false);
        }
      });

      test("returns empty array when no users registered", async () => {
        const result = await tracker.usersList();
        expect(result).toEqual([]);
      });
    });

    describe("usersRevoke", () => {
      test("removes a user", async () => {
        await tracker.usersRegister("alice");
        const result = await tracker.usersRevoke("alice");

        expect(result).toEqual({ result: "OK" });

        // Verify user is actually removed
        const listResult = await tracker.usersList();
        expect(listResult).toHaveLength(0);
      });

      test("rejects with USER_NOT_FOUND for non-existent user", async () => {
        const result = await tracker.usersRevoke("nonexistent");

        expect(result.result).toBe("USER_NOT_FOUND");
        if (result.result === "USER_NOT_FOUND") {
          expect(result.message).toContain("nonexistent");
        }
      });

      test("name matching is case-insensitive", async () => {
        await tracker.usersRegister("Alice");
        const result = await tracker.usersRevoke("alice");

        expect(result).toEqual({ result: "OK" });
      });
    });

    describe("usersRegenerate", () => {
      test("generates new token for self", async () => {
        const regResult = await tracker.usersRegister("alice");
        if (regResult.result !== "OK") throw new Error("Register failed");
        const oldToken = regResult.token;

        // Set env var so resolveAuthor identifies caller as alice
        process.env.AGT_USER_TOKEN = oldToken;

        const result = await tracker.usersRegenerate("alice");
        if (result.result === "OK") {
          expect(result.token).not.toBe(oldToken);
          expect(result.token).toMatch(/^tk_[a-z0-9]{8}$/);
          expect(result.name).toBe("alice");
        } else {
          expect.unreachable("Expected OK result");
        }
      });

      test("rejects when caller is not the target user (self-service only)", async () => {
        const aliceResult = await tracker.usersRegister("alice");
        await tracker.usersRegister("bob");
        if (aliceResult.result !== "OK") throw new Error("Register failed");

        // Alice tries to regenerate bob's token
        process.env.AGT_USER_TOKEN = aliceResult.token;
        const result = await tracker.usersRegenerate("bob");

        expect(result.result).toBe("INVALID_TOKEN");
        if (result.result === "INVALID_TOKEN") {
          expect(result.message).toBeTruthy();
        }
      });

      test("rejects with USER_NOT_FOUND for non-existent user", async () => {
        // In open mode without token, resolveAuthor returns "anonymous".
        // Calling regenerate("anonymous") passes the self-service check
        // (anonymous === anonymous) but "anonymous" is never in users list.
        const result = await tracker.usersRegenerate("anonymous");
        expect(result.result).toBe("USER_NOT_FOUND");
      });

      test("persists new token to users.json", async () => {
        const regResult = await tracker.usersRegister("alice");
        if (regResult.result !== "OK") throw new Error("Register failed");
        process.env.AGT_USER_TOKEN = regResult.token;

        const genResult = await tracker.usersRegenerate("alice");
        if (genResult.result !== "OK") throw new Error("Regenerate failed");

        const usersData = JSON.parse(
          readFileSync(join(testDir, ".agentrack", "users.json"), "utf-8"),
        );
        expect(usersData.users[0].token).toBe(genResult.token);
        expect(usersData.users[0].token).not.toBe(regResult.token);
      });
    });

    // ─── Token override (BUG-1 fix) ──────────────────────────────────
    describe("usersRegenerate token override", () => {
      test("succeeds with explicit token in open mode (no env var)", async () => {
        // Reproduces the BUG-1 scenario: webapp forwards the user's token
        // programmatically while AGT_USER_TOKEN is absent.
        const regResult = await tracker.usersRegister("alice");
        if (regResult.result !== "OK") throw new Error("Register failed");
        const oldToken = regResult.token;

        // No env var set — only the explicit token identifies the caller.
        const result = await tracker.usersRegenerate("alice", {
          token: oldToken,
        });

        expect(result.result).toBe("OK");
        if (result.result === "OK") {
          expect(result.name).toBe("alice");
          expect(result.token).toMatch(/^tk_[a-z0-9]{8}$/);
          expect(result.token).not.toBe(oldToken);
        }
      });

      test("explicit token takes precedence over conflicting env var", async () => {
        const aliceResult = await tracker.usersRegister("alice");
        const bobResult = await tracker.usersRegister("bob");
        if (aliceResult.result !== "OK" || bobResult.result !== "OK") {
          throw new Error("Register failed");
        }

        // Env var points to bob, but the explicit token authenticates alice.
        process.env.AGT_USER_TOKEN = bobResult.token;
        const result = await tracker.usersRegenerate("alice", {
          token: aliceResult.token,
        });

        expect(result.result).toBe("OK");
        if (result.result === "OK") {
          expect(result.name).toBe("alice");
        }
      });

      test("rejects with INVALID_TOKEN when explicit token belongs to another user", async () => {
        const aliceResult = await tracker.usersRegister("alice");
        await tracker.usersRegister("bob");
        if (aliceResult.result !== "OK") throw new Error("Register failed");

        // Alice forwards her token but asks to regenerate bob — must be refused.
        const result = await tracker.usersRegenerate("bob", {
          token: aliceResult.token,
        });

        expect(result.result).toBe("INVALID_TOKEN");
        if (result.result === "INVALID_TOKEN") {
          expect(result.message).toBeTruthy();
        }
      });

      test("throws INVALID_TOKEN when explicit token does not match any user", async () => {
        await tracker.usersRegister("alice");

        expect(() =>
          tracker.usersRegenerate("alice", { token: "tk_deadbeef" }),
        ).toThrow(/Invalid authentication token/);
      });

      test("omitting params preserves backward-compatible behavior", async () => {
        const regResult = await tracker.usersRegister("alice");
        if (regResult.result !== "OK") throw new Error("Register failed");
        process.env.AGT_USER_TOKEN = regResult.token;

        // Call with no second argument — pre-existing behavior must hold.
        const result = await tracker.usersRegenerate("alice");
        expect(result.result).toBe("OK");
      });
    });
  });
});
