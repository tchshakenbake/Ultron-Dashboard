# Stage 6 Report — Mission Control Data Binding

## Delivered
- Mission Control requests the protected `/api/missions` endpoint on initial load and supports manual sync.
- API now returns workspace and mission rows plus bounded task completion records using the authenticated, session-bound Supabase client.
- Mission progress is derived from completed tasks; a mission marked completed displays 100%. Missions without tasks show 0% unless completed.
- UI distinguishes `CONNECTED`, `LOADING`, and `PREVIEW` states and displays last successful sync time.
- If auth or database access fails, the UI keeps local preview data and explains that it is not synced. It does not claim the preview is persistent.
- Archived missions are excluded from the active list. Queries remain bounded and responses remain private/no-store.
- No mission writes, provider connections, service-role credentials, or deployments were added.

## Verification
- Added 10 static integration assertions (`npm run test:stage6`).
- These are source-level checks only. They do not prove a live Supabase project, RLS, authentication, or production build works.

## Required before live data
1. Review environment configuration and connect a disposable Supabase project only after operator approval.
2. Apply the migration after reviewing its contents and backup/rollback plan.
3. Create the single operator account and validate RLS with an authenticated session.
4. Run install, tests, lint, production build, and end-to-end verification before deployment.

No external services were connected and no deployment was performed in this stage.
