import { spawn } from "bun";
import { join } from "node:path";

/**
 * Absolute path to the agentrack CLI entry point.
 * Resolved relative to this file's location (validation/e2e/helpers/).
 */
const PROJECT_ROOT = join(import.meta.dir, "..", "..", "..");
export const BIN_PATH = join(PROJECT_ROOT, "packages", "library", "src", "bin.ts");

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute an `agt` CLI command in a given working directory.
 *
 * Uses Bun.spawn to run the TypeScript CLI directly — no build step needed.
 * The cwd determines which git repo / agentrack instance the command operates on.
 *
 * @param args    CLI arguments (e.g. ["create", "My Issue", "--priority", "1"])
 * @param cwd     Working directory — typically a test git repo
 * @param env     Optional env overrides (e.g. { AGENTACK_USER_TOKEN: "tk_abc12345" })
 */
export async function runAgt(
  args: string[],
  cwd: string,
  env?: Record<string, string>,
): Promise<CommandResult> {
  const proc = spawn({
    cmd: ["bun", "run", BIN_PATH, ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout, stderr };
}
