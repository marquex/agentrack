/**
 * Configuration file stored at `.agentrack/config.json` (or custom worktree dir).
 * Controls authentication behavior for all operations.
 */
export interface ConfigFile {
  auth: {
    /** Authentication mode:
     * - "open" — no auth required, uses default user
     * - "read-only" — auth required for writes, reads use default user
     * - "strict" — auth required for all operations
     */
    mode: "open" | "read-only" | "strict";
    /** Default user name used when no token is provided. */
    defaultUser: string;
  };
  /** Branch name used for this agentrack instance (e.g. "_agentrack", "_testing").
   *  Defaults to "_agentrack" when absent. */
  branch?: string;
}
