const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['middleware validates sessions with getUser', read('middleware.ts').includes('supabase.auth.getUser()')],
  ['middleware enforces configured operator email', read('middleware.ts').includes('user.email?.trim().toLowerCase() !== operatorEmail')],
  ['missing auth configuration redirects to login', read('middleware.ts').includes("searchParams.set('error', 'auth_not_configured')")],
  ['login checks allowlisted email before password auth', read('app/login/actions.ts').includes('if (!email || email !== expectedEmail || !password)')],
  ['no public registration action is exposed', !read('app/login/actions.ts').includes('signUp(')],
  ['logout signs out through Supabase Auth', read('app/logout/route.ts').includes('supabase.auth.signOut()')],
  ['auth dependencies declared', read('package.json').includes('@supabase/ssr') && read('package.json').includes('@supabase/supabase-js')],
  ['operator allowlist is documented', read('.env.example').includes('ULTRON_OPERATOR_EMAIL=')],
  ['health endpoint remains the only public API exception', read('middleware.ts').includes("pathname === '/api/health'")],
];
let failed = false;
for (const [name, ok] of checks) { process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${name}\n`); if (!ok) failed = true; }
if (failed) process.exit(1);
process.stdout.write(`\n${checks.length} auth source checks passed. These are static checks, not live Supabase integration tests.\n`);
