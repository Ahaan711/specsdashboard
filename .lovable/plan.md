## Goal
Point cloud sync at your own Supabase project (`jszniaaiuagasiyewnyy`) instead of Lovable Cloud, so Sync actually works.

## Approach
Create a second, dedicated Supabase client just for sync (companies + deals + documents). The existing Lovable Cloud client stays in place for auth and anything else — only `cloud-sync.ts` switches over.

## Steps

1. **Store your credentials as secrets** (not hardcoded), exposed to the browser as Vite env vars:
   - `VITE_SYNC_SUPABASE_URL` = `https://jszniaaiuagasiyewnyy.supabase.co`
   - `VITE_SYNC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_BmWqTF3bwTqmuXBXnKdjew_kJYQp8k0`

2. **New file `src/integrations/sync-supabase/client.ts`** — a standalone `createClient` using those env vars, with its own `storageKey` (`sync-auth`) so it doesn't collide with the Lovable Cloud client's localStorage session.

3. **Update `src/lib/cloud-sync.ts`** to import from the new sync client instead of `@/integrations/supabase/client`. No logic changes to push/pull/overwrite functions.

4. **Schema for your Supabase project** — I can't run migrations against a project I don't manage, so I'll give you the SQL to paste into your project's SQL editor once. It creates:
   - `portfolio_companies (id uuid pk, payload jsonb, updated_at timestamptz)`
   - `pipeline_deals (id uuid pk, payload jsonb, updated_at timestamptz)`
   - `portfolio_documents (...)` + `portfolio-docs` storage bucket
   - Permissive RLS (anon read/write) since the app currently has no per-user auth on sync data. If you want it locked to signed-in users later, say the word and I'll switch policies to `auth.uid()`-scoped.

5. **Verify**: click Sync on Portfolio and Pipeline pages, confirm "Synced" toast and that data round-trips after a hard reload.

## Open question
The current app stores companies/deals as a single shared dataset (no per-user filtering). For your own Supabase, do you want:
- **(A)** Same model — one shared dataset, anon key can read/write everything (simple, matches today).
- **(B)** Per-user — require login on the sync side, scope rows to the signed-in user.

I'll default to **(A)** unless you say otherwise.
