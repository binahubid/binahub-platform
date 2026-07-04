import app from "../apps/api/src/app";

export const runtime = "nodejs";

export default async function handler(request: Request) {
  return app.fetch(request);
}
