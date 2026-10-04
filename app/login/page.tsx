import type { Metadata } from 'next';
import { login } from './actions';

export const metadata: Metadata = { title: 'Operator Authentication // ULTRON' };

const messages: Record<string, string> = {
  auth_not_configured: 'Authentication is not configured. Access remains locked until the operator completes server setup.',
  invalid_credentials: 'Sign-in failed. Check the operator credentials and try again.',
  operator_session_required: 'A valid operator session is required to access the command center.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = process.env.SUPABASE_AUTH_ENABLED === 'true' && Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.ULTRON_OPERATOR_EMAIL);
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(ellipse at 50% 20%, #24232a 0%, #0b0c10 58%, #07080a 100%)', color: '#eceef2', fontFamily: 'Arial, sans-serif' }}>
      <section style={{ width: 'min(100%, 440px)', border: '1px solid #41434b', background: 'rgba(14,15,19,.94)', padding: 32, boxShadow: '0 0 50px #b321341c' }}>
        <div style={{ color: '#f04a4a', letterSpacing: '.24em', fontSize: 12, fontWeight: 700 }}>ULTRON // PRIVATE ACCESS</div>
        <h1 style={{ fontSize: 30, letterSpacing: '.06em', margin: '18px 0 8px' }}>OPERATOR <span style={{ color: '#b32134' }}>AUTHENTICATION</span></h1>
        <p style={{ color: '#a9abb4', fontSize: 14, lineHeight: 1.6 }}>Identity verification required. Only the configured operator account is permitted.</p>
        {error && <p role="alert" style={{ borderLeft: '3px solid #ef4444', padding: '10px 12px', background: '#ef444411', color: '#fca5a5', fontSize: 13 }}>{messages[error] ?? 'Authentication could not be completed.'}</p>}
        {!configured ? (
          <div style={{ border: '1px solid #7c4a22', padding: 14, marginTop: 20, color: '#fbbf77', fontSize: 13, lineHeight: 1.6 }}>
            <strong>SECURITY LOCK ACTIVE</strong><br />Set the server-only Supabase Auth variables and the single operator email in the deployment environment. Do not put secrets in client code or commit real credentials.
          </div>
        ) : (
          <form action={login} style={{ display: 'grid', gap: 14, marginTop: 24 }}>
            <label style={{ display: 'grid', gap: 7, fontSize: 12, color: '#c4c6ce', letterSpacing: '.08em' }}>OPERATOR EMAIL<input name="email" type="email" autoComplete="username" required style={fieldStyle} /></label>
            <label style={{ display: 'grid', gap: 7, fontSize: 12, color: '#c4c6ce', letterSpacing: '.08em' }}>PASSWORD<input name="password" type="password" autoComplete="current-password" required style={fieldStyle} /></label>
            <button type="submit" style={{ border: '1px solid #c33a46', background: 'linear-gradient(90deg,#7f1725,#b32134)', color: 'white', padding: '13px 16px', marginTop: 4, letterSpacing: '.12em', fontWeight: 700, cursor: 'pointer' }}>VERIFY OPERATOR</button>
          </form>
        )}
        <div style={{ borderTop: '1px solid #2c2e35', marginTop: 24, paddingTop: 16, fontSize: 11, color: '#777b86', letterSpacing: '.1em' }}>AUTH GATE // FAIL-CLOSED // NO PUBLIC REGISTRATION</div>
      </section>
    </main>
  );
}

const fieldStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 13px', color: '#f4f4f5', background: '#090a0d', border: '1px solid #3d4049', outlineColor: '#b32134' };
