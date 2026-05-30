const {
  fail,
  readBody,
  requireProfile,
  send,
  supabaseFetch,
} = require("../server/supabase-admin");

module.exports = async function handler(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return send(response, 204, {});
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const { profile } = await requireProfile(request);
    const body = await readBody(request);
    const tenantId = String(body.tenant_id || body.tenantId || "").trim();
    const message = String(body.message || "").trim();

    if (!tenantId) return send(response, 400, { error: "tenant_id is required." });
    if (!message) return send(response, 400, { error: "message is required." });
    if (message.length > 4096) return send(response, 400, { error: "WhatsApp messages must be 4096 characters or fewer." });

    const context = await tenantContext(tenantId);
    if (!canContactTenant(profile, context.property)) {
      return send(response, 403, { error: "You can only message tenants in your assigned properties." });
    }

    const payload = await sendWhatsAppText({
      phone: context.tenant.phone,
      message,
    });

    return send(response, 200, {
      ok: true,
      message_id: payload?.messages?.[0]?.id || null,
      contact: payload?.contacts?.[0] || null,
    });
  } catch (error) {
    return fail(response, error);
  }
};

async function tenantContext(tenantId) {
  const tenants = await supabaseFetch(`/rest/v1/tenants?id=eq.${encodeURIComponent(tenantId)}&select=*`);
  const tenant = tenants[0];
  if (!tenant) {
    const error = new Error("Tenant not found.");
    error.status = 404;
    throw error;
  }

  const units = await supabaseFetch(`/rest/v1/units?id=eq.${encodeURIComponent(tenant.unit_id)}&select=*`);
  const unit = units[0];
  const properties = unit
    ? await supabaseFetch(`/rest/v1/properties?id=eq.${encodeURIComponent(unit.property_id)}&select=*`)
    : [];
  const property = properties[0];
  if (!unit || !property) {
    const error = new Error("Tenant property was not found.");
    error.status = 404;
    throw error;
  }

  return { tenant, unit, property };
}

function canContactTenant(profile, property) {
  if (profile.role === "saas-owner") return true;
  if (profile.role === "landlord") return property.owner_id === profile.id;
  if (profile.role === "staff") {
    const assigned = new Set(Array.isArray(profile.assigned_property_ids) ? profile.assigned_property_ids : []);
    return property.owner_id === profile.company_owner_id && assigned.has(property.id);
  }
  return false;
}

async function sendWhatsAppText({ phone, message }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v25.0";

  if (!accessToken || !phoneNumberId) {
    const error = new Error("WhatsApp API is not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel.");
    error.status = 501;
    throw error;
  }

  const result = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizeWhatsAppPhone(phone),
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  const text = await result.text();
  const payload = text ? JSON.parse(text) : {};
  if (!result.ok) {
    const error = new Error(payload?.error?.message || "WhatsApp API request failed.");
    error.status = result.status >= 500 ? 502 : result.status;
    throw error;
  }
  return payload;
}

function normalizeWhatsAppPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0")) return `256${digits.slice(1)}`;
  return digits;
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
