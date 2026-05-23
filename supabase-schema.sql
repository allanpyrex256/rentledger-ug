-- RentLedger UG Supabase schema
-- Run this in the Supabase SQL editor, then update supabase-config.js.
--
-- This schema stores the app in real relational tables that match app.js.
-- For this static MVP, anon/authenticated policies are open so the browser app
-- can read and write. Before production, replace these with Supabase Auth
-- policies based on auth.uid() and remove password storage from app_users.

create table if not exists app_users (
  id text primary key,
  name text not null,
  phone text unique not null,
  email text unique,
  creator_email text,
  password text not null,
  role text not null check (role in ('saas-owner', 'landlord', 'staff')),
  company_owner_id text references app_users(id) on delete cascade,
  assigned_property_ids text[] not null default '{}',
  invitation_status text,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id text primary key,
  owner_id text not null references app_users(id) on delete cascade,
  plan text not null,
  monthly_fee numeric(12, 2) not null default 0,
  status text not null default 'Active',
  last_payment_date date,
  last_payment_method text,
  last_payment_note text,
  next_billing_date date,
  created_at timestamptz not null default now()
);

create table if not exists properties (
  id text primary key,
  owner_id text not null references app_users(id) on delete cascade,
  property_name text not null,
  location text not null,
  property_type text not null default 'Apartment',
  created_at timestamptz not null default now()
);

create table if not exists units (
  id text primary key,
  property_id text not null references properties(id) on delete cascade,
  unit_number text not null,
  rent_amount numeric(12, 2) not null default 0,
  status text not null default 'vacant',
  created_at timestamptz not null default now()
);

create table if not exists tenants (
  id text primary key,
  unit_id text not null references units(id) on delete restrict,
  name text not null,
  phone text not null,
  national_id text,
  rent_amount numeric(12, 2) not null default 0,
  deposit_paid numeric(12, 2) not null default 0,
  move_in_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  payment_method text not null,
  payment_date date not null,
  balance numeric(12, 2) not null default 0,
  reference text,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key,
  property_id text not null references properties(id) on delete cascade,
  type text not null,
  amount numeric(12, 2) not null default 0,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists support_tickets (
  id text primary key,
  owner_id text not null references app_users(id) on delete cascade,
  subject text not null,
  priority text not null default 'Medium',
  status text not null default 'Open',
  note text,
  updated_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  user_id text references app_users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  setting_key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_owner_id on properties(owner_id);
create index if not exists idx_units_property_id on units(property_id);
create index if not exists idx_tenants_unit_id on tenants(unit_id);
create index if not exists idx_payments_tenant_id on payments(tenant_id);
create index if not exists idx_expenses_property_id on expenses(property_id);
create index if not exists idx_support_tickets_owner_id on support_tickets(owner_id);

alter table app_users enable row level security;
alter table subscriptions enable row level security;
alter table properties enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table support_tickets enable row level security;
alter table notifications enable row level security;
alter table app_settings enable row level security;

drop policy if exists rentledger_anon_all on app_users;
create policy rentledger_anon_all on app_users for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on subscriptions;
create policy rentledger_anon_all on subscriptions for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on properties;
create policy rentledger_anon_all on properties for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on units;
create policy rentledger_anon_all on units for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on tenants;
create policy rentledger_anon_all on tenants for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on payments;
create policy rentledger_anon_all on payments for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on expenses;
create policy rentledger_anon_all on expenses for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on support_tickets;
create policy rentledger_anon_all on support_tickets for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on notifications;
create policy rentledger_anon_all on notifications for all to anon, authenticated using (true) with check (true);

drop policy if exists rentledger_anon_all on app_settings;
create policy rentledger_anon_all on app_settings for all to anon, authenticated using (true) with check (true);
