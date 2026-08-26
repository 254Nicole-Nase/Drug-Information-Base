import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  Database,
  FileText,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import heroImage from "@/assets/hero-molecules.jpg";
import { Disclaimer } from "@/components/Disclaimer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { labelSubtitle, labelTitle } from "@/lib/drug-label";
import { searchDrugLabels } from "@/lib/openfda.functions";

const TITLE = "Drug Info Center — grounded drug label reference";
const DESCRIPTION =
  "Search official FDA structured product labelling. Every answer is traced back to the published label it came from. Educational use only.";

export const Route = createFileRoute("/")({
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
  component: Home,
});

const SUGGESTIONS = ["ibuprofen", "amoxicillin", "metformin", "paracetamol", "morphine"];

const PILLARS = [
  {
    icon: Database,
    title: "Public-domain corpus",
    body: "Sourced live from the openFDA drug label endpoint — the same structured product labelling that powers DailyMed.",
  },
  {
    icon: FileText,
    title: "Traceable by design",
    body: "Label text is shown verbatim with its SPL set ID, effective date and a link straight to the original document.",
  },
  {
    icon: ShieldCheck,
    title: "Scoped on purpose",
    body: "General drug information only — no patient-specific dosing, no diagnosis, no health data stored.",
  },
];

function Home() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const search = useServerFn(searchDrugLabels);

  const { data, isFetching, error } = useQuery({
    queryKey: ["openfda", "search", query],
    queryFn: () => search({ data: { query } }),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-hero">
        <img
          src={heroImage}
          alt="Translucent drug capsules suspended in a molecular lattice"
          width={1600}
          height={912}
          className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Grounded · cited · evaluated
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] text-primary-foreground sm:text-6xl">
            Drug information you can{" "}
            <span className="bg-gradient-to-r from-primary-glow to-primary-foreground bg-clip-text text-transparent">
              trace to the source
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-primary-foreground/80">
            A reference grounded in official FDA structured product labelling. Nothing here
            is invented — every statement is quoted from a published label, with a link back
            to the document it came from.
          </p>

          <form
            className="mt-9 flex max-w-2xl flex-col gap-3 rounded-2xl border border-primary-foreground/15 bg-background/90 p-3 shadow-elevated backdrop-blur sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(input.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Search by brand, generic or substance name"
                aria-label="Search drug labels"
                className="h-12 border-0 bg-transparent pl-9 text-base shadow-none focus-visible:ring-0"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={input.trim().length < 2}
              className="h-12 bg-gradient-primary px-7 text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              Search labels
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-primary-foreground/70">
            <span className="text-xs uppercase tracking-widest">Try</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setInput(suggestion);
                  setQuery(suggestion);
                }}
                className="rounded-full border border-primary-foreground/25 px-3 py-1 text-xs text-primary-foreground/90 transition-colors hover:bg-primary-foreground/15"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
        <section className="-mt-6 relative z-10" aria-live="polite">
          {isFetching ? (
            <p className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-soft">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Searching openFDA…
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
              Could not reach the openFDA label API. {(error as Error).message}
            </p>
          ) : null}

          {!isFetching && data && data.labels.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
              No labels matched “{query}”. openFDA indexes US products only, and RxNorm had
              no equivalent name to fall back on.
            </p>
          ) : null}

          {data && data.labels.length > 0 ? (
            <>
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {data.labels.length} label{data.labels.length === 1 ? "" : "s"} for “{query}”
              </h2>
              {data.normalizedTo ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  RxNorm normalized “{data.normalizedFrom}” to “{data.normalizedTo}”
                </p>
              ) : null}
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {data.labels.map((label) => (

                  <li key={label.id}>
                    <Link
                      to="/drugs/$id"
                      params={{ id: label.id }}
                      data-testid="result-card"
                      className="group flex h-full flex-col rounded-2xl border border-border bg-gradient-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
                    >

                      <span className="font-display font-semibold text-card-foreground">
                        {labelTitle(label)}
                      </span>
                      {labelSubtitle(label) ? (
                        <span className="mt-1 text-sm text-primary">
                          {labelSubtitle(label)}
                        </span>
                      ) : null}
                      <span className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {label.openfda?.manufacturer_name?.[0] ?? "Labeler not stated"}
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display font-semibold text-card-foreground">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <div className="mt-6 text-sm">
          <Link
            to="/about"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            Read the scope &amp; limitations note <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Disclaimer className="mt-10" />
      </div>
    </div>
  );
}
