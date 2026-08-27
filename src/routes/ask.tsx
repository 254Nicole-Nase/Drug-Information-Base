import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BrainCircuit,
  Database,
  ExternalLink,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { AnswerText } from "@/components/AnswerText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askQuestion, getCorpusStatus, searchCorpusFn, seedCorpus } from "@/lib/rag.functions";

const TITLE = "Ask the corpus — Drug Info Center";
const DESCRIPTION =
  "Ask a plain-language question and get an answer grounded in the FDA label corpus, with citations back to the source documents.";

export const Route = createFileRoute("/ask")({
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
  component: Ask,
});

const EXAMPLES = [
  "What are the warnings for ibuprofen?",
  "How is metformin dosed?",
  "Which drugs interact with warfarin?",
  "What is atorvastatin used for?",
];

function Ask() {
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");

  const ask = useServerFn(askQuestion);
  const search = useServerFn(searchCorpusFn);
  const status = useServerFn(getCorpusStatus);
  const seed = useServerFn(seedCorpus);
  const queryClient = useQueryClient();

  const { data: corpus } = useQuery({
    queryKey: ["corpus", "status"],
    queryFn: () => status(),
  });

  const searchMutation = useMutation({
    mutationFn: (q: string) => search({ data: { query: q } }),
  });

  const answerMutation = useMutation({
    mutationFn: (q: string) => ask({ data: { query: q } }),
  });

  const seedMutation = useMutation({
    mutationFn: () => seed({ data: { limit: 3 } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["corpus", "status"] }),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = input.trim();
    if (q.length < 2) return;
    setQuestion(q);
    searchMutation.mutate(q);
    answerMutation.mutate(q);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-border bg-gradient-surface p-6 shadow-soft sm:p-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <BrainCircuit className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ask the corpus
            </h1>
            <p className="text-sm text-muted-foreground">
              Grounded answers from ingested FDA labels, with source citations.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {corpus ? (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {corpus.labelsCount} label{corpus.labelsCount === 1 ? "" : "s"} · {corpus.chunksCount}{" "}
              chunk
              {corpus.chunksCount === 1 ? "" : "s"} indexed
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="h-7 rounded-full border-border px-3 text-xs"
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">Expand corpus</span>
          </Button>
          {seedMutation.data ? (
            <span className="text-xs text-muted-foreground">
              {seedMutation.data.ingested.length > 0
                ? `Added ${seedMutation.data.ingested.map((item) => item.drug).join(", ")}`
                : "Nothing new to add"}
              {seedMutation.data.remaining > 0
                ? ` · ${seedMutation.data.remaining} more available`
                : " · corpus complete"}
            </span>
          ) : null}
          {seedMutation.error ? (
            <span className="text-xs text-destructive">
              {seedMutation.error instanceof Error ? seedMutation.error.message : "Seeding failed"}
            </span>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <MessageSquare className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question about a drug in the corpus"
              aria-label="Question"
              className="h-12 border-border pl-9 text-base shadow-none focus-visible:ring-primary"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={input.trim().length < 2 || answerMutation.isPending}
            className="h-12 bg-gradient-primary px-7 text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            {answerMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Ask</span>
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-widest">Try</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setInput(example);
                setQuestion(example);
                searchMutation.mutate(example);
                answerMutation.mutate(example);
              }}
              className="rounded-full border border-border px-2.5 py-1 transition-colors hover:border-primary/40 hover:text-primary"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {answerMutation.isPending ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Searching the corpus and synthesizing an answer…
          </p>
        </div>
      ) : null}

      {answerMutation.error ? (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive shadow-soft">
          <p className="font-medium">Answer failed</p>
          <p className="mt-1">
            {answerMutation.error instanceof Error
              ? answerMutation.error.message
              : "Something went wrong"}
          </p>
        </div>
      ) : null}

      {answerMutation.data ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display font-semibold text-card-foreground">Answer</h2>
              <span className="text-xs text-muted-foreground">
                {answerMutation.data.citations.length} source
                {answerMutation.data.citations.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-4">
              <AnswerText text={answerMutation.data.answer} />
            </div>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Reference information from FDA labels — not medical advice.
            </p>
          </section>

          {answerMutation.data.citations.length > 0 ? (
            <section>
              <h2 className="font-display font-semibold text-card-foreground">Sources</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {answerMutation.data.citations.map((chunk, index) => (
                  <li
                    key={chunk.chunk_id}
                    className="rounded-2xl border border-border bg-gradient-surface p-4 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-primary">
                        [{index + 1}]{" "}
                        {chunk.label?.brand_name ?? chunk.label?.generic_name ?? "Unknown product"}
                      </span>
                      <Link
                        to="/drugs/$id"
                        params={{ id: chunk.label_id }}
                        className="shrink-0 text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {chunk.section_title}
                    </p>
                    <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                      {chunk.content}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {!answerMutation.isPending &&
      !answerMutation.data &&
      searchMutation.data &&
      searchMutation.data.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-display font-semibold text-card-foreground">Top matching passages</h2>
          <ul className="mt-3 space-y-3">
            {searchMutation.data.slice(0, 5).map((chunk) => (
              <li
                key={chunk.chunk_id}
                className="rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  {chunk.label?.brand_name ?? chunk.label?.generic_name ?? "Unknown product"}
                  <ArrowRight className="h-3 w-3" />
                  {chunk.section_title}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {chunk.content}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
