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
grant select, insert, update, delete on support_tickets, landlord_messages, audit_logs, notifications to authenticated;
grant all privileges on support_tickets, landlord_messages, audit_logs, notifications to service_role;

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
