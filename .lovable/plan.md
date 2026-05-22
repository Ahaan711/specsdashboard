## Goals

1. Remove the **Legacy App** link from the PortfolioOS sidebar (it stays accessible only via the Home / Command Center card).
2. Replace the per-browser `localStorage` store with a shared **Lovable Cloud** (Supabase) backend so every visitor sees the same data, with **realtime sync** for edits.
3. Add an **audit log** that records every change (who/what/when/before→after) and is viewable inside PortfolioOS.

---

## 1. Sidebar cleanup

`src/routes/portfolio.tsx` — remove the `{ to: "/portfolio-legacy", label: "Legacy App", icon: FileText }` entry from `NAV`. Keep the route file itself intact so Home's Pipeline/Legacy card still works.

---

## 2. Shared data + realtime sync

Today `portfolio-data.ts` reads/writes `localStorage` (key `portfolio_companies_v1`) plus the embedded `misHistory` array. Move this to Supabase, keep the same `Company` shape so UI code barely changes.

**Schema (new migration)**
- `portfolio_companies` — one row per company. Columns: `id text pk`, `name`, `sector`, plus a single `data jsonb` column holding the rest of the `Company` object (term sheet, security, escrow, liveData, etc.). Reason: keeps the rich nested types we already have without flattening dozens of fields.
- `portfolio_audit_log` — `id uuid`, `company_id text`, `company_name text`, `action text` ('create'|'update'|'delete'|'mis_upload'|'watchlist_change'), `field text` nullable, `before jsonb`, `after jsonb`, `summary text`, `actor text`, `created_at timestamptz default now()`.
- RLS: this app has no auth (single-user internal tool per Settings page). Enable RLS and add permissive policies for `anon` (select/insert/update/delete) on both tables — matches current "anyone on the site can edit" behavior. Add a note that auth can be layered later.
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_companies, portfolio_audit_log;`

**Data layer (`src/lib/portfolio-data.ts`)**
- Replace `loadCompanies / saveCompanies / getCompany / updateCompany / resetSeed` with async Supabase-backed versions.
- Add `subscribeCompanies(cb)` that wires `supabase.channel('companies').on('postgres_changes', …)` and calls back with the fresh list.
- Add `seedIfEmpty()` — on first load, if table is empty, insert the existing SEED array so the demo data is preserved.
- Keep the `Company` / `TermSheetData` / `MISEntry` types exactly as-is.

**Hook (`src/lib/use-companies.ts`, new)**
- `useCompanies()` returns `{ companies, loading }`, fetches on mount, subscribes to realtime changes, unsubscribes on unmount.
- `useCompany(id)` thin wrapper.

**Component updates**
- `portfolio.index.tsx`, `portfolio.watchlist.tsx`, `portfolio.$companyId.tsx`, `portfolio.settings.tsx`, `pipeline.tsx` (if it uses the same store — verify): swap synchronous `loadCompanies()` / `updateCompany()` calls for the new async hook + `await updateCompany(...)`. Show a small "Syncing…" indicator while loading.

**Pipeline tracker note:** memory says pipeline currently uses its own `pipeline_deals_v1` localStorage key. Same treatment — new table `pipeline_deals` with realtime + audit entries — so "any change anyone makes is visible to everyone" holds across the whole app.

---

## 3. Audit log

**Write side** — every mutation helper in `portfolio-data.ts` (and `pipeline.tsx`'s deal mutations) inserts a row into `portfolio_audit_log`:
- On `updateCompany(id, patch)`: diff `patch` vs current row, write one entry per changed top-level field (`field`, `before`, `after`), plus a human `summary` like `"Moneyview · status changed Active → Watch"`.
- On MIS upload: action `mis_upload`, summary includes filename + breach count.
- On watchlist accept/dismiss: action `watchlist_change`.
- `actor` — since there is no auth, store a per-browser nickname kept in `localStorage` (`audit_actor`); Settings page gets a text input "Your name (shown in audit log)" defaulting to `"Anonymous"`.

**Read side** — new route `src/routes/portfolio.audit.tsx` (nav item "Audit Log", icon `History`):
- Table: timestamp · actor · company · action · summary, newest first.
- Filters: company dropdown, action dropdown, date range.
- Live: subscribe to `portfolio_audit_log` realtime inserts and prepend.
- Row click → expandable JSON diff (`before` / `after`).

---

## Technical details

- Files to **edit**: `src/routes/portfolio.tsx` (nav), `src/lib/portfolio-data.ts` (rewrite storage layer), `src/routes/portfolio.index.tsx`, `src/routes/portfolio.$companyId.tsx`, `src/routes/portfolio.watchlist.tsx`, `src/routes/portfolio.settings.tsx`, `src/routes/pipeline.tsx`.
- Files to **create**: migration for `portfolio_companies` + `portfolio_audit_log` (+ optional `pipeline_deals`), `src/lib/use-companies.ts`, `src/lib/audit.ts` (helper to write audit rows + compute diffs), `src/routes/portfolio.audit.tsx`.
- Realtime via the browser `supabase` client (RLS-permissive policies make this safe for the internal-tool model).
- Keep visual styling (`#0B1422`, `#FF7553` etc.) unchanged.

---

## Out of scope (call out, ask before doing)

- Adding real authentication / per-user actor identity.
- Server-side validation via `createServerFn` — direct client writes are fine for an internal tool; we can harden later.
- Migrating any existing localStorage data on each user's browser into the new table (a one-time "Import my local data" button can be added if needed).

---

## Open questions before I build

1. **Pipeline tracker** — should it also move to Supabase + audit log in this same pass, or leave it on localStorage for now?
2. **Actor identity** — OK with the simple "type your name in Settings" approach, or do you want me to add proper login (Google / email-password) so the audit log records real users?
3. **Seed behavior** — if the cloud table is already empty when this ships, should I auto-seed the 6 demo companies (Moneyview, GPS Renewables, etc.), or start blank?
