-- RentLedger UG production Supabase schema
-- Run this in a fresh Supabase project or after dropping the old prototype tables.
--
-- Public visitors can only read published vacant listings. Real app data is
-- protected by Supabase Auth + Row Level Security.

create table if not exists app_users (
  id text primary key,
  name text not null,
  phone text unique not null,
  email text unique not null,
  creator_email text,
  platform_owner_id text references app_users(id) on delete set null,
  role text not null check (role in ('saas-owner', 'landlord', 'staff')),
  account_status text not null default 'Trial',
  company_owner_id text references app_users(id) on delete cascade,
  assigned_property_ids text[] not null default '{}',
  invitation_status text,
  created_at timestamptz not null default now()
);

alter table app_users drop column if exists password;

create table if not exists subscriptions (
  id text primary key,
  owner_id text not null references app_users(id) on delete cascade,
  plan text not null,
  monthly_fee numeric(12, 2) not null default 0,
  status text not null default 'Trial',
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
  listing_published boolean not null default false,
  listing_bedrooms integer not null default 1,
  listing_bathrooms integer not null default 1,
  listing_furnished boolean not null default false,
  listing_photo text,
  listing_note text,
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

create index if not exists idx_app_users_company_owner_id on app_users(company_owner_id);
create index if not exists idx_properties_owner_id on properties(owner_id);
create index if not exists idx_units_property_id on units(property_id);
create index if not exists idx_tenants_unit_id on tenants(unit_id);
create index if not exists idx_payments_tenant_id on payments(tenant_id);
create index if not exists idx_expenses_property_id on expenses(property_id);
create index if not exists idx_support_tickets_owner_id on support_tickets(owner_id);
create index if not exists idx_notifications_user_id on notifications(user_id);

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

create schema if not exists private;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to anon, authenticated, service_role;

grant select on app_users, properties, units to anon;
grant select, insert, update, delete on
  app_users,
  subscriptions,
  properties,
  units,
  tenants,
  payments,
  expenses,
  support_tickets,
  notifications,
  app_settings
to authenticated;
grant all privileges on all tables in schema public to service_role;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from app_users
  where id = (select auth.uid())::text
    and account_status <> 'Suspended'
  limit 1
$$;

create or replace function private.is_saas_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_role() = 'saas-owner', false)
$$;

create or replace function private.staff_owner_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select company_owner_id
  from app_users
  where id = (select auth.uid())::text
    and role = 'staff'
    and account_status <> 'Suspended'
  limit 1
$$;

create or replace function private.has_public_listing_for_property(target_property_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from units
    where property_id = target_property_id
      and status = 'vacant'
  )
$$;

create or replace function private.has_public_listing_for_owner(target_owner_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from properties p
    join units u on u.property_id = p.id
    where p.owner_id = target_owner_id
      and u.status = 'vacant'
  )
$$;

create or replace function private.can_access_property(target_property_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_saas_owner()
    or exists (
      select 1
      from properties p
      where p.id = target_property_id
        and (
          p.owner_id = (select auth.uid())::text
          or (
            p.owner_id = private.staff_owner_id()
            and p.id = any (
              select unnest(coalesce(assigned_property_ids, '{}'))
              from app_users
              where id = (select auth.uid())::text
            )
          )
        )
    )
$$;

create or replace function private.can_manage_property(target_property_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_saas_owner()
    or exists (
      select 1
      from properties p
      where p.id = target_property_id
        and p.owner_id = (select auth.uid())::text
        and private.current_role() = 'landlord'
    )
$$;

create or replace function private.can_create_property(target_owner_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_saas_owner()
    or (
      target_owner_id = (select auth.uid())::text
      and private.current_role() = 'landlord'
    )
$$;

create or replace function private.can_access_unit(target_unit_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from units u
    where u.id = target_unit_id
      and private.can_access_property(u.property_id)
  )
$$;

create or replace function private.can_manage_unit_data(target_unit_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_saas_owner()
    or exists (
      select 1
      from units u
      join properties p on p.id = u.property_id
      where u.id = target_unit_id
        and (
          p.owner_id = (select auth.uid())::text
          or (
            p.owner_id = private.staff_owner_id()
            and p.id = any (
              select unnest(coalesce(assigned_property_ids, '{}'))
              from app_users
              where id = (select auth.uid())::text
            )
          )
        )
    )
$$;

create or replace function private.can_access_tenant(target_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from tenants t
    where t.id = target_tenant_id
      and private.can_access_unit(t.unit_id)
  )
$$;

create or replace function private.can_manage_tenant_data(target_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from tenants t
    where t.id = target_tenant_id
      and private.can_manage_unit_data(t.unit_id)
  )
$$;

grant execute on all functions in schema private to anon, authenticated, service_role;

drop policy if exists rentledger_anon_all on app_users;
drop policy if exists rentledger_anon_all on subscriptions;
drop policy if exists rentledger_anon_all on properties;
drop policy if exists rentledger_anon_all on units;
drop policy if exists rentledger_anon_all on tenants;
drop policy if exists rentledger_anon_all on payments;
drop policy if exists rentledger_anon_all on expenses;
drop policy if exists rentledger_anon_all on support_tickets;
drop policy if exists rentledger_anon_all on notifications;
drop policy if exists rentledger_anon_all on app_settings;

drop policy if exists app_users_public_listing_select on app_users;
create policy app_users_public_listing_select on app_users
for select to anon
using (private.has_public_listing_for_owner(id));

drop policy if exists app_users_authenticated_select on app_users;
create policy app_users_authenticated_select on app_users
for select to authenticated
using (
  private.is_saas_owner()
  or id = (select auth.uid())::text
  or company_owner_id = (select auth.uid())::text
  or id = private.staff_owner_id()
  or private.has_public_listing_for_owner(id)
);

drop policy if exists subscriptions_authenticated_select on subscriptions;
create policy subscriptions_authenticated_select on subscriptions
for select to authenticated
using (private.is_saas_owner() or owner_id = (select auth.uid())::text);

drop policy if exists properties_public_listing_select on properties;
create policy properties_public_listing_select on properties
for select to anon
using (private.has_public_listing_for_property(id));

drop policy if exists properties_authenticated_select on properties;
create policy properties_authenticated_select on properties
for select to authenticated
using (private.can_access_property(id) or private.has_public_listing_for_property(id));

drop policy if exists properties_authenticated_insert on properties;
create policy properties_authenticated_insert on properties
for insert to authenticated
with check (private.can_create_property(owner_id));

drop policy if exists properties_authenticated_update on properties;
create policy properties_authenticated_update on properties
for update to authenticated
using (private.can_manage_property(id))
with check (private.can_create_property(owner_id));

drop policy if exists properties_authenticated_delete on properties;
create policy properties_authenticated_delete on properties
for delete to authenticated
using (private.can_manage_property(id));

drop policy if exists units_public_listing_select on units;
create policy units_public_listing_select on units
for select to anon
using (status = 'vacant');

drop policy if exists units_authenticated_select on units;
create policy units_authenticated_select on units
for select to authenticated
using (private.can_access_property(property_id) or status = 'vacant');

drop policy if exists units_authenticated_insert on units;
create policy units_authenticated_insert on units
for insert to authenticated
with check (private.can_manage_property(property_id));

drop policy if exists units_authenticated_update on units;
create policy units_authenticated_update on units
for update to authenticated
using (private.can_manage_property(property_id))
with check (private.can_manage_property(property_id));

drop policy if exists units_authenticated_delete on units;
create policy units_authenticated_delete on units
for delete to authenticated
using (private.can_manage_property(property_id));

drop policy if exists tenants_authenticated_select on tenants;
create policy tenants_authenticated_select on tenants
for select to authenticated
using (private.can_access_unit(unit_id));

drop policy if exists tenants_authenticated_insert on tenants;
create policy tenants_authenticated_insert on tenants
for insert to authenticated
with check (private.can_manage_unit_data(unit_id));

drop policy if exists tenants_authenticated_update on tenants;
create policy tenants_authenticated_update on tenants
for update to authenticated
using (private.can_manage_unit_data(unit_id))
with check (private.can_manage_unit_data(unit_id));

drop policy if exists tenants_authenticated_delete on tenants;
create policy tenants_authenticated_delete on tenants
for delete to authenticated
using (private.can_manage_unit_data(unit_id));

drop policy if exists payments_authenticated_select on payments;
create policy payments_authenticated_select on payments
for select to authenticated
using (private.can_access_tenant(tenant_id));

drop policy if exists payments_authenticated_insert on payments;
create policy payments_authenticated_insert on payments
for insert to authenticated
with check (private.can_manage_tenant_data(tenant_id));

drop policy if exists payments_authenticated_update on payments;
create policy payments_authenticated_update on payments
for update to authenticated
using (private.can_manage_tenant_data(tenant_id))
with check (private.can_manage_tenant_data(tenant_id));

drop policy if exists payments_authenticated_delete on payments;
create policy payments_authenticated_delete on payments
for delete to authenticated
using (private.can_manage_tenant_data(tenant_id));

drop policy if exists expenses_authenticated_select on expenses;
create policy expenses_authenticated_select on expenses
for select to authenticated
using (private.can_access_property(property_id));

drop policy if exists expenses_authenticated_insert on expenses;
create policy expenses_authenticated_insert on expenses
for insert to authenticated
with check (private.can_manage_property(property_id));

drop policy if exists expenses_authenticated_update on expenses;
create policy expenses_authenticated_update on expenses
for update to authenticated
using (private.can_manage_property(property_id))
with check (private.can_manage_property(property_id));

drop policy if exists expenses_authenticated_delete on expenses;
create policy expenses_authenticated_delete on expenses
for delete to authenticated
using (private.can_manage_property(property_id));

drop policy if exists support_tickets_authenticated_all on support_tickets;
create policy support_tickets_authenticated_all on support_tickets
for all to authenticated
using (private.is_saas_owner() or owner_id = (select auth.uid())::text)
with check (private.is_saas_owner() or owner_id = (select auth.uid())::text);

drop policy if exists notifications_authenticated_select on notifications;
create policy notifications_authenticated_select on notifications
for select to authenticated
using (private.is_saas_owner() or user_id = (select auth.uid())::text);

drop policy if exists notifications_authenticated_insert on notifications;
create policy notifications_authenticated_insert on notifications
for insert to authenticated
with check (private.is_saas_owner() or user_id = (select auth.uid())::text);

drop policy if exists notifications_authenticated_update on notifications;
create policy notifications_authenticated_update on notifications
for update to authenticated
using (private.is_saas_owner() or user_id = (select auth.uid())::text)
with check (private.is_saas_owner() or user_id = (select auth.uid())::text);

drop policy if exists notifications_authenticated_delete on notifications;
create policy notifications_authenticated_delete on notifications
for delete to authenticated
using (private.is_saas_owner() or user_id = (select auth.uid())::text);

-- First admin bootstrap:
-- 1. Create a user in Supabase Auth.
-- 2. Run this with that Auth user id and your real contact details:
--
-- insert into app_users (id, name, phone, email, role, account_status)
-- values ('AUTH_USER_ID', 'Super Admin', '0700000000', 'allanpyrex5@gmail.com', 'saas-owner', 'Active');
