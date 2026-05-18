import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const AGENTACK_DIR = ".agentrack";

/**
 * Walk up from `cwd` looking for a `.agentrack/` directory.
 * Returns the absolute path to `.agentrack/` if found, or `null` if not found.
 * Stops at filesystem root.
 */
export function resolveTrackerDir(cwd: string): string | null {
  let current = resolve(cwd);

  while (true) {
    const candidate = join(current, AGENTACK_DIR);
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(current);
    if (parent === current) {
      // Reached filesystem root
      return null;
    }
    current = parent;
  }
}
