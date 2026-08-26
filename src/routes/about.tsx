import { createFileRoute, Link } from "@tanstack/react-router";

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

function About() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Scope, sources and limitations
      </h1>

      <Disclaimer className="mt-6" />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">What this is</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          A drug reference that shows published regulatory labelling verbatim, with a
          link back to the source document for every record. Nothing on a drug page is
          generated or paraphrased — the point is that a reader can independently verify
          every sentence.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Deliberate limits</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            · No patient-specific dosing, diagnosis or treatment recommendation. The tool
            answers questions about drugs, never about a person.
          </li>
          <li>· No collection or storage of personal or health data.</li>
          <li>
            · Sources are always displayed, so a clinician can independently review the
            basis of anything shown.
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          These limits keep the project clearly outside medical-device / clinical
          decision support territory, and outside the sensitive-data obligations of
          Kenya&apos;s Data Protection Act (2019).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Data sources</h2>
        <dl className="mt-2 space-y-3 text-sm text-muted-foreground">
          <div>
            <dt className="font-medium text-foreground">openFDA drug label API</dt>
            <dd>
              Structured product labelling (SPL) for US-marketed products. Public domain,
              no licence required. Currently queried live per request.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">DailyMed</dt>
            <dd>The original SPL documents linked from every drug page.</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Planned</dt>
            <dd>
              RxNorm/RxNav for name normalization, a local Postgres + pgvector corpus for
              retrieval, and the Kenyan Pharmacy and Poisons Board registers for local
              registration status.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Known gaps</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Coverage is US-only for now, so international generic names may not resolve.
          There is no interaction checker yet: the free NLM/RxNav drug-drug interaction
          API was retired in January 2024, so interactions will be extracted from label
          text and shown as quoted source sentences rather than generated claims.
        </p>
      </section>

      <p className="mt-10 text-sm">
        <Link to="/" className="underline underline-offset-4">
          Back to search
        </Link>
      </p>
    </article>
  );
}
