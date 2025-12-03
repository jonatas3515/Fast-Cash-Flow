-- Supabase schema for FAST CASH FLOW
-- Tables: transactions (for sync), companies (future), company_members (future)

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  type text not null check (type in ('income','expense')),
  date text not null,
  time text null,
  datetime text not null,
  description text null,
  category text null,
  amount_cents bigint not null,
  source_device text null,
  version int not null default 1,
  updated_at timestamptz not null,
  deleted_at timestamptz null
);

-- Helpful indexes
create index if not exists idx_transactions_user_date on public.transactions(user_id, date);
create index if not exists idx_transactions_updated on public.transactions(updated_at);
create index if not exists idx_transactions_deleted on public.transactions(deleted_at);

-- Enable RLS
alter table public.transactions enable row level security;

-- Policies: only owner can select/insert/update/delete by user_id
create policy if not exists "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy if not exists "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy if not exists "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy if not exists "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Companies (for future admin management)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  last_password_change date null,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

-- Basic policies (adjust later): members can read company and membership rows
create policy if not exists "companies_read_members"
  on public.companies for select
  using (exists (select 1 from public.company_members m where m.company_id = id and m.user_id = auth.uid()));

create policy if not exists "company_members_read_self"
  on public.company_members for select
  using (user_id = auth.uid());

-- Allow members to insert their own membership (optional; otherwise seed via admin UI)
create policy if not exists "company_members_insert_self"
  on public.company_members for insert
  with check (user_id = auth.uid());

-- Admin role hint: you can add a Postgres role or use a service key; for now, keep regular RLS.

-- Signup requests from landing/login form
create table if not exists public.company_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  owner_name text not null,
  phone text not null,
  address text null,
  cnpj text null,
  founded_on date,
  created_at timestamptz not null default now(),
  approved boolean not null default false,
  approver uuid null,
  -- Admin processing fields (filled on approval)
  approved_at timestamptz null,
  approved_username text null,
  approved_temp_password text null,
  trial_until date null,
  blocked boolean not null default false
);

alter table public.company_requests enable row level security;

-- Anyone can insert a request (public site/app users)
create policy if not exists "company_requests_insert_public"
  on public.company_requests for insert
  with check (true);

-- Only admin/service can select/update (adjust later); for now allow authenticated users select to demo
create policy if not exists "company_requests_select_all"
  on public.company_requests for select
  using (true);

create index if not exists idx_company_requests_created on public.company_requests(created_at);
