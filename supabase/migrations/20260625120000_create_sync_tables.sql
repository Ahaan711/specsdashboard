-- Migration: create the tables + storage bucket that src/lib/cloud-sync.ts
-- has always queried (portfolio_companies, pipeline_deals,
-- portfolio_documents, portfolio-docs bucket) but that were never actually
-- created on this project. This is the root cause of "Cloud sync not
-- provisioned yet" toasts — the code was correct, the schema just didn't
-- exist.
--
-- RLS below is permissive (anon read/write), matching the no-auth,
-- single-user design the app currently has — there's no login flow wired
-- into the sync client, so per-user (auth.uid()) scoping isn't possible yet
-- without adding one. Until that's added, treat the anon key as effectively
-- public: anyone with it can read and write this data. If this repo is
-- public, either keep it private or add an auth flow before relying on this
-- for anything sensitive long-term.

create table if not exists public.portfolio_companies (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pipeline_deals (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_documents (
  id uuid primary key default gen_random_uuid(),
  company_id text,
  company_name text,
  kind text not null,
  filename text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now()
);

alter table public.portfolio_companies enable row level security;
alter table public.pipeline_deals enable row level security;
alter table public.portfolio_documents enable row level security;

drop policy if exists "anon rw portfolio_companies" on public.portfolio_companies;
create policy "anon rw portfolio_companies" on public.portfolio_companies
  for all using (true) with check (true);

drop policy if exists "anon rw pipeline_deals" on public.pipeline_deals;
create policy "anon rw pipeline_deals" on public.pipeline_deals
  for all using (true) with check (true);

drop policy if exists "anon rw portfolio_documents" on public.portfolio_documents;
create policy "anon rw portfolio_documents" on public.portfolio_documents
  for all using (true) with check (true);

-- Private bucket. Files are served via short-lived signed URLs
-- (see getDocumentSignedUrl in src/lib/cloud-sync.ts), never public URLs —
-- these are term sheets, MIS, and pre-DD notes.
insert into storage.buckets (id, name, public)
values ('portfolio-docs', 'portfolio-docs', false)
on conflict (id) do nothing;

drop policy if exists "anon rw portfolio-docs" on storage.objects;
create policy "anon rw portfolio-docs" on storage.objects
  for all
  using (bucket_id = 'portfolio-docs')
  with check (bucket_id = 'portfolio-docs');
