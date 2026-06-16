import { Hono } from "hono";
import { tracker, cwd } from "../utils/tracker.js";
import type { HealthResponse } from "../types.js";

const health = new Hono();

health.get("/", (c) => {
  let trackerStatus: "initialized" | "not_initialized" = "not_initialized";

  try {
    // Check if agentrack is initialized by attempting to access the worktree
    const initialized = tracker.isWorktreeInitialized();
    trackerStatus = initialized ? "initialized" : "not_initialized";
  } catch {
    trackerStatus = "not_initialized";
  }

  return c.json<HealthResponse>({
    status: "ok",
    tracker: trackerStatus,
    // Echo the resolved cwd so test harnesses can verify data isolation
    // (the backend must point at validation/.e2edata/, never real .agentrack/).
    cwd,
  });
});

export default health;
