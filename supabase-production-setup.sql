-- RentLedger UG production setup patch.
-- Run this once in the Supabase SQL Editor after running supabase-schema.sql.
-- It is safe to run again if permissions need to be refreshed.

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
  notifications,
  app_settings
to authenticated;

grant all privileges on all tables in schema public to service_role;
grant execute on all functions in schema private to anon, authenticated, service_role;

-- The first sign-in for allanpyrex5@gmail.com calls /api/bootstrap-admin,
-- which creates the app_users row with role = 'saas-owner' automatically.
