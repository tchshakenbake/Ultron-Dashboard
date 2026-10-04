import { NextResponse } from "next/server";
import { getEnvironmentReport } from "@/lib/security/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnvironmentReport();
  return NextResponse.json({
    status: "ok",
    service: "ultron-command-center",
    stage: 2,
    timestamp: new Date().toISOString(),
    capabilities: {
      database: env.supabaseConfigured ? "configured_not_verified" : "not_configured",
      authentication: env.authConfigured ? "configured_not_verified" : "not_configured",
      secretEncryption: env.encryptionConfigured ? "configured_not_verified" : "not_configured",
      externalActions: "disabled",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
