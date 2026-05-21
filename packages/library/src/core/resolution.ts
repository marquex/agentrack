import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { readBranchPointer, dirFromBranch } from "./branch-config";

const AGENTACK_DIR = ".agentrack";

/**
 * Walk up from `cwd` looking for the agentrack data directory.
 *
 * Discovery mechanism:
 * 1. First, walk up looking for a `.agentrack.json` pointer file
 * 2. If found, derive the directory name from the pointer and check it exists
 * 3. If no pointer file found, fall back to walking up looking for `.agentrack/`
 *
 * Returns the absolute path to the data directory if found, or `null` if not found.
 * Stops at filesystem root.
 */
export function resolveTrackerDir(cwd: string): string | null {
  let current = resolve(cwd);

  while (true) {
    // Try pointer file first (for configurable branch)
    const branch = readBranchPointer(current);
    if (branch) {
      const dir = dirFromBranch(branch);
      const candidate = join(current, dir);
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    // Fall back to default .agentrack/ (backward compat)
    const defaultCandidate = join(current, AGENTACK_DIR);
    if (existsSync(defaultCandidate)) {
      return defaultCandidate;
    }

    const parent = dirname(current);
    if (parent === current) {
      // Reached filesystem root
      return null;
    }
    current = parent;
  }
}
