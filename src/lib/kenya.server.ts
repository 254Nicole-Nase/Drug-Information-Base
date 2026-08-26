import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { normalizeDrugName } from "./openfda.server";

export type KenyaProduct = {
  id: string;
  brand_name: string;
  generic_name: string;
  generic_key: string;
  strength: string | null;
  dosage_form: string | null;
  manufacturer: string | null;
  country_of_origin: string | null;
  registration_status: string;
  atc_code: string | null;
  atc_class: string | null;
  data_source: string;
  verification_note: string;
  source_url: string | null;
};

export type KenyaLookup = {
  query: string;
  normalizedTo: string | null;
  matchedOn: "brand" | "generic" | "none";
  products: KenyaProduct[];
  localManufacturers: string[];
  atcCodes: string[];
};

const SELECT =
  "id, brand_name, generic_name, generic_key, strength, dosage_form, manufacturer, country_of_origin, registration_status, atc_code, atc_class, data_source, verification_note, source_url";

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase publishable credentials missing");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Looks a medicine up in the Kenyan product reference table.
 * The term is matched against brand names first, then against the RxNorm-normalized
 * ingredient key so "paracetamol", "Panadol" and "acetaminophen" all resolve.
 */
export async function lookupKenyaProducts(term: string): Promise<KenyaLookup> {
  const supabase = publicClient();
  const query = term.trim();
  const like = `%${query}%`;

  const { data: brandHits, error: brandError } = await supabase
    .from("ke_products")
    .select(SELECT)
    .or(`brand_name.ilike.${like},generic_name.ilike.${like},generic_key.ilike.${like}`)
    .order("brand_name");
  if (brandError) throw brandError;

  let products = (brandHits ?? []) as KenyaProduct[];
  let normalizedTo: string | null = null;
  let matchedOn: KenyaLookup["matchedOn"] = products.length > 0 ? "brand" : "none";

  if (products.length === 0) {
    const normalized = await normalizeDrugName(query);
    if (normalized) {
      const key = normalized.toLowerCase().split(/\s+/)[0] ?? normalized.toLowerCase();
      const { data: normHits, error: normError } = await supabase
        .from("ke_products")
        .select(SELECT)
        .or(`generic_key.ilike.%${key}%,generic_name.ilike.%${key}%`)
        .order("brand_name");
      if (normError) throw normError;
      products = (normHits ?? []) as KenyaProduct[];
      if (products.length > 0) {
        normalizedTo = normalized;
        matchedOn = "generic";
      }
    }
  }

  const localManufacturers = [
    ...new Set(
      products
        .filter((p) => (p.country_of_origin ?? "").toLowerCase() === "kenya")
        .map((p) => p.manufacturer)
        .filter((m): m is string => Boolean(m)),
    ),
  ];

  const atcCodes = [
    ...new Set(products.map((p) => p.atc_code).filter((c): c is string => Boolean(c))),
  ];

  return { query, normalizedTo, matchedOn, products, localManufacturers, atcCodes };
}

export async function kenyaCoverageStats() {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("ke_products")
    .select("generic_key, country_of_origin, atc_code");
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    generic_key: string;
    country_of_origin: string | null;
    atc_code: string | null;
  }>;

  return {
    productsCount: rows.length,
    ingredientsCount: new Set(rows.map((r) => r.generic_key)).size,
    locallyMadeCount: rows.filter((r) => (r.country_of_origin ?? "").toLowerCase() === "kenya")
      .length,
    atcCodesCount: new Set(rows.map((r) => r.atc_code).filter(Boolean)).size,
  };
}
