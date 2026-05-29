import { Hono } from "hono";
import { tracker } from "../utils/tracker.js";

const users = new Hono();

// GET /api/users — list registered users
users.get("/", async (c) => {
  const result = await tracker.usersList();

  if ("result" in result && "message" in result) {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result);
});

export default users;
