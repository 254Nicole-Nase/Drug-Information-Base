import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

import { Disclaimer } from "@/components/Disclaimer";
import {
  dailyMedUrl,
  formatEffectiveTime,
  labelSections,
  labelSubtitle,
  labelTitle,
} from "@/lib/drug-label";
import { getDrugLabel } from "@/lib/openfda.functions";

const labelQueryOptions = (id: string) => ({
  queryKey: ["openfda", "label", id],
  queryFn: () => getDrugLabel({ data: { id } }),
  staleTime: 30 * 60 * 1000,
});

export const Route = createFileRoute("/drugs/$id")({
  loader: async ({ context, params }) => {
    const label = await context.queryClient.ensureQueryData(labelQueryOptions(params.id));
    if (!label) throw notFound();
    return { title: labelTitle(label) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Label unavailable — Drug Info Center" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.title} — label reference`;
    const description = `Official FDA structured product labelling for ${loaderData.title}, shown verbatim with its source document. Educational use only.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: DrugDetail,
});

function DrugDetail() {
  const { id } = Route.useParams();
  const { data: label } = useSuspenseQuery(labelQueryOptions(id));

  if (!label) return null;

  const sections = labelSections(label);
  const effective = formatEffectiveTime(label.effective_time);
  const sourceUrl = dailyMedUrl(label.set_id);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      <header className="mt-6 overflow-hidden rounded-3xl border border-border shadow-soft">
        <div className="bg-gradient-hero px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            {labelTitle(label)}
          </h1>
          {labelSubtitle(label) ? (
            <p className="mt-1 text-lg text-primary-foreground/75">{labelSubtitle(label)}</p>
          ) : null}
        </div>
        <dl className="grid gap-4 bg-gradient-surface p-6 text-sm sm:grid-cols-2">
          <Meta term="Labeler" value={label.openfda?.manufacturer_name?.[0]} />
          <Meta term="Route" value={label.openfda?.route?.join(", ")} />
          <Meta term="Product type" value={label.openfda?.product_type?.[0]} />
          <Meta term="Pharmacologic class" value={label.openfda?.pharm_class_epc?.[0]} />
          <Meta term="Label effective" value={effective ?? undefined} />
          <Meta term="RxCUI" value={label.openfda?.rxcui?.slice(0, 3).join(", ")} />
        </dl>
      </header>

      <Disclaimer className="mt-6" />

      {sections.length > 1 ? (
        <nav
          aria-label="Label sections"
          className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          {sections.map((section) => (
            <a
              key={section.key}
              href={`#${section.key}`}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {section.title}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="mt-8 space-y-6">
        {sections.map((section) => {
          const isCritical = section.key === "boxed_warning";
          const isCaution =
            section.key === "drug_interactions" || section.key === "contraindications";
          const tone = isCritical
            ? "border-destructive/40 bg-destructive/5"
            : isCaution
              ? "border-warning/40 bg-warning/10"
              : "border-border bg-card";
          const rule = isCritical
            ? "border-destructive/50"
            : isCaution
              ? "border-warning/60"
              : "border-primary/40";
          return (
            <section
              key={section.key}
              id={section.key}
              className={`scroll-mt-24 rounded-2xl border p-5 shadow-soft ${tone}`}
            >
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                {isCritical ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                ) : null}
                {section.title}
              </h2>
              <SectionBody
                paragraphs={section.paragraphs}
                sentenceBullets={SAFETY_SECTIONS.has(section.key)}
                rule={rule}
                marker={isCritical ? "bg-destructive" : isCaution ? "bg-warning" : "bg-primary"}
              />
            </section>
          );
        })}

        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This label record contains no narrative sections.
          </p>
        ) : null}
      </div>


      <footer className="mt-10 rounded-2xl border border-border bg-accent/40 p-5 text-sm">
        <h2 className="font-display font-semibold text-foreground">Source</h2>
        <p className="mt-1 text-muted-foreground">
          openFDA drug label record <code className="font-mono text-xs">{label.id}</code>
          {label.set_id ? (
            <>
              {" "}
              · SPL set ID <code className="font-mono text-xs">{label.set_id}</code>
            </>
          ) : null}
          {effective ? ` · effective ${effective}` : null}
        </p>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-4"
          >
            View the original label on DailyMed <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </footer>
    </article>
  );
}

function Meta({ term, value }: { term: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{term}</dt>
      <dd className="mt-0.5 font-medium text-card-foreground">{value}</dd>
    </div>
  );
}

