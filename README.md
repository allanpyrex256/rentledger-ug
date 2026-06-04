# RentLedger UG

A static MVP prototype for a Ugandan landlord/property management SaaS.

## What Is Included

- V1 landlord workflow: create property, add unit, add tenant, record payment, and see balance.
- Landlord daily dashboard with rent collected today, late tenants, and vacant rooms.
- Landlord account signup/sign-in with required plan selection, billing method, and first-month auto-collection authorization.
- Pesapal subscription billing endpoints for hosted Mobile Money/card checkout, callbacks, and IPN status updates, with Flutterwave still available as a fallback provider.
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
PAYMENT_PROVIDER=pesapal
PESAPAL_ENV=sandbox
PESAPAL_CONSUMER_KEY=your-pesapal-consumer-key
PESAPAL_CONSUMER_SECRET=your-pesapal-consumer-secret
PESAPAL_IPN_ID=your-registered-pesapal-ipn-id
PESAPAL_CURRENCY=UGX
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

Subscription billing uses `/api/subscription-payment` to start a landlord subscription collection, `/api/subscription-callback` for checkout redirects, and `/api/subscription-webhook` for final payment status updates. For Pesapal, register `https://your-domain.com/api/subscription-webhook` as an API 3.0 IPN URL with notification type `GET`, then put the returned IPN ID in `PESAPAL_IPN_ID`. Pesapal uses `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET` to generate a short-lived token before creating checkout orders. If `PAYMENT_PROVIDER=flutterwave`, the same billing flow uses the Flutterwave helper and signed webhooks instead.

For Pesapal merchant review, the public landing page includes pricing, payment methods, cancellation, refund/dispute handling, privacy language, and support contact details in the `#paymentDetails` section. Keep the production domain live, make sure checkout uses the same domain registered for the IPN URL, and confirm `PESAPAL_ENV=live` before collecting real payments.

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

For existing Supabase projects, rerun the latest `supabase-schema.sql` after pulling app updates. It is idempotent and repairs older production schemas by adding any missing tables, columns, indexes, grants, functions, and RLS policies.

Run `supabase-support-center-migration.sql` for the Support Center rollout or when production shows a Supabase schema-cache error. It includes the Support Center tables plus compatibility repairs for older RentLedger tables, so the database catches up in one SQL run.

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
app_users(id, name, phone, email, creator_email, platform_owner_id, role, account_status, verified_badge, verification_label, created_at)
subscriptions(id, owner_id, plan, monthly_fee, status, last_payment_date, next_billing_date, billing_method, billing_contact_masked, auto_collect_authorized, cancel_at_period_end, payment_provider, provider_payment_reference, provider_payment_status, created_at)
properties(id, property_name, location, property_type, owner_id)
units(id, property_id, unit_number, rent_amount, status)
tenants(id, unit_id, name, phone, national_id, rent_amount, deposit_paid, move_in_date, status, move_out_date, move_out_balance, move_out_damages, move_out_refund, move_out_note)
payments(id, tenant_id, amount, payment_method, payment_date, balance, reference, receipt_number, payment_proof, verification_status)
expenses(id, property_id, type, amount, date)
support_tickets(id, owner_id, landlord_id, subject, description, priority, status, note, admin_note, created_at, updated_at, resolved_at)
landlord_messages(id, landlord_id, user_id, ticket_id, template, title, message, created_at)
audit_logs(id, admin_id, landlord_id, action, old_value, new_value, created_at)
notifications(id, user_id, type, title, message, read, is_read, created_at)
app_settings(setting_key, value)
```

Production auth is handled by Supabase Auth. The schema enables RLS so anonymous users can only read published vacant listings, landlords can access their own records, staff can access assigned properties, and Super Admin users can manage platform data.

## Image Sources

- `assets/apartment-exterior.jpg` from Pexels photo `34360410`.
- `assets/mobile-payment.jpg` from Pexels photo `5239806`.
- `assets/property-keys.jpg` from Pexels photo `31015267`.
