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

Open `index.html` in a browser. If `supabase-config.js` has real project keys, records load from and save to Supabase.

For Vercel production, set these environment variables instead of hard-coding keys:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
```

The app exposes `/api/supabase-config` so the browser can read those public Supabase settings at runtime.

## Demo Login Details

- Super admin: `0700000000` or `allanpyrex5@gmail.com` / `Etochu@2727`
- Landlord Demo: `0772123456` or `landlord@rentledger.ug` / `demo123`
  Includes 5 properties, 20 tenants, expenses, rent balances, and payment history.
- Staff Demo: `0700111222` or `staff@rentledger.ug` / `staff123`
  Limited to assigned properties only.
- The sign-in screen includes one-click demo buttons for Super Admin, Landlord, and Staff testing.
- Seeded and admin-created demo accounts are linked back to the Super Admin account.
- New landlord signup generates a Super Admin OTP notification for the admin email/SMS contact.
- Forgot password sends a demo OTP to the account creator email shown in the reset form.
- Super admin can send reset OTPs for landlord and staff accounts from the Support console.

## Portal Structure

- Super Admin: platform overview, account management, billing, system monitoring, support tickets, subscriptions, and password resets.
- Landlord: properties, units, tenants, rent, expenses, reminders, and staff access.
- Staff: assigned properties, tenants, rent, and reminders only.

## Supabase Backend Setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel project environment variables, or add them in `supabase-config.js` for local testing.
4. Open the app. On first connection, the current demo data is uploaded to Supabase.
5. Use the complete V1 workflow: property -> unit -> tenant -> payment -> balance.

If you already ran an older version of the schema with UUID columns, use a fresh Supabase project or drop those prototype tables before running this schema.

The app stores real rows in these tables:

```sql
app_users(id, name, phone, email, creator_email, platform_owner_id, password, role, account_status, created_at)
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

For production, replace the prototype password field with Supabase Auth and tighten RLS policies so each landlord's records are securely isolated. The current schema is suitable for pilot validation, not final public security.

## Image Sources

- `assets/apartment-exterior.jpg` from Pexels photo `34360410`.
- `assets/mobile-payment.jpg` from Pexels photo `5239806`.
- `assets/property-keys.jpg` from Pexels photo `31015267`.
