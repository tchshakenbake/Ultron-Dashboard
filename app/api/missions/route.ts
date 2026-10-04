import { NextResponse } from 'next/server';
import { createOperatorServerClient } from '@/lib/supabase/operator-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };

/** Read-only first data integration. RLS is enforced by a session-bound client.
 * Mutations are intentionally not implemented in this stage. */
export async function GET() {
  try {
    const { supabase } = await createOperatorServerClient();
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, created_at, updated_at')
      .order('created_at', { ascending: true })
      .limit(100);

    if (workspaceError || !workspaces) {
      return NextResponse.json({ error: 'workspace_data_unavailable' }, { status: 503, headers: noStore });
    }

    if (workspaces.length === 0) {
      return NextResponse.json({ workspaces: [], missions: [] }, { headers: noStore });
    }

    const workspaceIds = workspaces.map((workspace) => workspace.id);
    const { data: missions, error: missionError } = await supabase
      .from('missions')
      .select('id, workspace_id, title, description, status, priority, due_at, completed_at, archived_at, sort_order, created_at, updated_at')
      .in('workspace_id', workspaceIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(250);

    if (missionError || !missions) {
      return NextResponse.json({ error: 'mission_data_unavailable' }, { status: 503, headers: noStore });
    }

    const { data: tasks, error: taskError } = missions.length
      ? await supabase
          .from('mission_tasks')
          .select('id, mission_id, is_complete')
          .in('workspace_id', workspaceIds)
          .limit(1000)
      : { data: [], error: null };

    if (taskError || !tasks) {
      return NextResponse.json({ error: 'task_data_unavailable' }, { status: 503, headers: noStore });
    }

    return NextResponse.json({ workspaces, missions, tasks }, { headers: noStore });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'OPERATOR_SESSION_REQUIRED') {
      return NextResponse.json({ error: 'operator_session_required' }, { status: 401, headers: noStore });
    }
    return NextResponse.json({ error: 'data_access_unavailable' }, { status: 503, headers: noStore });
  }
}
