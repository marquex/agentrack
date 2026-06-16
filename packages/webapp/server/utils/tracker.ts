import { Tracker } from "agentrack";

/**
 * Singleton Tracker instance.
 *
 * Uses AGENTRACK_CWD env var if set, otherwise falls back to process.cwd().
 */
/**
 * The resolved working directory the Tracker operates on.
 *
 * Echoed by the health endpoint so E2E global-setup can assert the backend
 * resolved AGENTRACK_CWD correctly (strongest isolation guard — fails the
 * run before any seed is created if a stale/wrong server is hit).
 */
export const cwd = process.env.AGENTRACK_CWD || process.cwd();

export const tracker = new Tracker(cwd);
