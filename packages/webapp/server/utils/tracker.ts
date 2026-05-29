import { Tracker } from "agentrack";

/**
 * Singleton Tracker instance.
 *
 * Uses AGENTACK_CWD env var if set, otherwise falls back to process.cwd().
 */
const cwd = process.env.AGENTACK_CWD || process.cwd();

export const tracker = new Tracker(cwd);
