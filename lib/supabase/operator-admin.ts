import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Privileged client is server-only and must only be used after operator auth and policy checks. */
export function createOperatorAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('OPERATOR_WRITE_STORE_DISABLED');
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Application-Name': 'ultron-command-center' } },
  });
}
