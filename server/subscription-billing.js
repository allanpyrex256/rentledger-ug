const {
  addMonths,
  insertRows,
  isoDate,
  makeId,
  patchRows,
  supabaseFetch,
} = require("./supabase-admin");
const {
  buildPaymentReference,
  createFlutterwaveSubscriptionPayment,
  extractPaymentEvent,
  normalizeFlutterwavePaymentMethod,
  normalizeProviderStatus,
  verifyFlutterwavePayment,
} = require("./flutterwave");
const {
  createPesapalSubscriptionPayment,
  extractPesapalPaymentEvent,
  isPesapalEvent,
  normalizePesapalPaymentMethod,
  verifyPesapalPayment,
} = require("./pesapal");

async function startSubscriptionCollection({ request, profile, body = {} }) {
  const ownerId = ownerIdForBillingRequest(profile, body);
  const { owner, subscription } = await loadSubscriptionContext(ownerId);
  const provider = normalizePaymentProvider(body.payment_provider || body.provider || process.env.PAYMENT_PROVIDER || "pesapal");
  const method = normalizeProviderPaymentMethod(provider, body.payment_method || body.paymentMethod || subscription.billing_method);
  const amount = billingAmount(profile, body, subscription);
  if (amount <= 0) {
    const error = new Error("This subscription does not have a billable monthly fee.");
    error.status = 400;
    throw error;
  }

  const reference = buildPaymentReference();
  const providerResult =
    provider === "pesapal"
      ? await createPesapalSubscriptionPayment({
          request,
          owner,
          subscription,
          amount,
          reference,
        })
      : await createFlutterwaveSubscriptionPayment({
          request,
          owner,
          subscription,
          amount,
          method,
          billingContact: body.billing_contact || body.billingContact || owner.phone,
          reference,
        });
  const providerLabel = providerDisplayName(providerResult.provider);

  const patch = {
    status: nextCollectionStatus(subscription),
    billing_method: method,
    auto_collect_authorized: true,
    payment_provider: providerResult.provider,
    provider_payment_reference: providerResult.reference,
    provider_payment_status: providerResult.status,
    provider_checkout_url: providerResult.checkout_url || null,
    provider_charge_id: providerResult.charge_id || null,
    provider_customer_id: providerResult.customer_id || subscription.provider_customer_id || null,
    provider_payment_method_id: providerResult.payment_method_id || subscription.provider_payment_method_id || null,
    provider_next_action: providerResult.instruction || null,
    last_payment_method: method,
    last_payment_note: `${providerLabel} collection started: ${providerResult.reference}`,
  };
  await patchRows("subscriptions", `id=eq.${encodeURIComponent(subscription.id)}`, patch);
  await createBillingNotification({
    userId: owner.id,
    title: "Subscription payment started",
    message: providerResult.checkout_url
      ? `${providerLabel} checkout is ready for ${formatMoney(amount)}. Reference ${providerResult.reference}.`
      : `${providerResult.instruction || `Approve the ${providerLabel} payment prompt.`} Reference ${providerResult.reference}.`,
  });

  return {
    subscription: { ...subscription, ...patch },
    payment: {
      reference: providerResult.reference,
      amount,
      currency: providerResult.currency || process.env.PAYMENT_CURRENCY || "UGX",
      method,
      status: providerResult.status,
      checkout_url: providerResult.checkout_url,
      instruction: providerResult.instruction,
      provider_version: providerResult.provider_version,
    },
  };
}

async function settleSubscriptionPayment(input, options = {}) {
  const incoming = normalizeIncomingPaymentEvent(input);
  const shouldVerify = options.verify !== false;
  const event = shouldVerify ? await verifyProviderPayment(incoming).catch(() => incoming) : incoming;
  if (!event.reference && !event.provider_id) return { ok: true, ignored: true, reason: "No payment reference." };

  const subscription = await findSubscriptionForPayment(event);
  if (!subscription) return { ok: true, ignored: true, reason: "No matching subscription." };

  const owners = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(subscription.owner_id)}&select=*`);
  const owner = owners[0];
  const amount = Number(event.amount || 0);
  const expectedAmount = Number(subscription.monthly_fee || 0);
  const currency = String(event.currency || process.env.PAYMENT_CURRENCY || "UGX").toUpperCase();
  const status = normalizeProviderStatus(event.status);
  const expectedCurrency = String(process.env.PAYMENT_CURRENCY || process.env.PESAPAL_CURRENCY || "UGX").toUpperCase();
  const paidEnough = amount >= expectedAmount && currency === expectedCurrency;
  const today = isoDate(new Date());
  const provider = normalizePaymentProvider(event.provider || subscription.payment_provider || process.env.PAYMENT_PROVIDER || "pesapal");
  const providerLabel = providerDisplayName(provider);

  if (status === "Successful" && paidEnough) {
    const patch = {
      status: "Active",
      last_payment_date: today,
      last_payment_method: event.payment_method || subscription.billing_method || providerLabel,
      last_payment_note: `${providerLabel} payment successful: ${event.reference}`,
      next_billing_date: addMonths(today, 1),
      grace_period_end: addMonths(today, 1),
      cancel_at_period_end: false,
      provider_payment_status: "Successful",
      payment_provider: provider,
      provider_charge_id: event.provider_id || subscription.provider_charge_id || null,
      provider_next_action: null,
    };
    await patchRows("subscriptions", `id=eq.${encodeURIComponent(subscription.id)}`, patch);
    await patchRows("app_users", `id=eq.${encodeURIComponent(subscription.owner_id)}`, { account_status: "Active" });
    await createBillingNotification({
      userId: subscription.owner_id,
      title: "Subscription payment received",
      message: `Your ${subscription.plan} plan is active until ${formatDate(patch.next_billing_date)}.`,
    });
    await notifySuperAdmin(
      `${owner?.name || "A landlord"} paid ${formatMoney(amount)} for ${subscription.plan} by ${providerLabel}. Reference ${event.reference}.`
    );
    return { ok: true, status: "Active", subscription: { ...subscription, ...patch } };
  }

  const failureStatus = status === "Failed" || (status === "Successful" && !paidEnough) ? "Failed" : "Pending";
  const patch = {
    status: subscriptionStatusAfterUnpaid(subscription),
    provider_payment_status: failureStatus,
    payment_provider: provider,
    provider_charge_id: event.provider_id || subscription.provider_charge_id || null,
    last_payment_note:
      status === "Successful" && !paidEnough
        ? `${providerLabel} paid amount did not match expected fee: ${event.reference}`
        : `${providerLabel} payment ${failureStatus.toLowerCase()}: ${event.reference}`,
  };
  await patchRows("subscriptions", `id=eq.${encodeURIComponent(subscription.id)}`, patch);
  return { ok: true, status: failureStatus, subscription: { ...subscription, ...patch } };
}

function normalizeIncomingPaymentEvent(input = {}) {
  if (input.reference || input.provider_id || input.order_tracking_id) return input;
  return isPesapalEvent(input) ? extractPesapalPaymentEvent(input) : extractPaymentEvent(input);
}

async function verifyProviderPayment(event) {
  const provider = normalizePaymentProvider(event.provider || process.env.PAYMENT_PROVIDER || "pesapal");
  return provider === "pesapal" ? verifyPesapalPayment(event) : verifyFlutterwavePayment(event);
}

async function findSubscriptionForPayment(event) {
  if (event.reference) {
    const rows = await supabaseFetch(
      `/rest/v1/subscriptions?provider_payment_reference=eq.${encodeURIComponent(event.reference)}&select=*`
    );
    if (rows[0]) return rows[0];
  }
  if (event.provider_id) {
    const rows = await supabaseFetch(
      `/rest/v1/subscriptions?provider_charge_id=eq.${encodeURIComponent(event.provider_id)}&select=*`
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

async function loadSubscriptionContext(ownerId) {
  if (!ownerId) {
    const error = new Error("Landlord account is required for subscription billing.");
    error.status = 400;
    throw error;
  }
  const owners = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(ownerId)}&select=*`);
  const owner = owners[0];
  if (!owner || owner.role !== "landlord") {
    const error = new Error("Landlord account was not found.");
    error.status = 404;
    throw error;
  }
  const rows = await supabaseFetch(`/rest/v1/subscriptions?owner_id=eq.${encodeURIComponent(ownerId)}&select=*`);
  const subscription = rows[0];
  if (!subscription) {
    const error = new Error("This landlord does not have a subscription record.");
    error.status = 404;
    throw error;
  }
  return { owner, subscription };
}

function ownerIdForBillingRequest(profile, body = {}) {
  if (profile.role === "saas-owner") return body.owner_id || body.ownerId || body.landlord_id || body.landlordId || "";
  if (profile.role === "landlord") return profile.id;
  const error = new Error("Subscription billing is available to landlords and the Super Admin only.");
  error.status = 403;
  throw error;
}

function billingAmount(profile, body, subscription) {
  const requested = Number(body.amount || 0);
  if (profile.role === "saas-owner" && requested > 0) return requested;
  return Number(subscription.monthly_fee || 0);
}

function nextCollectionStatus(subscription) {
  const current = subscription.status || "Active";
  if (["Cancelled", "Paused"].includes(current)) return current;
  return "Pending";
}

function subscriptionStatusAfterUnpaid(subscription) {
  if (!subscription.next_billing_date) return "Pending";
  const today = new Date(`${isoDate(new Date())}T00:00:00`);
  const nextBilling = new Date(`${subscription.next_billing_date}T00:00:00`);
  return nextBilling < today ? "Overdue" : "Pending";
}

async function createBillingNotification({ userId, title, message }) {
  if (!userId) return null;
  return insertRows("notifications", [
    {
      id: makeId("notification"),
      user_id: userId,
      type: "billing",
      title,
      message,
      read: false,
      created_at: new Date().toISOString(),
    },
  ]).catch(() => null);
}

async function notifySuperAdmin(message) {
  return createBillingNotification({
    userId: "user-saas-owner",
    title: "Billing update",
    message,
  });
}

function normalizePaymentProvider(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw === "flutterwave" || raw === "flw" ? "flutterwave" : "pesapal";
}

function normalizeProviderPaymentMethod(provider, value) {
  if (provider === "pesapal") return normalizePesapalPaymentMethod(value) || "Pesapal";
  return normalizeFlutterwavePaymentMethod(value);
}

function providerDisplayName(provider) {
  return normalizePaymentProvider(provider) === "flutterwave" ? "Flutterwave" : "Pesapal";
}

function formatMoney(value) {
  return `USh ${Number(value || 0).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}

module.exports = {
  loadSubscriptionContext,
  settleSubscriptionPayment,
  startSubscriptionCollection,
  _internal: {
    billingAmount,
    nextCollectionStatus,
    ownerIdForBillingRequest,
    normalizePaymentProvider,
    subscriptionStatusAfterUnpaid,
  },
};
