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

export const EMBEDDING_DIMENSIONS = 1536;

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini/gateway endpoints return transient 429/503s under load; retry with
// backoff + jitter before surfacing the failure to the user.
async function fetchWithRetry(url: string, init: RequestInit, attempts = 4): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      const retryAfter = Number(lastRetryAfter);
      const base =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 600 * 2 ** (attempt - 1);
      await sleep(Math.min(base, 8000) + Math.random() * 250);
    }
    try {
      const response = await fetch(url, init);
      if (!RETRYABLE.has(response.status) || attempt === attempts - 1) return response;
      lastRetryAfter = response.headers.get("retry-after");
      await response.text().catch(() => undefined);
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed after retries");
}

let lastRetryAfter: string | null = null;

function describeFailure(label: string, status: number, body: string): string {
  if (RETRYABLE.has(status)) {
    return `${label} service is temporarily unavailable (${status}) after several retries. Please try again in a moment.`;
  }
  return `${label} request failed [${status}]: ${body.slice(0, 300)}`;
}

const EMBED_BATCH_SIZE = 32;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Providers reject or stall on very large batches; send fixed-size batches.
  if (texts.length > EMBED_BATCH_SIZE) {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      out.push(...(await embedTexts(texts.slice(i, i + EMBED_BATCH_SIZE))));
    }
    return out;
  }

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

  const response = await fetchWithRetry(`${baseUrl}/embeddings`, {
    method: "POST",
    headers,
    // The label_chunks.embedding column is vector(1536); gemini-embedding-001
    // defaults to 3072, so the dimension is pinned explicitly on both providers.
    body: JSON.stringify({ model, input: texts, dimensions: EMBEDDING_DIMENSIONS }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Embedding request failed [${response.status}]: ${body}`);
    throw new Error(describeFailure("Embedding", response.status, body));
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  // Truncated Gemini vectors are not unit-normalised, which breaks cosine distance.
  return json.data.map((item) =>
    provider === "google" ? normalize(item.embedding) : item.embedding,
  );
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude > 0 ? vector.map((value) => value / magnitude) : vector;
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

  const body: Record<string, unknown> = {
    model: mappedModel,
    temperature: 0.2,
    // Gemini 2.5 spends part of this budget on hidden thinking tokens, so the
    // cap has to be generous or the visible answer gets cut mid-sentence.
    max_tokens: 3000,
    messages: [{ role: "system", content: system }, ...messages],
  };
  if (provider === "google") {
    // Turn thinking off entirely: the whole budget then goes to the answer.
    body["reasoning_effort"] = "none";
  }

  const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Chat completion failed [${response.status}]: ${text}`);
    throw new Error(describeFailure("Answer", response.status, text));
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string | null }; finish_reason?: string }>;
  };
  const choice = json.choices[0];
  const content = choice?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error(
      `The model returned an empty answer (finish reason: ${choice?.finish_reason ?? "unknown"}). Please try again.`,
    );
  }
  if (choice?.finish_reason === "length") {
    console.warn("Answer truncated by token limit");
  }
  return content;
}
