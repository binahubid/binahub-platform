import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./modules/auth";
import admin from "./modules/admin";
import ai from "./modules/ai";
import { associateRoutes } from "./modules/associate/routes";
import { reviewRoutes } from "./modules/reviews/routes";
import { fileRoutes } from "./modules/files/routes";
import { workerRoutes } from "./workers/routes";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use("/*", cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://binahub.id",
    "https://app.binahub.id",
    "https://ams-api-binahub.vercel.app",
  ],
  credentials: true,
}));

app.route("/api/auth", auth);
app.route("/api/associate", associateRoutes);
app.route("/api/admin", admin);
app.route("/api/ai", ai);
app.route("/api/reviews", reviewRoutes);
app.route("/api/files", fileRoutes);
app.route("/api/workers", workerRoutes);

app.get("/api/health", (c) => c.json({ status: "ok", version: "0.2.0" }));

export default app;
