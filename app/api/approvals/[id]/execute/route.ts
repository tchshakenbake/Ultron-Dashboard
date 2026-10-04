import { NextRequest, NextResponse } from 'next/server';
import { createOperatorServerClient } from '@/lib/supabase/operator-server';
import { createOperatorAdminClient } from '@/lib/supabase/operator-admin';
import { approvalDigestForAudit } from '@/lib/security/approval';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie, Origin' };

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) return NextResponse.json({ error: 'same_origin_required' }, { status: 403, headers });
  try {
    const { supabase, user } = await createOperatorServerClient();
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'invalid_approval_id' }, { status: 400, headers });
    const admin = createOperatorAdminClient();
    const { data: approval, error } = await admin.from('approvals').select('*').eq('id', id).maybeSingle();
    if (error || !approval) return NextResponse.json({ error: 'approval_not_found' }, { status: 404, headers });
    if (approval.requested_by !== user.id || approval.action_kind !== 'mission.create') return NextResponse.json({ error: 'approval_not_owned' }, { status: 403, headers });
    if (approval.status !== 'pending') return NextResponse.json({ error: 'approval_not_pending' }, { status: 409, headers });
    if (Date.parse(approval.expires_at) <= Date.now()) {
      await admin.from('approvals').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
      return NextResponse.json({ error: 'approval_expired' }, { status: 409, headers });
    }
    const payload = approval.action_payload as Record<string, unknown>;
    const action = { kind: 'mission.create' as const, summary: approval.action_summary as string, payload };
    if (approvalDigestForAudit(action) !== approval.action_digest) return NextResponse.json({ error: 'approval_integrity_check_failed' }, { status: 409, headers });
    const { data: membership, error: membershipError } = await supabase.from('workspace_members').select('role').eq('workspace_id', approval.workspace_id).eq('user_id', user.id).maybeSingle();
    if (membershipError || !membership || !['owner', 'operator'].includes(membership.role)) return NextResponse.json({ error: 'workspace_write_access_required' }, { status: 403, headers });
    const { data: result, error: executeError } = await admin.rpc('ultron_execute_mission_create', {
      p_approval_id: id, p_operator_id: user.id, p_action_digest: approval.action_digest,
    });
    if (executeError || !result) return NextResponse.json({ error: 'mission_execution_failed', message: 'No success was reported. Check the approval record before retrying.' }, { status: 409, headers });
    return NextResponse.json({ result }, { headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'OPERATOR_SESSION_REQUIRED') return NextResponse.json({ error: 'operator_session_required' }, { status: 401, headers });
    return NextResponse.json({ error: 'mission_execution_unavailable' }, { status: 503, headers });
  }
}
