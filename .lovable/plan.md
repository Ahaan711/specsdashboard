## Restructure Term Sheet tab with compliance tracking

Refactor the Term Sheet tab on the company detail page into 3 sub-tabs (Covenants, Security, Escrow Flow), add an MIS upload history log, and use AI to suggest watchlist flags when MIS shows breaches.

### 1. Data model (`src/lib/portfolio-data.ts`)

Extend `Company.termSheet` shape:
- `covenants: { id, text, type: 'financial'|'affirmative'|'negative', threshold?: string }[]` (normalize existing string[])
- `security: { collateral, charge, coverage, guarantors, valuation, perfectionStatus }`
- `escrow: { bank, account, triggerEvents, waterfall: { step, label, description }[] }`
- `misHistory: { id, fileName, uploadedAt, period, compliance: { covenantId|sectionKey, status: 'pass'|'breach'|'unknown', note }[], aiSummary, breachDetected }[]`

### 2. AI parsing (`src/lib/portfolio-ai.functions.ts`)

- Update `termsheet` prompt to emit structured `covenants[]`, `security{}`, `escrow{}` matching new shape.
- Add new mode `"mis"` — input: extracted MIS text + the company's current termSheet covenants/security/escrow. Output: per-item compliance verdict, overall `breachDetected` boolean, and a 1-2 sentence `aiSummary` + suggested `watchReason` if breach.

### 3. Term Sheet UI (`src/routes/portfolio.$companyId.tsx`)

Replace single `TermSheetTab` rendering with nested `Tabs`:

```text
Term Sheet
├── Covenants     → table of covenants + latest-MIS pass/breach badge per row
├── Security      → fields card (collateral, charge, coverage, guarantors) + compliance badges
└── Escrow Flow   → fields + vertical waterfall diagram (SVG/divs) + compliance badge
```

Above sub-tabs: keep existing "Upload Term Sheet PDF" action.

### 4. MIS upload + history

New panel below sub-tabs (visible on all 3): **"MIS Reports"**
- Upload PDF button → extract text → call AI mode `"mis"` with current termSheet context → append to `misHistory`.
- List of past uploads (newest first): filename, period, upload date, overall status pill (Compliant / Breach), expand to see per-item findings.
- Each sub-tab reads the latest MIS entry and shows status badges next to each covenant / security field / escrow step.

### 5. Watchlist suggestion banner

When latest MIS has `breachDetected: true` and `company.status !== 'Watch'`:
- Show amber banner at top of company page: "AI detected potential breach in latest MIS — {summary}. [Add to Watchlist] [Dismiss]"
- Confirm → `updateCompany` sets `status: 'Watch'` and `watchReason: aiSummary`.
- Dismiss → store dismissal id in MIS entry so banner won't reappear for that upload.

### 6. Escrow waterfall visual

Vertical flow (CSS, no extra deps): inflow box → arrow → reserve account → arrow → interest → arrow → principal → arrow → surplus. Each step shows expected vs actual amount from latest MIS when available; non-compliant steps highlight red.

### Files to edit
- `src/lib/portfolio-data.ts` — extend types + migrate seed/localStorage shape (back-compat: treat old `covenants: string[]` as text-only items).
- `src/lib/portfolio-ai.functions.ts` — new prompts for `termsheet` (structured) and `mis` mode.
- `src/routes/portfolio.$companyId.tsx` — split TermSheetTab into nested-tab component + add MIS panel + watchlist banner.

### Out of scope (phase 2)
- Persisting MIS PDFs to storage (keeping localStorage + extracted text only for now).
- Multi-period trend charts of compliance.
- Editing covenants/security manually (only AI-extracted for now).