import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  kind: z.enum(["grounded", "refusal"]).optional(),
});

export const runEvals = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    const { runEvalSuite } = await import("./eval.server");
    return runEvalSuite(data.kind);
  });
