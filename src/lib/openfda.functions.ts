import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OPENFDA_BASE = "https://api.fda.gov/drug/label.json";

/**
 * openFDA drug label (SPL) subset.
 * Source: https://open.fda.gov/apis/drug/label/ — public domain, no licence required.
 * Every field rendered in the UI must be traceable back to this response.
 */
const labelSchema = z.object({
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

export type DrugLabel = z.infer<typeof labelSchema>;

const responseSchema = z.object({
  results: z.array(labelSchema).optional(),
});

/** openFDA answers "no matches" with HTTP 404 + a NOT_FOUND envelope. */
async function queryOpenFda(search: string, limit: number): Promise<DrugLabel[]> {
  const url = `${OPENFDA_BASE}?search=${encodeURIComponent(search)}&limit=${limit}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) return [];

  if (!response.ok) {
    const body = await response.text();
    console.error(`openFDA request failed [${response.status}]: ${body}`);
    throw new Error(`openFDA request failed [${response.status}]: ${body}`);
  }

  const parsed = responseSchema.parse(await response.json());
  return parsed.results ?? [];
}

export const searchDrugLabels = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ query: z.string().trim().max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const term = data.query.replace(/["\\]/g, "").trim();
    if (term.length < 2) return [];

    const search = [
      `openfda.brand_name:"${term}"`,
      `openfda.generic_name:"${term}"`,
      `openfda.substance_name:"${term}"`,
    ].join(" OR ");

    return queryOpenFda(search, 24);
  });

export const getDrugLabel = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const id = data.id.replace(/["\\]/g, "");
    const results = await queryOpenFda(`id:"${id}"`, 1);
    return results[0] ?? null;
  });
