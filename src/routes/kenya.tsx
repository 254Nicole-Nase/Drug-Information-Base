import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, MapPin, Search, Factory, Sparkles, ExternalLink } from "lucide-react";

import { getKenyaCoverage, lookupKenyaAvailability } from "@/lib/kenya.functions";
import { Disclaimer } from "@/components/Disclaimer";

export const Route = createFileRoute("/kenya")({
  head: () => ({
    meta: [
      { title: "Is it available in Kenya? — Drug Info Center" },
      {
        name: "description",
        content:
          "Check whether a medicine has a Kenyan-market equivalent, see local manufacturers and the WHO ATC classification.",
      },
      { property: "og:title", content: "Kenya medicines lookup" },
      {
        property: "og:description",
        content:
          "Local brand equivalents, manufacturers and WHO ATC classes for medicines on the Kenyan market.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KenyaPage,
});

function KenyaPage() {
  const [term, setTerm] = useState("");

  const coverage = useQuery({
    queryKey: ["kenya-coverage"],
    queryFn: () => getKenyaCoverage(),
  });

  const lookup = useMutation({
    mutationFn: (value: string) => lookupKenyaAvailability({ data: { term: value } }),
  });

  const result = lookup.data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Kenya availability</h1>
          <p className="text-sm text-muted-foreground">
            Local brand equivalents, manufacturers and WHO ATC classes
          </p>
        </div>
      </div>

      {coverage.data ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Products", value: coverage.data.productsCount },
            { label: "Ingredients", value: coverage.data.ingredientsCount },
            { label: "Made in Kenya", value: coverage.data.locallyMadeCount },
            { label: "ATC codes", value: coverage.data.atcCodesCount },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-4 shadow-soft"
            >
              <p className="font-display text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          const value = term.trim();
          if (value.length >= 2) lookup.mutate(value);
        }}
      >
        <label className="text-sm font-medium" htmlFor="kenya-term">
          Medicine name (brand, generic or international name)
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="kenya-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="e.g. paracetamol, Panadol, omeprazole"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={lookup.isPending || term.trim().length < 2}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {lookup.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Check
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Reference data curated from the Pharmacy and Poisons Board product registers. It is a
          starter sample, not the complete register — always verify against the official source
          before acting on it.
        </p>
      </form>

      {lookup.isError ? (
        <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Lookup failed. Please try again.
        </p>
      ) : null}

      {result ? (
        <section className="mt-8 space-y-4">
          {result.normalizedTo ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/50 px-3 py-1.5 text-xs text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Matched via RxNorm: “{result.query}” → “{result.normalizedTo}”
            </p>
          ) : null}

          {result.products.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
              No product in the reference set matches “{result.query}”. That does not mean it is
              unregistered in Kenya — it means this curated dataset does not cover it yet.
            </div>
          ) : (
            <>
              {result.localManufacturers.length > 0 ? (
                <div className="rounded-xl border border-border bg-accent/40 p-4 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Factory className="h-4 w-4" /> Locally manufactured by
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {result.localManufacturers.join(", ")}
                  </p>
                </div>
              ) : null}

              <ul className="space-y-3">
                {result.products.map((product) => (
                  <li
                    key={product.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-display text-lg font-semibold">
                          {product.brand_name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {product.generic_name}
                          {product.strength ? ` · ${product.strength}` : ""}
                          {product.dosage_form ? ` · ${product.dosage_form}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground">
                        {product.registration_status}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Manufacturer</dt>
                        <dd className="mt-0.5 font-medium">{product.manufacturer ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Origin</dt>
                        <dd className="mt-0.5 font-medium">{product.country_of_origin ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">WHO ATC</dt>
                        <dd className="mt-0.5 font-medium">
                          {product.atc_code ? (
                            <>
                              <span className="font-mono">{product.atc_code}</span>
                              {product.atc_class ? (
                                <span className="block font-normal text-muted-foreground">
                                  {product.atc_class}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-4 text-[0.7rem] text-muted-foreground">
                      {product.verification_note}
                      {product.source_url ? (
                        <a
                          href={product.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Official register <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}

      <div className="mt-10">
        <Disclaimer />
      </div>
    </main>
  );
}
