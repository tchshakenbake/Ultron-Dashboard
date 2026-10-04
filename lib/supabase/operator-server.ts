import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Session-bound Supabase client. It deliberately uses the public anon key so RLS
 * remains in force; the service-role key is never read by this module. */
export async function createOperatorServerClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const operatorEmail = process.env.ULTRON_OPERATOR_EMAIL?.trim().toLowerCase();
  const authEnabled = process.env.SUPABASE_AUTH_ENABLED === 'true';

  if (!url || !anonKey || !operatorEmail || !authEnabled) {
    throw new Error('OPERATOR_DATA_ACCESS_DISABLED');
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components may not mutate cookies; middleware refreshes sessions.
        }
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.email?.trim().toLowerCase() !== operatorEmail) {
    throw new Error('OPERATOR_SESSION_REQUIRED');
  }

  return { supabase, user };
}
