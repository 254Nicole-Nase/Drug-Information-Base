import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { kenyaCoverageStats, lookupKenyaProducts } from "./kenya.server";

export const lookupKenyaAvailability = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ term: z.string().trim().min(2).max(120) }).parse(data),
  )
  .handler(async ({ data }) => lookupKenyaProducts(data.term));

export const getKenyaCoverage = createServerFn({ method: "GET" }).handler(async () =>
  kenyaCoverageStats(),
);
