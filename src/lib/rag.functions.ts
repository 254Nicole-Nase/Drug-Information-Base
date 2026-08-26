import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateAnswer } from "./ai.server";
import { labelSchema, queryOpenFda } from "./openfda.server";
import { buildAnswerPrompt, embedAndStoreChunks, searchCorpus } from "./rag.server";
import type { Database } from "@/integrations/supabase/types";

const idSchema = z.object({ id: z.string().min(1) });
const querySchema = z.object({ query: z.string().trim().min(2).max(240) });

export const ingestDrugLabel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const id = data.id.replace(/["\\]/g, "");
    const [label] = await queryOpenFda(`id:"${id}"`, 1);
    if (!label) throw new Error("Label not found in openFDA");

    const parsed = labelSchema.parse(label);

    const { error: upsertError } = await supabaseAdmin
      .from("drug_labels" as keyof Database["public"]["Tables"])
      .upsert(
        {
          id: parsed.id,
          set_id: parsed.set_id,
          effective_time: parsed.effective_time,
          brand_name: parsed.openfda?.brand_name?.[0] ?? null,
          generic_name: parsed.openfda?.generic_name?.[0] ?? null,
          substance_name: parsed.openfda?.substance_name?.[0] ?? null,
          manufacturer_name: parsed.openfda?.manufacturer_name?.[0] ?? null,
          route: parsed.openfda?.route?.join(", ") ?? null,
          product_type: parsed.openfda?.product_type?.[0] ?? null,
          pharmacologic_class: parsed.openfda?.pharm_class_epc ?? [],
          rxcui: parsed.openfda?.rxcui ?? [],
          label_json: parsed as unknown as Record<string, unknown>,
        },
        { onConflict: "id" },
      );
    if (upsertError) throw upsertError;

    const { chunksCount } = await embedAndStoreChunks(parsed, supabaseAdmin);

    return { labelId: parsed.id, chunksCount };
  });

export const getCorpusStatus = createServerFn({ method: "GET" })
  .inputValidator(() => z.object({}).parse({}))
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Supabase credentials missing");
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [{ data: labels }, { data: chunks }] = await Promise.all([
      supabase.from("drug_labels" as keyof Database["public"]["Tables"]).select("id", { count: "exact", head: true }),
      supabase.from("label_chunks" as keyof Database["public"]["Tables"]).select("id", { count: "exact", head: true }),
    ]);

    return {
      labelsCount: labels?.length ?? 0,
      chunksCount: chunks?.length ?? 0,
    };
  });

export const searchCorpusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => querySchema.parse(data))
  .handler(async ({ data }) => {
    return searchCorpus(data.query);
  });

export const askQuestion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => querySchema.parse(data))
  .handler(async ({ data }) => {
    const question = data.query;
    const chunks = await searchCorpus(question, 8);

    if (chunks.length === 0) {
      return {
        answer:
          "I don't have any grounded label passages in the corpus yet. Try adding a relevant drug label first.",
        citations: [] as typeof chunks,
      };
    }

    const context = chunks
      .map((chunk, index) => {
        const brand = chunk.label?.brand_name ?? chunk.label?.generic_name ?? "Unknown product";
        return `[${index + 1}] ${brand} — ${chunk.section_title}\n${chunk.content}`;
      })
      .join("\n\n");

    const answer = await generateAnswer(buildAnswerPrompt(context), [{ role: "user", content: question }]);

    return { answer, citations: chunks };
  });
