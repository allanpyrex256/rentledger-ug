const {
  fail,
  planLimitForPlan,
  readBody,
  requireProfile,
  send,
  supabaseFetch,
  upsertRows,
} = require("../supabase-admin");

const STATE_TABLES = [
  { stateKey: "subscriptions", table: "subscriptions" },
  { stateKey: "properties", table: "properties" },
  { stateKey: "units", table: "units" },
  { stateKey: "tenants", table: "tenants" },
  { stateKey: "payments", table: "payments" },
  { stateKey: "expenses", table: "expenses" },
  { stateKey: "supportTickets", table: "support_tickets" },
  { stateKey: "notifications", table: "notifications" },
];

const DELETE_ORDER = ["notifications", "supportTickets", "expenses", "payments", "tenants", "units", "properties", "subscriptions"];
const SUPER_ADMIN_USER_ID = "user-saas-owner";

module.exports = async function handler(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return send(response, 204, {});
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const { profile } = await requireProfile(request);
    const body = await readBody(request);
    const snapshot = normalizeSnapshot(body.state || body);
    const context = await buildSyncContext(profile, snapshot);
    await enforcePlanLimits(profile, context);
    const rowsByKey = new Map();
    const deletedRowsByKey = normalizeDeletedRowIds(snapshot.deletedRowIds);

    for (const item of STATE_TABLES) {
      const rows = writableRowsForStateKey(item.stateKey, snapshot, profile, context).map((row) =>
        toSupabaseRow(item.stateKey, row, profile)
      );
      rowsByKey.set(item.stateKey, rows);
    }

    for (const stateKey of DELETE_ORDER) {
      const table = STATE_TABLES.find((item) => item.stateKey === stateKey)?.table;
      if (!table) continue;
      await deleteRequestedRows(table, stateKey, deletedRowsByKey[stateKey] || [], profile, context);
    }

    for (const item of STATE_TABLES) {
      const rows = rowsByKey.get(item.stateKey) || [];
      if (rows.length) await upsertRows(item.table, rows);
    }

    return send(response, 200, { ok: true });
  } catch (error) {
    return fail(response, error);
  }
};

async function enforcePlanLimits(profile, context) {
  if (profile.role !== "landlord") return;
  const rows = await supabaseFetch(`/rest/v1/subscriptions?owner_id=eq.${encodeURIComponent(profile.id)}&select=plan`);
  const limits = planLimitForPlan(rows[0]?.plan || "Trial");
  if (context.propertyIds.size > limits.properties) {
    const error = new Error(`Your plan allows ${limitLabel(limits.properties)} properties. Upgrade before adding more.`);
    error.status = 403;
    throw error;
  }
  if (context.unitIds.size > limits.units) {
    const error = new Error(`Your plan allows ${limitLabel(limits.units)} units. Upgrade before adding more.`);
    error.status = 403;
    throw error;
  }
}

function limitLabel(value) {
  return Number.isFinite(value) ? String(value) : "unlimited";
}

function normalizeSnapshot(value) {
  const state = value && typeof value === "object" ? value : {};
  return {
    properties: Array.isArray(state.properties) ? state.properties : [],
    subscriptions: Array.isArray(state.subscriptions) ? state.subscriptions : [],
    units: Array.isArray(state.units) ? state.units : [],
    tenants: Array.isArray(state.tenants) ? state.tenants : [],
    payments: Array.isArray(state.payments) ? state.payments : [],
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    supportTickets: Array.isArray(state.supportTickets) ? state.supportTickets : [],
    notifications: Array.isArray(state.notifications) ? state.notifications : [],
    deletedRowIds: normalizeDeletedRowIds(state.deletedRowIds),
  };
}

async function buildSyncContext(profile, snapshot) {
  const ownedPropertyIds =
    profile.role === "staff"
      ? new Set(profile.assigned_property_ids || [])
      : new Set(snapshot.properties.filter((property) => property.owner_id === profile.id).map((property) => property.id));

  if (profile.role === "landlord") {
    const remoteProperties = await supabaseFetch(`/rest/v1/properties?owner_id=eq.${encodeURIComponent(profile.id)}&select=id`);
    remoteProperties.forEach((property) => ownedPropertyIds.add(property.id));
  }

  const unitIds = new Set(snapshot.units.filter((unit) => ownedPropertyIds.has(unit.property_id)).map((unit) => unit.id));
  const remoteUnits = ownedPropertyIds.size
    ? await supabaseFetch(`/rest/v1/units?property_id=in.(${listValues([...ownedPropertyIds])})&select=id`)
    : [];
  remoteUnits.forEach((unit) => unitIds.add(unit.id));

  const tenantIds = new Set(snapshot.tenants.filter((tenant) => unitIds.has(tenant.unit_id)).map((tenant) => tenant.id));
  const remoteTenants = unitIds.size
    ? await supabaseFetch(`/rest/v1/tenants?unit_id=in.(${listValues([...unitIds])})&select=id`)
    : [];
  remoteTenants.forEach((tenant) => tenantIds.add(tenant.id));

  return { propertyIds: ownedPropertyIds, unitIds, tenantIds };
}

function writableRowsForStateKey(stateKey, snapshot, profile, context) {
  if (profile.role === "staff") {
    if (stateKey === "tenants") return snapshot.tenants.filter((row) => context.unitIds.has(row.unit_id));
    if (stateKey === "payments") return snapshot.payments.filter((row) => context.tenantIds.has(row.tenant_id));
    if (stateKey === "notifications") return snapshot.notifications.filter((row) => row.user_id === profile.id);
    return [];
  }
  if (profile.role === "saas-owner") {
    if (stateKey === "subscriptions") return snapshot.subscriptions;
    if (stateKey === "supportTickets") return snapshot.supportTickets;
    if (stateKey === "notifications") return snapshot.notifications;
    return [];
  }
  if (profile.role !== "landlord") return [];

  if (stateKey === "properties") return snapshot.properties.filter((row) => row.owner_id === profile.id);
  if (stateKey === "units") return snapshot.units.filter((row) => context.propertyIds.has(row.property_id));
  if (stateKey === "tenants") return snapshot.tenants.filter((row) => context.unitIds.has(row.unit_id));
  if (stateKey === "payments") return snapshot.payments.filter((row) => context.tenantIds.has(row.tenant_id));
  if (stateKey === "expenses") return snapshot.expenses.filter((row) => context.propertyIds.has(row.property_id));
  if (stateKey === "supportTickets") return snapshot.supportTickets.filter((row) => row.owner_id === profile.id);
  if (stateKey === "notifications") {
    return snapshot.notifications.filter((row) => row.user_id === profile.id || isSuperAdminSupportNotification(row));
  }
  return [];
}

async function deleteRequestedRows(table, stateKey, deleteIds, profile, context) {
  if (!deleteIds.length) return;
  const remoteIds = await remoteIdsForStateKey(table, stateKey, profile, context);
  if (!remoteIds.length) return;
  const allowedIds = new Set(remoteIds);
  const scopedDeleteIds = deleteIds.filter((id) => allowedIds.has(id));
  if (!scopedDeleteIds.length) return;
  await supabaseFetch(`/rest/v1/${table}?id=in.(${listValues(scopedDeleteIds)})`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

function normalizeDeletedRowIds(value = {}) {
  const stateKeys = STATE_TABLES.map((item) => item.stateKey);
  return stateKeys.reduce((result, key) => {
    const ids = Array.isArray(value[key]) ? value[key].filter(Boolean) : [];
    if (ids.length) result[key] = [...new Set(ids)];
    return result;
  }, {});
}

async function remoteIdsForStateKey(table, stateKey, profile, context) {
  if (stateKey === "properties") {
    if (profile.role !== "landlord") return [];
    return selectIds(table, `owner_id=eq.${encodeURIComponent(profile.id)}`);
  }
  if (stateKey === "subscriptions") {
    if (profile.role === "saas-owner") return selectIds(table, "");
    return [];
  }
  if (stateKey === "units") {
    if (!context.propertyIds.size) return [];
    return selectIds(table, `property_id=in.(${listValues([...context.propertyIds])})`);
  }
  if (stateKey === "tenants") {
    if (!context.unitIds.size) return [];
    return selectIds(table, `unit_id=in.(${listValues([...context.unitIds])})`);
  }
  if (stateKey === "payments") {
    if (!context.tenantIds.size) return [];
    return selectIds(table, `tenant_id=in.(${listValues([...context.tenantIds])})`);
  }
  if (stateKey === "expenses") {
    if (!context.propertyIds.size) return [];
    return selectIds(table, `property_id=in.(${listValues([...context.propertyIds])})`);
  }
  if (stateKey === "supportTickets") {
    if (profile.role === "saas-owner") return selectIds(table, "");
    return selectIds(table, `owner_id=eq.${encodeURIComponent(profile.id)}`);
  }
  if (stateKey === "notifications") {
    if (profile.role === "saas-owner") return selectIds(table, "");
    return selectIds(table, `user_id=eq.${encodeURIComponent(profile.id)}`);
  }
  return [];
}

async function selectIds(table, filter) {
  const prefix = filter ? `${filter}&` : "";
  const rows = await supabaseFetch(`/rest/v1/${table}?${prefix}select=id`);
  return rows.map((row) => row.id).filter(Boolean);
}

function isSuperAdminSupportNotification(row) {
  return row?.user_id === SUPER_ADMIN_USER_ID && row?.type === "support";
}

function toSupabaseRow(stateKey, row, profile) {
  if (stateKey === "subscriptions") {
    return pick(row, [
      "id",
      "owner_id",
      "plan",
      "monthly_fee",
      "status",
      "last_payment_date",
      "last_payment_method",
      "last_payment_note",
      "next_billing_date",
      "billing_method",
      "billing_contact_masked",
      "auto_collect_authorized",
      "cancel_at_period_end",
      "cancellation_requested_at",
      "grace_period_end",
      "payment_provider",
      "provider_payment_reference",
      "provider_payment_status",
      "provider_checkout_url",
      "provider_charge_id",
      "provider_customer_id",
      "provider_payment_method_id",
      "provider_next_action",
    ]);
  }
  if (stateKey === "properties") {
    return pick({ ...row, owner_id: profile.id }, ["id", "owner_id", "property_name", "location", "property_type"]);
  }
  if (stateKey === "units") {
    return pick(row, [
      "id",
      "property_id",
      "unit_number",
      "rent_amount",
      "status",
      "listing_published",
      "listing_bedrooms",
      "listing_bathrooms",
      "listing_furnished",
      "listing_photo",
      "listing_note",
    ]);
  }
  if (stateKey === "tenants") {
    return pick(row, [
      "id",
      "unit_id",
      "name",
      "phone",
      "national_id",
      "rent_amount",
      "deposit_paid",
      "move_in_date",
      "status",
      "move_out_date",
      "move_out_balance",
      "move_out_damages",
      "move_out_refund",
      "move_out_note",
    ]);
  }
  if (stateKey === "payments") {
    return pick(row, [
      "id",
      "tenant_id",
      "amount",
      "payment_method",
      "payment_date",
      "balance",
      "reference",
      "receipt_number",
      "payment_proof",
      "verification_status",
    ]);
  }
  if (stateKey === "expenses") return pick(row, ["id", "property_id", "type", "amount", "date"]);
  if (stateKey === "supportTickets") return pick(row, ["id", "owner_id", "subject", "priority", "status", "note", "updated_at"]);
  if (stateKey === "notifications") return pick(row, ["id", "user_id", "type", "title", "message", "read", "created_at"]);
  return row;
}

function pick(row, keys) {
  return keys.reduce((result, key) => {
    if (row[key] !== undefined) result[key] = row[key];
    return result;
  }, {});
}

function listValues(values) {
  return values.map((value) => encodeURIComponent(String(value))).join(",");
}

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", apiCorsOrigin());
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function apiCorsOrigin() {
  if (process.env.API_CORS_ORIGIN) return process.env.API_CORS_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
