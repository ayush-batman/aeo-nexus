-- AEO Nexus Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Organizations table (multi-tenant root)
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'agency', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  razorpay_subscription_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Users table
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  org_id uuid references public.organizations(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor', 'viewer')),
  is_super_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- Workspaces table (brands/clients)
create table public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  logo_url text,
  settings jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Products table
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  website text,
  description text,
  keywords text[] default '{}',
  competitors jsonb default '[]',
  knowledge_base jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- LLM Scans table
create table public.llm_scans (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform text not null check (platform in ('chatgpt', 'perplexity', 'claude', 'gemini', 'google_ai', 'bing_copilot')),
  prompt text not null,
  response text not null,
  brand_mentioned boolean default false,
  mention_position integer,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  competitors_mentioned text[] default '{}',
  citations jsonb default '[]',
  created_at timestamp with time zone default now()
);

-- Forum Threads table
create table public.forum_threads (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform text not null check (platform in ('reddit', 'quora', 'teambhp', 'xbhp', 'youtube', 'other')),
  external_id text not null,
  url text not null,
  title text not null,
  text text,
  subreddit text,
  author text,
  score integer default 0,
  num_comments integer default 0,
  opportunity_score integer default 0,
  score_breakdown jsonb default '{}',
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'discovered' check (status in ('discovered', 'queued', 'drafted', 'posted', 'skipped')),
  comment_draft text,
  posted_at timestamp with time zone,
  posted_by text,
  discovered_at timestamp with time zone,
  external_created_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  
  unique(workspace_id, platform, external_id)
);

-- Reddit Accounts table
create table public.reddit_accounts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  username text not null,
  posts_today integer default 0,
  last_post_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  
  unique(org_id, username)
);

-- Content Analyses table
create table public.content_analyses (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  url text not null,
  title text,
  aeo_score integer default 0,
  readability_score integer default 0,
  eeat_score integer default 0,
  schema_present text[] default '{}',
  recommendations text[] default '{}',
  created_at timestamp with time zone default now()
);

-- Row Level Security (RLS)
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.products enable row level security;
alter table public.llm_scans enable row level security;
alter table public.forum_threads enable row level security;
alter table public.reddit_accounts enable row level security;
alter table public.content_analyses enable row level security;

-- RLS Policies

-- Users can see their own org
create policy "Users can view own organization"
  on public.organizations for select
  using (id in (select org_id from public.users where id = auth.uid()));

-- Users can see themselves and org members
create policy "Users can view own profile and org members"
  on public.users for select
  using (org_id in (select org_id from public.users where id = auth.uid()));

-- Users can view workspaces in their org
create policy "Users can view workspaces in their org"
  on public.workspaces for select
  using (org_id in (select org_id from public.users where id = auth.uid()));

-- Users can manage workspaces (admin+)
create policy "Admins can manage workspaces"
  on public.workspaces for all
  using (org_id in (select org_id from public.users where id = auth.uid() and role in ('owner', 'admin')));

-- Products policies
create policy "Users can view products in their workspaces"
  on public.products for select
  using (workspace_id in (
    select w.id from public.workspaces w
    join public.users u on w.org_id = u.org_id
    where u.id = auth.uid()
  ));

create policy "Editors can manage products"
  on public.products for all
  using (workspace_id in (
    select w.id from public.workspaces w
    join public.users u on w.org_id = u.org_id
    where u.id = auth.uid() and u.role in ('owner', 'admin', 'editor')
  ));

-- LLM Scans policies
create policy "Users can view LLM scans in their workspaces"
  on public.llm_scans for select
  using (workspace_id in (
    select w.id from public.workspaces w
    join public.users u on w.org_id = u.org_id
    where u.id = auth.uid()
  ));

create policy "Editors can manage LLM scans"
  on public.llm_scans for all
  using (workspace_id in (
    select w.id from public.workspaces w
    join public.users u on w.org_id = u.org_id
    where u.id = auth.uid() and u.role in ('owner', 'admin', 'editor')
  ));

-- Forum threads policies
create policy "Users can view forum threads in their workspaces"
  on public.forum_threads for select
  using (workspace_id in (
    select w.id from public.workspaces w
    join public.users u on w.org_id = u.org_id
    where u.id = auth.uid()
  ));

create policy "Editors can manage forum threads"
  on public.forum_threads for all
  using (workspace_id in (
    select w.id from public.workspaces w
    join public.users u on w.org_id = u.org_id
    where u.id = auth.uid() and u.role in ('owner', 'admin', 'editor')
  ));

-- Reddit accounts policies
create policy "Users can view Reddit accounts in their org"
  on public.reddit_accounts for select
  using (org_id in (select org_id from public.users where id = auth.uid()));

create policy "Admins can manage Reddit accounts"
  on public.reddit_accounts for all
  using (org_id in (select org_id from public.users where id = auth.uid() and role in ('owner', 'admin')));

-- Content analyses policies
create policy "Users can view content analyses in their workspaces"
  on public.content_analyses for select
  using (workspace_id in (
    select w.id from public.workspaces w
    join public.users u on w.org_id = u.org_id
    where u.id = auth.uid()
  ));

create policy "Editors can manage content analyses"
  on public.content_analyses for all
  using (workspace_id in (
    select w.id from public.workspaces w
    join public.users u on w.org_id = u.org_id
    where u.id = auth.uid() and u.role in ('owner', 'admin', 'editor')
  ));

-- Indexes for performance
create index idx_users_org_id on public.users(org_id);
create index idx_workspaces_org_id on public.workspaces(org_id);
create index idx_products_workspace_id on public.products(workspace_id);
create index idx_llm_scans_workspace_id on public.llm_scans(workspace_id);
create index idx_llm_scans_created_at on public.llm_scans(created_at);
create index idx_forum_threads_workspace_id on public.forum_threads(workspace_id);
create index idx_forum_threads_status on public.forum_threads(status);
create index idx_content_analyses_workspace_id on public.content_analyses(workspace_id);

-- Function to create org and user on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
begin
  -- Create organization
  insert into public.organizations (name)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Organization')
  returning id into new_org_id;
  
  -- Create user profile
  insert into public.users (id, email, full_name, avatar_url, org_id, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new_org_id,
    'owner'
  );
  
  -- Create default workspace
  insert into public.workspaces (org_id, name)
  values (new_org_id, 'My Brand');
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
