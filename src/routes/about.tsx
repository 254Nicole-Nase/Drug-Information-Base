import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Database,
  FileText,
  Globe2,
  ShieldCheck,
} from "lucide-react";

import { Disclaimer } from "@/components/Disclaimer";

const TITLE = "Scope, data sources and limitations — Drug Info Center";
const DESCRIPTION =
  "How Drug Info Center is grounded: openFDA labelling, deliberate non-clinical scope, and the roadmap toward retrieval and evaluation.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const SOURCES = [
  {
    icon: Database,
    name: "openFDA drug label API",
    body: "Structured product labelling (SPL) for US-marketed products. Public domain, no licence required. Queried live per request.",
  },
  {
    icon: FileText,
    name: "DailyMed",
    body: "The original SPL documents, linked from every drug page so any sentence can be independently checked.",
  },
  {
    icon: Globe2,
    name: "RxNorm / RxNav",
    body: "Name normalization — international or misspelled names are mapped to the US ingredient name openFDA indexes.",
  },
];

const ROADMAP = [
  { done: true, label: "openFDA label search and cited detail pages" },
  { done: true, label: "RxNorm name normalization with a visible normalization notice" },
  { done: false, label: "Local Postgres corpus + pgvector hybrid retrieval" },
  { done: false, label: "Cited answer synthesis with low-confidence refusal" },
  { done: false, label: "Evaluation suite: faithfulness, relevance, adversarial refusals" },
  { done: false, label: "Kenyan Pharmacy and Poisons Board registration lookup" },
];

function About() {
  return (
    <div>
      <section className="bg-gradient-hero px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
            How this works
          </span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-foreground">
            Scope, sources and limitations
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80">
            A drug reference that shows published regulatory labelling verbatim, with a link
            back to the source document for every record. Nothing on a drug page is
            generated or paraphrased.
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Disclaimer />

        <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
            Deliberate limits
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              No patient-specific dosing, diagnosis or treatment recommendation. The tool
              answers questions about drugs, never about a person.
            </li>
            <li>No collection or storage of personal or health data.</li>
            <li>
              Sources are always displayed, so a clinician can independently review the basis
              of anything shown.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            These limits keep the project clearly outside medical-device / clinical decision
            support territory, and outside the sensitive-data obligations of Kenya&apos;s Data
            Protection Act (2019).
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-foreground">Data sources</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {SOURCES.map(({ icon: Icon, name, body }) => (
              <div
                key={name}
                className="rounded-2xl border border-border bg-gradient-surface p-5 shadow-soft"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-card-foreground">{name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-foreground">Build status</h2>
          <ul className="mt-4 space-y-2.5">
            {ROADMAP.map((item) => (
              <li key={item.label} className="flex items-start gap-3 text-sm">
                {item.done ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleDashed
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-warning/40 bg-warning/10 p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">Known gaps</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            Coverage is US-only for now, so some international products will not resolve even
            after name normalization. There is no interaction checker yet: the free NLM/RxNav
            drug-drug interaction API was retired in January 2024, so interactions will be
            extracted from label text and shown as quoted source sentences rather than
            generated claims.
          </p>
        </section>

        <p className="mt-10 text-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to search
          </Link>
        </p>
      </article>
    </div>
  );
}
