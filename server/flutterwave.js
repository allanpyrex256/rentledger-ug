const crypto = require("crypto");

const DEFAULT_CURRENCY = "UGX";
const FLUTTERWAVE_V3_BASE_URL = "https://api.flutterwave.com/v3";
const FLUTTERWAVE_TOKEN_URL = "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";

let tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

function flutterwaveConfig() {
  const mode = normalizeMode(process.env.FLUTTERWAVE_MODE || process.env.FLW_MODE || "sandbox");
  return {
    mode,
    currency: process.env.FLUTTERWAVE_CURRENCY || process.env.FLW_CURRENCY || DEFAULT_CURRENCY,
    webhookSecret:
      process.env.FLUTTERWAVE_WEBHOOK_SECRET ||
      process.env.FLW_SECRET_HASH ||
      process.env.FLUTTERWAVE_SECRET_HASH ||
      "",
    v3SecretKey: process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLW_SECRET_KEY || "",
    v4ClientId: process.env.FLUTTERWAVE_CLIENT_ID || process.env.FLW_CLIENT_ID || "",
    v4ClientSecret: process.env.FLUTTERWAVE_CLIENT_SECRET || process.env.FLW_CLIENT_SECRET || "",
    v4BaseUrl:
      process.env.FLUTTERWAVE_BASE_URL ||
      process.env.FLW_BASE_URL ||
      (mode === "live" ? "https://f4bexperience.flutterwave.com" : "https://developersandbox-api.flutterwave.com"),
    tokenUrl: process.env.FLUTTERWAVE_TOKEN_URL || process.env.FLW_TOKEN_URL || FLUTTERWAVE_TOKEN_URL,
  };
}

function normalizeMode(value) {
  return String(value || "").toLowerCase() === "live" || String(value || "").toLowerCase() === "production"
    ? "live"
    : "sandbox";
}

function isFlutterwaveConfigured(config = flutterwaveConfig()) {
  return Boolean(config.v3SecretKey || (config.v4ClientId && config.v4ClientSecret));
}

function hasV3HostedCheckout(config = flutterwaveConfig()) {
  return Boolean(config.v3SecretKey);
}

function hasV4MobileMoney(config = flutterwaveConfig()) {
  return Boolean(config.v4ClientId && config.v4ClientSecret);
}

function normalizeFlutterwavePaymentMethod(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("airtel")) return "Airtel Money";
  if (raw.includes("mtn") || raw.includes("momo") || raw.includes("mobile")) return "MTN MoMo";
  if (raw.includes("visa") || raw.includes("master") || raw.includes("card")) return "Visa / Mastercard";
  return raw ? capitalizeWords(raw) : "MTN MoMo";
}

function flutterwaveNetworkForMethod(method) {
  const normalized = normalizeFlutterwavePaymentMethod(method);
  if (normalized === "Airtel Money") return "AIRTEL";
  if (normalized === "MTN MoMo") return "MTN";
  return "";
}

function isCardMethod(method) {
  return normalizeFlutterwavePaymentMethod(method) === "Visa / Mastercard";
}

function isMobileMoneyMethod(method) {
  return Boolean(flutterwaveNetworkForMethod(method));
}

function buildPaymentReference(prefix = "RLUG") {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function checkoutReturnUrl(request, reference) {
  const baseUrl = publicBaseUrl(request);
  return `${baseUrl}/api/subscription-callback?reference=${encodeURIComponent(reference)}`;
}

function publicBaseUrl(request) {
  const configured = process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || process.env.SITE_URL || "";
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = request?.headers?.host || request?.headers?.Host || "localhost:3000";
  const proto = request?.headers?.["x-forwarded-proto"] || request?.headers?.["X-Forwarded-Proto"] || "http";
  return `${proto}://${host}`;
}

async function createFlutterwaveSubscriptionPayment({
  request,
  owner,
  subscription,
  amount,
  method,
  billingContact,
  reference = buildPaymentReference(),
}) {
  const config = flutterwaveConfig();
  if (!isFlutterwaveConfigured(config)) {
    const error = new Error("Flutterwave is not configured. Add Flutterwave environment variables before collecting payments.");
    error.status = 500;
    throw error;
  }

  const normalizedMethod = normalizeFlutterwavePaymentMethod(method || subscription?.billing_method);
  const redirectUrl = checkoutReturnUrl(request, reference);

  if (isMobileMoneyMethod(normalizedMethod) && hasV4MobileMoney(config)) {
    return createV4MobileMoneyCharge({
      config,
      owner,
      subscription,
      amount,
      method: normalizedMethod,
      billingContact,
      reference,
      redirectUrl,
    });
  }

  if (hasV3HostedCheckout(config)) {
    return createV3HostedCheckout({
      config,
      owner,
      subscription,
      amount,
      method: normalizedMethod,
      reference,
      redirectUrl,
    });
  }

  const error = new Error(
    isCardMethod(normalizedMethod)
      ? "Card checkout needs FLUTTERWAVE_SECRET_KEY/FLW_SECRET_KEY for Flutterwave Standard, or a live COF approval flow."
      : "This payment method is not configured for Flutterwave yet."
  );
  error.status = 400;
  throw error;
}

async function createV3HostedCheckout({ config, owner, subscription, amount, method, reference, redirectUrl }) {
  const body = {
    tx_ref: reference,
    amount: String(Number(amount || 0)),
    currency: config.currency,
    redirect_url: redirectUrl,
    payment_options: paymentOptionsForMethod(method),
    customer: {
      email: owner.email,
      name: owner.name,
      phonenumber: owner.phone,
    },
    customizations: {
      title: "RentLedger UG Subscription",
      description: `${subscription.plan} monthly plan`,
      logo: process.env.FLUTTERWAVE_LOGO_URL || undefined,
    },
    meta: {
      owner_id: owner.id,
      subscription_id: subscription.id,
      plan: subscription.plan,
      provider_version: "v3_standard",
    },
    configurations: {
      session_duration: 30,
      max_retry_attempt: 3,
    },
  };

  const payload = await fetchJson(`${FLUTTERWAVE_V3_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.v3SecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(stripUndefined(body)),
  });

  return {
    provider: "flutterwave",
    provider_version: "v3_standard",
    reference,
    status: "Pending",
    checkout_url: payload?.data?.link || "",
    instruction: "Open the Flutterwave checkout link to complete the subscription payment.",
    raw_status: payload?.status || "",
    charge_id: "",
    customer_id: "",
    payment_method_id: "",
  };
}

async function createV4MobileMoneyCharge({ config, owner, subscription, amount, method, billingContact, reference, redirectUrl }) {
  const phone = normalizeUgandaPhone(billingContact || owner.phone);
  if (!phone.number) {
    const error = new Error("Add a valid MTN or Airtel billing phone number before collecting by Mobile Money.");
    error.status = 400;
    throw error;
  }

  const name = splitName(owner.name);
  const customerPayload = await v4Fetch("/customers", {
    config,
    method: "POST",
    idempotencyKey: `customer-${owner.id}`,
    body: {
      email: owner.email,
      name,
      phone,
      meta: {
        rentledger_owner_id: owner.id,
      },
    },
  });
  const customerId = customerPayload?.data?.id;
  if (!customerId) {
    const error = new Error("Flutterwave did not return a customer id.");
    error.status = 502;
    throw error;
  }

  const paymentMethodPayload = await v4Fetch("/payment-methods", {
    config,
    method: "POST",
    idempotencyKey: `payment-method-${reference}`,
    body: {
      type: "mobile_money",
      mobile_money: {
        country_code: phone.country_code,
        network: flutterwaveNetworkForMethod(method),
        phone_number: phone.number,
      },
    },
  });
  const paymentMethodId = paymentMethodPayload?.data?.id;
  if (!paymentMethodId) {
    const error = new Error("Flutterwave did not return a payment method id.");
    error.status = 502;
    throw error;
  }

  const chargePayload = await v4Fetch("/charges", {
    config,
    method: "POST",
    idempotencyKey: `charge-${reference}`,
    scenarioKey: process.env.FLUTTERWAVE_SANDBOX_SCENARIO || "",
    body: {
      reference,
      currency: config.currency,
      customer_id: customerId,
      payment_method_id: paymentMethodId,
      redirect_url: redirectUrl,
      amount: Number(amount || 0),
      meta: {
        owner_id: owner.id,
        subscription_id: subscription.id,
        plan: subscription.plan,
        provider_version: "v4_mobile_money",
      },
    },
  });
  const charge = chargePayload?.data || {};
  const nextAction = charge.next_action || {};

  return {
    provider: "flutterwave",
    provider_version: "v4_mobile_money",
    reference,
    status: normalizeProviderStatus(charge.status),
    checkout_url: nextAction?.redirect_url?.url || "",
    instruction: nextAction?.payment_instruction?.note || "Approve the Mobile Money prompt on the billing phone.",
    raw_status: charge.status || "",
    charge_id: charge.id || "",
    customer_id: customerId,
    payment_method_id: paymentMethodId,
  };
}

async function verifyFlutterwavePayment(event) {
  const config = flutterwaveConfig();
  if (event.provider_id && String(event.provider_id).startsWith("chg_") && hasV4MobileMoney(config)) {
    const payload = await v4Fetch(`/charges/${encodeURIComponent(event.provider_id)}`, {
      config,
      method: "GET",
    });
    return extractPaymentEvent({ data: payload?.data || {}, type: "charge.completed" });
  }

  if ((event.transaction_id || event.provider_id) && hasV3HostedCheckout(config)) {
    const id = event.transaction_id || event.provider_id;
    const payload = await fetchJson(`${FLUTTERWAVE_V3_BASE_URL}/transactions/${encodeURIComponent(id)}/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.v3SecretKey}`,
        "Content-Type": "application/json",
      },
    });
    return extractPaymentEvent({ data: payload?.data || {}, event: "charge.completed" });
  }

  return event;
}

function extractPaymentEvent(payload = {}) {
  const data = payload.data || payload;
  const reference = data.reference || data.tx_ref || data.txRef || payload.tx_ref || payload.txRef || "";
  const providerId = data.id || payload.id || data.transaction_id || payload.transaction_id || "";
  return {
    provider: "flutterwave",
    reference: String(reference || ""),
    provider_id: providerId ? String(providerId) : "",
    transaction_id: data.transaction_id || payload.transaction_id || data.id || "",
    status: normalizeProviderStatus(data.status || payload.status),
    raw_status: String(data.status || payload.status || ""),
    amount: Number(data.amount || data.charged_amount || 0),
    currency: String(data.currency || ""),
    payment_method: paymentMethodFromPayload(data),
    event_type: payload.type || payload.event || payload["event.type"] || "",
    customer_email: data.customer?.email || data.customer_email || "",
  };
}

function normalizeProviderStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["successful", "success", "succeeded", "approved", "completed"].includes(raw)) return "Successful";
  if (["failed", "error", "declined", "cancelled", "canceled"].includes(raw)) return "Failed";
  if (["pending", "processing", "initiated"].includes(raw)) return "Pending";
  return raw ? capitalizeWords(raw) : "Pending";
}

function paymentMethodFromPayload(data) {
  const method = data.payment_method || data.payment_type || data.paymentMethod || "";
  if (typeof method === "string") return normalizeFlutterwavePaymentMethod(method);
  if (method?.type === "mobile_money") {
    const network = method.mobile_money?.network || "";
    return normalizeFlutterwavePaymentMethod(network);
  }
  return "";
}

function verifyFlutterwaveWebhook(rawBody, headers = {}) {
  const secret = flutterwaveConfig().webhookSecret;
  const signature = headerValue(headers, "flutterwave-signature");
  const legacyHash = headerValue(headers, "verif-hash");

  if (!secret) return process.env.FLUTTERWAVE_ALLOW_UNSIGNED_WEBHOOKS === "true";
  if (legacyHash && safeEqual(legacyHash, secret)) return true;
  if (!signature) return false;

  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return safeEqual(signature, computed);
}

async function readRawBody(request) {
  if (Buffer.isBuffer(request.body)) return request.body.toString("utf8");
  if (typeof request.body === "string") return request.body;
  if (request.body && typeof request.body === "object") return JSON.stringify(request.body);
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function v4Fetch(path, { config = flutterwaveConfig(), method = "GET", body, idempotencyKey, scenarioKey } = {}) {
  const token = await getV4AccessToken(config);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Trace-Id": buildTraceId(),
  };
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
  if (scenarioKey && config.mode !== "live") headers["X-Scenario-Key"] = scenarioKey;
  return fetchJson(`${config.v4BaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(stripUndefined(body)),
  });
}

async function getV4AccessToken(config = flutterwaveConfig()) {
  if (!config.v4ClientId || !config.v4ClientSecret) {
    const error = new Error("Flutterwave v4 client credentials are not configured.");
    error.status = 500;
    throw error;
  }
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.accessToken;

  const body = new URLSearchParams({
    client_id: config.v4ClientId,
    client_secret: config.v4ClientSecret,
    grant_type: "client_credentials",
  });
  const payload = await fetchJson(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!payload.access_token) {
    const error = new Error("Flutterwave did not return an access token.");
    error.status = 502;
    throw error;
  }
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 600) * 1000,
  };
  return tokenCache.accessToken;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || "Flutterwave request failed.");
    error.status = response.status >= 500 ? 502 : response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function paymentOptionsForMethod(method) {
  if (isCardMethod(method)) return "card";
  if (isMobileMoneyMethod(method)) return "mobilemoneyuganda";
  return "card, mobilemoneyuganda";
}

function normalizeUgandaPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return { country_code: "256", number: "" };
  if (digits.startsWith("256")) return { country_code: "256", number: digits.slice(3) };
  if (digits.startsWith("0")) return { country_code: "256", number: digits.slice(1) };
  return { country_code: "256", number: digits };
}

function splitName(value) {
  const parts = String(value || "RentLedger Customer").trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || "RentLedger",
    middle: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    last: parts.length > 1 ? parts[parts.length - 1] : "Customer",
  };
}

function buildTraceId() {
  return `rlug-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

function headerValue(headers, name) {
  const lowerName = name.toLowerCase();
  const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === lowerName);
  const value = key ? headers[key] : "";
  return Array.isArray(value) ? value[0] : String(value || "");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.entries(value).reduce((result, [key, item]) => {
    if (item !== undefined) result[key] = stripUndefined(item);
    return result;
  }, {});
}

function capitalizeWords(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

module.exports = {
  buildPaymentReference,
  checkoutReturnUrl,
  createFlutterwaveSubscriptionPayment,
  extractPaymentEvent,
  flutterwaveConfig,
  hasV3HostedCheckout,
  hasV4MobileMoney,
  isFlutterwaveConfigured,
  normalizeFlutterwavePaymentMethod,
  normalizeProviderStatus,
  normalizeUgandaPhone,
  publicBaseUrl,
  readRawBody,
  verifyFlutterwavePayment,
  verifyFlutterwaveWebhook,
  _internal: {
    flutterwaveNetworkForMethod,
    isCardMethod,
    isMobileMoneyMethod,
    paymentOptionsForMethod,
    splitName,
    stripUndefined,
  },
};
