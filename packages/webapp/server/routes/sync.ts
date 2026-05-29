import { Hono } from "hono";
import { pushWorktree, pullWorktree } from "agentrack";

const cwd = process.env.AGENTRACK_CWD || process.cwd();

const sync = new Hono();

// POST /api/sync/push — push local changes to remote
sync.post("/push", async (c) => {
  try {
    const result = await pushWorktree(cwd);
    return c.json(result);
  } catch (err) {
    throw err;
  }
});

// POST /api/sync/pull — pull remote changes
sync.post("/pull", async (c) => {
  try {
    const result = await pullWorktree(cwd);
    return c.json(result);
  } catch (err) {
    throw err;
  }
});

export default sync;
