import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkInteractions } from "./interactions.server";

export const checkDrugInteractions = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ drugs: z.array(z.string().min(1)).min(2).max(10) }).parse(data),
  )
  .handler(async ({ data }) => checkInteractions(data.drugs));
