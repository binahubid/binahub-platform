// Placeholder — akan diisi saat setup Supabase
export const config = {
  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    anonKey: process.env.SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  storage: {
    bucket: process.env.STORAGE_BUCKET ?? "associate-documents",
  },
  app: {
    name: "BinaApps",
    url: process.env.APP_URL ?? "http://localhost:3000",
    apiUrl: process.env.API_URL ?? "http://localhost:4000",
  },
};

export type AppConfig = typeof config;
