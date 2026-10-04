/** Server-side environment validation. Never import this module from a Client Component. */
export type EnvironmentReport = {
  nodeEnvironment: string;
  supabaseConfigured: boolean;
  authConfigured: boolean;
  encryptionConfigured: boolean;
};

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

export function getEnvironmentReport(): EnvironmentReport {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = process.env.ULTRON_ENCRYPTION_KEY_BASE64;

  // A service-role key is server-only and must never be used to imply client auth is ready.
  const supabaseConfigured = isValidHttpUrl(supabaseUrl) && Boolean(supabaseAnonKey);
  const authConfigured = supabaseConfigured && Boolean(process.env.SUPABASE_AUTH_ENABLED === "true");
  const encryptionConfigured = isValidAesKey(encryptionKey);

  // Avoid logging or returning the value of any credential, including the service-role key.
  void serviceRoleKey;
  return {
    nodeEnvironment: process.env.NODE_ENV ?? "unknown",
    supabaseConfigured,
    authConfigured,
    encryptionConfigured,
  };
}

export function isValidAesKey(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").byteLength === 32;
  } catch {
    return false;
  }
}
