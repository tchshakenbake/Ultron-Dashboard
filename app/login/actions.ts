'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const expectedEmail = process.env.ULTRON_OPERATOR_EMAIL?.trim().toLowerCase();
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (process.env.SUPABASE_AUTH_ENABLED !== 'true' || !url || !anonKey || !expectedEmail) {
    redirect('/login?error=auth_not_configured');
  }
  // Enforce the single configured operator account before contacting Auth.
  if (!email || email !== expectedEmail || !password) {
    redirect('/login?error=invalid_credentials');
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: Array<{
        name: string;
        value: string;
        options?: Parameters<typeof cookieStore.set>[2];
      }>) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || data.user.email?.trim().toLowerCase() !== expectedEmail) {
    redirect('/login?error=invalid_credentials');
  }
  redirect('/');
}
