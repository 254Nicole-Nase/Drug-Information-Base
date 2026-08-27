const AIG_BASE = "https://ai.gateway.lovable.dev/v1";
const GOOGLE_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

type Provider = "lovable" | "google";

function pickProvider(): { provider: Provider; apiKey: string; baseUrl: string } {
  const googleKey = process.env["GOOGLE_API_KEY"];
  if (googleKey) {
    return { provider: "google", apiKey: googleKey, baseUrl: GOOGLE_OPENAI_BASE };
  }

  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return { provider: "lovable", apiKey: lovableKey, baseUrl: AIG_BASE };
  }

  throw new Error(
    "No AI provider configured. Set GOOGLE_API_KEY or LOVABLE_API_KEY in your environment.",
  );
}

function mapModel(provider: Provider, model: string): string {
  if (provider === "google") {
    // Lovable gateway uses vendor-prefixed ids; Google's OpenAI endpoint uses bare ids.
    if (model.startsWith("google/")) return model.slice("google/".length);
    if (model.startsWith("openai/")) {
      throw new Error(`OpenAI model "${model}" is not available on the Google provider.`);
    }
    return model;
  }
  return model;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { provider, apiKey, baseUrl } = pickProvider();
  const model = provider === "google" ? "gemini-embedding-001" : "openai/text-embedding-3-small";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (provider === "lovable") {
    headers["Lovable-API-Key"] = apiKey;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, input: texts }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Embedding request failed [${response.status}]: ${body}`);
    throw new Error(`Embedding request failed [${response.status}]`);
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return json.data.map((item) => item.embedding);
}

export async function generateAnswer(
  system: string,
  messages: Array<{ role: "user"; content: string }>,
  model = "google/gemini-2.5-flash",
): Promise<string> {
  const { provider, apiKey, baseUrl } = pickProvider();
  const mappedModel = mapModel(provider, model);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (provider === "lovable") {
    headers["Lovable-API-Key"] = apiKey;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: mappedModel,
      temperature: 0.2,
      max_tokens: 900,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Chat completion failed [${response.status}]: ${body}`);
    throw new Error(`Chat completion failed [${response.status}]`);
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string | null }; finish_reason?: string }>;
  };
  return json.choices[0]?.message?.content?.trim() ?? "";
}
