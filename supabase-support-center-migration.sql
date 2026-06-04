-- RentLedger UG Support Center upgrade migration
-- Run this in Supabase SQL Editor for existing projects.

create schema if not exists private;

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

alter table app_users drop column if exists password;
alter table app_users add column if not exists name text;
alter table app_users add column if not exists phone text;
alter table app_users add column if not exists email text;
alter table app_users add column if not exists creator_email text;
alter table app_users add column if not exists platform_owner_id text references app_users(id) on delete set null;
alter table app_users add column if not exists role text not null default 'landlord';
alter table app_users add column if not exists account_status text not null default 'Trial';
alter table app_users add column if not exists company_owner_id text references app_users(id) on delete cascade;
alter table app_users add column if not exists assigned_property_ids text[] not null default '{}';
alter table app_users add column if not exists invitation_status text;
alter table app_users add column if not exists created_at timestamptz not null default now();
alter table app_users add column if not exists verified_badge boolean not null default false;
alter table app_users add column if not exists verification_label text;

alter table subscriptions add column if not exists owner_id text references app_users(id) on delete cascade;
alter table subscriptions add column if not exists plan text not null default 'Trial';
alter table subscriptions add column if not exists monthly_fee numeric(12, 2) not null default 0;
alter table subscriptions add column if not exists status text not null default 'Trial';
alter table subscriptions add column if not exists last_payment_date date;
alter table subscriptions add column if not exists last_payment_method text;
alter table subscriptions add column if not exists last_payment_note text;
alter table subscriptions add column if not exists next_billing_date date;
alter table subscriptions add column if not exists billing_method text;
alter table subscriptions add column if not exists billing_contact_masked text;
alter table subscriptions add column if not exists auto_collect_authorized boolean not null default false;
alter table subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table subscriptions add column if not exists cancellation_requested_at timestamptz;
alter table subscriptions add column if not exists grace_period_end date;
alter table subscriptions add column if not exists payment_provider text;
alter table subscriptions add column if not exists provider_payment_reference text;
alter table subscriptions add column if not exists provider_payment_status text;
alter table subscriptions add column if not exists provider_checkout_url text;
alter table subscriptions add column if not exists provider_charge_id text;
alter table subscriptions add column if not exists provider_customer_id text;
alter table subscriptions add column if not exists provider_payment_method_id text;
alter table subscriptions add column if not exists provider_next_action text;
alter table subscriptions add column if not exists created_at timestamptz not null default now();

alter table properties add column if not exists owner_id text references app_users(id) on delete cascade;
alter table properties add column if not exists property_name text not null default 'Property';
alter table properties add column if not exists location text not null default 'Unknown';
alter table properties add column if not exists property_type text not null default 'Apartment';
alter table properties add column if not exists created_at timestamptz not null default now();

alter table units add column if not exists property_id text references properties(id) on delete cascade;
alter table units add column if not exists unit_number text not null default 'Unit';
alter table units add column if not exists rent_amount numeric(12, 2) not null default 0;
alter table units add column if not exists status text not null default 'vacant';
alter table units add column if not exists listing_published boolean not null default false;
alter table units add column if not exists listing_bedrooms integer not null default 1;
alter table units add column if not exists listing_bathrooms integer not null default 1;
alter table units add column if not exists listing_furnished boolean not null default false;
alter table units add column if not exists listing_photo text;
alter table units add column if not exists listing_note text;
alter table units add column if not exists created_at timestamptz not null default now();

alter table tenants add column if not exists unit_id text references units(id) on delete restrict;
alter table tenants add column if not exists name text not null default 'Tenant';
alter table tenants add column if not exists phone text not null default '';
alter table tenants add column if not exists national_id text;
alter table tenants add column if not exists rent_amount numeric(12, 2) not null default 0;
alter table tenants add column if not exists deposit_paid numeric(12, 2) not null default 0;
alter table tenants add column if not exists move_in_date date not null default current_date;
alter table tenants add column if not exists status text not null default 'active';
alter table tenants add column if not exists move_out_date date;
alter table tenants add column if not exists move_out_balance numeric(12, 2) not null default 0;
alter table tenants add column if not exists move_out_damages numeric(12, 2) not null default 0;
alter table tenants add column if not exists move_out_refund numeric(12, 2) not null default 0;
alter table tenants add column if not exists move_out_note text;
alter table tenants add column if not exists created_at timestamptz not null default now();

alter table payments add column if not exists tenant_id text references tenants(id) on delete cascade;
alter table payments add column if not exists amount numeric(12, 2) not null default 0;
alter table payments add column if not exists payment_method text not null default 'Cash';
alter table payments add column if not exists payment_date date not null default current_date;
alter table payments add column if not exists balance numeric(12, 2) not null default 0;
alter table payments add column if not exists reference text;
alter table payments add column if not exists receipt_number text;
alter table payments add column if not exists payment_proof text;
alter table payments add column if not exists verification_status text not null default 'Unverified';
alter table payments add column if not exists created_at timestamptz not null default now();

alter table expenses add column if not exists property_id text references properties(id) on delete cascade;
alter table expenses add column if not exists type text not null default 'General';
alter table expenses add column if not exists amount numeric(12, 2) not null default 0;
alter table expenses add column if not exists date date not null default current_date;
alter table expenses add column if not exists created_at timestamptz not null default now();

create index if not exists idx_app_users_company_owner_id on app_users(company_owner_id);
create index if not exists idx_subscriptions_provider_payment_reference on subscriptions(provider_payment_reference);
create index if not exists idx_properties_owner_id on properties(owner_id);
create index if not exists idx_units_property_id on units(property_id);
create index if not exists idx_tenants_unit_id on tenants(unit_id);
create index if not exists idx_payments_tenant_id on payments(tenant_id);
create index if not exists idx_expenses_property_id on expenses(property_id);

create table if not exists support_tickets (
  id text primary key,
  owner_id text not null references app_users(id) on delete cascade,
  landlord_id text references app_users(id) on delete cascade,
  subject text not null,
  description text,
  priority text not null default 'Medium',
  status text not null default 'Open',
  note text,
  admin_note text,
  updated_at date not null default current_date,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  user_id text references app_users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table support_tickets add column if not exists owner_id text references app_users(id) on delete cascade;
alter table support_tickets add column if not exists landlord_id text references app_users(id) on delete cascade;
alter table support_tickets add column if not exists subject text;
alter table support_tickets add column if not exists description text;
alter table support_tickets add column if not exists priority text not null default 'Medium';
alter table support_tickets add column if not exists status text not null default 'Open';
alter table support_tickets add column if not exists note text;
alter table support_tickets add column if not exists admin_note text;
alter table support_tickets add column if not exists updated_at date not null default current_date;
alter table support_tickets add column if not exists resolved_at timestamptz;
update support_tickets set landlord_id = owner_id where landlord_id is null;
update support_tickets set owner_id = landlord_id where owner_id is null and landlord_id is not null;

alter table notifications add column if not exists read boolean not null default false;
alter table notifications add column if not exists is_read boolean not null default false;
update notifications set is_read = read where is_read is distinct from read;

create table if not exists landlord_messages (
  id text primary key,
  landlord_id text not null references app_users(id) on delete cascade,
  user_id text references app_users(id) on delete cascade,
  ticket_id text references support_tickets(id) on delete set null,
  template text,
  title text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key,
  admin_id text references app_users(id) on delete set null,
  landlord_id text references app_users(id) on delete set null,
  action text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_landlord_id on support_tickets(landlord_id);
create index if not exists idx_support_tickets_status on support_tickets(status);
create index if not exists idx_support_tickets_priority on support_tickets(priority);
create index if not exists idx_support_tickets_updated_at on support_tickets(updated_at);
create index if not exists idx_notifications_is_read on notifications(is_read);
create index if not exists idx_landlord_messages_landlord_id on landlord_messages(landlord_id);
create index if not exists idx_landlord_messages_ticket_id on landlord_messages(ticket_id);
create index if not exists idx_audit_logs_landlord_id on audit_logs(landlord_id);
create index if not exists idx_audit_logs_admin_id on audit_logs(admin_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_tickets_status_check' and conrelid = 'support_tickets'::regclass) then
    alter table support_tickets add constraint support_tickets_status_check check (status in ('Open', 'In Progress', 'Resolved', 'Closed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'support_tickets_priority_check' and conrelid = 'support_tickets'::regclass) then
    alter table support_tickets add constraint support_tickets_priority_check check (priority in ('High', 'Medium', 'Low'));
  end if;
end $$;

alter table support_tickets enable row level security;
alter table landlord_messages enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;

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
  landlord_messages,
  audit_logs,
  notifications
to authenticated;
grant all privileges on all tables in schema public to service_role;
grant execute on all functions in schema private to anon, authenticated, service_role;

drop policy if exists support_tickets_authenticated_all on support_tickets;
create policy support_tickets_authenticated_all on support_tickets
for all to authenticated
using (private.is_saas_owner() or owner_id = (select auth.uid())::text or landlord_id = (select auth.uid())::text)
with check (private.is_saas_owner() or owner_id = (select auth.uid())::text or landlord_id = (select auth.uid())::text);

drop policy if exists landlord_messages_authenticated_select on landlord_messages;
create policy landlord_messages_authenticated_select on landlord_messages
for select to authenticated
using (private.is_saas_owner() or landlord_id = (select auth.uid())::text or user_id = (select auth.uid())::text);

drop policy if exists landlord_messages_authenticated_insert on landlord_messages;
create policy landlord_messages_authenticated_insert on landlord_messages
for insert to authenticated
with check (private.is_saas_owner());

drop policy if exists landlord_messages_authenticated_update on landlord_messages;
create policy landlord_messages_authenticated_update on landlord_messages
for update to authenticated
using (private.is_saas_owner())
with check (private.is_saas_owner());

drop policy if exists landlord_messages_authenticated_delete on landlord_messages;
create policy landlord_messages_authenticated_delete on landlord_messages
for delete to authenticated
using (private.is_saas_owner());

drop policy if exists audit_logs_authenticated_select on audit_logs;
create policy audit_logs_authenticated_select on audit_logs
for select to authenticated
using (private.is_saas_owner());

drop policy if exists audit_logs_authenticated_insert on audit_logs;
create policy audit_logs_authenticated_insert on audit_logs
for insert to authenticated
with check (private.is_saas_owner());

drop policy if exists audit_logs_authenticated_update on audit_logs;
create policy audit_logs_authenticated_update on audit_logs
for update to authenticated
using (private.is_saas_owner())
with check (private.is_saas_owner());

drop policy if exists audit_logs_authenticated_delete on audit_logs;
create policy audit_logs_authenticated_delete on audit_logs
for delete to authenticated
using (private.is_saas_owner());

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
