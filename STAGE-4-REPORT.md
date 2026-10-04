# Stage 4 report — Operator authentication gate

## Implemented
- Supabase SSR middleware validates the current user with `auth.getUser()` before serving protected routes.
- Only the single account matching `ULTRON_OPERATOR_EMAIL` is admitted; all other users are redirected to login.
- Missing auth configuration fails closed and sends requests to a locked login screen.
- Server-action password login and a logout endpoint use HTTP-only cookie handling through `@supabase/ssr`.
- Public registration is not implemented. `/api/health` remains the one intentionally public API route and must expose no secrets.
- Added static source checks to the project test suite.

## Required configuration before private login can work
Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_AUTH_ENABLED=true`, and `ULTRON_OPERATOR_EMAIL` in the server environment. Create the operator account directly in Supabase Auth through a reviewed administrative workflow; do not enable public sign-up. Keep any service-role key server-only and unused by browser code.

## Verification status
- The Stage 4 test script checks source-level security invariants only.
- No Supabase project was connected or modified. Live cookie refresh, redirect behavior, RLS, MFA, and production deployment are not verified.
- Existing approval routes remain fail-closed. Authentication does not itself authorize modifications; every future mutating route must enforce ownership, role, approval binding, idempotency, and audit logging independently.
- Build and runtime integration testing require dependency installation and should be run before deployment.

## Operator gate
No external service was connected and no deployment was performed in this stage.
