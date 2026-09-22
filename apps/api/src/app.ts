import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import auth from "./modules/auth/index.js";
import admin from "./modules/admin/index.js";
import ai from "./modules/ai/index.js";
import { associateRoutes } from "./modules/associate/routes.js";
import { reviewRoutes } from "./modules/reviews/routes.js";
import { fileRoutes } from "./modules/files/routes.js";
import { workerRoutes } from "./workers/routes.js";
import type { AppEnv } from "./types/env.js";

const app = new Hono<AppEnv>();

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "https://ams.binahub.id",
  "https://app.binahub.id",
  "https://binahub.id",
  "https://www.binahub.id",
  ...configuredOrigins,
]);

function resolveCorsOrigin(origin: string): string | undefined {
  if (allowedOrigins.has(origin)) return origin;

  if (
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return origin;
  }

  return undefined;
}

app.use("*", cors({
  origin: (origin) => resolveCorsOrigin(origin),
  allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
  exposeHeaders: ["X-Request-Id", "Retry-After"],
  maxAge: 600,
  credentials: true,
}));

app.use("*", bodyLimit({
  maxSize: 2 * 1024 * 1024,
  onError: (c) => c.json({ success: false, error: "Ukuran permintaan terlalu besar" }, 413),
}));

app.use("*", async (c, next) => {
  const incomingRequestId = c.req.header("X-Request-Id");
  const requestId = incomingRequestId && /^[A-Za-z0-9._-]{1,64}$/.test(incomingRequestId)
    ? incomingRequestId
    : crypto.randomUUID();

  c.header("X-Request-Id", requestId);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (c.req.url.startsWith("https://")) {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (c.req.path.startsWith("/api/auth") || c.req.path.startsWith("/auth")) {
    c.header("Cache-Control", "no-store");
  }

  await next();

  if (c.res.status >= 500 && c.res.headers.get("content-type")?.includes("application/json")) {
    let internalError: unknown;
    try {
      internalError = await c.res.clone().json();
    } catch {
      internalError = "Respons server tidak dapat dibaca";
    }

    console.error("API request failed", {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      internalError,
    });

    const headers = new Headers(c.res.headers);
    headers.set("Content-Type", "application/json; charset=UTF-8");
    c.res = new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan pada server",
        requestId,
      }),
      { status: c.res.status, headers },
    );
  }
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
// Never leak internal error details to the client. Log full error server-side,
// return a generic message for 500s. Route-level responses (4xx) are untouched.
app.onError((err, c) => {
  const requestId = c.res.headers.get("X-Request-Id") || crypto.randomUUID();
  if (err instanceof SyntaxError) {
    return c.json({ success: false, error: "Format JSON tidak valid", requestId }, 400);
  }
  console.error("Unhandled error", { requestId, method: c.req.method, path: c.req.path, err });
  return c.json({ success: false, error: "Terjadi kesalahan pada server", requestId }, 500);
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

// Fallback routes for requests without /api prefix
app.route("/auth", auth);
app.route("/associate", associateRoutes);
app.route("/admin", admin);
app.route("/ai", ai);
app.route("/reviews", reviewRoutes);
app.route("/files", fileRoutes);
app.route("/workers", workerRoutes);

app.get("/", (c) => c.json({ status: "ok", message: "BinaApps API is running" }));
app.get("/api", (c) => c.json({ status: "ok", message: "BinaApps API is running" }));
app.get("/api/health", (c) => c.json({ status: "ok", version: "0.8.0" }));
app.get("/health", (c) => c.json({ status: "ok", version: "0.8.0" }));

export default app;
