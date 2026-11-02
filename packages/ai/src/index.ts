import OpenAI from "openai";
import { OpenAIProvider } from "./providers/openai.js";
import { parseCVWithFallback } from "./providers/cv-router.js";
import type { ParsedCV } from "./providers/base.js";
import { createManagedAIClient, usesManagedAI } from "./providers/managed.js";
import { redactAIText } from "./privacy.js";

export function createAIClient() {
  if (usesManagedAI()) return createManagedAIClient();
  const apiKey =
    process.env.LAPAKVIP_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";
  const baseURL = process.env.LAPAKVIP_API_KEY
    ? process.env.LAPAKVIP_BASE_URL || "https://router.lapakvip.com/api/v1"
    : process.env.OPENROUTER_API_KEY
      ? process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
      : process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

export async function parseCV(text: string): Promise<ParsedCV> {
  return parseCVWithFallback(text);
}

export { OpenAIProvider };
export {
  AIProviderConfigurationError,
  AIProviderExhaustedError,
  buildCVProviderAttempts,
  parseCVWithFallback,
} from "./providers/cv-router.js";
export type {
  AIProvider,
  AIProviderConfig,
  ParsedCV,
} from "./providers/base.js";

export async function rankCandidates(
  assignment: {
    title: string;
    client_name: string;
    description: string;
    needed_roles: string[];
  },
  candidates: Array<{
    id: string;
    name: string;
    roles: string[];
    expertises: string[];
    skills: string[];
    bio: string;
  }>,
): Promise<Array<{ associate_id: string; score: number; reasoning: string }>> {
  if (!candidates.length) return [];
  const references = candidates.map((candidate, index) => ({
    ref: "candidate-" + (index + 1),
    candidate,
  }));
  const identities = [
    assignment.client_name,
    ...candidates.flatMap((candidate) => [candidate.id, candidate.name]),
  ];
  const safe = (value: string) => redactAIText(value, identities);
  const client = createAIClient();
  const modelName = usesManagedAI()
    ? "binahub-managed"
    : process.env.LAPAKVIP_API_KEY
      ? process.env.LAPAKVIP_MODEL || "lv/deepseek-v4.1-flash"
      : process.env.OPENROUTER_API_KEY
        ? process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4.1-flash"
        : process.env.OPENAI_MODEL || "gpt-4o-mini";

  const systemPrompt = `You are an AI Talent Matcher. Analyze the project assignment details and a list of candidates.
Rerank the candidates based on how well their skills, experience, and role preferences match the project requirements.
For each candidate, output a match score from 0 to 100 and a 1-sentence reasoning in Indonesian explaining why the candidate is a match (or not).
Return a JSON object containing a "recommendations" array of objects, where each object has:
- associate_id: string (must match candidate ID exactly)
- score: number (0-100)
- reasoning: string (a short, professional match summary in Indonesian)
Use only the supplied candidate-N references. Do not invent names or contacts in the reasoning.
Do not include any markdown wrap or formatting other than valid JSON.`;

  const userPrompt = `=== PROJECT REQUIREMENT ===
Title: ${safe(assignment.title)}
Description: ${safe(assignment.description || "-")}
Needed Roles: ${safe(assignment.needed_roles.join(", "))}

=== CANDIDATES ===
${references
  .map(
    ({ ref, candidate: c }) => `ID: ${ref}
Roles: ${safe(c.roles.join(", "))}
Expertises: ${safe(c.expertises.join(", "))}
Skills: ${safe(c.skills.join(", "))}
Bio: ${safe(c.bio || "-")}`,
  )
  .join("\n\n")}`;

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.recommendations)) return [];
    const seen = new Set<string>();
    return parsed.recommendations.flatMap((row: unknown) => {
      if (!row || typeof row !== "object") return [];
      const value = row as Record<string, unknown>,
        candidate = references.find(
          (item) => item.ref === value.associate_id,
        )?.candidate;
      if (
        !candidate ||
        seen.has(candidate.id) ||
        typeof value.score !== "number" ||
        !Number.isFinite(value.score) ||
        value.score < 0 ||
        value.score > 100 ||
        typeof value.reasoning !== "string"
      )
        return [];
      seen.add(candidate.id);
      return [
        {
          associate_id: candidate.id,
          score: value.score,
          reasoning: safe(value.reasoning)
            .replace(/\bcandidate-\d+\b/g, "Kandidat")
            .slice(0, 2000),
        },
      ];
    });
  } catch {
    console.error("AI ranking failed");
    return [];
  }
}
