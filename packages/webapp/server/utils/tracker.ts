import { Tracker } from "agentrack";

/**
 * Singleton Tracker instance.
 *
 * Uses AGENTRACK_CWD env var if set, otherwise falls back to process.cwd().
 */
const cwd = process.env.AGENTRACK_CWD || process.cwd();

export const tracker = new Tracker(cwd);
