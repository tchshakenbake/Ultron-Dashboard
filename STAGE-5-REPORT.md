# Ultron Stage 5 — Persistent Data Access Foundation

## Added
- Server-only Supabase SSR client bound to the operator's cookie session.
- Server-side `auth.getUser()` validation and normalized operator-email allowlist check.
- Read-only `GET /api/missions` endpoint for authorized workspace and mission data.
- Bounded query sizes, explicit workspace scoping, private no-store response headers, generic failure messages, and no service-role key use.
- Static data-access regression checks wired into `npm test`.

## Security boundaries
- No database write endpoint is included in this stage. All modifications still require a future approval-bound implementation.
- The data client uses `SUPABASE_ANON_KEY`, not `SUPABASE_SERVICE_ROLE_KEY`, so Supabase Row Level Security remains active.
- No API key, database URL, or other secret is included in source files.

## Verification
- Run `npm run test:data-access` and `npm test` after dependencies are installed.
- TypeScript/build and live RLS behavior still require verification in the deployment environment.
- The migration remains unapplied. No Supabase project, GitHub repository, Netlify site, or voice provider was connected or modified.
