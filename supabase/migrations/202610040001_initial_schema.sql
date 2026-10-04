-- ULTRON Stage 3: initial private workspace schema.
-- Apply only to a reviewed Supabase project. No remote project is contacted by this file.

begin;

create type public.workspace_role as enum ('owner', 'operator', 'viewer');
create type public.mission_status as enum ('planned', 'active', 'blocked', 'completed', 'archived');
create type public.mission_priority as enum ('low', 'normal', 'high', 'critical');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'expired', 'consumed');
create type public.audit_severity as enum ('info', 'warning', 'urgent', 'critical');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text not null default '' check (char_length(description) <= 12000),
  status public.mission_status not null default 'planned',
  priority public.mission_priority not null default 'normal',
  due_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  check ((status <> 'completed') or completed_at is not null),
  check ((status <> 'archived') or archived_at is not null)
);

create table public.mission_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  mission_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 180),
  details text not null default '' check (char_length(details) <= 8000),
  is_complete boolean not null default false,
  due_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (mission_id, workspace_id) references public.missions(id, workspace_id) on delete cascade
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  category text not null check (char_length(trim(category)) between 1 and 80),
  title text not null check (char_length(trim(title)) between 1 and 180),
  content text not null check (char_length(content) <= 30000),
  tags text[] not null default '{}',
  source text not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (cardinality(tags) <= 40)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  status public.approval_status not null default 'pending',
  action_kind text not null check (action_kind ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  action_summary text not null check (char_length(trim(action_summary)) between 1 and 240),
  action_payload jsonb not null check (jsonb_typeof(action_payload) = 'object'),
  action_digest text not null check (action_digest ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  reviewed_at timestamptz,
  consumed_at timestamptz,
  result_summary text check (result_summary is null or char_length(result_summary) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status not in ('approved', 'rejected', 'consumed')) or reviewed_at is not null),
  check ((status <> 'consumed') or consumed_at is not null)
);

create table public.provider_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  provider_id text not null check (provider_id ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 100),
  provider_type text not null check (provider_type in ('llm', 'tts', 'stt', 'integration')),
  enabled boolean not null default false,
  non_secret_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(non_secret_settings) = 'object'),
  last_tested_at timestamptz,
  last_test_status text check (last_test_status is null or last_test_status in ('success', 'failure', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, workspace_id, provider_id)
);

-- Deliberately isolated from client-readable provider metadata.
-- encrypted_payload must contain only the application-encrypted envelope, never plaintext.
create table public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_config_id uuid not null unique references public.provider_configs(id) on delete cascade,
  encryption_version smallint not null check (encryption_version > 0),
  encrypted_payload jsonb not null check (
    jsonb_typeof(encrypted_payload) = 'object' and
    encrypted_payload ?& array['version', 'algorithm', 'iv', 'authTag', 'ciphertext']
  ),
  key_reference text not null check (char_length(trim(key_reference)) between 1 and 120),
  rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_.-]{1,99}$'),
  severity public.audit_severity not null default 'info',
  outcome text not null check (outcome in ('proposed', 'approved', 'rejected', 'attempted', 'verified_success', 'failed', 'unknown')),
  summary text not null check (char_length(trim(summary)) between 1 and 500),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  correlation_id uuid,
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  updated_at timestamptz not null default now()
);

create index missions_workspace_status_idx on public.missions(workspace_id, status, priority);
create index missions_workspace_due_idx on public.missions(workspace_id, due_at) where due_at is not null;
create index mission_tasks_mission_idx on public.mission_tasks(mission_id, sort_order);
create index memories_owner_updated_idx on public.memories(owner_id, updated_at desc) where deleted_at is null;
create index memories_workspace_idx on public.memories(workspace_id, updated_at desc) where deleted_at is null;
create index approvals_workspace_status_idx on public.approvals(workspace_id, status, created_at desc);
create index activity_workspace_created_idx on public.activity_events(workspace_id, created_at desc);
create index activity_correlation_idx on public.activity_events(correlation_id) where correlation_id is not null;

-- SECURITY DEFINER avoids recursive RLS evaluation against workspace_members.
-- Empty search_path and fully qualified table/function names prevent object shadowing.
create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles public.workspace_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.role = any(allowed_roles)
  );
$$;

revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public, anon;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.missions enable row level security;
alter table public.mission_tasks enable row level security;
alter table public.memories enable row level security;
alter table public.approvals enable row level security;
alter table public.provider_configs enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.activity_events enable row level security;
alter table public.user_preferences enable row level security;

-- Authenticated clients receive read access only. All writes must pass through
-- the authenticated server layer, which validates owner identity and approvals.
create policy workspaces_read_member on public.workspaces for select to authenticated
  using (public.has_workspace_role(id, array['owner','operator','viewer']::public.workspace_role[]));
create policy members_read_workspace on public.workspace_members for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','operator','viewer']::public.workspace_role[]));
create policy missions_read_member on public.missions for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','operator','viewer']::public.workspace_role[]));
create policy tasks_read_member on public.mission_tasks for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','operator','viewer']::public.workspace_role[]));
create policy memories_read_owner_or_member on public.memories for select to authenticated
  using (owner_id = auth.uid() or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','operator','viewer']::public.workspace_role[])));
create policy approvals_read_member on public.approvals for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','operator','viewer']::public.workspace_role[]));
create policy provider_configs_read_owner_or_member on public.provider_configs for select to authenticated
  using (owner_id = auth.uid() or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','operator']::public.workspace_role[])));
create policy activity_read_member on public.activity_events for select to authenticated
  using (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','operator','viewer']::public.workspace_role[]));
create policy preferences_read_self on public.user_preferences for select to authenticated
  using (user_id = auth.uid());

-- Do not grant authenticated/anon access to credential ciphertext or audit-event writes.
revoke all on public.provider_credentials from anon, authenticated;
revoke all on public.activity_events from anon, authenticated;
grant select on public.workspaces, public.workspace_members, public.missions, public.mission_tasks,
  public.memories, public.approvals, public.provider_configs, public.activity_events, public.user_preferences
  to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.workspaces, public.workspace_members,
  public.missions, public.mission_tasks, public.memories, public.approvals, public.provider_configs,
  public.activity_events, public.user_preferences from authenticated;

-- Service role is used only by trusted server code after auth/approval validation.
grant all privileges on public.workspaces, public.workspace_members, public.missions, public.mission_tasks,
  public.memories, public.approvals, public.provider_configs, public.provider_credentials,
  public.activity_events, public.user_preferences to service_role;

commit;
