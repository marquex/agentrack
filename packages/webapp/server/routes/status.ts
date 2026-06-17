import { Hono } from "hono";
import { cwd } from "../utils/tracker.js";
import type { StatusResponse } from "../types.js";

/**
 * Authoritative environment/isolation endpoint.
 *
 * Returns the resolved tracker cwd (AGENTRACK_CWD || process.cwd()). The
 * value is sourced from the shared `cwd` export in utils/tracker.ts so the
 * endpoint and the Tracker singleton can never drift — E2E global-setup reads
 * this to verify the backend is pointed at validation/.e2edata/ and not the
 * real .agentrack/ directory before any seed is created.
 */
const status = new Hono();

status.get("/", (c) => c.json<StatusResponse>({ agentrackPath: cwd }));

export default status;
