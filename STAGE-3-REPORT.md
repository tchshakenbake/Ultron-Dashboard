# Stage 3 report — database schema and access model

## Added locally
- Initial SQL migration for workspaces/members, missions/tasks, memories, approvals, provider metadata, isolated encrypted provider credentials, activity/audit events, and user preferences.
- Row-level security on all application tables.
- Authenticated clients have read-only grants; direct client mutations are denied by table grants and absence of write policies.
- Provider credential table is inaccessible to `anon` and `authenticated` roles.
- Workspace-role helper function uses `SECURITY DEFINER`, an empty `search_path`, and fully qualified names to avoid recursive RLS and object-shadowing issues.
- Migration review notes and requirements documented.

## Verification
- Six automated static schema checks passed for required tables, RLS enablement, read-only client access, isolated credentials, locked search path, and scoped service-role grants.
- Six Stage 2 security tests also pass through `npm test`.
- TypeScript syntax/transpile check passed for all 8 TypeScript files.
- Migration was reviewed statically for required tables, RLS enablement, read-only client access, and isolated credentials.
- No `psql` client was available, so SQL was not executed against PostgreSQL and runtime RLS behavior is unverified.
- No Supabase project was connected or modified.

## Important boundary
The service-role database path must only be used from trusted server routes that validate the logged-in user, workspace permissions, approval record status, expiry, and action digest. This schema alone does not provide a complete production authorization system.

## Before applying to a real project
Operator review and explicit approval are required. Then apply to a disposable project first, inspect grants and RLS behavior with multiple test users, and only afterward consider a production project.
