import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { errorHandler } from "./middleware/error-handler.js";
import healthRoute from "./routes/health.js";
import issueRoutes from "./routes/issues.js";
import userRoutes from "./routes/users.js";
import commentRoutes from "./routes/comments.js";
import blockageRoutes from "./routes/blockages.js";
import syncRoutes from "./routes/sync.js";

const app = new Hono();

// Middleware
app.use("/api/*", cors());
app.use("/api/*", logger());

// API routes
app.route("/api/health", healthRoute);
app.route("/api/issues", issueRoutes);
app.route("/api/issues", commentRoutes);
app.route("/api/issues", blockageRoutes);
app.route("/api/users", userRoutes);
app.route("/api/sync", syncRoutes);

// Serve frontend static files (production)
app.use("/*", serveStatic({ root: "./frontend/dist" }));

// Global error handler
app.onError(errorHandler);

const port = parseInt(process.env.PORT || "3000", 10);
console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
