const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function withoutAISecrets(value: string) {
  return value
    .replace(/\bBearer[ \t]+[A-Za-z0-9._~+\/-]+=*/gi, "[CREDENTIAL_REMOVED]")
    .replace(
      /\b(?:sk-|sk_|cc_|re_)[A-Za-z0-9_-]{16,}\b/g,
      "[CREDENTIAL_REMOVED]",
    )
    .replace(
      /\b(?:api[_ -]?key|password|secret|token)(?:\\*["'])?\s*[:=]\s*(?:\\*["'])?[^\\\s,"';}<>]+/gi,
      "[CREDENTIAL_REMOVED]",
    );
}

export function redactAIText(
  value: string,
  identities: readonly string[] = [],
) {
  let text = withoutAISecrets(value);
  for (const identity of [
    ...new Set(identities.filter((v) => v.trim().length >= 2)),
  ].sort((a, b) => b.length - a.length)) {
    for (const form of new Set([
      JSON.stringify(identity).slice(1, -1),
      identity,
    ])) {
      text = text.replace(
        new RegExp(
          "(?<![\\p{L}\\p{N}])" + escape(form) + "(?![\\p{L}\\p{N}])",
          "giu",
        ),
        "[IDENTITY_REMOVED]",
      );
    }
  }
  return text
    .replace(
      /[\p{L}\p{N}_.%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu,
      "[CONTACT_REMOVED]",
    )
    .replace(/\bhttps?:\/\/[^\s<>"'\\]+/gi, "[PRIVATE_URL_REMOVED]")
    .replace(
      /(?<![\p{L}\p{N}_])\+?\d(?:[ \t().-]*\d){8,}(?![\p{L}\p{N}_])/gu,
      "[CONTACT_REMOVED]",
    );
}

export function insightAIProjection(input: Record<string, unknown>) {
  const strings = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter((s): s is string => typeof s === "string")
          .slice(0, 100)
          .map((s) => redactAIText(s))
      : [];
  return {
    roles: strings(input.roles),
    expertises: strings(input.expertises),
    skills: strings(input.skills),
    summary:
      typeof input.summary === "string" ? redactAIText(input.summary) : "",
    scores:
      input.scores &&
      typeof input.scores === "object" &&
      !Array.isArray(input.scores)
        ? Object.fromEntries(
            Object.entries(input.scores)
              .filter(
                ([, value]) =>
                  typeof value === "number" && Number.isFinite(value),
              )
              .map(([key, value]) => [redactAIText(key), value]),
          )
        : {},
  };
}
