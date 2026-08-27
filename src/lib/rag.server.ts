import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { embedTexts } from "./ai.server";
import { chunkSection, type ChunkInput } from "./chunks.server";
import { labelSections } from "./drug-label";
import { normalizeDrugName, searchLabelsWithNormalization } from "./openfda.server";
import type { DrugLabel } from "./openfda.functions";

export type ChunkResult = {
  chunk_id: string;
  label_id: string;
  section_key: string;
  section_title: string;
  content: string;
  similarity: number;
  keyword_rank: number;
  label?: {
    brand_name: string | null;
    generic_name: string | null;
    set_id: string | null;
  };
};

function createPublishableClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase publishable credentials missing");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function embedAndStoreChunks(
  label: DrugLabel,
  supabaseAdmin: SupabaseClient<Database>,
) {
  // Full prescribing-information labels can produce hundreds of chunks; cap the
  // ingest so one label cannot stall the request or blow the embedding budget.
  const MAX_CHUNKS_PER_LABEL = 60;
  const chunks: ChunkInput[] = labelSections(label)
    .flatMap((section) => chunkSection(section.key, section.title, section.paragraphs))
    .slice(0, MAX_CHUNKS_PER_LABEL);

  if (chunks.length === 0) return { chunksCount: 0 };

  console.info(`Embedding ${chunks.length} chunks for label ${label.id}`);

  const embeddings = await embedTexts(chunks.map((c) => c.embedding_text));

  const { error: deleteError } = await supabaseAdmin
    .from("label_chunks")
    .delete()
    .eq("label_id", label.id);
  if (deleteError) throw deleteError;

  const rows = chunks.map((chunk, index) => ({
    label_id: label.id,
    section_key: chunk.section_key,
    section_title: chunk.section_title,
    content: chunk.content,
    embedding: embeddings[index] as unknown as string,
  }));

  const { error: insertError } = await supabaseAdmin.from("label_chunks").insert(rows);
  if (insertError) throw insertError;

  return { chunksCount: chunks.length };
}

// Pull out candidate drug names from a free-text question so they can be
// normalized via RxNav (e.g. "paracetamol" -> "acetaminophen", brand names
// like "Ozempic" -> "semaglutide"). Bounded to the 4 longest words.
function extractCandidateTerms(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .sort((a, b) => b.length - a.length)
    .slice(0, 4);
}

async function normalizedAliases(question: string): Promise<string[]> {
  const candidates = extractCandidateTerms(question);
  const results = await Promise.all(
    candidates.map(async (term) => {
      try {
        const normalized = await normalizeDrugName(term);
        return normalized && normalized !== term ? normalized : null;
      } catch {
        return null;
      }
    }),
  );
  return [...new Set(results.filter((v): v is string => Boolean(v)))];
}

type HybridRow = {
  chunk_id: string;
  label_id: string;
  section_key: string;
  section_title: string;
  content: string;
  similarity: number;
  keyword_rank: number;
};

async function runHybridSearch(
  supabase: SupabaseClient<Database>,
  queryText: string,
  matchCount: number,
): Promise<HybridRow[]> {
  const [embedding] = await embedTexts([queryText]);
  const { data, error } = await supabase.rpc("match_chunks_hybrid", {
    query_embedding: embedding as unknown as string,
    query_text: queryText,
    match_count: matchCount,
  });
  if (error) throw error;
  return (data ?? []) as HybridRow[];
}

export async function searchCorpus(question: string, matchCount = 8): Promise<ChunkResult[]> {
  const supabase = createPublishableClient();

  // Retry once with RxNav-normalized aliases when the raw question finds
  // nothing (handles brand names and regional synonyms like paracetamol).
  let queryText = question;
  let rows = await runHybridSearch(supabase, question, matchCount);
  if (rows.length === 0) {
    const aliases = await normalizedAliases(question);
    if (aliases.length > 0) {
      queryText = `${question} ${aliases.join(" ")}`;
      rows = await runHybridSearch(supabase, queryText, matchCount);
    }
  }

  if (rows.length === 0) return [];

  const labelIds = [...new Set(rows.map((r) => r.label_id))];
  const { data: labels, error: labelsError } = await supabase
    .from("drug_labels")
    .select("id, brand_name, generic_name, set_id")
    .in("id", labelIds);
  if (labelsError) throw labelsError;

  const typedLabels = (labels ?? []) as Array<{
    id: string;
    brand_name: string | null;
    generic_name: string | null;
    set_id: string | null;
  }>;

  const labelMap = new Map(
    typedLabels.map((l) => [
      l.id,
      {
        brand_name: l.brand_name,
        generic_name: l.generic_name,
        set_id: l.set_id,
      },
    ]),
  );

  return rows.map((row) => {
    const label = labelMap.get(row.label_id);
    return label ? { ...row, label } : { ...row };
  });
}

export function buildAnswerPrompt(context: string): string {
  return `You are a grounded drug-information assistant. Answer the user's question using ONLY the labelled context below. Each source is cited as [Brand name, Section title].

Output format (markdown, strict):
- Start with a single one-sentence summary (no heading, max 25 words).
- Then at most 6 bullet points. Each bullet: a short **bold lead-in**, an em dash, then one sentence, ending with its citation [Brand name, Section title].
- No preamble, no restating the question, no closing paragraph, no nested bullets.
- Never exceed 180 words in total.

Rules:
- Quote or paraphrase the context; do not invent facts.
- Cite every substantive claim with [Brand name, Section title].
- If the context does not contain enough information, say "I don't have enough grounded information to answer that." and name what is missing.
- Never give patient-specific dosing, diagnosis, or treatment advice.

Context:
${context}`;
}

/** Curated starter corpus: common OTC/chronic-care molecules with rich FDA labels. */
export const SEED_DRUGS = [
  "ibuprofen",
  "acetaminophen",
  "metformin",
  "amoxicillin",
  "warfarin",
  "atorvastatin",
  "omeprazole",
  "amlodipine",
  "losartan",
  "azithromycin",
  "prednisone",
  "sertraline",
  "levothyroxine",
  "salbutamol",
  "ciprofloxacin",
  "aspirin",
] as const;

export async function ingestLabelRecord(
  parsed: DrugLabel,
  supabaseAdmin: SupabaseClient<Database>,
) {
  const { error: upsertError } = await supabaseAdmin.from("drug_labels").upsert(
    {
      id: parsed.id,
      set_id: parsed.set_id ?? null,
      effective_time: parsed.effective_time ?? null,
      brand_name: parsed.openfda?.brand_name?.[0] ?? null,
      generic_name: parsed.openfda?.generic_name?.[0] ?? null,
      substance_name: parsed.openfda?.substance_name?.[0] ?? null,
      manufacturer_name: parsed.openfda?.manufacturer_name?.[0] ?? null,
      route: parsed.openfda?.route?.join(", ") ?? null,
      product_type: parsed.openfda?.product_type?.[0] ?? null,
      pharmacologic_class: parsed.openfda?.pharm_class_epc ?? [],
      rxcui: parsed.openfda?.rxcui ?? [],
      label_json:
        parsed as unknown as Database["public"]["Tables"]["drug_labels"]["Insert"]["label_json"],
    },
    { onConflict: "id" },
  );
  if (upsertError) throw upsertError;

  return embedAndStoreChunks(parsed, supabaseAdmin);
}

/**
 * Ingests the next batch of curated seed drugs that are not in the corpus yet.
 * Batched on purpose: embedding a whole label takes seconds, so the UI calls this
 * repeatedly instead of holding one long request open.
 */
export async function seedNextDrugs(supabaseAdmin: SupabaseClient<Database>, limit = 3) {
  const { data: existing, error } = await supabaseAdmin
    .from("drug_labels")
    .select("generic_name, substance_name, brand_name");
  if (error) throw error;

  // Labels store salt/brand variants ("METFORMIN HYDROCHLORIDE"), so match by
  // substring rather than equality or the same drug is ingested repeatedly.
  const have = (existing ?? []).flatMap((row) =>
    [row.generic_name, row.substance_name, row.brand_name]
      .filter(Boolean)
      .map((value) => (value as string).toLowerCase()),
  );

  const pending = SEED_DRUGS.filter((drug) => !have.some((name) => name.includes(drug)));
  const batch = pending.slice(0, limit);

  const ingested: Array<{ drug: string; labelId: string; chunksCount: number }> = [];
  const skipped: string[] = [];

  for (const drug of batch) {
    try {
      const started = Date.now();
      const { labels } = await searchLabelsWithNormalization(drug);
      const best = labels.find((label) => (label.warnings?.length ?? 0) > 0) ?? labels[0];
      if (!best) {
        skipped.push(drug);
        continue;
      }
      const { chunksCount } = await ingestLabelRecord(best as DrugLabel, supabaseAdmin);
      console.info(`Seeded "${drug}" in ${Date.now() - started}ms (${chunksCount} chunks)`);
      ingested.push({ drug, labelId: best.id, chunksCount });
    } catch (cause) {
      console.error(`Seeding "${drug}" failed`, cause);
      skipped.push(drug);
    }
  }

  return {
    ingested,
    skipped,
    remaining: Math.max(pending.length - batch.length, 0),
    total: SEED_DRUGS.length,
  };
}
