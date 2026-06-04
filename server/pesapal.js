const { buildPaymentReference, publicBaseUrl } = require("./flutterwave");

const DEFAULT_CURRENCY = "UGX";
const tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

function pesapalConfig() {
  const env = normalizePesapalEnv(process.env.PESAPAL_ENV || process.env.PESAPAL_MODE || "sandbox");
  const baseUrl =
    process.env.PESAPAL_BASE_URL ||
    (env === "live" ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3");
  return {
    env,
    baseUrl: baseUrl.replace(/\/$/, ""),
    currency: process.env.PESAPAL_CURRENCY || process.env.PAYMENT_CURRENCY || DEFAULT_CURRENCY,
    consumerKey: process.env.PESAPAL_CONSUMER_KEY || "",
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || "",
    ipnId: process.env.PESAPAL_IPN_ID || process.env.PESAPAL_NOTIFICATION_ID || "",
  };
}

function normalizePesapalEnv(value) {
  return ["live", "production", "prod"].includes(String(value || "").trim().toLowerCase()) ? "live" : "sandbox";
}

function isPesapalConfigured(config = pesapalConfig()) {
  return Boolean(config.consumerKey && config.consumerSecret && config.ipnId);
}

async function createPesapalSubscriptionPayment({
  request,
  owner,
  subscription,
  amount,
  reference = buildPaymentReference("RLUG"),
}) {
  const config = pesapalConfig();
  if (!config.consumerKey || !config.consumerSecret) {
    const error = new Error("Pesapal credentials are not configured. Add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.");
    error.status = 500;
    throw error;
  }
  if (!config.ipnId) {
    const error = new Error("PESAPAL_IPN_ID is missing. Register the IPN URL in Pesapal first.");
    error.status = 500;
    throw error;
  }

  const callbackUrl = `${publicBaseUrl(request)}/api/subscription-callback?provider=pesapal`;
  const name = splitName(owner.name);
  const payload = await pesapalFetch("/api/Transactions/SubmitOrderRequest", {
    config,
    method: "POST",
    body: {
      id: reference,
      currency: config.currency,
      amount: Number(amount || 0),
      description: `RentLedger UG ${subscription.plan} subscription`,
      callback_url: callbackUrl,
      notification_id: config.ipnId,
      billing_address: {
        email_address: owner.email || "",
        phone_number: normalizePhone(owner.phone),
        country_code: "UG",
        first_name: name.first,
        middle_name: name.middle,
        last_name: name.last,
        line_1: "Uganda",
        line_2: "",
        city: "Kampala",
        state: "",
        postal_code: "",
        zip_code: "",
      },
    },
  });

  if (payload?.error?.message) {
    const error = new Error(normalizePesapalErrorMessage(extractPesapalErrorMessage(payload)) || "Pesapal rejected the checkout request.");
    error.status = 502;
    error.provider = "pesapal";
    error.details = extractPesapalErrorDetails(payload);
    throw error;
  }

  return {
    provider: "pesapal",
    provider_version: "api_3_json",
    reference,
    status: "Pending",
    checkout_url: payload.redirect_url || "",
    instruction: "Open Pesapal checkout to complete the subscription payment.",
    raw_status: payload.status || "",
    charge_id: payload.order_tracking_id || "",
    currency: config.currency,
    customer_id: "",
    payment_method_id: "",
  };
}

async function verifyPesapalPayment(event) {
  const orderTrackingId = event.order_tracking_id || event.provider_id || event.provider_charge_id || "";
  if (!orderTrackingId) return event;
  const payload = await pesapalFetch(`/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
    method: "GET",
  });
  const verified = extractPesapalPaymentEvent(payload);
  return {
    ...event,
    ...verified,
    reference: verified.reference || event.reference,
    provider_id: orderTrackingId,
    order_tracking_id: orderTrackingId,
  };
}

function extractPesapalPaymentEvent(payload = {}) {
  const source = payload.data || payload;
  const reference =
    source.OrderMerchantReference ||
    source.orderMerchantReference ||
    source.order_merchant_reference ||
    source.merchant_reference ||
    source.pesapal_merchant_reference ||
    source.id ||
    "";
  const orderTrackingId =
    source.OrderTrackingId ||
    source.orderTrackingId ||
    source.order_tracking_id ||
    source.pesapal_transaction_tracking_id ||
    source.provider_id ||
    "";
  const rawStatus = source.payment_status_description || source.payment_status || source.status || "";
  return {
    provider: "pesapal",
    reference: String(reference || ""),
    provider_id: String(orderTrackingId || ""),
    order_tracking_id: String(orderTrackingId || ""),
    transaction_id: String(source.confirmation_code || orderTrackingId || ""),
    status: normalizePesapalStatus(rawStatus, source.status_code),
    raw_status: String(rawStatus || ""),
    amount: Number(source.amount || 0),
    currency: String(source.currency || ""),
    payment_method: normalizePesapalPaymentMethod(source.payment_method || ""),
    event_type:
      source.OrderNotificationType ||
      source.orderNotificationType ||
      source.order_notification_type ||
      source.pesapal_notification_type ||
      "IPNCHANGE",
    customer_email: source.email_address || source.customer_email || "",
  };
}

function normalizePesapalStatus(status, statusCode) {
  const raw = String(status || "").trim().toLowerCase();
  if (String(statusCode) === "1" || raw === "completed") return "Successful";
  if (String(statusCode) === "2" || raw === "failed") return "Failed";
  if (String(statusCode) === "3" || raw === "reversed") return "Failed";
  if (String(statusCode) === "0" || raw === "invalid") return "Failed";
  return raw ? capitalizeWords(raw) : "Pending";
}

function normalizePesapalPaymentMethod(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("mtn")) return "MTN MoMo";
  if (raw.includes("airtel")) return "Airtel Money";
  if (raw.includes("card") || raw.includes("visa") || raw.includes("master")) return "Visa / Mastercard";
  return raw ? capitalizeWords(raw) : "";
}

function isPesapalEvent(value = {}) {
  return Boolean(
    value.provider === "pesapal" ||
      value.OrderTrackingId ||
      value.orderTrackingId ||
      value.order_tracking_id ||
      value.OrderMerchantReference ||
      value.orderMerchantReference ||
      value.order_merchant_reference ||
      value.pesapal_transaction_tracking_id ||
      value.pesapal_merchant_reference
  );
}

async function pesapalFetch(path, { config = pesapalConfig(), method = "GET", body } = {}) {
  const token = await getPesapalToken(config);
  return fetchJson(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function getPesapalToken(config = pesapalConfig()) {
  if (!config.consumerKey || !config.consumerSecret) {
    const error = new Error("Pesapal credentials are not configured.");
    error.status = 500;
    throw error;
  }
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.accessToken;
  const payload = await fetchJson(`${config.baseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consumer_key: config.consumerKey,
      consumer_secret: config.consumerSecret,
    }),
  });
  if (!payload.token) {
    const error = new Error(payload?.error?.message || "Pesapal did not return an access token.");
    error.status = 502;
    throw error;
  }
  tokenCache.accessToken = payload.token;
  tokenCache.expiresAt = Date.now() + 4 * 60 * 1000;
  return tokenCache.accessToken;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = parseJsonResponse(text);
  if (!response.ok) {
    const error = new Error(normalizePesapalErrorMessage(extractPesapalErrorMessage(payload)) || "Pesapal request failed.");
    error.status = response.status >= 500 ? 502 : response.status;
    error.provider = "pesapal";
    error.code = response.status;
    error.details = extractPesapalErrorDetails(payload, text);
    error.payload = payload;
    throw error;
  }
  return payload;
}

function parseJsonResponse(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw_response: text };
  }
}

function extractPesapalErrorMessage(payload = {}) {
  const values = [
    payload?.error?.message,
    payload?.error_description,
    payload?.message,
    payload?.error,
    payload?.data?.message,
    Array.isArray(payload?.errors) ? payload.errors.map((item) => item.message || item.detail || item).join("; ") : "",
  ];
  return values.map((value) => String(value || "").trim()).find(Boolean) || "";
}

function normalizePesapalErrorMessage(message) {
  const text = String(message || "").trim();
  if (!text) return "";
  if (/amount.*exceeds.*limit|amount_exceeds/i.test(text)) {
    return "Pesapal rejected this amount because it exceeds your merchant transaction limit. Ask Pesapal to increase the limit or test with a lower amount.";
  }
  return text.replace(/\s+/g, " ");
}

function extractPesapalErrorDetails(payload = {}, rawText = "") {
  const sanitized = redactSensitivePayload(payload);
  const details = sanitized && Object.keys(sanitized).length ? JSON.stringify(sanitized) : String(rawText || "").trim();
  return details.length > 700 ? `${details.slice(0, 697)}...` : details;
}

function redactSensitivePayload(value) {
  if (Array.isArray(value)) return value.map(redactSensitivePayload);
  if (!value || typeof value !== "object") return value;
  return Object.entries(value).reduce((result, [key, child]) => {
    const normalizedKey = key.toLowerCase();
    result[key] = /secret|token|authorization|consumer_key|consumer_secret/.test(normalizedKey)
      ? "[redacted]"
      : redactSensitivePayload(child);
    return result;
  }, {});
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("256")) return `0${digits.slice(3)}`;
  return digits || "";
}

function splitName(value) {
  const parts = String(value || "RentLedger Customer").trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || "RentLedger",
    middle: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    last: parts.length > 1 ? parts[parts.length - 1] : "Customer",
  };
}

function capitalizeWords(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

module.exports = {
  createPesapalSubscriptionPayment,
  extractPesapalPaymentEvent,
  isPesapalConfigured,
  isPesapalEvent,
  normalizePesapalPaymentMethod,
  normalizePesapalStatus,
  pesapalConfig,
  verifyPesapalPayment,
  _internal: {
    extractPesapalErrorDetails,
    extractPesapalErrorMessage,
    normalizePhone,
    splitName,
  },
};
