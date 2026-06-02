const PACKAGE_OPTIONS = [
  { plan: "Trial", fee: 0, status: "Trial" },
  { plan: "Starter", fee: 50000, status: "Active" },
  { plan: "Professional", fee: 120000, status: "Active" },
  { plan: "Enterprise", fee: 250000, status: "Active" },
];

const PLAN_LIMITS = {
  Trial: { properties: 1, units: 5, caretakers: 0, publicListings: false },
  Starter: { properties: 1, units: 20, caretakers: 1, publicListings: false },
  Professional: { properties: 5, units: 100, caretakers: 10, publicListings: true },
  Enterprise: {
    properties: Number.POSITIVE_INFINITY,
    units: Number.POSITIVE_INFINITY,
    caretakers: Number.POSITIVE_INFINITY,
    publicListings: true,
  },
};

function planLimitForPlan(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.Trial;
}

function planCanPublishPublicListings(plan) {
  return Boolean(planLimitForPlan(plan).publicListings);
}

function env() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  return { url: url.replace(/\/$/, ""), anonKey, serviceRoleKey };
}

function assertServerSupabase() {
  const config = env();
  if (!config.url || !config.anonKey || !config.serviceRoleKey) {
    const error = new Error("Supabase server credentials are not configured.");
    error.status = 500;
    throw error;
  }
  return config;
}

async function readBody(request) {
  if (typeof request.body === "string") return request.body ? JSON.parse(request.body) : {};
  if (request.body && typeof request.body === "object") return request.body;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function send(response, status, payload) {
  response.status(status).json(payload);
}

function fail(response, error) {
  const payload = { error: error.message || "Server error" };
  if (error.provider) payload.provider = error.provider;
  if (error.code) payload.code = error.code;
  if (error.details) payload.details = error.details;
  send(response, error.status || 500, payload);
}

function requireFields(body, fields) {
  fields.forEach((field) => {
    if (!String(body[field] || "").trim()) {
      const error = new Error(`${field} is required.`);
      error.status = 400;
      throw error;
    }
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("256")) return `0${digits.slice(3)}`;
  return digits;
}

function phoneVariants(value) {
  const local = normalizePhone(value);
  const international = local.startsWith("0") ? `256${local.slice(1)}` : local;
  const variants = new Set([String(value || "").trim(), local, international]);
  if (international) variants.add(`+${international}`);
  return [...variants].filter(Boolean);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(dateString, count) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setMonth(date.getMonth() + count);
  return isoDate(date);
}

function addDays(dateString, count) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + count);
  return isoDate(date);
}

function autoReference(method) {
  const prefix = String(method || "PAY")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();
  return `${prefix || "PAY"}-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function supabaseFetch(path, options = {}) {
  const config = assertServerSupabase();
  const key = options.service === false ? config.anonKey : config.serviceRoleKey;
  const response = await fetch(`${config.url}${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: options.apikey || key,
      Authorization: options.authorization || `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.msg || payload?.message || payload?.error_description || "Supabase request failed.");
    error.status = response.status >= 500 ? 502 : response.status;
    throw error;
  }
  return payload;
}

async function authUserFromRequest(request) {
  const config = assertServerSupabase();
  const authorization = request.headers.authorization || request.headers.Authorization || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) {
    const error = new Error("Sign in required.");
    error.status = 401;
    throw error;
  }
  const payload = await supabaseFetch("/auth/v1/user", {
    service: false,
    apikey: config.anonKey,
    authorization: `Bearer ${token}`,
  });
  const user = payload.user || payload;
  if (!user?.id) {
    const error = new Error("Invalid auth session.");
    error.status = 401;
    throw error;
  }
  return user;
}

async function getProfile(userId) {
  const rows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=*`);
  return rows[0] || null;
}

async function requireProfile(request) {
  const authUser = await authUserFromRequest(request);
  const profile = await getProfile(authUser.id);
  if (!profile || profile.account_status === "Suspended") {
    const error = new Error("Account is not active.");
    error.status = 403;
    throw error;
  }
  return { authUser, profile };
}

async function requireAdmin(request) {
  const context = await requireProfile(request);
  if (context.profile.role !== "saas-owner") {
    const error = new Error("Super admin access required.");
    error.status = 403;
    throw error;
  }
  return context;
}

async function createAuthUser({ email, password, name, phone, role }) {
  const payload = await supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email: normalizeEmail(email),
      password,
      email_confirm: true,
      user_metadata: { name, phone, role },
    },
  });
  const user = payload.user || payload;
  if (!user?.id) {
    const error = new Error("Supabase Auth did not return a user id.");
    error.status = 502;
    throw error;
  }
  return user;
}

async function deleteAuthUser(id) {
  return supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function insertRows(table, rows) {
  return supabaseFetch(`/rest/v1/${table}`, {
    method: "POST",
    prefer: "return=representation",
    body: rows,
  });
}

async function upsertRows(table, rows, conflictColumn = "id") {
  return supabaseFetch(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumn)}`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: rows,
  });
}

async function patchRows(table, query, values) {
  return supabaseFetch(`/rest/v1/${table}?${query}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: values,
  });
}

async function deleteRows(table, query) {
  return supabaseFetch(`/rest/v1/${table}?${query}`, { method: "DELETE" });
}

async function findUserByEmailOrPhone({ email, phone }) {
  if (email) {
    const rows = await supabaseFetch(`/rest/v1/app_users?email=eq.${encodeURIComponent(normalizeEmail(email))}&select=*`);
    if (rows[0]) return rows[0];
  }
  const variants = phoneVariants(phone);
  for (const variant of variants) {
    const rows = await supabaseFetch(`/rest/v1/app_users?phone=eq.${encodeURIComponent(variant)}&select=*`);
    if (rows[0]) return rows[0];
  }
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) {
    const rows = await supabaseFetch("/rest/v1/app_users?select=*");
    return rows.find((row) => normalizePhone(row.phone) === normalizedPhone) || null;
  }
  return null;
}

async function sendPasswordRecovery(email) {
  const config = assertServerSupabase();
  return supabaseFetch("/auth/v1/recover", {
    method: "POST",
    service: false,
    apikey: config.anonKey,
    authorization: `Bearer ${config.anonKey}`,
    body: { email: normalizeEmail(email) },
  });
}

module.exports = {
  PACKAGE_OPTIONS,
  PLAN_LIMITS,
  addDays,
  addMonths,
  autoReference,
  authUserFromRequest,
  createAuthUser,
  deleteAuthUser,
  deleteRows,
  fail,
  findUserByEmailOrPhone,
  getProfile,
  insertRows,
  isoDate,
  makeId,
  normalizeEmail,
  phoneVariants,
  planCanPublishPublicListings,
  planLimitForPlan,
  patchRows,
  readBody,
  requireAdmin,
  requireFields,
  requireProfile,
  send,
  sendPasswordRecovery,
  supabaseFetch,
  upsertRows,
};
