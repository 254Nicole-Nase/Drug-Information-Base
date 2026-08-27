# Moving Drug Info Center onto your own Supabase project

Today the app runs on a managed Postgres project (Postgres 15 + `pgvector` +
PostgREST + RLS) provisioned inside Lovable. This guide moves the whole thing —
schema **and data** — into a Supabase project in _your_ account, so the repo is
one a recruiter can clone, point at your project, and run.

Everything you need is in the repo:

| File                       | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| `supabase/schema.sql`      | Tables, indexes, RLS policies, retrieval functions      |
| `supabase/seed.sql`        | Every row currently in the corpus, including embeddings |
| `scripts/export-corpus.ts` | Regenerates `seed.sql` from any live project            |

## 1. Create the project

1. supabase.com → New project. `eu-central-1` is usually the lowest-latency
   free region from Kenya.
2. Save the database password — it is shown only once.

## 2. Apply the schema

SQL Editor → paste `supabase/schema.sql` → Run. It creates:

| Object                | Purpose                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| `drug_labels`         | One row per FDA Structured Product Label, plus raw `label_json`                      |
| `label_chunks`        | Sentence-bounded passages with a `vector(1536)` embedding and a generated `tsvector` |
| `ke_products`         | Curated Kenyan (PPB) product register sample                                         |
| `match_chunks_vector` | Pure dense retrieval (cosine similarity)                                             |
| `match_chunks_hybrid` | Dense + keyword retrieval fused with reciprocal-rank fusion                          |

RLS is enabled on every table with anonymous **read-only** policies — the corpus
is public reference data. All writes happen server-side with the service-role key.

CLI equivalent: `supabase link --project-ref <ref>` then `supabase db push`.

## 3. Load the data

SQL Editor → paste `supabase/seed.sql` → Run. It is a single transaction with
`ON CONFLICT DO NOTHING`, so re-running it is safe.

To refresh the dump later from whichever project holds the newest corpus:

```bash
SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... bun run export:corpus
```

Only public tables are read (anon key, read-only) — no secrets or users leave
the project.

## 4. Environment variables

| Variable                        | Where it is used                  | Value                                              |
| ------------------------------- | --------------------------------- | -------------------------------------------------- |
| `VITE_SUPABASE_URL`             | browser                           | Project URL                                        |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser                           | Publishable / anon key                             |
| `SUPABASE_URL`                  | server functions                  | same project URL                                   |
| `SUPABASE_PUBLISHABLE_KEY`      | server functions (public reads)   | same publishable key                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | server functions (ingestion only) | Service role key — **never** expose to the browser |
| `LOVABLE_API_KEY`               | server functions                  | AI gateway key for embeddings + answer synthesis   |

Settings → API has the first five. Put them in `.env` locally and in your host's
environment panel in production. `.env.example` lists the same set.

> Note on the Lovable preview: this preview always talks to the Lovable-managed
> project, because Lovable injects those variables itself and they cannot be
> overridden from inside the app. Your own project takes over as soon as you run
> the app anywhere else — locally, Docker, Vercel, Fly, Render.

Swapping the AI provider: `src/lib/ai.server.ts` is the only file that talks to a
model. Point `AIG_BASE` at `https://api.openai.com/v1` and send
`Authorization: Bearer $OPENAI_API_KEY` to use OpenAI directly — the embedding
model (`text-embedding-3-small`, 1536 dims) matches the schema as-is.

## 5. Verify

```sql
select count(*) from public.drug_labels;
select count(*) from public.label_chunks where embedding is not null;
select count(*) from public.ke_products;
```

All three non-zero means `/ask`, `/interactions` and `/kenya` work against your
own database.

## 6. Grow the corpus

Labels are fetched live from openFDA so the corpus never goes stale. Search a
drug on `/`, open the label, click **Add to corpus** — `ingestDrugLabel`
(`src/lib/rag.functions.ts`) upserts the label, chunks the prose, embeds each
chunk and writes to `label_chunks`. Re-run `bun run export:corpus` to capture
the new rows in `seed.sql`.

## What this demonstrates on a CV

Postgres + pgvector vector search, hybrid (dense + BM25) retrieval with
reciprocal-rank fusion, row-level security, service-role vs. anon key
separation, and a reproducible schema + seed migration path.
