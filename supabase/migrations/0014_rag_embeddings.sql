-- RAG: 문서·시트 본문을 청크로 쪼개 임베딩 저장 + 의미 검색 RPC.
-- 임베딩: Gemini gemini-embedding-001, output_dimensionality=1536 (정규화).
-- 1536차원 → HNSW 인덱스 한계(2000) 내라 인덱싱 가능. (기본 3072는 초과하여 불가)

create extension if not exists vector;

create table public.doc_chunks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  chunk_index int not null default 0,
  content text not null,
  embedding vector(1536),
  token_estimate int not null default 0,
  created_at timestamptz not null default now()
);

create index doc_chunks_project_idx on public.doc_chunks(project_id);
create index doc_chunks_item_idx on public.doc_chunks(item_id);
-- 코사인 거리 기반 근사 최근접 인덱스
create index doc_chunks_embedding_idx on public.doc_chunks
  using hnsw (embedding vector_cosine_ops);

-- RLS: 다른 작품-범위 테이블과 동일하게 owns_project 로 소유자 한정
alter table public.doc_chunks enable row level security;
create policy doc_chunks_owner on public.doc_chunks
  for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));

-- 의미 검색: 쿼리 임베딩과 코사인 유사도 상위 N개 (작품 범위)
create or replace function public.match_doc_chunks(
  query_embedding vector(1536),
  p_project_id uuid,
  match_count int default 10
) returns table (
  id uuid,
  item_id uuid,
  chunk_index int,
  content text,
  similarity float
) language sql stable as $$
  select c.id, c.item_id, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.doc_chunks c
  where c.project_id = p_project_id and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count
$$;
