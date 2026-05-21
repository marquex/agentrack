import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt } from "./helpers/setup";
import { assertSuccess, assertError, parseJson } from "./helpers/assertions";

describe("E2E: users", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-users");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("register a user", async () => {
    const result = await runAgt(["users", "register", "Alice"], testDir);
    const output = assertSuccess<{ result: string; name: string; token: string }>(result);

    expect(output.result).toBe("OK");
    expect(output.name).toBe("alice");
    expect(output.token).toMatch(/^tk_[a-z0-9]{8}$/);
  });

  test("list users", async () => {
    await runAgt(["users", "register", "alice"], testDir);
    await runAgt(["users", "register", "bob"], testDir);

    const result = await runAgt(["users", "list"], testDir);
    const users = assertSuccess<Array<{ name: string; registeredAt: string }>>(result);

    expect(users).toHaveLength(2);
    expect(users[0].name).toBe("alice");
    expect(users[1].name).toBe("bob");
    expect(users[0].registeredAt).toBeTruthy();
    // Tokens must NOT be present
    for (const user of users) {
      expect("token" in user).toBe(false);
    }
  });

  test("revoke a user", async () => {
    await runAgt(["users", "register", "alice"], testDir);

    const result = await runAgt(["users", "revoke", "alice"], testDir);
    assertSuccess(result);

    // Verify user is gone
    const listResult = await runAgt(["users", "list"], testDir);
    const users = parseJson<unknown[]>(listResult.stdout);
    expect(users).toHaveLength(0);
  });

  test("revoke non-existent user returns USER_NOT_FOUND", async () => {
    const result = await runAgt(["users", "revoke", "nonexistent"], testDir);
    assertError(result, "USER_NOT_FOUND", 1);
  });

  test("regenerate token with own token", async () => {
    const regResult = parseJson<{ result: string; token: string }>(
      (await runAgt(["users", "register", "alice"], testDir)).stdout,
    );
    const oldToken = regResult.token;

    const result = await runAgt(
      ["users", "regenerate", "alice"],
      testDir,
      { AGENTACK_USER_TOKEN: oldToken },
    );
    const output = assertSuccess<{ result: string; name: string; token: string }>(result);

    expect(output.token).not.toBe(oldToken);
    expect(output.token).toMatch(/^tk_[a-z0-9]{8}$/);
  });

  test("regenerate with different user's token fails", async () => {
    await runAgt(["users", "register", "alice"], testDir);
    const bobResult = parseJson<{ token: string }>(
      (await runAgt(["users", "register", "bob"], testDir)).stdout,
    );

    const result = await runAgt(
      ["users", "regenerate", "alice"],
      testDir,
      { AGENTACK_USER_TOKEN: bobResult.token },
    );
    assertError(result, "INVALID_TOKEN", 3);
  });

  test("rejects duplicate name", async () => {
    await runAgt(["users", "register", "alice"], testDir);
    const result = await runAgt(["users", "register", "alice"], testDir);

    const output = parseJson<{ result: string }>(result.stdout);
    expect(output.result).toBe("USER_ALREADY_EXISTS");
  });

  test('rejects "anonymous" as reserved name', async () => {
    const result = await runAgt(["users", "register", "anonymous"], testDir);
    const output = parseJson<{ result: string }>(result.stdout);
    expect(output.result).toBe("USER_ALREADY_EXISTS");
  });

  test("register many users", async () => {
    for (let i = 0; i < 10; i++) {
      const result = await runAgt(["users", "register", `user${i}`], testDir);
      expect(result.exitCode).toBe(0);
    }

    const listResult = await runAgt(["users", "list"], testDir);
    const users = parseJson<unknown[]>(listResult.stdout);
    expect(users).toHaveLength(10);
  });
});
