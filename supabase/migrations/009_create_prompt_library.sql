-- Create prompt_library table
create table if not exists prompt_library (
    id uuid default gen_random_uuid() primary key,
    workspace_id uuid references workspaces(id) not null,
    created_at timestamptz default now() not null,
    prompt text not null,
    category text,
    is_favorite boolean default false,
    ai_generated boolean default false,
    metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table prompt_library enable row level security;

-- Policies

-- 1. View
drop policy if exists "Users can view own workspace prompts" on prompt_library;
create policy "Users can view own workspace prompts"
    on prompt_library for select
    using (workspace_id in (
        select id from workspaces where org_id in (
            select org_id from users where id = auth.uid()
        )
    ));

-- 2. Insert
drop policy if exists "Users can insert into own workspace prompts" on prompt_library;
create policy "Users can insert into own workspace prompts"
    on prompt_library for insert
    with check (workspace_id in (
        select id from workspaces where org_id in (
            select org_id from users where id = auth.uid()
        )
    ));

-- 3. Update
drop policy if exists "Users can update own workspace prompts" on prompt_library;
create policy "Users can update own workspace prompts"
    on prompt_library for update
    using (workspace_id in (
        select id from workspaces where org_id in (
            select org_id from users where id = auth.uid()
        )
    ));

-- 4. Delete
drop policy if exists "Users can delete own workspace prompts" on prompt_library;
create policy "Users can delete own workspace prompts"
    on prompt_library for delete
    using (workspace_id in (
        select id from workspaces where org_id in (
            select org_id from users where id = auth.uid()
        )
    ));

-- Index for faster querying
create index if not exists idx_prompt_library_workspace_id on prompt_library(workspace_id);
create index if not exists idx_prompt_library_category on prompt_library(category);
