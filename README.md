# ULTRON // Command Center

A cinematic Next.js + TypeScript personal command dashboard. Current source includes the Stage 1 interface prototype and Stage 2 server-side security foundation.

## Stage 1 interface
- Dark metallic HUD with crimson reactor accents and a custom vector face mark.
- Command Center overview, mission cards, local command console, diagnostics, and event center.
- Responsive navigation, visible keyboard focus, and reduced-motion support.
- Demo mission and transcript state is local and resets on refresh.

## Stage 2 security foundation
- `/api/health` reports only configuration status; `configured_not_verified` is not a live connection test.
- AES-256-GCM helper for application-level encryption of secrets.
- Versioned encrypted payload includes IV, authentication tag, and ciphertext.
- Approval records bind an allowlisted proposed action to a digest and expiry.
- Approval API intentionally fails closed with HTTP 503 until authentication and persistent authorization are implemented.
- Security headers are configured in `next.config.ts`.

## Not connected
No Supabase project, auth session, database, AI model, Fish Audio, provider API key, background job, notification service, GitHub repository, or Netlify deployment is connected. No external action can execute.

## Requirements
- Node.js 20.9+ (Node.js 22 LTS recommended)
- npm

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Build and lint
```bash
npm run build
npm run lint
```

## Security rules
- Never expose secrets via `NEXT_PUBLIC_*`, browser bundles, transcripts, or logs.
- Store encryption keys separately from encrypted database values; plan rotation and recovery before production use.
- Use Supabase Auth, server-side authorization, and database RLS before persisting private data.
- Bind approvals to an immutable action preview; revalidate authorization and payload immediately before execution.
- Treat external actions as untrusted until the outcome is verified; implement idempotency and duplicate-action protections.
- External service connections and deployment require a separate operator review before proceeding.


## Stage 4 operator authentication gate
- A private operator-only Supabase Auth gate now protects application routes through server-side session validation.
- Set `ULTRON_OPERATOR_EMAIL` alongside the Supabase server environment variables; if any required setting is missing, the gate denies dashboard access.
- No public registration route is provided. Create the one operator account through an explicitly reviewed administrative process.
- `/api/health` is the only public API exception and must remain free of secret values.
- This is an implementation scaffold, not a verified live connection. Test in a disposable Supabase project before production. See `STAGE-4-REPORT.md`.


## Stage 6 mission data binding
- Mission Control reads from `/api/missions` through a same-origin, no-store request and supports manual sync.
- When the protected endpoint returns real rows, the dashboard replaces sample missions with persistent mission data and task-derived completion progress.
- When data access fails, the interface explicitly labels its content as local preview data.
- No mission write operations are implemented. See `STAGE-6-REPORT.md` for scope and validation limits.
