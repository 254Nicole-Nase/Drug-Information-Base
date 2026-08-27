# Drug Info Center

A grounded, cited and **evaluated** drug-information assistant built on public
regulatory data (openFDA structured product labels, RxNorm/RxNav, WHO ATC).

> Educational and general drug information only. Not medical advice, not a
> clinical decision-support tool. Every answer is grounded in a cited source
> document; the system refuses patient-specific dosing, diagnosis and
> off-label questions by design.

Originally a PHP 8 + MySQL coursework CRUD app; rebuilt as a retrieval-augmented
generation (RAG) application with a real evaluation suite.

## What it does

| Route           | Feature                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/`             | Drug label search over openFDA, with RxNorm name normalization (`paracetamol` → `acetaminophen`)                      |
| `/drugs/$id`    | Full label view, structured warnings, "Add to corpus" ingestion                                                       |
| `/ask`          | Natural-language Q&A over the ingested corpus, hybrid retrieval, mandatory citations, refusal when unsupported        |
| `/interactions` | Pairwise interaction checker built from label `drug_interactions` sections, with severity hints and verbatim evidence |
| `/kenya`        | Kenyan-market availability: local brand equivalents, manufacturers, WHO ATC classes                                   |
| `/evals`        | Live Ragas-style evaluation dashboard: faithfulness, answer relevance, context precision, refusal accuracy            |

## Architecture

```text
openFDA / RxNav ──► ingestion (chunking + embeddings) ──► Postgres
                                                          ├─ drug_labels
                                                          ├─ label_chunks (pgvector + tsvector)
                                                          └─ ke_products (Kenya reference)
                                                                 │
question ──► embed ──► match_chunks_hybrid (vector + BM25, RRF) ──► LLM synthesis ──► cited answer
                                                                 │
                                                        eval suite (LLM-as-judge)
```

- **Framework:** TanStack Start (React 19, SSR, typed server functions), Vite 7, Tailwind v4
- **Database:** Postgres with `pgvector`, row-level security, anon read-only policies
- **Retrieval:** dense vector recall fused with full-text ranking via reciprocal-rank fusion
- **AI:** embeddings (1536-dim) + answer synthesis behind a single swappable module
  (`src/lib/ai.server.ts`)

## Notable engineering decisions

- **The RxNav drug–drug interaction API was retired in January 2024**, so the
  usual tutorial path no longer exists. `/interactions` instead extracts
  cross-mentions from FDA label interaction sections and returns the _source
  sentence_ for every hit — never a generated claim.
- **Grounding over fluency:** the answer prompt forbids uncited claims and the
  adversarial eval set asserts the system refuses unsafe requests.
- **Kenya reference data is labelled as a curated sample**, not the official
  register, because the Pharmacy and Poisons Board publishes no API.

## Running locally

```sh
bun install
cp .env.example .env   # fill in your own values
bun run dev
```

Scripts: `dev`, `build`, `lint`, `test`, `format`, plus target-specific builds
(`build:node`, `build:vercel`, `build:cloudflare`) and `start`.

## Deployment

Docker, Vercel and Cloudflare Workers configs are committed
(`Dockerfile`, `docker-compose.yml`, `vercel.json`, `wrangler.toml`).
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the environment variables
and per-host steps:

```sh
docker compose up --build     # http://localhost:3000
```

Bringing your own Postgres/Supabase project: apply
[`supabase/schema.sql`](supabase/schema.sql) and follow
[`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

## Testing and CI

`bun run test` runs the unit suite (chunking, schema validation, query
building). GitHub Actions runs lint, typecheck, tests and a production build on
every push and pull request (`.github/workflows/ci.yml`). The RAG evaluation
suite runs on demand from `/evals` because it calls a model.

## Roadmap

See [`ROADMAP.md`](ROADMAP.md).

## Licence

MIT.
