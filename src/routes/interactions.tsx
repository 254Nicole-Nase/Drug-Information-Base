import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, X, ArrowLeftRight, ShieldAlert } from "lucide-react";
import { checkDrugInteractions } from "@/lib/interactions.functions";
import type { InteractionFinding } from "@/lib/interactions.server";
import { Disclaimer } from "@/components/Disclaimer";

export const Route = createFileRoute("/interactions")({
  head: () => ({
    meta: [
      { title: "Drug Interaction Checker — Drug Info Center" },
      {
        name: "description",
        content:
          "Check pairwise drug interactions extracted from FDA label interaction sections, with citations.",
      },
      { property: "og:title", content: "Drug Interaction Checker" },
      {
        property: "og:description",
        content: "Pairwise interaction detection grounded in FDA structured product labels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InteractionsPage,
});

const SEVERITY_STYLES: Record<
  InteractionFinding["severityHint"],
  { label: string; classes: string }
> = {
  contraindicated: {
    label: "Contraindicated",
    classes: "bg-destructive/10 text-destructive border-destructive/30",
  },
  major: {
    label: "Major signal",
    classes: "bg-destructive/10 text-destructive border-destructive/30",
  },
  moderate: {
    label: "Mentioned",
    classes: "bg-accent text-accent-foreground border-border",
  },
  unknown: {
    label: "Unknown",
    classes: "bg-muted text-muted-foreground border-border",
  },
};

function InteractionsPage() {
  const [drugs, setDrugs] = useState<string[]>(["", ""]);

  const mutation = useMutation({
    mutationFn: (list: string[]) => checkDrugInteractions({ data: { drugs: list } }),
  });

  const setDrug = (i: number, v: string) => setDrugs((d) => d.map((x, idx) => (idx === i ? v : x)));
  const addDrug = () => setDrugs((d) => (d.length < 10 ? [...d, ""] : d));
  const removeDrug = (i: number) =>
    setDrugs((d) => (d.length > 2 ? d.filter((_, idx) => idx !== i) : d));

  const filled = drugs.map((d) => d.trim()).filter(Boolean);
  const result = mutation.data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Interaction checker</h1>
          <p className="text-sm text-muted-foreground">
            Pairwise detection from FDA label interaction sections
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <label className="text-sm font-medium">Drugs to check (2–10)</label>
        <div className="mt-3 space-y-2">
          {drugs.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={d}
                onChange={(e) => setDrug(i, e.target.value)}
                placeholder={`Drug ${i + 1} (e.g. warfarin)`}
                className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
              />
              {drugs.length > 2 && (
                <button
                  onClick={() => removeDrug(i)}
                  aria-label={`Remove drug ${i + 1}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={addDrug}
            disabled={drugs.length >= 10}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add drug
          </button>
          <button
            onClick={() => mutation.mutate(filled)}
            disabled={filled.length < 2 || mutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-95 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Check interactions
          </button>
        </div>
      </div>

      {mutation.isError && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {(mutation.error as Error).message}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            {result.drugs.map((d) => (
              <span
                key={d.input}
                className={`rounded-full border px-3 py-1 text-xs ${
                  d.found
                    ? "border-border bg-card"
                    : "border-destructive/30 bg-destructive/5 text-destructive"
                }`}
              >
                {d.input}
                {d.normalized !== d.input.toLowerCase() && ` → ${d.normalized}`}
                {!d.found && " (no label found)"}
              </span>
            ))}
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {result.checkedPairs} pair{result.checkedPairs === 1 ? "" : "s"} checked
            </span>
          </div>

          {result.findings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                No cross-mentions found in the interaction sections.
              </p>
              <p className="mt-1">{result.note}</p>
            </div>
          ) : (
            result.findings.map((f, i) => {
              const sev = SEVERITY_STYLES[f.severityHint];
              return (
                <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold">
                      {f.drugA} × {f.drugB}
                    </h2>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${sev.classes}`}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mention found in{" "}
                    {f.source === "both"
                      ? "both labels"
                      : f.source === "labelA"
                        ? `${f.brandA ?? f.drugA}'s label`
                        : `${f.brandB ?? f.drugB}'s label`}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {f.evidence.map((e, j) => (
                      <li
                        key={j}
                        className="rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed"
                      >
                        {e}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex gap-3 text-xs">
                    {f.labelIdA && (
                      <Link
                        to="/drugs/$id"
                        params={{ id: f.labelIdA }}
                        className="text-primary hover:underline"
                      >
                        View {f.drugA} label
                      </Link>
                    )}
                    {f.labelIdB && (
                      <Link
                        to="/drugs/$id"
                        params={{ id: f.labelIdB }}
                        className="text-primary hover:underline"
                      >
                        View {f.drugB} label
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{result.note}</p>
          </div>
        </div>
      )}

      <Disclaimer className="mt-10" />
    </main>
  );
}
