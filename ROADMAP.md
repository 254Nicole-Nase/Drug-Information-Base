# Drug Info Center — 2026 Modernization Roadmap

Turning a PHP 8 + MySQL coursework CRUD app into a portfolio-grade, grounded,
evaluated health-AI application.

**Positioning:** *A grounded, cited, evaluated drug-information assistant.*
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

## Phase 2 — Retrieval + RAG

- [ ] Chunk label sections (indications, warnings, interactions, adverse
      reactions) into a `documents` + `chunks` schema in Postgres
- [ ] Embeddings + **pgvector** index; hybrid search (vector + full-text)
- [ ] Answer synthesis with **mandatory inline citations** back to chunk IDs;
      refuse to answer when retrieval confidence is low
- [ ] Per-answer disclaimer + "show sources" expansion

**Skills:** RAG, embeddings, pgvector, hybrid retrieval, prompt design,
grounding/refusal behaviour.

## Phase 3 — Evaluation suite (the real differentiator)

- [ ] Hand-label ~100 question/answer pairs from label content (gold set)
- [ ] Score faithfulness, answer relevance, context precision/recall
      (Ragas-style metrics)
- [ ] Adversarial set: questions the system *must refuse* (dosing for a
      specific patient, diagnosis, off-label advice)
- [ ] Regression run in CI on every PR; publish the score table in the README
- [ ] Tracing/observability (LangFuse or equivalent) on every generation

**Skills:** LLM evals, faithfulness/hallucination measurement, observability,
CI-gated quality.

## Phase 4 — Interaction checker (work around the dead API)

The NLM/RxNav free drug–drug interaction API was **retired in January 2024**,
so the usual tutorial path does not exist any more.

- [ ] Extract interaction statements from openFDA label `drug_interactions`
      free text into a structured `interactions` table
- [ ] Normalize the mentioned drugs to RxNorm concepts
- [ ] Pairwise checker returning the *source sentence* for every hit, never a
      generated claim
- [ ] Document the retirement and the workaround in the README — the
      engineering reasoning is itself the portfolio signal

**Skills:** information extraction, entity normalization, pipeline design.

## Phase 5 — Kenya context (the unfair advantage)

- [ ] Scrape + normalize the Pharmacy and Poisons Board product registers
      (no public API exists — this dataset is the moat)
- [ ] "Is this registered in Kenya?" lookup + local generic equivalents
- [ ] Map to WHO ATC classification
- [ ] Publish the cleaned dataset (open data contribution)

**Skills:** data engineering, scraping + cleaning, dataset publication.

## Phase 6 — Production polish

- [ ] Unit + integration tests, GitHub Actions CI (lint, typecheck, tests,
      evals)
- [ ] Dockerized local stack, one-command bootstrap
- [ ] Live public deployment a reviewer can break in 30 seconds
- [ ] Architecture writeup: retrieval design, eval results, regulatory scoping,
      and what was deliberately *not* built

**Skills:** testing, CI/CD, containerization, technical writing.

## Stretch (optional, only after 1–6)

- [ ] RDKit + PubChem/ChEMBL molecule lookups
- [ ] MCP server exposing the drug tools to any AI client
- [ ] Agentic multi-step research over PubMed / Europe PMC

---

## Data sources

| Source | Use | Terms |
|---|---|---|
| openFDA `/drug/label`, `/drug/event`, `/drug/ndc` | Primary grounding corpus | Free, public domain; API key raises rate limits |
| DailyMed SPL | Full label documents | Free, public domain (NLM) |
| RxNorm / RxNav | Name normalization, RxClass | Free (DDI endpoint retired Jan 2024) |
| PubChem / ChEMBL | Compound + bioactivity data | Free REST |
| Europe PMC / PubMed | Literature grounding | Free REST |
| WHO ATC | Classification | Free reference data |
| Pharmacy and Poisons Board (KE) | Kenyan registration status | Public web tables, no API — scrape |
| DrugBank | Curated interactions | **Not free for production**; academic licence only |

## Immediate housekeeping on the original repo

- [ ] Remove the default credentials (`joke` / `12345`) from the README
- [ ] Add a real `LICENSE` file to match the MIT badge
- [ ] Add the educational-use / not-medical-advice disclaimer
