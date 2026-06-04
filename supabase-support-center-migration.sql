-- RentLedger UG Support Center upgrade migration
-- Run this in Supabase SQL Editor for existing projects.

alter table support_tickets add column if not exists landlord_id text references app_users(id) on delete cascade;
alter table support_tickets add column if not exists description text;
alter table support_tickets add column if not exists admin_note text;
alter table support_tickets add column if not exists resolved_at timestamptz;
update support_tickets set landlord_id = owner_id where landlord_id is null;

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

alter table landlord_messages enable row level security;
alter table audit_logs enable row level security;

grant select, insert, update, delete on landlord_messages, audit_logs to authenticated;
grant all privileges on landlord_messages, audit_logs to service_role;

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
