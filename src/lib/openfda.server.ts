import { z } from "zod";

const OPENFDA_BASE = "https://api.fda.gov/drug/label.json";
const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";

/**
 * openFDA drug label (SPL) subset.
 * Source: https://open.fda.gov/apis/drug/label/ — public domain, no licence required.
 */
export const labelSchema = z.object({
  id: z.string(),
  set_id: z.string().optional(),
  effective_time: z.string().optional(),
  purpose: z.array(z.string()).optional(),
  indications_and_usage: z.array(z.string()).optional(),
  dosage_and_administration: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  boxed_warning: z.array(z.string()).optional(),
  drug_interactions: z.array(z.string()).optional(),
  adverse_reactions: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  pregnancy: z.array(z.string()).optional(),
  description: z.array(z.string()).optional(),
  openfda: z
    .object({
      brand_name: z.array(z.string()).optional(),
      generic_name: z.array(z.string()).optional(),
      substance_name: z.array(z.string()).optional(),
      manufacturer_name: z.array(z.string()).optional(),
      route: z.array(z.string()).optional(),
      product_type: z.array(z.string()).optional(),
      pharm_class_epc: z.array(z.string()).optional(),
      rxcui: z.array(z.string()).optional(),
    })
    .optional(),
});

export type DrugLabelRecord = z.infer<typeof labelSchema>;

const responseSchema = z.object({
  results: z.array(labelSchema).optional(),
});

/** openFDA answers "no matches" with HTTP 404 + a NOT_FOUND envelope. */
export async function queryOpenFda(search: string, limit: number): Promise<DrugLabelRecord[]> {
  const url = `${OPENFDA_BASE}?search=${encodeURIComponent(search)}&limit=${limit}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (response.status === 404) return [];

  if (!response.ok) {
    const body = await response.text();
    console.error(`openFDA request failed [${response.status}]: ${body}`);
    throw new Error(`openFDA request failed [${response.status}]`);
  }

  const parsed = responseSchema.parse(await response.json());
  return parsed.results ?? [];
}

export function nameSearchExpression(term: string): string {
  return [
    `openfda.brand_name:"${term}"`,
    `openfda.generic_name:"${term}"`,
    `openfda.substance_name:"${term}"`,
  ].join(" OR ");
}

const rxnavSchema = z.object({
  approximateGroup: z
    .object({
      candidate: z
        .array(
          z.object({
            rxcui: z.string().optional(),
            name: z.string().optional(),
            score: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

const rxcuiPropsSchema = z.object({
  properties: z.object({ name: z.string().optional() }).nullish(),
});

/**
 * RxNorm/RxNav name normalization — maps international or misspelled names to the
 * US ingredient name openFDA indexes (e.g. "paracetamol" -> "acetaminophen").
 * Returns null when RxNav has no confident match.
 */
export async function normalizeDrugName(term: string): Promise<string | null> {
  try {
    const url = `${RXNAV_BASE}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=1&option=1`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const parsed = rxnavSchema.parse(await response.json());
    const rxcui = parsed.approximateGroup?.candidate?.[0]?.rxcui;
    if (!rxcui) return null;

    const propsResponse = await fetch(`${RXNAV_BASE}/rxcui/${rxcui}/properties.json`, {
      headers: { Accept: "application/json" },
    });
    if (!propsResponse.ok) return null;

    const name = rxcuiPropsSchema.parse(await propsResponse.json()).properties?.name ?? null;
    if (!name) return null;
    if (name.toLowerCase() === term.toLowerCase()) return null;
    return name.replace(/["\\]/g, "").trim();
  } catch (error) {
    console.error("RxNav normalization failed", error);
    return null;
  }
}

/**
 * Decides whether a free-text word is a real drug name and returns its
 * canonical RxNorm name. Unlike normalizeDrugName this rejects approximate
 * low-score matches — approximateTerm happily maps junk words ("side",
 * "effects") to unrelated drugs, which would poison retrieval filtering.
 * Exact/near-exact matches score 100; we require >= 80.
 */
export async function resolveDrugTerm(
  term: string,
): Promise<{ term: string; canonical: string } | null> {
  try {
    const url = `${RXNAV_BASE}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=1&option=1`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const candidate = rxnavSchema.parse(await response.json()).approximateGroup?.candidate?.[0];
    if (!candidate?.rxcui || Number(candidate.score ?? 0) < 80) return null;

    const propsResponse = await fetch(`${RXNAV_BASE}/rxcui/${candidate.rxcui}/properties.json`, {
      headers: { Accept: "application/json" },
    });
    if (!propsResponse.ok) return null;

    const name = rxcuiPropsSchema.parse(await propsResponse.json()).properties?.name ?? null;
    if (!name) return null;
    return { term, canonical: name.replace(/["\\]/g, "").trim() };
  } catch {
    return null;
  }
}

export async function searchLabelsWithNormalization(term: string): Promise<{
  labels: DrugLabelRecord[];
  normalizedFrom: string | null;
  normalizedTo: string | null;
}> {
  const direct = await queryOpenFda(nameSearchExpression(term), 24);
  if (direct.length > 0) {
    return { labels: direct, normalizedFrom: null, normalizedTo: null };
  }

  const normalized = await normalizeDrugName(term);
  if (!normalized) return { labels: [], normalizedFrom: null, normalizedTo: null };

  const fallback = await queryOpenFda(nameSearchExpression(normalized), 24);
  return {
    labels: fallback,
    normalizedFrom: fallback.length > 0 ? term : null,
    normalizedTo: fallback.length > 0 ? normalized : null,
  };
}
