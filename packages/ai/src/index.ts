import OpenAI from "openai";

export function createAIClient() {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  const baseURL = process.env.OPENAI_API_BASE || undefined; // opsional, gunakan OPENAI_API_BASE untuk OpenRouter
  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      "HTTP-Referer": "https://binahub.id",
      "X-Title": "BinaHub Platform",
    }
  });
}

export async function parseCV(text: string): Promise<Record<string, unknown>> {
  const client = createAIClient();
  const modelName = process.env.OPENAI_MODEL || "openai/gpt-oss-120b:free";
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
