-- Create scheduled_scans table
create table if not exists scheduled_scans (
    id uuid default gen_random_uuid() primary key,
    workspace_id uuid references workspaces(id) not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    prompt text not null,
    platforms text[] not null,
    competitors text[],
    frequency text check (frequency in ('daily', 'weekly', 'monthly')) not null default 'daily',
    last_run_at timestamptz,
    next_run_at timestamptz default now(),
    status text check (status in ('active', 'paused')) not null default 'active'
);

-- Enable RLS
alter table scheduled_scans enable row level security;

-- Policies

-- 1. View
create policy "Users can view own workspace scheduled scans"
    on scheduled_scans for select
    using (workspace_id in (
        select id from workspaces where org_id in (
            select org_id from users where id = auth.uid()
        )
    ));

-- 2. Insert
create policy "Users can insert into own workspace scheduled scans"
    on scheduled_scans for insert
    with check (workspace_id in (
        select id from workspaces where org_id in (
            select org_id from users where id = auth.uid()
        )
    ));

-- 3. Update
create policy "Users can update own workspace scheduled scans"
    on scheduled_scans for update
    using (workspace_id in (
        select id from workspaces where org_id in (
            select org_id from users where id = auth.uid()
        )
    ));

-- 4. Delete
create policy "Users can delete own workspace scheduled scans"
    on scheduled_scans for delete
    using (workspace_id in (
        select id from workspaces where org_id in (
            select org_id from users where id = auth.uid()
        )
    ));

-- Create index for faster querying by next_run_at (for cron jobs)
create index if not exists idx_scheduled_scans_next_run_at on scheduled_scans(next_run_at);
