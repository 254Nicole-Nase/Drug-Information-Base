import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateAnswer } from "./ai.server";
import { labelSchema, queryOpenFda } from "./openfda.server";
import { buildAnswerPrompt, ingestLabelRecord, searchCorpus, seedNextDrugs } from "./rag.server";
import type { Database } from "@/integrations/supabase/types";

const idSchema = z.object({ id: z.string().min(1) });
const querySchema = z.object({ query: z.string().trim().min(2).max(240) });
const seedSchema = z.object({ limit: z.number().int().min(1).max(5).default(3) });

export const getLabelIngestionStatus = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Supabase credentials missing");
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { count, error } = await supabase
      .from("label_chunks")
      .select("id", { count: "exact", head: true })
      .eq("label_id", data.id);
    if (error) throw error;

    return { ingested: (count ?? 0) > 0, chunksCount: count ?? 0 };
  });

export const ingestDrugLabel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const id = data.id.replace(/["\\]/g, "");
    const [label] = await queryOpenFda(`id:"${id}"`, 1);
    if (!label) throw new Error("Label not found in openFDA");

    const parsed = labelSchema.parse(label);
    const { chunksCount } = await ingestLabelRecord(parsed, supabaseAdmin);

    return { labelId: parsed.id, chunksCount };
  });

export const seedCorpus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => seedSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return seedNextDrugs(supabaseAdmin, data.limit);
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

    const [{ count: labels }, { count: chunks }] = await Promise.all([
      supabase.from("drug_labels").select("id", { count: "exact", head: true }),
      supabase.from("label_chunks").select("id", { count: "exact", head: true }),
    ]);

    return {
      labelsCount: labels ?? 0,
      chunksCount: chunks ?? 0,
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

    const answer = await generateAnswer(buildAnswerPrompt(context), [
      { role: "user", content: question },
    ]);

    return { answer, citations: chunks };
  });
