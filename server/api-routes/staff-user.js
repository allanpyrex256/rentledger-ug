const {
  createAuthUser,
  deleteAuthUser,
  deleteRows,
  fail,
  findUserByEmailOrPhone,
  insertRows,
  normalizeEmail,
  planLimitForPlan,
  readBody,
  requireFields,
  requireProfile,
  send,
  supabaseFetch,
} = require("../supabase-admin");

module.exports = async function handler(request, response) {
  try {
    if (request.method === "POST") return await createStaff(request, response);
    if (request.method === "DELETE") return await removeStaff(request, response);
    return send(response, 405, { error: "Method not allowed" });
  } catch (error) {
    return fail(response, error);
  }
};

async function createStaff(request, response) {
  const { profile } = await requireProfile(request);
  if (profile.role !== "landlord") return send(response, 403, { error: "Only landlord admins can create caretaker logins." });

  const body = await readBody(request);
  requireFields(body, ["name", "phone", "email", "password"]);

  if (String(body.password).length < 8) {
    return send(response, 400, { error: "Use a password with at least 8 characters." });
  }

  const assignedPropertyIds = Array.isArray(body.assigned_property_ids) ? body.assigned_property_ids.filter(Boolean) : [];
  if (!assignedPropertyIds.length) return send(response, 400, { error: "Assign at least one property." });

  const ownedProperties = await supabaseFetch(
    `/rest/v1/properties?owner_id=eq.${encodeURIComponent(profile.id)}&select=id`
  );
  const ownedIds = new Set(ownedProperties.map((property) => property.id));
  if (assignedPropertyIds.some((id) => !ownedIds.has(id))) {
    return send(response, 403, { error: "Assigned properties must belong to your account." });
  }

  const limit = await staffLimitForOwner(profile.id);
  const existingStaff = await supabaseFetch(
    `/rest/v1/app_users?company_owner_id=eq.${encodeURIComponent(profile.id)}&role=eq.staff&select=id`
  );
  if (existingStaff.length >= limit.max) {
    return send(response, 403, { error: limit.message });
  }

  const email = normalizeEmail(body.email);
  const existing = await findUserByEmailOrPhone({ email, phone: body.phone });
  if (existing) return send(response, 409, { error: "That phone or email already has an account." });

  const authUser = await createAuthUser({
    email,
    password: body.password,
    name: body.name,
    phone: body.phone,
    role: "staff",
  });

  const user = {
    id: authUser.id,
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    email,
    creator_email: profile.email || "",
    platform_owner_id: profile.platform_owner_id || null,
    role: "staff",
    account_status: "Active",
    company_owner_id: profile.id,
    assigned_property_ids: assignedPropertyIds,
    invitation_status: "Login Created",
    created_at: new Date().toISOString(),
  };

  try {
    await insertRows("app_users", [user]);
  } catch (error) {
    await deleteAuthUser(authUser.id).catch(() => null);
    throw error;
  }
  return send(response, 200, { user });
}

async function staffLimitForOwner(ownerId) {
  const rows = await supabaseFetch(`/rest/v1/subscriptions?owner_id=eq.${encodeURIComponent(ownerId)}&select=plan,status`);
  const plan = String(rows[0]?.plan || "Trial");
  const limit = planLimitForPlan(plan);
  if (plan === "Starter") {
    return {
      max: limit.caretakers,
      message: "Starter plan includes 1 caretaker account. Upgrade to Professional to add more caretakers.",
    };
  }
  if (plan === "Trial") {
    return {
      max: limit.caretakers,
      message: "Upgrade to Starter or Professional before inviting caretaker accounts.",
    };
  }
  return { max: limit.caretakers, message: "" };
}

async function removeStaff(request, response) {
  const { profile } = await requireProfile(request);
  if (profile.role !== "landlord") return send(response, 403, { error: "Only landlord admins can remove caretaker logins." });

  const body = await readBody(request);
  const userId = String(body.userId || "");
  if (!userId) return send(response, 400, { error: "Caretaker user is required." });

  const rows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=*`);
  const staff = rows[0];
  if (!staff || staff.role !== "staff" || staff.company_owner_id !== profile.id) {
    return send(response, 404, { error: "Caretaker user not found." });
  }

  await deleteRows("app_users", `id=eq.${encodeURIComponent(userId)}`);
  await deleteAuthUser(userId);
  return send(response, 200, { ok: true });
}
