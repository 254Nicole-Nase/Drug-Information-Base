import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  FlaskConical,
  Loader2,
  MinusCircle,
  Play,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EVAL_SET } from "@/lib/eval-set";
import { runEvals } from "@/lib/eval.functions";

const TITLE = "Evaluation suite — Drug Info Center";
const DESCRIPTION =
  "Faithfulness, answer relevance, context precision and refusal accuracy for the grounded drug-label RAG pipeline, scored against a hand-written gold set.";

export const Route = createFileRoute("/evals")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Evals,
});

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "fail" | "skipped" }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

function Evals() {
  const run = useServerFn(runEvals);
  const [expanded, setExpanded] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (kind?: "grounded" | "refusal") =>
      run({ data: kind ? { kind } : {} }),
  });

  const groundedCount = EVAL_SET.filter((c) => c.kind === "grounded").length;
  const refusalCount = EVAL_SET.length - groundedCount;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-border bg-gradient-surface p-6 shadow-soft sm:p-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <FlaskConical className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Evaluation suite
            </h1>
            <p className="text-sm text-muted-foreground">
              {groundedCount} grounded cases · {refusalCount} adversarial cases the system must refuse
            </p>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every case runs the real pipeline — hybrid retrieval over the label corpus, then answer
          synthesis — and an LLM judge scores the output for faithfulness to the retrieved passages,
          relevance to the question, and whether it correctly refused. Grounded cases whose drug is
          not in the corpus are reported as skipped rather than counted as failures.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => mutation.mutate(undefined)}
            disabled={mutation.isPending}
            size="lg"
            className="bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-2">Run full suite</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("refusal")}
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="ml-2">Safety cases only</span>
          </Button>
        </div>
      </div>

      {mutation.isPending ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Running retrieval, synthesis and judging for every case…
          </p>
        </div>
      ) : null}

      {mutation.error ? (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive shadow-soft">
          {mutation.error instanceof Error ? mutation.error.message : "Eval run failed"}
        </div>
      ) : null}

      {mutation.data ? (
        <div className="mt-8 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Metric
              label="Pass rate"
              value={pct(mutation.data.totals.passRate)}
              hint={`${mutation.data.totals.passed}/${mutation.data.totals.evaluated} evaluated`}
            />
            <Metric label="Faithfulness" value={pct(mutation.data.totals.meanFaithfulness)} hint="mean, judge-scored" />
            <Metric label="Answer relevance" value={pct(mutation.data.totals.meanRelevance)} hint="mean, judge-scored" />
            <Metric
              label="Context precision"
              value={pct(mutation.data.totals.meanContextPrecision)}
              hint="retrieved chunks on target"
            />
            <Metric
              label="Refusal accuracy"
              value={pct(mutation.data.totals.refusalAccuracy)}
              hint="adversarial cases declined"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Run {new Date(mutation.data.ranAt).toLocaleString()} · judge model {mutation.data.model} ·{" "}
            {mutation.data.totals.skipped} skipped (drug not in corpus)
          </p>

          <ul className="space-y-3">
            {mutation.data.results.map((result) => (
              <li key={result.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => setExpanded(expanded === result.id ? null : result.id)}
                >
                  <span className="mt-0.5">
                    <StatusIcon status={result.status} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-foreground">{result.question}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {result.kind === "refusal" ? "safety" : "grounded"} · {result.retrieved} passages ·
                      faithfulness {pct(result.faithfulness)} · relevance {pct(result.answerRelevance)} ·
                      context precision {pct(result.contextPrecision)}
                    </span>
                    {result.reason ? (
                      <span className="mt-1 block text-xs italic text-muted-foreground">{result.reason}</span>
                    ) : null}
                  </span>
                </button>

                {expanded === result.id && result.answer ? (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {result.answer}
                    </p>
                    {result.citations.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {result.citations.map((citation, index) => (
                          <li
                            key={`${result.id}-${index}`}
                            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            {citation.label} — {citation.section}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
