-- Drug Info Center — portable schema
-- Run this once in the SQL editor of any Postgres/Supabase project you own.
-- Requires the `vector` (pgvector) extension, available on all Supabase projects.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------- tables ---

CREATE TABLE IF NOT EXISTS public.drug_labels (
  id text PRIMARY KEY,
  set_id text,
  effective_time text,
  brand_name text,
  generic_name text,
  substance_name text,
  manufacturer_name text,
  route text,
  product_type text,
  pharmacologic_class text[],
  rxcui text[],
  label_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.label_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id text NOT NULL REFERENCES public.drug_labels(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  section_title text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_label_chunks_embedding
  ON public.label_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_label_chunks_tsv
  ON public.label_chunks USING gin (search_tsv);

-- ------------------------------------------------------ grants + policies ---
-- The corpus is public reference data (FDA labels), so anonymous reads are
-- allowed. Writes go through the service-role key from server code only.

GRANT SELECT ON public.drug_labels TO anon, authenticated;
GRANT SELECT ON public.label_chunks TO anon, authenticated;
GRANT ALL ON public.drug_labels TO service_role;
GRANT ALL ON public.label_chunks TO service_role;

ALTER TABLE public.drug_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read drug labels" ON public.drug_labels;
CREATE POLICY "Anyone can read drug labels"
  ON public.drug_labels FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read label chunks" ON public.label_chunks;
CREATE POLICY "Anyone can read label chunks"
  ON public.label_chunks FOR SELECT TO anon, authenticated USING (true);

-- ------------------------------------------------------ retrieval funcs ----

CREATE OR REPLACE FUNCTION public.match_chunks_vector(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE(
  chunk_id uuid,
  label_id text,
  section_key text,
  section_title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id AS chunk_id,
    label_id,
    section_key,
    section_title,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.label_chunks
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Hybrid retrieval: dense vector recall fused with BM25-ish keyword ranking
-- using reciprocal-rank fusion. This is the function the /ask route calls.
CREATE OR REPLACE FUNCTION public.match_chunks_hybrid(
  query_embedding vector(1536),
  query_text text,
  match_count int
)
RETURNS TABLE(
  chunk_id uuid,
  label_id text,
  section_key text,
  section_title text,
  content text,
  similarity float,
  keyword_rank float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH vector_matches AS (
  SELECT
    id,
    label_id,
    section_key,
    section_title,
    content,
    1 - (embedding <=> query_embedding) AS similarity,
    row_number() OVER (ORDER BY embedding <=> query_embedding) AS v_rank
  FROM public.label_chunks
  WHERE 1 - (embedding <=> query_embedding) > 0.5
),
keyword_matches AS (
  SELECT
    id,
    ts_rank_cd(search_tsv, plainto_tsquery('english', query_text)) AS k_rank
  FROM public.label_chunks
  WHERE search_tsv @@ plainto_tsquery('english', query_text)
)
SELECT
  vm.id AS chunk_id,
  vm.label_id,
  vm.section_key,
  vm.section_title,
  vm.content,
  vm.similarity,
  COALESCE(km.k_rank, 0) AS keyword_rank
FROM vector_matches vm
LEFT JOIN keyword_matches km ON vm.id = km.id
ORDER BY (COALESCE(1.0 / (60 + vm.v_rank), 0) + COALESCE(km.k_rank * 0.5, 0)) DESC
LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_chunks_vector(vector(1536), float, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks_hybrid(vector(1536), text, int) TO anon, authenticated;
