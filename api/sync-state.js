const {
  fail,
  readBody,
  requireProfile,
  send,
  supabaseFetch,
  upsertRows,
} = require("../server/supabase-admin");

const STATE_TABLES = [
  { stateKey: "properties", table: "properties" },
  { stateKey: "units", table: "units" },
  { stateKey: "tenants", table: "tenants" },
  { stateKey: "payments", table: "payments" },
  { stateKey: "expenses", table: "expenses" },
  { stateKey: "supportTickets", table: "support_tickets" },
  { stateKey: "notifications", table: "notifications" },
];

const DELETE_ORDER = ["notifications", "supportTickets", "expenses", "payments", "tenants", "units", "properties"];
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
    const rowsByKey = new Map();

    for (const item of STATE_TABLES) {
      const rows = writableRowsForStateKey(item.stateKey, snapshot, profile, context).map((row) =>
        toSupabaseRow(item.stateKey, row, profile)
      );
      rowsByKey.set(item.stateKey, rows);
    }

    for (const stateKey of DELETE_ORDER) {
      const table = STATE_TABLES.find((item) => item.stateKey === stateKey)?.table;
      if (!table) continue;
      await deleteRemovedRows(table, stateKey, rowsByKey.get(stateKey) || [], profile, context);
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

function normalizeSnapshot(value) {
  const state = value && typeof value === "object" ? value : {};
  return {
    properties: Array.isArray(state.properties) ? state.properties : [],
    units: Array.isArray(state.units) ? state.units : [],
    tenants: Array.isArray(state.tenants) ? state.tenants : [],
    payments: Array.isArray(state.payments) ? state.payments : [],
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    supportTickets: Array.isArray(state.supportTickets) ? state.supportTickets : [],
    notifications: Array.isArray(state.notifications) ? state.notifications : [],
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

async function deleteRemovedRows(table, stateKey, keepRows, profile, context) {
  const remoteIds = await remoteIdsForStateKey(table, stateKey, profile, context);
  if (!remoteIds.length) return;
  const keepIds = new Set(keepRows.map((row) => row.id));
  const staleIds = remoteIds.filter((id) => !keepIds.has(id));
  if (!staleIds.length) return;
  await supabaseFetch(`/rest/v1/${table}?id=in.(${listValues(staleIds)})`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

async function remoteIdsForStateKey(table, stateKey, profile, context) {
  if (stateKey === "properties") {
    if (profile.role !== "landlord") return [];
    return selectIds(table, `owner_id=eq.${encodeURIComponent(profile.id)}`);
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
    return pick(row, ["id", "unit_id", "name", "phone", "national_id", "rent_amount", "deposit_paid", "move_in_date"]);
  }
  if (stateKey === "payments") {
    return pick(row, ["id", "tenant_id", "amount", "payment_method", "payment_date", "balance", "reference", "receipt_number"]);
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
  response.setHeader("Access-Control-Allow-Origin", process.env.API_CORS_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
