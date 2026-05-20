# RentLedger UG

A static MVP prototype for a Ugandan landlord/property management SaaS.

## What Is Included

- Landlord dashboard with unit occupancy, monthly revenue, late payments, and net income.
- Landlord account signup/sign-in prototype with owner-specific data views.
- Property setup for houses, apartments, and individual units.
- Landing page with local photo assets for apartments, mobile payments, and property handover moments.
- Tenant management with phone, National ID, unit, rent, deposit, and move-in date.
- Rent tracking with partial payments, balances, payment history, and MTN/Airtel reference fields.
- Expense tracking for repairs, utilities, caretaker salary, security, and other costs.
- SMS and WhatsApp reminder templates for due, received, and overdue rent.
- Local browser storage so demo changes persist without a backend.

## Open It

Open `index.html` in a browser.

## Next Build Step

Move the same data shape into a backend:

```sql
users(id, name, phone, role)
properties(id, property_name, location, property_type, owner_id)
units(id, property_id, unit_number, rent_amount, status)
tenants(id, unit_id, name, phone, national_id, rent_amount, deposit_paid, move_in_date)
payments(id, tenant_id, amount, payment_method, payment_date, balance, reference)
expenses(id, property_id, type, amount, date)
```

For production, replace the local browser storage with real authentication and a backend database so each landlord's records are securely isolated.

## Image Sources

- `assets/apartment-exterior.jpg` from Pexels photo `34360410`.
- `assets/mobile-payment.jpg` from Pexels photo `5239806`.
- `assets/property-keys.jpg` from Pexels photo `31015267`.
