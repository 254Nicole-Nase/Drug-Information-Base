import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { embedTexts } from "./ai.server";
import { chunkSection, type ChunkInput } from "./chunks.server";
import { labelSections, type DrugLabel } from "./drug-label";

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
  supabaseAdmin: ReturnType<typeof import("@/integrations/supabase/client.server").supabaseAdmin>,
) {
  const chunks: ChunkInput[] = labelSections(label).flatMap((section) =>
    chunkSection(section.key, section.title, section.paragraphs),
  );

  if (chunks.length === 0) return { chunksCount: 0 };

  const embeddings = await embedTexts(chunks.map((c) => c.embedding_text));

  const { error: deleteError } = await supabaseAdmin
    .from("label_chunks" as keyof Database["public"]["Tables"])
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

  const { error: insertError } = await supabaseAdmin
    .from("label_chunks" as keyof Database["public"]["Tables"])
    .insert(rows);
  if (insertError) throw insertError;

  return { chunksCount: chunks.length };
}

export async function searchCorpus(
  question: string,
  matchCount = 8,
): Promise<ChunkResult[]> {
  const [embedding] = await embedTexts([question]);
  const supabase = createPublishableClient();

  const { data, error } = await supabase.rpc(
    "match_chunks_hybrid" as keyof Database["public"]["Functions"],
    {
      query_embedding: embedding as unknown as string,
      query_text: question,
      match_count: matchCount,
    } as never,
  );
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    chunk_id: string;
    label_id: string;
    section_key: string;
    section_title: string;
    content: string;
    similarity: number;
    keyword_rank: number;
  }>;

  if (rows.length === 0) return [];

  const labelIds = [...new Set(rows.map((r) => r.label_id))];
  const { data: labels, error: labelsError } = await supabase
    .from("drug_labels" as keyof Database["public"]["Tables"])
    .select("id, brand_name, generic_name, set_id")
    .in("id", labelIds as never);
  if (labelsError) throw labelsError;

  const labelMap = new Map(
    (labels ?? []).map((l) => [
      l.id,
      {
        brand_name: l.brand_name as string | null,
        generic_name: l.generic_name as string | null,
        set_id: l.set_id as string | null,
      },
    ]),
  );

  return rows.map((row) => ({
    ...row,
    label: labelMap.get(row.label_id),
  }));
}

export function buildAnswerPrompt(context: string): string {
  return `You are a grounded drug-information assistant. Answer the user's question using ONLY the labelled context below. Each source is cited as [Brand name, Section title].

Rules:
- Quote or paraphrase the context; do not invent facts.
- Cite every substantive claim with [Brand name, Section title].
- If the context does not contain enough information, say "I don't have enough grounded information to answer that." and explain what is missing.
- Never give patient-specific dosing, diagnosis, or treatment advice.
- Keep the answer concise and structured.

Context:
${context}`;
}
