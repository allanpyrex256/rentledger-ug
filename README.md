# RentLedger UG

A static MVP prototype for a Ugandan landlord/property management SaaS.

## What Is Included

- V1 landlord workflow: create property, add unit, add tenant, record payment, and see balance.
- Landlord daily dashboard with rent collected today, late tenants, and vacant rooms.
- Landlord account signup/sign-in prototype with owner-specific data views.
- Property setup for rooms, shops, boys quarters, houses, and rent amounts.
- Public rental listings at `/vacancies` and `/available-units`, connected to vacant rooms with WhatsApp inquiry buttons.
- Landing page with local photo assets for apartments, mobile payments, and property handover moments.
- Tenant management with phone, National ID, unit, rent, deposit, and move-in date.
- Rent tracking with partial payments, balances, payment history, and MTN/Airtel reference fields.
- Receipt generation, monthly rent report downloads, and expense report downloads.
- WhatsApp reminder and receipt links for due, partial, and overdue rent.
- Notifications for payment, staff, expense, and overdue rent events.
- Separate Super Admin SaaS dashboard for landlords, subscriptions, revenue, signups, support tickets, and expired accounts.
- Super-admin console for account management, billing, monitoring, and backend support tickets.
- Supabase-backed persistence with local browser storage as an offline fallback.

## Open It

Open `index.html` in a browser for local demo mode. For real users, deploy on Vercel or another host that can run the `/api/*` server routes; those routes handle signup, sign-in, staff invites, password resets, and admin-only actions.

For Vercel production, set these environment variables instead of hard-coding keys:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

The app exposes `/api/supabase-config` so the browser can read only the public Supabase settings at runtime. The service role key is used only inside Vercel API routes and must never be exposed in browser code.

## Demo Mode

When Supabase is not configured, the app runs with local browser demo data for development. When Supabase is configured, public demo buttons are hidden, signup/sign-in uses Supabase Auth, and data is protected by RLS.

## Portal Structure

- Super Admin: platform overview, account management, billing, system monitoring, support tickets, subscriptions, and password resets.
- Landlord: properties, units, tenants, rent, expenses, reminders, and staff access.
- Staff: assigned properties, tenants, rent, and reminders only.

## Supabase Backend Setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Create your first Super Admin in Supabase Auth with email `allanpyrex5@gmail.com`.
4. Sign in once with that Super Admin email so `/api/bootstrap-admin` can create the matching `app_users` row with `role = 'saas-owner'`, or insert it manually using the bootstrap SQL comment at the bottom of `supabase-schema.sql`.
5. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel project environment variables.
6. Run `supabase-production-setup.sql` in the Supabase SQL editor to apply API role permissions.
7. Set the Supabase Auth site URL to your deployed domain so password reset links return to the app.
8. Open the app and use the complete V1 workflow: signup -> property -> unit -> tenant -> payment -> balance.

If you already ran an older version of the schema with UUID columns, use a fresh Supabase project or drop those prototype tables before running this schema.

If sign-in shows `permission denied for table app_users`, rerun the latest `supabase-schema.sql` grant section in the Supabase SQL editor.

The app stores real rows in these tables:

```sql
app_users(id, name, phone, email, creator_email, platform_owner_id, role, account_status, created_at)
subscriptions(id, owner_id, plan, monthly_fee, status, last_payment_date, next_billing_date, created_at)
properties(id, property_name, location, property_type, owner_id)
units(id, property_id, unit_number, rent_amount, status)
tenants(id, unit_id, name, phone, national_id, rent_amount, deposit_paid, move_in_date)
payments(id, tenant_id, amount, payment_method, payment_date, balance, reference)
expenses(id, property_id, type, amount, date)
support_tickets(id, owner_id, subject, priority, status, note, updated_at)
notifications(id, user_id, type, title, message, read, created_at)
app_settings(setting_key, value)
```

Production auth is handled by Supabase Auth. The schema enables RLS so anonymous users can only read published vacant listings, landlords can access their own records, staff can access assigned properties, and Super Admin users can manage platform data.

## Image Sources

- `assets/apartment-exterior.jpg` from Pexels photo `34360410`.
- `assets/mobile-payment.jpg` from Pexels photo `5239806`.
- `assets/property-keys.jpg` from Pexels photo `31015267`.
