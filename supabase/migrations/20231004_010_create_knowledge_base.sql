-- Supabase migration: create knowledge base tables for RAG
-- Enable extensions

create extension if not exists vector;
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. sources
-- -----------------------------------------------------------------------------
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  authority_tier integer not null,
  organization text,
  jurisdiction text,
  source_type text,
  base_url text,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger for updated_at
drop trigger if exists trg_update_sources_updated_at on sources;
create trigger trg_update_sources_updated_at
  before update on sources
  for each row
  execute procedure update_updated_at();

-- Indexes
create index if not exists idx_sources_name on sources(name);
create index if not exists idx_sources_authority_tier on sources(authority_tier);

-- RLS
alter table sources enable row level security;

-- -----------------------------------------------------------------------------
-- 2. documents
-- -----------------------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete cascade,
  title text not null,
  document_type text,
  jurisdiction text,
  publication_date date,
  effective_date date,
  version text,
  canonical_url text,
  storage_path text,
  content_hash text,
  status text default 'active',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger for updated_at on documents
drop trigger if exists trg_update_documents_updated_at on documents;
create trigger trg_update_documents_updated_at
  before update on documents
  for each row
  execute procedure update_updated_at();

-- Indexes
create index if not exists idx_documents_source_id on documents(source_id);
create index if not exists idx_documents_jurisdiction on documents(jurisdiction);
create index if not exists idx_documents_status on documents(status);

-- RLS
alter table documents enable row level security;

-- -----------------------------------------------------------------------------
-- 3. document_chunks
-- -----------------------------------------------------------------------------
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  section_title text,
  subsection_title text,
  page_number integer,
  source_url text,
  metadata jsonb default '{}'::jsonb,
  embedding vector(768),
  search_vector tsvector,
  created_at timestamptz default now()
);

-- Trigger to update search_vector
create or replace function update_document_chunk_search_vector()
  returns trigger language plpgsql as $$
begin
  new.search_vector := to_tsvector('english', coalesce(new.content, '') || ' ' || coalesce(new.section_title, '') || ' ' || coalesce(new.subsection_title, ''));
  return new;
end;
$$;

-- Trigger for search_vector updates
drop trigger if exists trg_update_search_vector on document_chunks;
create trigger trg_update_search_vector
  before insert or update on document_chunks
  for each row
  execute procedure update_document_chunk_search_vector();

-- Indexes
create index if not exists idx_document_chunks_document_id on document_chunks(document_id);
create index if not exists idx_document_chunks_embedding on document_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists idx_document_chunks_search_vector on document_chunks using GIN (search_vector);

-- RLS
alter table document_chunks enable row level security;

-- -----------------------------------------------------------------------------
-- End of migration
-- -----------------------------------------------------------------------------