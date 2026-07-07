import OpenAI from "openai";

export function createAIClient() {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  const baseURL = process.env.OPENAI_API_BASE || "https://opencode.ai/zen/v1"; // OpenCode Zen default
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

export async function parseCV(text: string): Promise<Record<string, unknown>> {
  const client = createAIClient();
  const modelName = process.env.OPENAI_MODEL || "aihubmix/xiaomi-mimo-v2.5-free";
  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      {
        role: "system",
        content:
          "Extract structured data from this CV. Return JSON with: full_name, email, phone, title, specializations (array), experience_years (number), skills (array).",
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  return content ? JSON.parse(content) : {};
}

export { OpenAIProvider } from "./providers/openai";
export type { AIProvider, AIProviderConfig, ParsedCV } from "./providers/base";
export { extractTextFromPDF, extractTextFromPDFFile } from "./utils/pdf";
