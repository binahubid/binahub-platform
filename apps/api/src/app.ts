import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./modules/auth/index.js";
import admin from "./modules/admin/index.js";
import ai from "./modules/ai/index.js";
import { associateRoutes } from "./modules/associate/routes.js";
import { reviewRoutes } from "./modules/reviews/routes.js";
import { fileRoutes } from "./modules/files/routes.js";
import { workerRoutes } from "./workers/routes.js";
import type { AppEnv } from "./types/env.js";

const app = new Hono<AppEnv>();

app.use("/*", cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://binahub.id",
    "https://app.binahub.id",
    "https://ams.binahub.id",
    "https://ams-api-binahub.vercel.app",
  ],
  credentials: true,
}));

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
// Never leak internal error details to the client. Log full error server-side,
// return a generic message for 500s. Route-level responses (4xx) are untouched.
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: 'Terjadi kesalahan pada server' }, 500);
});

// Catch unhandled async rejections / not-found to avoid stack traces leaking
app.notFound((c) => c.json({ success: false, error: 'Endpoint tidak ditemukan' }, 404));

app.route("/api/auth", auth);
app.route("/api/associate", associateRoutes);
app.route("/api/admin", admin);
app.route("/api/ai", ai);
app.route("/api/reviews", reviewRoutes);
app.route("/api/files", fileRoutes);
app.route("/api/workers", workerRoutes);

app.get("/", (c) => c.json({ status: "ok", message: "BinaApps API is running" }));
app.get("/api", (c) => c.json({ status: "ok", message: "BinaApps API is running" }));
app.get("/api/health", (c) => c.json({ status: "ok", version: "0.2.0" }));

export default app;
