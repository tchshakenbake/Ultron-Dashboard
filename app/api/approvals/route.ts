import { NextRequest, NextResponse } from 'next/server';
import { createOperatorServerClient } from '@/lib/supabase/operator-server';
import { createOperatorAdminClient } from '@/lib/supabase/operator-admin';
import { approvalDigestForAudit } from '@/lib/security/approval';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie, Origin' };
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return !!origin && origin === request.nextUrl.origin;
}

/** Creates a pending proposal only; it never performs the requested action. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'same_origin_required' }, { status: 403, headers });
  try {
    const { supabase, user } = await createOperatorServerClient();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.workspaceId !== 'string' || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400, headers });
    }
    const title = body.title.trim();
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const priority = typeof body.priority === 'string' ? body.priority.toLowerCase() : 'normal';
    const dueAt = body.dueAt === null || body.dueAt === undefined || body.dueAt === '' ? null : body.dueAt;
    if (!title || title.length > 180 || description.length > 12000 || !['low', 'normal', 'high', 'critical'].includes(priority)) {
      return NextResponse.json({ error: 'invalid_mission_fields' }, { status: 400, headers });
    }
    if (dueAt !== null && (typeof dueAt !== 'string' || !Number.isFinite(Date.parse(dueAt)))) {
      return NextResponse.json({ error: 'invalid_due_date' }, { status: 400, headers });
    }
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members').select('role').eq('workspace_id', body.workspaceId).eq('user_id', user.id).maybeSingle();
    if (membershipError || !membership || !['owner', 'operator'].includes(membership.role)) {
      return NextResponse.json({ error: 'workspace_write_access_required' }, { status: 403, headers });
    }
    const payload = { title, description, priority, due_at: dueAt, workspace_id: body.workspaceId };
    const action = { kind: 'mission.create' as const, summary: `Create mission: ${title}`, payload };
    const digest = approvalDigestForAudit(action);
    const admin = createOperatorAdminClient();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data, error } = await admin.from('approvals').insert({
      workspace_id: body.workspaceId, requested_by: user.id, status: 'pending', action_kind: action.kind,
      action_summary: action.summary, action_payload: payload, action_digest: digest, expires_at: expiresAt,
    }).select('id, action_summary, action_payload, expires_at, status').single();
    if (error || !data) return NextResponse.json({ error: 'proposal_store_unavailable' }, { status: 503, headers });
    return NextResponse.json({ approval: data }, { status: 201, headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'OPERATOR_SESSION_REQUIRED') return NextResponse.json({ error: 'operator_session_required' }, { status: 401, headers });
    return NextResponse.json({ error: 'approval_proposal_unavailable' }, { status: 503, headers });
  }
}

export async function GET() {
  try {
    const { supabase, user } = await createOperatorServerClient();
    const { data: memberships, error: membershipError } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).in('role', ['owner', 'operator']).limit(100);
    if (membershipError || !memberships) return NextResponse.json({ error: 'approval_data_unavailable' }, { status: 503, headers });
    const ids = memberships.map((item) => item.workspace_id);
    if (!ids.length) return NextResponse.json({ approvals: [] }, { headers });
    const admin = createOperatorAdminClient();
    const { data, error } = await admin.from('approvals').select('id, workspace_id, requested_by, action_kind, action_summary, action_payload, action_digest, status, expires_at, created_at').eq('requested_by', user.id).in('workspace_id', ids).in('status', ['pending', 'approved']).order('created_at', { ascending: false }).limit(50);
    if (error || !data) return NextResponse.json({ error: 'approval_data_unavailable' }, { status: 503, headers });
    return NextResponse.json({ approvals: data }, { headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'OPERATOR_SESSION_REQUIRED') return NextResponse.json({ error: 'operator_session_required' }, { status: 401, headers });
    return NextResponse.json({ error: 'approval_data_unavailable' }, { status: 503, headers });
  }
}
