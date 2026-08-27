# Drug Info Center — 2026 Modernization Roadmap

Turning a PHP 8 + MySQL coursework CRUD app into a portfolio-grade, grounded,
evaluated health-AI application.

**Positioning:** _A grounded, cited, evaluated drug-information assistant._
Not "an AI chatbot for drugs" — the differentiator is verifiable grounding and
a real evaluation suite, not the LLM call.

**Scope guardrail (non-negotiable):** educational / general drug information
only. No patient-specific dosing, no diagnosis, no storage of real user health
data. Every AI answer must carry a citation to a source document and a
disclaimer. This keeps the project clear of FDA "device"/CDS classification
and of Kenya Data Protection Act (2019) sensitive-data obligations.

---

## Phase 1 — Grounded drug reference (data layer) ✅ in progress

The retrieval substrate everything else stands on.

- [x] openFDA `/drug/label` search server function (brand, generic, substance)
- [x] Drug label detail view rendering label sections verbatim with source
      attribution (SPL set ID, effective date, labeler)
- [x] "How this works / scope & limitations" page documenting the regulatory
      framing and data provenance
- [x] RxNorm/RxNav name normalization so `paracetamol` → `acetaminophen`
      (approximateTerm → rxcui → properties, used as a fallback when the direct
      openFDA name search returns nothing; the UI shows the normalization)

- [ ] Persist a local corpus (Postgres) instead of live API passthrough

**Skills demonstrated:** API integration, schema validation (Zod), typed RPC,
SSR data loading, data provenance.

## Phase 2 — Retrieval + RAG ✅

- [x] Chunk label sections into `drug_labels` + `label_chunks` in Postgres
- [x] Embeddings + **pgvector** index; hybrid search (vector + full-text RRF)
- [x] Answer synthesis with **mandatory citations**; refuses when the corpus
      lacks grounded passages
- [x] Per-answer disclaimer + source cards linking back to the label

**Skills:** RAG, embeddings, pgvector, hybrid retrieval, prompt design,
grounding/refusal behaviour.

## Phase 3 — Evaluation suite (the real differentiator) ✅ in progress

- [x] Gold set in `src/lib/eval-set.ts` (grounded + adversarial cases)
- [x] Ragas-style scoring: faithfulness, answer relevance, context precision,
      refusal accuracy — LLM-as-judge in `src/lib/eval.server.ts`
- [x] Adversarial set the system _must refuse_ (patient-specific dosing,
      diagnosis, off-label use, non-existent drug)
- [x] `/evals` dashboard: run the suite live, per-case drill-down, skip
      handling for drugs not yet ingested
- [ ] Expand the gold set toward ~100 cases as the corpus grows
- [ ] Regression run in CI on every PR; publish the score table in the README
- [ ] Tracing/observability (LangFuse or equivalent) on every generation

**Skills:** LLM evals, faithfulness/hallucination measurement, observability,
CI-gated quality.

## Phase 4 — Interaction checker (work around the dead API) ✅

The NLM/RxNav free drug–drug interaction API was **retired in January 2024**,
so the usual tutorial path does not exist any more.

**Status: shipped (label-based variant).** `/interactions` normalizes each drug
via RxNav, pulls the `drug_interactions` sections of matching openFDA labels,
detects cross-mentions between the queried drugs, classifies a severity hint
(contraindicated / major / mentioned) from the surrounding prose, dedupes
evidence, and cites the source labels with links. Verified: warfarin ×
ibuprofen → "Major signal" (bleeding-risk table), build clean.

- [x] Normalize the mentioned drugs to RxNorm concepts (via RxNav)
- [x] Pairwise checker returning the _source sentence_ for every hit, never a
      generated claim
- [ ] Extract interaction statements into a structured `interactions` table
      (stretch — enables offline/fast checks and multi-drug matrices)
- [x] Document the retirement and the workaround in the README — the
      engineering reasoning is itself the portfolio signal

**Skills:** information extraction, entity normalization, pipeline design.

## Phase 5 — Kenya context (the unfair advantage) ✅

**Status: shipped (curated starter dataset).** `ke_products` holds a normalized
Kenyan-market reference set (brand, generic, strength, form, manufacturer,
origin, WHO ATC code + class, provenance note). `/kenya` resolves a query
against brand names first, then via RxNorm normalization, and surfaces local
manufacturers and ATC classification. Every row is labelled `curated-sample`
with a link to the official register — the honesty is part of the design.

- [x] Normalized Kenyan product table with provenance + verification note
- [x] "Is this available in Kenya?" lookup + local generic equivalents
- [x] WHO ATC code/class mapping per product
- [ ] Automated scrape of the full PPB register (no public API — needs a
      resilient HTML scraper + review workflow)
- [ ] Publish the cleaned dataset (open data contribution)

**Skills:** data engineering, scraping + cleaning, dataset publication.

## Phase 6 — Production polish ✅

- [x] Unit tests (`vitest`: chunking, schema validation, query building) via
      `bun run test`
- [x] GitHub Actions CI: lint, typecheck, tests, production build on every push
      and PR (`.github/workflows/ci.yml`)
- [x] Dockerfile (multi-stage bun build → `.output` runtime) + `.env.example`
- [x] README rewrite: architecture diagram, feature table, engineering
      decisions (retired RxNav DDI API, grounding-over-fluency, dataset honesty)
- [ ] Eval regression gate in CI (needs a model key in repo secrets)
- [ ] Live public deployment a reviewer can break in 30 seconds

**Skills:** testing, CI/CD, containerization, technical writing.

## Stretch (optional, only after 1–6)

- [ ] RDKit + PubChem/ChEMBL molecule lookups
- [ ] MCP server exposing the drug tools to any AI client
- [ ] Agentic multi-step research over PubMed / Europe PMC

---

## Data sources

| Source                                            | Use                         | Terms                                              |
| ------------------------------------------------- | --------------------------- | -------------------------------------------------- |
| openFDA `/drug/label`, `/drug/event`, `/drug/ndc` | Primary grounding corpus    | Free, public domain; API key raises rate limits    |
| DailyMed SPL                                      | Full label documents        | Free, public domain (NLM)                          |
| RxNorm / RxNav                                    | Name normalization, RxClass | Free (DDI endpoint retired Jan 2024)               |
| PubChem / ChEMBL                                  | Compound + bioactivity data | Free REST                                          |
| Europe PMC / PubMed                               | Literature grounding        | Free REST                                          |
| WHO ATC                                           | Classification              | Free reference data                                |
| Pharmacy and Poisons Board (KE)                   | Kenyan registration status  | Public web tables, no API — scrape                 |
| DrugBank                                          | Curated interactions        | **Not free for production**; academic licence only |

## Immediate housekeeping on the original repo

- [ ] Remove the default credentials (`joke` / `12345`) from the README
- [ ] Add a real `LICENSE` file to match the MIT badge
- [ ] Add the educational-use / not-medical-advice disclaimer
