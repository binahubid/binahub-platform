import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createServer } from "node:http";
import { OpenAIProvider, rankCandidates } from "../packages/ai/dist/index.js";
import {
  redactAIText,
  insightAIProjection,
} from "../packages/ai/dist/privacy.js";

const name = "Ayu Private Sentinel",
  email = "ayu.sentinel@example.invalid",
  company = "PT Private Client";
const raw = `Trainer kolaborasi. ${name}, ${email}, +62 812-3456-7890. https://example.invalid/private?token=do-not-send api_key=never-send`;
test("generic summary/insight minimization preserves expertise but omits contacts and unknown record fields", () => {
  const value = redactAIText(raw, [name]);
  assert(
    !/Ayu Private|ayu\.sentinel|812-3456|https:|never-send|do-not-send/.test(
      value,
    ),
  );
  assert(value.includes("Trainer kolaborasi"));
  const quotedName = 'Ayu "Private Sentinel"';
  assert(
    !redactAIText(JSON.stringify({ summary: quotedName }), [
      quotedName,
    ]).includes("Private Sentinel"),
  );
  const projection = insightAIProjection({
    name,
    email,
    unknown: "PRIVATE_UNKNOWN",
    scores: { D: 4, secret: "PRIVATE_SCORE_FIELD" },
    skills: ["Coaching"],
    summary: email,
  });
  assert(
    !/PRIVATE_UNKNOWN|PRIVATE_SCORE_FIELD|ayu\.sentinel|Ayu Private/.test(
      JSON.stringify(projection),
    ),
  );
  assert.deepEqual(projection.scores, { D: 4 });
  assert.deepEqual(projection.skills, ["Coaching"]);
});
test("redaction removes credentials inside JSON-escaped professional summaries", () => {
  for (const raw of [
    'api_key="encoded-secret-sentinel"',
    JSON.stringify({ token: "encoded-secret-sentinel" }),
  ]) {
    for (const text of [
      raw,
      JSON.stringify({ summary: raw }),
      JSON.stringify({ summary: JSON.stringify(raw) }),
    ]) {
      assert(!redactAIText(text).includes("encoded-secret-sentinel"));
    }
  }
});

test("CV extraction keeps its required contact fields but never sends embedded credentials", async () => {
  let sent;
  const provider = new OpenAIProvider(
    { apiKey: "synthetic", model: "synthetic" },
    {
      chat: {
        completions: {
          create: async (input) => {
            sent = input;
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      fullName: name,
                      email,
                      roles: ["Trainer"],
                      expertises: ["Kolaborasi"],
                    }),
                  },
                },
              ],
            };
          },
        },
      },
    },
  );
  const result = await provider.parseCV(raw);
  const prompt = sent.messages.find((m) => m.role === "user").content;
  assert(prompt.includes(email));
  assert(prompt.includes(name));
  assert(!/never-send|do-not-send/.test(prompt));
  assert.equal(result.email, email);
  assert.equal(result.fullName, name);
});
test("ranker sends transient references and qualifications only, verifies IDs and makes no empty-candidate request", async () => {
  const received = [];
  let invalid = false;
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    received.push(input);
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        id: "synthetic",
        object: "chat.completion",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: JSON.stringify({
                recommendations: [
                  {
                    associate_id: invalid ? "foreign-ref" : "candidate-1",
                    score: 82,
                    reasoning: "candidate-1 memiliki keahlian kolaborasi.",
                  },
                  {
                    associate_id: "foreign-ref",
                    score: 99,
                    reasoning: "Not supplied",
                  },
                ],
              }),
            },
            finish_reason: "stop",
          },
        ],
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const keys = ["APP_INTEGRATION_SECRET", "APP_INTEGRATION_API_URL"];
  const previous = keys.map((key) => [key, process.env[key]]);
  Object.assign(process.env, {
    APP_INTEGRATION_SECRET: "synthetic-privacy-only",
    APP_INTEGRATION_API_URL: "http://127.0.0.1:" + server.address().port,
  });
  try {
    const assignment = {
      title: "Koordinasi Tim",
      client_name: company,
      description: raw,
      needed_roles: ["Trainer"],
    };
    const candidate = {
      id: "PRIVATE_DATABASE_ID",
      name,
      roles: ["Trainer"],
      expertises: ["Kolaborasi"],
      skills: ["Coaching"],
      bio: raw,
      email,
      extra: "PRIVATE_EXTRA",
    };
    const before = JSON.stringify(candidate),
      result = await rankCandidates(assignment, [candidate]);
    const prompt = JSON.stringify(received[0]);
    assert(
      !/Ayu Private|ayu\.sentinel|PT Private Client|PRIVATE_DATABASE_ID|812-3456|never-send|PRIVATE_EXTRA/.test(
        prompt,
      ),
    );
    assert(prompt.includes("Kolaborasi"));
    assert(prompt.includes("candidate-1"));
    assert(prompt.includes("Trainer"));
    assert.deepEqual(result, [
      {
        associate_id: candidate.id,
        score: 82,
        reasoning: "Kandidat memiliki keahlian kolaborasi.",
      },
    ]);
    assert.equal(JSON.stringify(candidate), before);
    invalid = true;
    assert.deepEqual(await rankCandidates(assignment, [candidate]), []);
    const count = received.length;
    assert.deepEqual(await rankCandidates(assignment, []), []);
    assert.equal(received.length, count);
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise((resolve) => server.close(resolve));
  }
});
