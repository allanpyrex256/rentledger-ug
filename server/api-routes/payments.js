const {
  autoReference,
  fail,
  isoDate,
  makeId,
  readBody,
  requireProfile,
  send,
  supabaseFetch,
} = require("../supabase-admin");

module.exports = async function handler(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return send(response, 204, {});

  try {
    if (request.method === "GET") return await listPayments(request, response);
    if (request.method === "POST") return await recordPayment(request, response);
    return send(response, 405, { error: "Method not allowed" });
  } catch (error) {
    return fail(response, error);
  }
};

async function listPayments(request, response) {
  await requireProfile(request);
  const authorization = bearerAuthorization(request);
  const query = new URL(request.url, "http://localhost").searchParams;
  const tenantId = String(query.get("tenant_id") || query.get("tenantId") || "").trim();
  const limit = clamp(Number(query.get("limit") || 50), 1, 100);
  const tenantFilter = tenantId ? `tenant_id=eq.${encodeURIComponent(tenantId)}&` : "";

  const payments = await supabaseFetch(
    `/rest/v1/payments?${tenantFilter}select=*&order=payment_date.desc,created_at.desc&limit=${limit}`,
    { service: false, authorization }
  );

  return send(response, 200, { payments });
}

async function recordPayment(request, response) {
  const { profile } = await requireProfile(request);
  const authorization = bearerAuthorization(request);
  const body = await readBody(request);
  const tenantId = String(body.tenant_id || body.tenantId || "").trim();
  const amount = Number(body.amount);
  const paymentMethod = String(body.payment_method || body.paymentMethod || "Mobile Money").trim() || "Mobile Money";
  const paymentDate = normalizePaymentDate(body.payment_date || body.paymentDate);
  const reference = String(body.reference || body.transaction_reference || body.transactionReference || "").trim();
  const paymentProof = normalizePaymentProof(body.payment_proof || body.paymentProof || body.proof || "");
  let verificationStatus = normalizeVerificationStatus(body.verification_status || body.verificationStatus || "Unverified");
  // Only super admins may set verification status via this API. Non-admins' submissions default to Unverified.
  if (String(profile.role || "").toLowerCase() !== "saas-owner") {
    verificationStatus = "Unverified";
  }
  const paymentId = String(body.id || body.payment_id || body.paymentId || "").trim() || makeId("payment");
  const receiptNumber = String(body.receipt_number || body.receiptNumber || "").trim() || generateReceiptNumber(paymentDate, paymentId);

  if (!tenantId) return send(response, 400, { error: "tenant_id is required." });
  if (!Number.isFinite(amount) || amount <= 0) {
    return send(response, 400, { error: "amount must be greater than 0." });
  }

  const tenant = await fetchTenant(tenantId, authorization);
  const balance = await balanceAfterPayment(tenant, paymentDate, amount, authorization);
  const payment = {
    id: paymentId,
    tenant_id: tenant.id,
    amount,
    payment_method: paymentMethod,
    payment_date: paymentDate,
    balance,
    reference: reference || autoReference(paymentMethod),
    receipt_number: receiptNumber,
    payment_proof: paymentProof,
    verification_status: verificationStatus,
  };

  const rows = await supabaseFetch("/rest/v1/payments", {
    method: "POST",
    service: false,
    authorization,
    prefer: "return=representation",
    body: [payment],
  });

  await createPaymentNotification({ profile, tenant, amount, paymentMethod, receiptNumber, authorization }).catch(() => null);
  return send(response, 201, { payment: rows[0] || payment });
}

async function fetchTenant(tenantId, authorization) {
  const rows = await supabaseFetch(`/rest/v1/tenants?id=eq.${encodeURIComponent(tenantId)}&select=*`, {
    service: false,
    authorization,
  });
  if (!rows[0]) {
    const error = new Error("Tenant not found or not available to this account.");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function balanceAfterPayment(tenant, paymentDate, amount, authorization) {
  const [monthStart, nextMonthStart] = monthRange(paymentDate);
  const rows = await supabaseFetch(
    `/rest/v1/payments?tenant_id=eq.${encodeURIComponent(tenant.id)}&payment_date=gte.${monthStart}&payment_date=lt.${nextMonthStart}&select=amount`,
    { service: false, authorization }
  );
  const existingPaid = rows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return Math.max(0, Number(tenant.rent_amount || 0) - existingPaid - amount);
}

async function createPaymentNotification({ profile, tenant, amount, paymentMethod, receiptNumber, authorization }) {
  return supabaseFetch("/rest/v1/notifications", {
    method: "POST",
    service: false,
    authorization,
    prefer: "return=minimal",
    body: [
      {
        id: makeId("notification"),
        user_id: profile.id,
        type: "payment",
        title: "Payment recorded",
        message: `${tenant.name} paid ${formatMoney(amount)} by ${paymentMethod}. Receipt ${receiptNumber}.`,
        read: false,
      },
    ],
  });
}

function bearerAuthorization(request) {
  const authorization = request.headers.authorization || request.headers.Authorization || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) {
    const error = new Error("Bearer token is required.");
    error.status = 401;
    throw error;
  }
  return authorization;
}

function normalizePaymentDate(value) {
  if (!value) return isoDate(new Date());
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && isValidDate(new Date(`${raw}T00:00:00Z`))) return raw;

  const parsed = new Date(raw);
  if (!isValidDate(parsed)) {
    const error = new Error("payment_date must be a valid date.");
    error.status = 400;
    throw error;
  }
  return isoDate(parsed);
}

function monthRange(paymentDate) {
  const date = new Date(`${paymentDate}T00:00:00Z`);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return [isoDate(start), isoDate(next)];
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizePaymentProof(value) {
  return String(value || "").trim().slice(0, 500);
}

function normalizeVerificationStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  const allowed = ["unverified", "verified", "disputed"];
  const resolved = allowed.includes(raw) ? raw : "unverified";
  return resolved[0].toUpperCase() + resolved.slice(1);
}

function formatMoney(value) {
  return `USh ${Number(value || 0).toLocaleString("en-UG")}`;
}

function generateReceiptNumber(paymentDate, seed = "") {
  const date = String(paymentDate || isoDate(new Date())).replace(/\D/g, "").slice(0, 8) || isoDate(new Date()).replace(/\D/g, "");
  const suffixSource = String(seed || `${Date.now()}${Math.random()}`).replace(/\D/g, "");
  const suffix = (suffixSource.slice(-6) || String(Math.floor(100000 + Math.random() * 900000))).padStart(6, "0");
  return `RL-${date}-${suffix}`;
}

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", apiCorsOrigin());
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function apiCorsOrigin() {
  if (process.env.API_CORS_ORIGIN) return process.env.API_CORS_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

module.exports._internal = {
  normalizePaymentProof,
  normalizeVerificationStatus,
  monthRange,
};
