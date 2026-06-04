const test = require("node:test");
const assert = require("node:assert/strict");

const { planCanPublishPublicListings, planLimitForPlan } = require("../server/supabase-admin");
const flutterwave = require("../server/flutterwave");
const pesapal = require("../server/pesapal");
const subscriptionBilling = require("../server/subscription-billing");
const payments = require("../server/api-routes/payments");
const signup = require("../server/api-routes/signup");
const syncState = require("../server/api-routes/sync-state");

test("plan limits match public package promises", () => {
  assert.deepEqual(planLimitForPlan("Starter"), { properties: 1, units: 20, caretakers: 1, publicListings: false });
  assert.deepEqual(planLimitForPlan("Professional"), { properties: 5, units: 100, caretakers: 10, publicListings: true });
  assert.equal(planLimitForPlan("Enterprise").units, Number.POSITIVE_INFINITY);
  assert.deepEqual(planLimitForPlan("Unknown"), { properties: 1, units: 5, caretakers: 0, publicListings: false });
  assert.equal(planCanPublishPublicListings("Starter"), false);
  assert.equal(planCanPublishPublicListings("Professional"), true);
});

test("signup masks billing contacts before storing subscription metadata", () => {
  assert.equal(signup._internal.maskBillingContact("0772123456"), "******3456");
  assert.equal(signup._internal.maskBillingContact("landlord@example.com"), "la***@example.com");
  assert.equal(signup._internal.normalizeSignupPaymentProvider("flutterwave"), "flutterwave");
  assert.equal(signup._internal.normalizeSignupPaymentProvider("anything"), "pesapal");
});

test("payment proof and verification helpers normalize user input", () => {
  assert.equal(payments._internal.normalizeVerificationStatus("verified"), "Verified");
  assert.equal(payments._internal.normalizeVerificationStatus("DISPUTED"), "Disputed");
  assert.equal(payments._internal.normalizeVerificationStatus("anything else"), "Unverified");
  assert.equal(payments._internal.normalizePaymentProof("  MOMO-48391 screenshot  "), "MOMO-48391 screenshot");
  assert.equal(payments._internal.normalizePaymentProof("x".repeat(600)).length, 500);
});

test("payment month range is stable for balance calculations", () => {
  assert.deepEqual(payments._internal.monthRange("2026-05-29"), ["2026-05-01", "2026-06-01"]);
});

test("flutterwave helpers normalize Ugandan billing inputs", () => {
  assert.equal(flutterwave.normalizeFlutterwavePaymentMethod("airtel"), "Airtel Money");
  assert.equal(flutterwave.normalizeFlutterwavePaymentMethod("visa card"), "Visa / Mastercard");
  assert.deepEqual(flutterwave.normalizeUgandaPhone("+256 772 123 456"), { country_code: "256", number: "772123456" });
  assert.deepEqual(flutterwave.normalizeUgandaPhone("0772123456"), { country_code: "256", number: "772123456" });
});

test("flutterwave statuses map to billing statuses", () => {
  assert.equal(flutterwave.normalizeProviderStatus("succeeded"), "Successful");
  assert.equal(flutterwave.normalizeProviderStatus("successful"), "Successful");
  assert.equal(flutterwave.normalizeProviderStatus("failed"), "Failed");
  assert.equal(flutterwave.normalizeProviderStatus("pending"), "Pending");
  assert.equal(flutterwave._internal.paymentOptionsForMethod("MTN MoMo"), "mobilemoneyuganda");
});

test("pesapal helpers normalize callback payloads", () => {
  const event = pesapal.extractPesapalPaymentEvent({
    OrderTrackingId: "track-123",
    OrderMerchantReference: "RLUG-001",
    payment_status_description: "COMPLETED",
    payment_method: "MTN",
    amount: 50000,
    currency: "UGX",
  });

  assert.equal(event.provider, "pesapal");
  assert.equal(event.provider_id, "track-123");
  assert.equal(event.reference, "RLUG-001");
  assert.equal(event.status, "Successful");
  assert.equal(event.payment_method, "MTN MoMo");
});

test("pesapal environment defaults to sandbox", () => {
  assert.equal(pesapal.pesapalConfig().env, "sandbox");
  assert.equal(pesapal.normalizePesapalStatus("FAILED"), "Failed");
  assert.equal(pesapal.normalizePesapalPaymentMethod("Airtel"), "Airtel Money");
});

test("pesapal errors expose useful review-safe details", () => {
  const payload = {
    error: { message: "Merchant account is not enabled" },
    consumer_secret: "secret-value",
    request_id: "abc-123",
  };
  assert.equal(pesapal._internal.extractPesapalErrorMessage(payload), "Merchant account is not enabled");
  assert.match(pesapal._internal.extractPesapalErrorDetails(payload), /abc-123/);
  assert.doesNotMatch(pesapal._internal.extractPesapalErrorDetails(payload), /secret-value/);
});

test("subscription billing uses subscription plan prices, not submitted overrides", () => {
  const billingAmount = subscriptionBilling._internal.billingAmount;
  assert.equal(billingAmount({ role: "saas-owner" }, { amount: 1000 }, { plan: "Starter", monthly_fee: 1000 }), 50000);
  assert.equal(billingAmount({ role: "landlord" }, {}, { plan: "Professional", monthly_fee: 1000 }), 120000);
  assert.equal(billingAmount({ role: "landlord" }, {}, { plan: "Enterprise", monthly_fee: 250000 }), 500000);
  assert.equal(billingAmount({ role: "saas-owner" }, { amount: 1000 }, { plan: "Custom", monthly_fee: 75000 }), 75000);
  assert.equal(billingAmount({ role: "saas-owner" }, { amount: 1000 }, { plan: "Custom", monthly_fee: 0 }), 0);
});

test("sync-state tolerates missing optional tenant move-out columns", () => {
  const error = new Error("Could not find the 'move_out_balance' column of 'tenants' in the schema cache");
  const missing = syncState._internal.missingSchemaCacheColumn(error);

  assert.deepEqual(missing, { column: "move_out_balance", table: "tenants" });
  assert.equal(syncState._internal.isRetryableOptionalTenantColumn("tenants", missing), true);
  assert.equal(syncState._internal.isRetryableOptionalTenantColumn("payments", missing), false);
  assert.deepEqual(
    syncState._internal.stripColumnsFromRows(
      [{ id: "tenant-1", status: "moved_out", move_out_balance: 10000, move_out_refund: 5000 }],
      new Set(["move_out_balance"])
    ),
    [{ id: "tenant-1", status: "moved_out", move_out_refund: 5000 }]
  );
});

test("sync-state tolerates missing optional support center tables", () => {
  const error = new Error("Could not find the table 'public.landlord_messages' in the schema cache");

  assert.equal(syncState._internal.missingSchemaCacheTable(error), "landlord_messages");
  assert.equal(syncState._internal.isRetryableOptionalSchemaTable({ table: "landlord_messages" }, error), true);
  assert.equal(syncState._internal.isRetryableOptionalSchemaTable({ table: "payments" }, error), false);
});

test("sync-state strips additive support center columns before migration", () => {
  const missing = syncState._internal.missingSchemaCacheColumn(
    new Error("Could not find the 'admin_note' column of 'support_tickets' in the schema cache")
  );

  assert.equal(syncState._internal.isRetryableOptionalSchemaColumn("supportTickets", missing), true);
  assert.equal(syncState._internal.isRetryableOptionalSchemaColumn("supportTickets", { ...missing, column: "subject" }), false);
  assert.equal(syncState._internal.isRetryableOptionalSchemaColumn("payments", missing), false);
});
