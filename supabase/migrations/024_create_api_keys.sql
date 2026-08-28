-- Personal API keys for programmatic access (MCP server, scripts).
-- A key is scoped to ONE workspace and is read-first: the API layer only
-- exposes measurement writes (schedule a scan, track a prompt), never
-- money-spending or posting actions.

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  org_id       uuid not null references public.organizations(id) on delete cascade,
  created_by   uuid not null references public.users(id) on delete cascade,
  name         text not null default 'API key',
  key_prefix   text not null,                 -- e.g. "alo_live_a1b2" shown in UI, safe to display
  key_hash     text not null unique,          -- sha256 hex of the full secret; the secret itself is never stored
  scopes       text[] not null default array['read','measure'],
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);

create index if not exists api_keys_workspace_idx on public.api_keys(workspace_id);
create index if not exists api_keys_hash_idx on public.api_keys(key_hash) where revoked_at is null;

-- RLS: keys are managed through the service role in the API layer, and are
-- only ever visible to their owner in the dashboard.
alter table public.api_keys enable row level security;

drop policy if exists api_keys_owner_select on public.api_keys;
create policy api_keys_owner_select on public.api_keys
  for select using (created_by = auth.uid());

drop policy if exists api_keys_owner_delete on public.api_keys;
create policy api_keys_owner_delete on public.api_keys
  for delete using (created_by = auth.uid());
