const test = require("node:test");
const assert = require("node:assert/strict");

const { planLimitForPlan } = require("../server/supabase-admin");
const flutterwave = require("../server/flutterwave");
const payments = require("../api/payments");
const signup = require("../api/signup");

test("plan limits match public package promises", () => {
  assert.deepEqual(planLimitForPlan("Starter"), { properties: 1, units: 20, caretakers: 1 });
  assert.deepEqual(planLimitForPlan("Professional"), { properties: 5, units: 100, caretakers: 5 });
  assert.equal(planLimitForPlan("Enterprise").units, Number.POSITIVE_INFINITY);
  assert.deepEqual(planLimitForPlan("Unknown"), { properties: 1, units: 5, caretakers: 0 });
});

test("signup masks billing contacts before storing subscription metadata", () => {
  assert.equal(signup._internal.maskBillingContact("0772123456"), "******3456");
  assert.equal(signup._internal.maskBillingContact("landlord@example.com"), "la***@example.com");
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
