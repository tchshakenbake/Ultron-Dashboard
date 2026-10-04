const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['server-only marker is present', read('lib/supabase/operator-server.ts').includes("import 'server-only';")],
  ['data client uses anon key only', read('lib/supabase/operator-server.ts').includes('process.env.SUPABASE_ANON_KEY') && !read('lib/supabase/operator-server.ts').includes('SUPABASE_SERVICE_ROLE_KEY')],
  ['operator email is validated server-side', read('lib/supabase/operator-server.ts').includes('user.email?.trim().toLowerCase() !== operatorEmail')],
  ['Supabase user token is verified', read('lib/supabase/operator-server.ts').includes('supabase.auth.getUser()')],
  ['missions endpoint is GET-only', read('app/api/missions/route.ts').includes('export async function GET()') && !/export async function (POST|PUT|PATCH|DELETE)\s*\(/.test(read('app/api/missions/route.ts'))],
  ['workspace and mission queries are bounded', read('app/api/missions/route.ts').includes('.limit(100)') && read('app/api/missions/route.ts').includes('.limit(250)')],
  ['workspace IDs scope mission query', read('app/api/missions/route.ts').includes(".in('workspace_id', workspaceIds)")],
  ['responses disable caching', read('app/api/missions/route.ts').includes("'Cache-Control': 'private, no-store, max-age=0'")],
  ['failures return generic messages', read('app/api/missions/route.ts').includes("'data_access_unavailable'") && !read('app/api/missions/route.ts').includes('error.message,')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`${checks.length - failed}/${checks.length} data-access checks passed`);
if (failed) process.exit(1);
