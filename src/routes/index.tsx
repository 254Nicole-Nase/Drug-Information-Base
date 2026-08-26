import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search, Database, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

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
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const SUGGESTIONS = ["ibuprofen", "amoxicillin", "metformin", "ketamine", "morphine"];

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
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Grounded · cited · evaluated
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Drug Info Center
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A drug reference grounded in official FDA structured product labelling.
          No generated claims — every statement shown here is quoted from the
          published label, with a link back to the source document.
        </p>
      </header>

      <form
        className="mt-8 flex gap-2"
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
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={input.trim().length < 2}>
          Search
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Try:</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setInput(suggestion);
              setQuery(suggestion);
            }}
            className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <section className="mt-10" aria-live="polite">
        {isFetching ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching openFDA…
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
            Could not reach the openFDA label API. {(error as Error).message}
          </p>
        ) : null}

        {!isFetching && data && data.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No labels matched “{query}”. openFDA indexes US products only — try a
            generic name such as “acetaminophen” rather than “paracetamol”.
          </p>
        ) : null}

        {data && data.length > 0 ? (
          <>
            <h2 className="text-sm font-medium text-muted-foreground">
              {data.length} label{data.length === 1 ? "" : "s"} for “{query}”
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.map((label) => (
                <li key={label.id}>
                  <Link
                    to="/drugs/$id"
                    params={{ id: label.id }}
                    className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40"
                  >
                    <span className="font-semibold text-card-foreground">
                      {labelTitle(label)}
                    </span>
                    {labelSubtitle(label) ? (
                      <span className="mt-1 text-sm text-muted-foreground">
                        {labelSubtitle(label)}
                      </span>
                    ) : null}
                    <span className="mt-3 text-xs text-muted-foreground">
                      {label.openfda?.manufacturer_name?.[0] ?? "Labeler not stated"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h2 className="mt-3 font-semibold text-card-foreground">Public-domain data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sourced live from the openFDA drug label endpoint, the same structured
            product labelling that powers DailyMed.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="mt-3 font-semibold text-card-foreground">Traceable by design</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Label text is shown verbatim with its SPL set ID, effective date and a
            link to the original document.{" "}
            <Link to="/about" className="underline underline-offset-4">
              Read the scope note
            </Link>
            .
          </p>
        </div>
      </section>

      <Disclaimer className="mt-10" />
    </div>
  );
}
