import { Hono } from "hono";
import { materialSlugSchema } from "@ams/shared/validators/materials";
import type {
  MaterialCatalog,
  MaterialLink,
} from "@ams/shared/types/materials";
import type { AppEnv } from "../../types/env.js";
import { postSigned } from "../../lib/app-integration.js";

const materials = new Hono<AppEnv>();
materials.use("*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  c.header("Referrer-Policy", "no-referrer");
  await next();
});
materials.get("/", async (c) => {
  try {
    const result = await postSigned<{ success: true; data: MaterialCatalog }>(
      "/api/integrations/ams/materials",
      {
        purpose: "ams-admin-materials",
        action: "catalog",
        requesterId: c.get("user").id,
      },
    );
    return c.json(result);
  } catch {
    return c.json(
      { success: false, error: "Daftar materi belum dapat dimuat. Coba lagi." },
      503,
    );
  }
});
materials.get("/:slug", async (c) => {
  const slug = materialSlugSchema.safeParse(c.req.param("slug"));
  if (!slug.success)
    return c.json({ success: false, error: "Materi tidak ditemukan." }, 404);
  try {
    const result = await postSigned<{ success: true; data: MaterialLink }>(
      "/api/integrations/ams/materials",
      {
        purpose: "ams-admin-materials",
        action: "document",
        slug: slug.data,
        requesterId: c.get("user").id,
      },
    );
    return c.json(result);
  } catch {
    return c.json(
      { success: false, error: "Dokumen belum dapat dibuka. Coba lagi." },
      503,
    );
  }
});
export default materials;
