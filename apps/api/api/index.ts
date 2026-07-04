import app from "../src/app";

export const runtime = "nodejs";

export default async function handler(request: Request) {
  return app.fetch(request);
}
