# RentLedger UG

A static MVP prototype for a Ugandan landlord/property management SaaS.

## What Is Included

- Landlord dashboard with unit occupancy, monthly revenue, late payments, and net income.
- Landlord account signup/sign-in prototype with owner-specific data views.
- Property setup for houses, apartments, and individual units.
- Landing page with local photo assets for apartments, mobile payments, and property handover moments.
- Tenant management with phone, National ID, unit, rent, deposit, and move-in date.
- Rent tracking with partial payments, balances, payment history, and MTN/Airtel reference fields.
- Receipt generation for recorded rent payments.
- Staff invitations with assigned-property access for managers.
- Expense tracking for repairs, utilities, caretaker salary, security, and other costs.
- SMS and WhatsApp reminder templates for due, received, and overdue rent.
- Notifications for payment, staff, expense, and overdue rent events.
- Website-owner console for SaaS revenue, landlord accounts, billing status, and backend support tickets.
- Supabase-backed persistence with local browser storage as an offline fallback.

## Open It

Open `index.html` in a browser. If `supabase-config.js` has real project keys, records load from and save to Supabase.

## Demo Login Details

- Website owner: `0700000000` or `allanpyrex5@gmail.com` / `Etochu@2727`
- Landlord Demo: `0772123456` or `landlord@rentledger.ug` / `demo123`
  Includes 5 properties, 20 tenants, expenses, rent balances, and payment history.
- Staff Demo: `0700111222` or `staff@rentledger.ug` / `staff123`
  Limited to assigned properties only.
- Forgot password sends a demo OTP to the account creator email shown in the reset form.
- Super admin can send reset OTPs for landlord and staff accounts from the Support console.

## Supabase Backend Setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Add your project URL and public anon key in `supabase-config.js`.
4. Open the app. On first connection, the current demo data is uploaded to Supabase.

If you already ran an older version of the schema with UUID columns, use a fresh Supabase project or drop those prototype tables before running this schema.

The app stores real rows in these tables:

```sql
app_users(id, name, phone, email, creator_email, password, role)
subscriptions(id, owner_id, plan, monthly_fee, status, last_payment_date, next_billing_date)
properties(id, property_name, location, property_type, owner_id)
units(id, property_id, unit_number, rent_amount, status)
tenants(id, unit_id, name, phone, national_id, rent_amount, deposit_paid, move_in_date)
payments(id, tenant_id, amount, payment_method, payment_date, balance, reference)
expenses(id, property_id, type, amount, date)
support_tickets(id, owner_id, subject, priority, status, note, updated_at)
notifications(id, user_id, type, title, message, read, created_at)
app_settings(setting_key, value)
```

For production, replace the prototype password field with Supabase Auth and tighten RLS policies so each landlord's records are securely isolated.

## Image Sources

- `assets/apartment-exterior.jpg` from Pexels photo `34360410`.
- `assets/mobile-payment.jpg` from Pexels photo `5239806`.
- `assets/property-keys.jpg` from Pexels photo `31015267`.
