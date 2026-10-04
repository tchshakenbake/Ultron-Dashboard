import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Private operator gate. Missing configuration denies access instead of silently
 * falling back to a public dashboard. This middleware does not grant write
 * permission; each mutating route must still perform its own authorization.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/login' || pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }
  // The health endpoint exposes configuration booleans only, never credentials.
  if (pathname === '/api/health') return NextResponse.next();

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const operatorEmail = process.env.ULTRON_OPERATOR_EMAIL?.trim().toLowerCase();
  const authEnabled = process.env.SUPABASE_AUTH_ENABLED === 'true';
  if (!url || !anonKey || !operatorEmail || !authEnabled) {
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.searchParams.set('error', 'auth_not_configured');
    return NextResponse.redirect(target);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser validates the token with Supabase Auth; do not trust getSession alone.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.email?.trim().toLowerCase() !== operatorEmail) {
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.searchParams.set('error', 'operator_session_required');
    const redirectResponse = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|robots.txt|sitemap.xml).*)'],
};
