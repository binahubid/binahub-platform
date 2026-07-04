import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

const port = parseInt(process.env.PORT || "4000");
serve({ fetch: app.fetch, port });
console.log(`BinaApps API running on http://localhost:${port}`);
