The backend says it is online, but direct database reads are still timing out, which is why the app keeps falling into its “cloud sync unavailable / not provisioned” path. The app is also treating several different backend failures as the same “not provisioned” message, so the UI cannot distinguish “tables missing” from “database temporarily unreachable.”

Plan:
1. Re-check the database once the connection responds, specifically for `portfolio_companies` and `pipeline_deals`.
2. If the tables are missing, add a migration to create them with the required access grants and user-scoped security rules.
3. If the tables exist but access fails, add/fix the required grants and policies so authenticated users can read/write their sync data.
4. Update the sync error handling so connection timeouts show a clearer error, while true missing-table cases still say sync is not provisioned.
5. Verify with a fresh read query and then test the Portfolio/Pipeline Sync buttons.

Technical notes:
- No UI redesign is needed.
- The current frontend Sync buttons are wired to `portfolio_companies` and `pipeline_deals`.
- The likely blocker is backend schema/access or a transient database connectivity issue, not the button code.