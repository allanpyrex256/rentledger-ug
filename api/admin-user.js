const {
  PACKAGE_OPTIONS,
  addMonths,
  autoReference,
  createAuthUser,
  deleteAuthUser,
  fail,
  insertRows,
  isoDate,
  makeId,
  patchRows,
  readBody,
  requireAdmin,
  send,
  sendPasswordRecovery,
  supabaseFetch,
} = require("../server/supabase-admin");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const { profile } = await requireAdmin(request);
    const body = await readBody(request);

    if (body.action === "create-demo-landlord") return await createDemoLandlord(response, profile);
    if (body.action === "toggle-status") return await toggleStatus(response, body.userId);
    if (body.action === "cycle-package") return await cyclePackage(response, body.ownerId);
    if (body.action === "password-reset") return await sendReset(response, body.userId);

    return send(response, 400, { error: "Unknown admin action." });
  } catch (error) {
    return fail(response, error);
  }
};

async function createDemoLandlord(response, adminProfile) {
  const today = isoDate(new Date());
  const demoNumber = Date.now();
  const email = `demo.landlord.${demoNumber}@rentledger.ug`;
  const password = `Demo${Math.floor(100000 + Math.random() * 900000)}!`;
  const authUser = await createAuthUser({
    email,
    password,
    name: "Demo Landlord",
    phone: `0799${String(demoNumber).slice(-6)}`,
    role: "landlord",
  });

  const propertyId = makeId("property");
  const occupiedUnitId = makeId("unit");
  const vacantUnitId = makeId("unit");
  const tenantId = makeId("tenant");
  const paymentId = makeId("payment");

  try {
    await insertRows("app_users", [
      {
        id: authUser.id,
        name: `Demo Landlord ${String(demoNumber).slice(-4)}`,
        phone: `0799${String(demoNumber).slice(-6)}`,
        email,
        creator_email: adminProfile.email,
        platform_owner_id: adminProfile.id,
        role: "landlord",
        account_status: "Trial",
        company_owner_id: null,
        assigned_property_ids: [],
        invitation_status: null,
        created_at: new Date().toISOString(),
      },
    ]);

    await insertRows("properties", [
      {
        id: propertyId,
        property_name: "Demo Estate",
        location: "Kampala",
        property_type: "Rooms",
        owner_id: authUser.id,
      },
    ]);
    await insertRows("units", [
      { id: occupiedUnitId, property_id: propertyId, unit_number: "A1", rent_amount: 650000, status: "occupied" },
      {
        id: vacantUnitId,
        property_id: propertyId,
        unit_number: "A2",
        rent_amount: 650000,
        status: "vacant",
        listing_published: true,
        listing_bedrooms: 1,
        listing_bathrooms: 1,
        listing_furnished: false,
        listing_photo: "assets/apartment-exterior.jpg",
        listing_note: "Demo vacancy published from the owner dashboard.",
      },
    ]);
    await insertRows("tenants", [
      {
        id: tenantId,
        unit_id: occupiedUnitId,
        name: "Demo Tenant",
        phone: "0770000001",
        national_id: "DEMO-001",
        rent_amount: 650000,
        deposit_paid: 650000,
        move_in_date: today,
      },
    ]);
    await insertRows("payments", [
      {
        id: paymentId,
        tenant_id: tenantId,
        amount: 650000,
        payment_method: "MTN MoMo",
        payment_date: today,
        balance: 0,
        reference: autoReference("MTN MoMo"),
        receipt_number: generateReceiptNumber(today, paymentId),
      },
    ]);
    await insertRows("subscriptions", [
      {
        id: makeId("subscription"),
        owner_id: authUser.id,
        plan: "Trial",
        monthly_fee: 0,
        status: "Trial",
        last_payment_date: today,
        last_payment_method: "Trial",
        last_payment_note: "Demo trial account created by super admin",
        next_billing_date: addMonths(today, 1),
      },
    ]);
  } catch (error) {
    await deleteAuthUser(authUser.id).catch(() => null);
    throw error;
  }

  return send(response, 200, { email, temporaryPassword: password });
}

function generateReceiptNumber(paymentDate, seed = "") {
  const date = String(paymentDate || isoDate(new Date())).replace(/\D/g, "").slice(0, 8) || isoDate(new Date()).replace(/\D/g, "");
  const suffixSource = String(seed || `${Date.now()}${Math.random()}`).replace(/\D/g, "");
  const suffix = (suffixSource.slice(-6) || String(Math.floor(100000 + Math.random() * 900000))).padStart(6, "0");
  return `RL-${date}-${suffix}`;
}

async function toggleStatus(response, userId) {
  if (!userId) return send(response, 400, { error: "User is required." });
  const rows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=*`);
  const user = rows[0];
  if (!user || user.role !== "landlord") return send(response, 404, { error: "Landlord not found." });

  const nextStatus = user.account_status === "Suspended" || user.account_status === "Inactive" ? "Active" : "Suspended";
  await patchRows(`app_users`, `id=eq.${encodeURIComponent(userId)}`, { account_status: nextStatus });
  return send(response, 200, { account_status: nextStatus });
}

async function cyclePackage(response, ownerId) {
  if (!ownerId) return send(response, 400, { error: "Owner is required." });

  const rows = await supabaseFetch(`/rest/v1/subscriptions?owner_id=eq.${encodeURIComponent(ownerId)}&select=*`);
  const subscription = rows[0];
  const currentIndex = Math.max(0, PACKAGE_OPTIONS.findIndex((option) => option.plan === subscription?.plan));
  const nextPackage = PACKAGE_OPTIONS[(currentIndex + 1) % PACKAGE_OPTIONS.length];
  const today = isoDate(new Date());

  if (subscription) {
    await patchRows("subscriptions", `id=eq.${encodeURIComponent(subscription.id)}`, {
      plan: nextPackage.plan,
      monthly_fee: nextPackage.fee,
      status: nextPackage.status,
      next_billing_date: subscription.next_billing_date || addMonths(today, 1),
    });
  } else {
    await insertRows("subscriptions", [
      {
        id: makeId("subscription"),
        owner_id: ownerId,
        plan: nextPackage.plan,
        monthly_fee: nextPackage.fee,
        status: nextPackage.status,
        last_payment_date: today,
        last_payment_method: "Manual",
        last_payment_note: "Package assigned by super admin",
        next_billing_date: addMonths(today, 1),
      },
    ]);
  }

  await patchRows("app_users", `id=eq.${encodeURIComponent(ownerId)}`, {
    account_status: nextPackage.status === "Trial" ? "Trial" : "Active",
  });
  return send(response, 200, { plan: nextPackage.plan });
}

async function sendReset(response, userId) {
  if (!userId) return send(response, 400, { error: "User is required." });
  const rows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=email`);
  const user = rows[0];
  if (!user?.email) return send(response, 404, { error: "User email not found." });
  await sendPasswordRecovery(user.email);
  return send(response, 200, { ok: true });
}
