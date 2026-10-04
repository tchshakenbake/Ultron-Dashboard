# Supabase schema package (not connected)

`migrations/202610040001_initial_schema.sql` defines the first database schema for Ultron. It has not been applied to any project.

## Security design
- Row-level security is enabled on all application tables.
- Authenticated clients have read-only grants; there are no direct client write policies.
- Writes must be performed by a trusted server route after checking the authenticated owner, workspace role, and any required approval.
- Provider credentials are isolated in `provider_credentials`, with no table privileges for `anon` or `authenticated`.
- Credential payloads must be encrypted by the application before insertion; the encryption key must be held outside Postgres.
- Audit events are server-written and client-readable only within the relevant workspace.
- The service-role key is never a browser credential and must not be placed in `NEXT_PUBLIC_*` variables.

## Review before applying
1. Confirm the migration role has permission to create the extension/types and set default privileges.
2. Review `SECURITY DEFINER` ownership and grants in the target project.
3. Confirm service-role access is restricted to server runtime secrets.
4. Add server-side auth/role validation, atomic approval state transitions, idempotency, and audit logging before enabling any write route.
5. Generate TypeScript database types from the actual reviewed schema and run integration tests in a disposable Supabase project.

No remote Supabase project was accessed or modified as part of this stage.
