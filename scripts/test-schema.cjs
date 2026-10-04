const assert = require("node:assert/strict");
const fs = require("node:fs");
const sql = fs.readFileSync("supabase/migrations/202610040001_initial_schema.sql", "utf8");
const tables = ["workspaces", "workspace_members", "missions", "mission_tasks", "memories", "approvals", "provider_configs", "provider_credentials", "activity_events", "user_preferences"];
let passed = 0;
function test(name, fn) { fn(); passed += 1; process.stdout.write(`PASS ${name}\n`); }
test("defines every planned core table", () => { for (const table of tables) assert.match(sql, new RegExp(`create table public\\.${table}\\s*\\(`, "i")); });
test("enables RLS on every application table", () => { for (const table of tables) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i")); });
test("credential ciphertext is denied to browser roles", () => { assert.match(sql, /revoke all on public\.provider_credentials from anon, authenticated/i); assert.doesNotMatch(sql, /grant\s+select\s+on\s+public\.provider_credentials\s+to\s+authenticated/i); });
test("authenticated clients receive read-only table grants", () => { assert.match(sql, /grant select on public\.workspaces[\s\S]*?to authenticated/i); assert.match(sql, /revoke insert, update, delete, truncate, references, trigger[\s\S]*?from authenticated/i); assert.doesNotMatch(sql, /create policy [\s\S]{0,100} for (insert|update|delete|all) to authenticated/i); });
test("workspace-role helper uses a locked search path", () => { assert.match(sql, /security definer\s+set search_path = ''/i); assert.match(sql, /revoke all on function public\.has_workspace_role[\s\S]*?from public, anon/i); });
test("service-role grants are explicit to Ultron tables only", () => { assert.doesNotMatch(sql, /grant all privileges on all tables in schema public/i); assert.doesNotMatch(sql, /alter default privileges in schema public/i); assert.match(sql, /grant all privileges on public\.workspaces[\s\S]*?to service_role/i); });
process.stdout.write(`${passed} schema checks passed (static review only; SQL not executed).\n`);
