import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  queryOpenFda,
  searchLabelsWithNormalization,
  type DrugLabelRecord,
} from "./openfda.server";

export type DrugLabel = DrugLabelRecord;

export const searchDrugLabels = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ query: z.string().trim().max(120) }).parse(data))
  .handler(async ({ data }) => {
    const term = data.query.replace(/["\\]/g, "").trim();
    if (term.length < 2) {
      return { labels: [], normalizedFrom: null, normalizedTo: null };
    }
    return searchLabelsWithNormalization(term);
  });

export const getDrugLabel = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const id = data.id.replace(/["\\]/g, "");
    const results = await queryOpenFda(`id:"${id}"`, 1);
    return results[0] ?? null;
  });
