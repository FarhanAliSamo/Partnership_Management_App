-- =====================================================================
-- F CRM — Supabase (PostgreSQL) schema
-- Run this in Supabase SQL Editor to set up the cloud tables.
-- The local app uses SQLite as offline source of truth and syncs to these
-- tables when online. Row Level Security (RLS) is enabled for safety.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id text primary key,
  username text unique not null,
  display_name text not null,
  role_key text not null,
  passcode_hash text,
  biometric_enabled integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Earnings
-- ---------------------------------------------------------------------
create table if not exists public.earnings (
  id text primary key,
  business_date text not null,
  amount_minor bigint not null,
  note text,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Daily business status
-- ---------------------------------------------------------------------
create table if not exists public.daily_business_status (
  id text primary key,
  business_date text unique not null,
  status text not null,
  reason text,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id text primary key,
  business_date text not null,
  amount_minor bigint not null,
  category text not null,
  description text not null,
  notes text,
  is_wifi integer not null default 0,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Investments
-- ---------------------------------------------------------------------
create table if not exists public.investments (
  id text primary key,
  item_name text not null,
  amount_minor bigint not null,
  business_date text not null,
  category text not null,
  description text not null,
  contributor text not null default 'admin',
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Loans
-- ---------------------------------------------------------------------
create table if not exists public.loans (
  id text primary key,
  lender text not null,
  borrower text not null,
  amount_minor bigint not null,
  business_date text not null,
  reason text not null,
  notes text,
  status text not null default 'active',
  remaining_minor bigint not null,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Loan repayments
-- ---------------------------------------------------------------------
create table if not exists public.loan_repayments (
  id text primary key,
  loan_id text not null,
  amount_minor bigint not null,
  business_date text not null,
  note text,
  source text not null default 'manual',
  settlement_id text,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Settlements
-- ---------------------------------------------------------------------
create table if not exists public.monthly_settlements (
  id text primary key,
  month text not null unique,
  total_earning_minor bigint not null,
  shared_expense_minor bigint not null,
  net_profit_minor bigint not null,
  admin_share_minor bigint not null,
  manager_share_minor bigint not null,
  admin_expense_minor bigint not null,
  admin_due_minor bigint not null,
  manager_due_minor bigint not null,
  status text not null default 'pending',
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Allocations
-- ---------------------------------------------------------------------
create table if not exists public.settlement_allocations (
  id text primary key,
  settlement_id text not null,
  partner text not null,
  allocation_type text not null,
  amount_minor bigint not null,
  loan_id text,
  note text,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id text primary key,
  settlement_id text not null,
  partner text not null,
  amount_minor bigint not null,
  business_date text not null,
  status text not null default 'released',
  note text,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_state text not null default 'synced',
  local_version integer not null default 1,
  remote_version integer not null default 0,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Settings (centralized partner names, business config)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
create index if not exists idx_earnings_date on public.earnings(business_date);
create index if not exists idx_expenses_date on public.expenses(business_date);
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_repayments_loan on public.loan_repayments(loan_id);
create index if not exists idx_settlements_month on public.monthly_settlements(month);

-- =====================================================================
-- Row Level Security (ENABLE + permissive policies for demo/dev).
-- For production, replace with authenticated-user policies tied to Supabase
-- Auth. Keeping them permissive here means the app's sync works out of the
-- box once you paste your Supabase URL + anon key.
-- =====================================================================
alter table public.users enable row level security;
alter table public.earnings enable row level security;
alter table public.daily_business_status enable row level security;
alter table public.expenses enable row level security;
alter table public.investments enable row level security;
alter table public.loans enable row level security;
alter table public.loan_repayments enable row level security;
alter table public.monthly_settlements enable row level security;
alter table public.settlement_allocations enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;

create policy "Allow all for demo" on public.users for all using (true) with check (true);
create policy "Allow all for demo" on public.earnings for all using (true) with check (true);
create policy "Allow all for demo" on public.daily_business_status for all using (true) with check (true);
create policy "Allow all for demo" on public.expenses for all using (true) with check (true);
create policy "Allow all for demo" on public.investments for all using (true) with check (true);
create policy "Allow all for demo" on public.loans for all using (true) with check (true);
create policy "Allow all for demo" on public.loan_repayments for all using (true) with check (true);
create policy "Allow all for demo" on public.monthly_settlements for all using (true) with check (true);
create policy "Allow all for demo" on public.settlement_allocations for all using (true) with check (true);
create policy "Allow all for demo" on public.payments for all using (true) with check (true);
create policy "Allow all for demo" on public.settings for all using (true) with check (true);