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

// POST /api/users — register a new user
users.post("/", async (c) => {
  const body = await c.req.json();

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return c.json(
      { error: true, code: "VALIDATION_ERROR", message: "Name is required" },
      400
    );
  }

  const result = await tracker.usersRegister(body.name.trim());

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result, 201);
});

// DELETE /api/users/:name — revoke a user
users.delete("/:name", async (c) => {
  const name = c.req.param("name");

  const result = await tracker.usersRevoke(name);

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json({ result: "OK" });
});

// POST /api/users/:name/regenerate — regenerate user token
users.post("/:name/regenerate", async (c) => {
  const name = c.req.param("name");

  const result = await tracker.usersRegenerate(name);

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result);
});

export default users;
