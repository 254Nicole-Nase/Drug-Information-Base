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
SET search_path = public, extensions
AS $$
WITH vector_matches AS (
  SELECT
    id,
    1 - (embedding <=> query_embedding) AS similarity,
    row_number() OVER (ORDER BY embedding <=> query_embedding) AS v_rank
  FROM public.label_chunks
  ORDER BY embedding <=> query_embedding
  LIMIT GREATEST(match_count * 4, 20)
),
keyword_matches AS (
  SELECT
    id,
    ts_rank_cd(search_tsv, plainto_tsquery('english', query_text)) AS k_rank,
    row_number() OVER (
      ORDER BY ts_rank_cd(search_tsv, plainto_tsquery('english', query_text)) DESC
    ) AS k_rank_pos
  FROM public.label_chunks
  WHERE search_tsv @@ plainto_tsquery('english', query_text)
  LIMIT GREATEST(match_count * 4, 20)
),
fused AS (
  SELECT
    COALESCE(vm.id, km.id) AS id,
    COALESCE(vm.similarity, 0) AS similarity,
    COALESCE(km.k_rank, 0) AS keyword_rank,
    COALESCE(1.0 / (60 + vm.v_rank), 0) + COALESCE(1.0 / (60 + km.k_rank_pos), 0) AS score
  FROM vector_matches vm
  FULL OUTER JOIN keyword_matches km ON vm.id = km.id
)
SELECT
  c.id AS chunk_id,
  c.label_id,
  c.section_key,
  c.section_title,
  c.content,
  f.similarity,
  f.keyword_rank
FROM fused f
JOIN public.label_chunks c ON c.id = f.id
ORDER BY f.score DESC
LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_chunks_hybrid(vector(1536), text, int) TO anon, authenticated;