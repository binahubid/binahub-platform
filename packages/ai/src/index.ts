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

export async function rankCandidates(
  assignment: { title: string; client_name: string; description: string; needed_roles: string[] },
  candidates: Array<{ id: string; name: string; roles: string[]; expertises: string[]; skills: string[]; bio: string }>
): Promise<Array<{ associate_id: string; score: number; reasoning: string }>> {
  const client = createAIClient();
  const modelName = process.env.OPENAI_MODEL || "aihubmix/xiaomi-mimo-v2.5-free";

  const systemPrompt = `You are an AI Talent Matcher. Analyze the project assignment details and a list of candidates.
Rerank the candidates based on how well their skills, experience, and role preferences match the project requirements.
For each candidate, output a match score from 0 to 100 and a 1-sentence reasoning in Indonesian explaining why the candidate is a match (or not).
Return a JSON object containing a "recommendations" array of objects, where each object has:
- associate_id: string (must match candidate ID exactly)
- score: number (0-100)
- reasoning: string (a short, professional match summary in Indonesian)
Do not include any markdown wrap or formatting other than valid JSON.`;

  const userPrompt = `=== PROJECT REQUIREMENT ===
Title: ${assignment.title}
Client: ${assignment.client_name}
Description: ${assignment.description || "-"}
Needed Roles: ${assignment.needed_roles.join(", ")}

=== CANDIDATES ===
${candidates.map(c => `ID: ${c.id}
Name: ${c.name}
Roles: ${c.roles.join(", ")}
Expertises: ${c.expertises.join(", ")}
Skills: ${c.skills.join(", ")}
Bio: ${c.bio || "-"}`).join("\n\n")}`;

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    return parsed.recommendations || [];
  } catch (error) {
    console.error("AI ranking failed:", error);
    return [];
  }
}
