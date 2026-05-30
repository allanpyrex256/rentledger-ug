# RentLedger UG

A static MVP prototype for a Ugandan landlord/property management SaaS.

## What Is Included

- V1 landlord workflow: create property, add unit, add tenant, record payment, and see balance.
- Landlord daily dashboard with rent collected today, late tenants, and vacant rooms.
- Landlord account signup/sign-in with required plan selection, billing method, and first-month auto-collection authorization.
- Flutterwave subscription billing endpoints for Mobile Money prompts, hosted card checkout support, callbacks, and signed webhooks.
- Plan limits for properties, units, and caretaker accounts across Trial, Starter, Professional, and Enterprise packages.
- Setup checklist for the first property, rooms, tenant, payment, and public vacancy.
- Property setup for rooms, shops, boys quarters, houses, and rent amounts.
- Public rental listings at `/vacancies` and `/available-units`, with district/budget/type search, featured listings, property photos, landlord profile pages, and WhatsApp inquiry buttons.
- Landing page with local photo assets for apartments, mobile payments, and property handover moments.
- Tenant management with phone, National ID, unit, rent, deposit, and move-in date.
- Tenant move-out history with balance, damages, refund, and notes retained after a unit becomes vacant again.
- Rent tracking with partial payments, balances, payment history, MTN/Airtel reference fields, proof notes, and verification status.
- Tenant CSV import/export for moving existing notebooks or spreadsheets into RentLedger.
- Automatic receipt numbers, PDF receipt downloads, WhatsApp receipts, monthly rent report downloads, and expense report downloads.
- WhatsApp reminder and receipt links for due, partial, and overdue rent.
- Reminder queue that can create daily alert notifications for due and overdue tenants.
- Optional WhatsApp Cloud API route for sending tenant reminders and receipts directly from the app.
- Notifications for payment, staff, expense, and overdue rent events.
- Separate Super Admin SaaS dashboard for landlords, subscriptions, revenue, signups, support tickets, and expired accounts.
- Super-admin console for account management, billing, monitoring, and backend support tickets.
- Supabase-backed persistence with local browser storage as an offline fallback.

## Open It

Open `index.html` in a browser for local demo mode. For real users, deploy on Vercel or another host that can run the `/api/*` server routes; those routes handle signup, sign-in, caretaker logins, password resets, and admin-only actions.

For Vercel production, set these environment variables instead of hard-coding keys:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
WHATSAPP_ACCESS_TOKEN=your-meta-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-whatsapp-phone-number-id
WHATSAPP_GRAPH_VERSION=v25.0
PAYMENT_PROVIDER=flutterwave
FLUTTERWAVE_MODE=sandbox
FLUTTERWAVE_CLIENT_ID=your-flutterwave-v4-client-id
FLUTTERWAVE_CLIENT_SECRET=your-flutterwave-v4-client-secret
FLUTTERWAVE_ENCRYPTION_KEY=your-flutterwave-v4-encryption-key
FLUTTERWAVE_SECRET_KEY=your-v3-secret-key-if-using-hosted-card-checkout
FLUTTERWAVE_WEBHOOK_SECRET=your-random-webhook-secret-hash
API_CORS_ORIGIN=https://your-production-domain.com
```

The app exposes `/api/supabase-config` so the browser can read only the public Supabase settings at runtime. The service role key is used only inside Vercel API routes and must never be exposed in browser code.

WhatsApp sending uses `/api/whatsapp`. If the WhatsApp environment variables are not configured, landlords can still use the Open WhatsApp and Call buttons. Tenants can also open landlord profile pages at `/landlords/:id` from published vacancy cards. For production messages outside WhatsApp's customer-service window, configure approved message templates in Meta Business Manager.

Flutterwave billing uses `/api/subscription-payment` to start a landlord subscription collection, `/api/subscription-callback` for checkout redirects, and `/api/subscription-webhook` for final payment status updates. In Flutterwave, set the webhook URL to `https://your-domain.com/api/subscription-webhook` and use the same value in `FLUTTERWAVE_WEBHOOK_SECRET` as the dashboard secret hash. The v4 `CLIENT_ID` and `CLIENT_SECRET` support MTN/Airtel Mobile Money prompts; hosted card checkout also needs a v3 `FLUTTERWAVE_SECRET_KEY`, or a live Flutterwave recurring-card approval flow.

## Demo Mode

When Supabase is not configured, the app runs with local browser demo data for development. When Supabase is configured, public demo buttons are hidden, signup/sign-in uses Supabase Auth, and data is protected by RLS.

## Portal Structure

- Super Admin: platform overview, account management, billing, system monitoring, support tickets, subscriptions, and password resets.
- Landlord: properties, units, tenants, rent, support, and caretaker access.
- Caretaker: assigned properties, tenants, and rent only.

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

## Flutter Payment API

Flutter clients can sign in with `/api/signin`, then call `/api/payments` with the returned Supabase access token.

```dart
final login = await http.post(
  Uri.parse('$baseUrl/api/signin'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'identifier': phoneOrEmail, 'password': password}),
);
final accessToken = jsonDecode(login.body)['session']['access_token'];

final payment = await http.post(
  Uri.parse('$baseUrl/api/payments'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $accessToken',
  },
  body: jsonEncode({
    'tenant_id': tenantId,
    'amount': 450000,
    'payment_method': 'MTN MoMo',
    'payment_date': '2026-05-29',
    'reference': 'MOMO-48391',
    'payment_proof': 'MoMo confirmation screenshot or note',
    'verification_status': 'Verified',
  }),
);
```

`POST /api/payments` records a rent payment, calculates that month's remaining balance, and returns `{ "payment": ... }`. Use `GET /api/payments?tenant_id=...` to fetch recent payments visible to the signed-in landlord or staff user.

The app stores real rows in these tables:

```sql
app_users(id, name, phone, email, creator_email, platform_owner_id, role, account_status, created_at)
subscriptions(id, owner_id, plan, monthly_fee, status, last_payment_date, next_billing_date, billing_method, billing_contact_masked, auto_collect_authorized, cancel_at_period_end, payment_provider, provider_payment_reference, provider_payment_status, created_at)
properties(id, property_name, location, property_type, owner_id)
units(id, property_id, unit_number, rent_amount, status)
tenants(id, unit_id, name, phone, national_id, rent_amount, deposit_paid, move_in_date, status, move_out_date)
payments(id, tenant_id, amount, payment_method, payment_date, balance, reference, receipt_number, payment_proof, verification_status)
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
