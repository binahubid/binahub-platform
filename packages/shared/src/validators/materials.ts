import { z } from "zod";
export const materialSlugSchema = z.enum([
  "company-profile",
  "product-knowledge",
]);
