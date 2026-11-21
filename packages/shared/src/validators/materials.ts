import { z } from "zod";
export const materialSlugSchema = z.enum([
  "company-profile-v1",
  "company-profile",
  "product-knowledge-v1",
  "product-knowledge",
]);
