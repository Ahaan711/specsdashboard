## Goal
Get the manual cloud sync working reliably so PortfolioOS and Deal Manager can push local changes to the hosted backend and pull them onto other machines.

## What’s blocking sync now
- The frontend sync buttons are already wired.
- The hosted backend is reachable, but database reads are timing out intermittently.
- The sync schema/storage were never successfully provisioned, so the app falls back to “not provisioned yet.”

## Plan

### 1. Provision the backend objects the sync code expects
Create the missing backend pieces in one pass:
- `portfolio_companies` for PortfolioOS records
- `pipeline_deals` for Deal Manager records
- `portfolio_documents` for uploaded term sheets / MIS metadata
- `portfolio-docs` storage bucket for the actual files
- access rules so the app can read/write these safely

### 2. Verify provisioning before touching app behavior
After the migration succeeds, verify:
- all three tables exist
- the storage bucket exists
- the app can read and write a test row/file without timing out

### 3. Re-test the current manual sync flow end to end
Validate the existing buttons already added:
- PortfolioOS Sync: push local companies, pull latest cloud copy
- Deal Manager Sync: push/pull deals
- Documents tab: list metadata and download uploaded files
- term sheet / MIS uploads: archive file + create document metadata row

### 4. Fix merge reliability if needed
If sync still feels inconsistent after provisioning, tighten the data merge logic:
- prefer newest `updated_at` instead of blind last-write wins
- avoid local stale data overwriting fresher cloud data
- return clearer per-module sync results (companies, deals, documents)

### 5. Handle backend flakiness gracefully
If the hosted database keeps timing out even after provisioning:
- add retry/backoff around sync operations
- show a more specific UI message when the backend is temporarily unavailable
- if the backend instance is overloaded, recommend checking Cloud instance sizing/status in the backend panel

## Expected outcome
- Manual push/pull sync works on both PortfolioOS and Deal Manager
- Uploaded term sheets and MIS files appear in Documents with metadata + download
- Changes made on one laptop become available on another after pressing Sync

## Technical notes
- This is primarily a backend provisioning issue, not a missing-button issue.
- The current frontend work should start functioning as soon as the tables and storage bucket exist and are reachable.
- If the migration service is healthy on the next attempt, this should be a straightforward repair rather than a redesign.