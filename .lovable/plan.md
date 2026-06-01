# Term Sheet (PDF/HTML) + MIS → Financials

## What already exists (no rebuild needed)

- Term Sheet tab with sub-tabs **Covenants / Security / Escrow Flow** and an Upload button that parses a PDF, calls Lovable AI, and populates every field — `src/routes/portfolio.$companyId.tsx` (`TermSheetTab`, lines ~410–470).
- MIS Reports panel that uploads a PDF, cross-checks against the saved term sheet, writes a `MISEntry` with `findings[]` (pass / breach / unknown per covenant, security field, escrow step), and surfaces a watchlist-suggestion banner — same file (`MISPanel`, lines ~735–810).
- Backend AI modes `termsheet` and `mis` in `src/lib/portfolio-ai.functions.ts`.

## Gaps to close

### 1. Accept HTML term sheets (in addition to PDF)

- `src/lib/pdf-extract.ts`: add a sibling helper `extractHtmlText(file: File)` that reads the file as text, strips tags (`DOMParser` → `textContent`), collapses whitespace, and returns plain text. Same return contract as `extractPdfText`.
- New tiny dispatcher `extractDocText(file)` that picks PDF vs HTML based on `file.type` / extension (`.html`, `.htm`).
- `TermSheetTab.handleFile` in `src/routes/portfolio.$companyId.tsx`: call `extractDocText` instead of `extractPdfText`, and update the file input `accept` from `application/pdf` to `application/pdf,text/html,.htm,.html`.
- `UploadButton` (same file) already takes an `accept` prop — just widen it for the term-sheet upload site. Leave MIS upload PDF-only unless asked.

### 2. MIS upload also refreshes Overview financials

- Extend the `mis` AI prompt in `portfolio-ai.functions.ts` to additionally return a `financials` block matching `LiveFinancials` shape:
  ```
  "financials": {
    "revenue": string, "ebitda": string, "pat": string,
    "debt": string, "netWorth": string,
    "ratios": [{ "label": string, "value": string }]
  }
  ```
  Fields are optional — model returns `""` / `[]` when MIS doesn't contain them.
- In `MISPanel.handleFile` (`src/routes/portfolio.$companyId.tsx`), after building the `MISEntry`, merge any non-empty `financials` into `company.liveData`:
  - Keep existing `rating`, `stockPrice`, `news` (MIS won't have those).
  - Overwrite `revenue / ebitda / pat / debt / netWorth` when MIS provides them.
  - Replace `ratios` only if MIS returned a non-empty array; otherwise keep prior ratios.
  - Set `liveData.updatedAt = new Date().toISOString()` and add a small "Last MIS update" hint in the Overview financials card.
- Single `updateCompany(id, { termSheet: { ...misHistory }, liveData: mergedLiveData })` call so the Overview tab re-renders immediately (it already reads from `company.liveData`).

### 3. UX polish

- Toast on MIS upload now reads: "MIS parsed — financials updated, N findings (X breaches)".
- Show file-type hint under the Term Sheet upload button: "PDF or HTML".

## Out of scope

- No schema/Supabase migration (data still lives in localStorage per current `portfolio-data.ts`).
- No changes to MIS history panel layout, watchlist banner, or covenant/security/escrow rendering.
- No DOCX support (can add later with mammoth if needed).

## Files touched

- `src/lib/pdf-extract.ts` — add `extractHtmlText` + `extractDocText`.
- `src/lib/portfolio-ai.functions.ts` — extend `mis` prompt schema with `financials`.
- `src/routes/portfolio.$companyId.tsx` — widen term-sheet `accept`, swap extractor, merge MIS financials into `liveData`, update toast.
