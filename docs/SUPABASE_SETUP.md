# Running Drug Info Center on your own Supabase project

The backend this app already uses is Supabase-managed Postgres (Postgres 15 +
`pgvector` + PostgREST + RLS), provisioned for you. This guide is for when you
want the same stack on a **Supabase project you own** — your own dashboard,
your own billing, and a repo a recruiter can clone and run.

## 1. Create the project

1. supabase.com → New project (pick the region closest to you; `eu-central-1`
   is usually the lowest-latency free region from Kenya).
2. Save the database password somewhere safe — it is shown only once.

## 2. Apply the schema

Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/schema.sql`](../supabase/schema.sql), and run it. It creates:

| Object | Purpose |
| --- | --- |
| `drug_labels` | One row per FDA Structured Product Label, plus raw `label_json` |
| `label_chunks` | Sentence-bounded passages with a `vector(1536)` embedding and a generated `tsvector` |
| `match_chunks_vector` | Pure dense retrieval (cosine similarity) |
| `match_chunks_hybrid` | Dense + keyword retrieval fused with reciprocal-rank fusion |

RLS is enabled on both tables with anonymous **read-only** policies — the
corpus is public FDA data. All writes happen server-side with the service-role
key.

Prefer the CLI? `supabase link --project-ref <ref>` then
`supabase db push` will apply everything in `supabase/migrations/`.

## 3. Environment variables

| Variable | Where it is used | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | Publishable / anon key |
| `SUPABASE_URL` | server functions | same project URL |
| `SUPABASE_PUBLISHABLE_KEY` | server functions (public reads) | same publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server functions (ingestion only) | Service role key — **never** expose to the browser |
| `LOVABLE_API_KEY` | server functions | AI gateway key for embeddings + answer synthesis |

Settings → API in the dashboard has the first five. Put them in `.env` locally
and in your host's environment panel in production.

Swapping the AI provider: `src/lib/ai.server.ts` is the only file that talks to
a model. Point `AIG_BASE` at `https://api.openai.com/v1` and send
`Authorization: Bearer $OPENAI_API_KEY` to use OpenAI directly — the embedding
model (`text-embedding-3-small`, 1536 dims) matches the schema as-is.

## 4. Seeding the corpus

There is no bulk seed file on purpose: labels are fetched live from openFDA so
the corpus never goes stale. To fill it:

1. Search a drug on `/`.
2. Open the label and click **Add to corpus**.
3. `ingestDrugLabel` (`src/lib/rag.functions.ts`) upserts the label, chunks the
   prose, embeds each chunk, and writes to `label_chunks`.

For a batch seed, loop `ingestDrugLabel` over a list of openFDA record IDs from
a Node script using the service-role key.

## 5. Verify

```sql
select count(*) from public.drug_labels;
select count(*) from public.label_chunks where embedding is not null;
```

Both non-zero means `/ask` will return grounded, cited answers.

## What this demonstrates on a CV

Postgres + pgvector vector search, hybrid (dense + BM25) retrieval with
reciprocal-rank fusion, row-level security, service-role vs. anon key
separation, and a reproducible SQL migration path.
