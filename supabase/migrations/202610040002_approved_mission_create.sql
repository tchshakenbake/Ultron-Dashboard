-- ULTRON Stage 7: atomic, approval-bound mission creation.
-- Review and apply manually only after Stage 3 schema exists on the intended project.
begin;

create or replace function public.ultron_execute_mission_create(
  p_approval_id uuid,
  p_operator_id uuid,
  p_action_digest text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_approval public.approvals%rowtype;
  v_payload jsonb;
  v_mission public.missions%rowtype;
  v_now timestamptz := now();
begin
  if p_operator_id is null or p_action_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_execution_request' using errcode = '22023';
  end if;

  select * into v_approval from public.approvals where id = p_approval_id for update;
  if not found then raise exception 'approval_not_found' using errcode = 'P0002'; end if;
  if v_approval.requested_by <> p_operator_id or v_approval.action_kind <> 'mission.create' then
    raise exception 'approval_not_owned' using errcode = '42501';
  end if;
  if v_approval.status <> 'pending' then raise exception 'approval_not_pending' using errcode = '55000'; end if;
  if v_approval.expires_at <= v_now then
    update public.approvals set status = 'expired', updated_at = v_now where id = p_approval_id;
    raise exception 'approval_expired' using errcode = '55000';
  end if;
  if v_approval.action_digest <> p_action_digest then raise exception 'approval_digest_mismatch' using errcode = '22000'; end if;

  select v_approval.action_payload into v_payload;
  if v_payload->>'workspace_id' is distinct from v_approval.workspace_id::text
    or nullif(trim(v_payload->>'title'), '') is null
    or char_length(v_payload->>'title') > 180
    or coalesce(char_length(v_payload->>'description'), 0) > 12000
    or coalesce(v_payload->>'priority', '') not in ('low', 'normal', 'high', 'critical') then
    raise exception 'approval_payload_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from public.workspace_members wm where wm.workspace_id = v_approval.workspace_id and wm.user_id = p_operator_id and wm.role in ('owner', 'operator')) then
    raise exception 'workspace_write_access_required' using errcode = '42501';
  end if;

  insert into public.missions(workspace_id, created_by, title, description, status, priority, due_at)
  values (
    v_approval.workspace_id, p_operator_id, trim(v_payload->>'title'), coalesce(v_payload->>'description', ''),
    'planned', (v_payload->>'priority')::public.mission_priority,
    case when nullif(v_payload->>'due_at', '') is null then null else (v_payload->>'due_at')::timestamptz end
  ) returning * into v_mission;

  update public.approvals set status = 'consumed', reviewed_by = p_operator_id,
    reviewed_at = v_now, consumed_at = v_now, result_summary = 'Mission created: ' || v_mission.id::text,
    updated_at = v_now where id = p_approval_id and status = 'pending';
  if not found then raise exception 'approval_race_detected' using errcode = '40001'; end if;

  insert into public.activity_events(workspace_id, actor_id, event_type, severity, outcome, summary, details)
  values (v_approval.workspace_id, p_operator_id, 'mission.created', 'info', 'verified_success', 'Mission created after operator approval',
    jsonb_build_object('mission_id', v_mission.id, 'approval_id', p_approval_id, 'action_digest', p_action_digest));

  return jsonb_build_object('status', 'verified', 'mission_id', v_mission.id, 'title', v_mission.title, 'approval_id', p_approval_id);
end;
$$;

revoke all on function public.ultron_execute_mission_create(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.ultron_execute_mission_create(uuid, uuid, text) to service_role;
commit;
