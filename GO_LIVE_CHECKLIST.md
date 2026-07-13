# RentFlow UG go-live checklist

## 1. Prepare backend services
- Create a Supabase project.
- Run [supabase-schema.sql](supabase-schema.sql) in the SQL editor.
- Run [supabase-production-setup.sql](supabase-production-setup.sql).
- Configure Supabase Auth site URL to your production domain.
- Create the first Super Admin account and allow the bootstrap route to create the matching app user.

## 2. Configure environment variables
- Copy [.env.example](.env.example) into your deployment environment.
- Fill in real Supabase, WhatsApp, and payment provider values.
- For live payments, set the payment provider to live mode and use the production domain.

## 3. Deploy the app
- Deploy the repository to Vercel using [vercel.json](vercel.json).
- Ensure the deployment has the API routes enabled.
- Confirm the production URL works and the signup flow completes.

## 4. Test before public launch
- Create a test landlord account.
- Create a property, unit, tenant, and payment.
- Verify receipts, password reset, and WhatsApp buttons.
- Confirm billing and subscription flows behave correctly.

## 5. Soft launch
- Invite a small group of real landlords.
- Monitor signups, logins, payments, and support tickets.
- Fix issues before opening to a larger audience.
