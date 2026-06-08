const {
  PACKAGE_OPTIONS,
  addDays,
  addMonths,
  autoReference,
  createAuthUser,
  deleteAuthUser,
  deleteRows,
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
} = require("../supabase-admin");

const TRIAL_DAYS = 30;
const VERIFIED_BADGE_REQUEST_SUBJECT = "Verified badge request";
const VERIFIED_BADGE_APPROVAL_NOTE = "Verified badge approved directly by the super admin.";

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const { profile } = await requireAdmin(request);
    const body = await readBody(request);

    if (body.action === "create-demo-landlord") return await createDemoLandlord(response, profile);
    if (body.action === "toggle-status") return await toggleStatus(response, body.userId);
    if (body.action === "toggle-verified-badge") return await toggleVerifiedBadge(response, body.userId);
    if (body.action === "cycle-package") return await cyclePackage(response, body.ownerId);
    if (body.action === "end-trial") return await endTrial(response, body.ownerId);
    if (body.action === "activate-account") return await activateAccount(response, body.ownerId);
    if (body.action === "delete-account") return await deleteAccount(response, body.ownerId);
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
        listing_published: false,
        listing_bedrooms: 1,
        listing_bathrooms: 1,
        listing_furnished: false,
        listing_photo: "assets/apartment-exterior.jpg",
        listing_note: "Demo vacancy ready to publish after upgrading to Professional.",
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
        next_billing_date: addDays(today, TRIAL_DAYS),
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

async function toggleVerifiedBadge(response, userId) {
  if (!userId) return send(response, 400, { error: "User is required." });
  const rows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=*`);
  const user = rows[0];
  if (!user || user.role !== "landlord") return send(response, 404, { error: "Landlord not found." });

  const approvedRequests = await resolvedVerifiedBadgeRequestsForOwner(userId);
  const currentVerified = Boolean(user.verified_badge) || Boolean(user.verified) || Boolean(approvedRequests.length);
  const nextVerified = !currentVerified;
  const requests = await verifiedBadgeRequestsForOwner(userId);
  await patchRows(`app_users`, `id=eq.${encodeURIComponent(userId)}`, {
    verified_badge: nextVerified,
    verification_label: nextVerified ? "Verified" : null,
  });
  if (nextVerified) {
    if (requests.length) {
      await Promise.all(requests.map((request) => resolveVerifiedBadgeRequest(request.id)));
    } else if (!approvedRequests.length) {
      await createResolvedVerifiedBadgeRequest(userId);
    }
    await insertRows("notifications", [
      {
        id: makeId("notification"),
        user_id: userId,
        type: "support",
        title: "Verified badge approved",
        message: "The super admin approved your verified landlord badge.",
        read: false,
        created_at: new Date().toISOString(),
      },
    ]);
  } else {
    await Promise.all(
      approvedRequests.map((request) =>
        patchRows("support_tickets", `id=eq.${encodeURIComponent(request.id)}`, {
          status: "Open",
          updated_at: isoDate(new Date()),
        })
      )
    );
  }
  return send(response, 200, { verified_badge: nextVerified });
}

async function resolveVerifiedBadgeRequest(requestId) {
  return patchRows("support_tickets", `id=eq.${encodeURIComponent(requestId)}`, {
    status: "Resolved",
    admin_note: VERIFIED_BADGE_APPROVAL_NOTE,
    updated_at: isoDate(new Date()),
    resolved_at: new Date().toISOString(),
  });
}

async function createResolvedVerifiedBadgeRequest(ownerId) {
  const now = new Date().toISOString();
  return insertRows("support_tickets", [
    {
      id: makeId("ticket"),
      owner_id: ownerId,
      landlord_id: ownerId,
      subject: VERIFIED_BADGE_REQUEST_SUBJECT,
      description: VERIFIED_BADGE_APPROVAL_NOTE,
      priority: "High",
      status: "Resolved",
      note: VERIFIED_BADGE_APPROVAL_NOTE,
      admin_note: VERIFIED_BADGE_APPROVAL_NOTE,
      updated_at: isoDate(new Date()),
      resolved_at: now,
      created_at: now,
    },
  ]);
}

async function verifiedBadgeRequestsForOwner(ownerId) {
  return await supabaseFetch(
    `/rest/v1/support_tickets?owner_id=eq.${encodeURIComponent(ownerId)}&subject=eq.${encodeURIComponent(
      VERIFIED_BADGE_REQUEST_SUBJECT
    )}&status=neq.Resolved&select=id`
  );
}

async function resolvedVerifiedBadgeRequestsForOwner(ownerId) {
  return await supabaseFetch(
    `/rest/v1/support_tickets?owner_id=eq.${encodeURIComponent(ownerId)}&subject=eq.${encodeURIComponent(
      VERIFIED_BADGE_REQUEST_SUBJECT
    )}&status=eq.Resolved&select=id`
  );
}

async function cyclePackage(response, ownerId) {
  if (!ownerId) return send(response, 400, { error: "Owner is required." });

  const rows = await supabaseFetch(`/rest/v1/subscriptions?owner_id=eq.${encodeURIComponent(ownerId)}&select=*`);
  const subscription = rows[0];
  const currentIndex = Math.max(0, PACKAGE_OPTIONS.findIndex((option) => option.plan === subscription?.plan));
  const nextPackage = PACKAGE_OPTIONS[(currentIndex + 1) % PACKAGE_OPTIONS.length];
  const nextStatus = nextPackage.status === "Trial" ? "Trial" : isPaidSubscription(subscription) ? "Active" : "Pending";
  const today = isoDate(new Date());
  const nextBillingDate = nextPackage.status === "Trial" ? addDays(today, TRIAL_DAYS) : addMonths(today, 1);

  if (subscription) {
    await patchRows("subscriptions", `id=eq.${encodeURIComponent(subscription.id)}`, {
      plan: nextPackage.plan,
      monthly_fee: nextPackage.fee,
      status: nextStatus,
      next_billing_date: nextPackage.status === "Trial" ? nextBillingDate : subscription.next_billing_date || nextBillingDate,
    });
  } else {
    await insertRows("subscriptions", [
      {
        id: makeId("subscription"),
        owner_id: ownerId,
        plan: nextPackage.plan,
        monthly_fee: nextPackage.fee,
        status: nextStatus,
        last_payment_date: today,
        last_payment_method: "Manual",
        last_payment_note: "Package assigned by super admin",
        next_billing_date: nextBillingDate,
      },
    ]);
  }

  await patchRows("app_users", `id=eq.${encodeURIComponent(ownerId)}`, {
    account_status: nextStatus === "Trial" ? "Trial" : nextStatus === "Active" ? "Active" : "Pending",
  });
  return send(response, 200, { plan: nextPackage.plan });
}

function isPaidSubscription(subscription) {
  if (!subscription || Number(subscription.monthly_fee || 0) <= 0) return false;
  const status = String(subscription.status || "").trim();
  if (!["Active", "Cancelling"].includes(status)) return false;
  const paymentStatus = String(subscription.provider_payment_status || "").trim().toLowerCase();
  return ["successful", "manual", "paid", "completed"].includes(paymentStatus);
}

async function endTrial(response, ownerId) {
  if (!ownerId) return send(response, 400, { error: "Owner is required." });

  const ownerRows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(ownerId)}&select=*`);
  const owner = ownerRows[0];
  if (!owner || owner.role !== "landlord") return send(response, 404, { error: "Landlord not found." });

  const rows = await supabaseFetch(`/rest/v1/subscriptions?owner_id=eq.${encodeURIComponent(ownerId)}&select=*`);
  const subscription = rows[0];
  const paidPackage = paidPackageForEndedTrial(subscription);
  const today = isoDate(new Date());
  const promptMessage = `Your free trial has ended. Subscribe to ${paidPackage.plan} at ${formatCurrency(
    paidPackage.fee
  )}/month to keep using RentLedger UG.`;
  const subscriptionPatch = {
    plan: paidPackage.plan,
    monthly_fee: paidPackage.fee,
    status: "Pending",
    next_billing_date: today,
    grace_period_end: today,
    cancel_at_period_end: false,
    cancellation_requested_at: null,
    payment_provider: subscription?.payment_provider || process.env.PAYMENT_PROVIDER || "pesapal",
    provider_payment_status: "Subscription required",
    provider_next_action: "Trial ended. Subscribe to continue using RentLedger UG.",
    last_payment_method: subscription?.last_payment_method || subscription?.billing_method || "Trial",
    last_payment_note: "Trial ended by super admin. Subscription required.",
  };

  if (subscription) {
    await patchRows("subscriptions", `id=eq.${encodeURIComponent(subscription.id)}`, subscriptionPatch);
  } else {
    await insertRows("subscriptions", [
      {
        id: makeId("subscription"),
        owner_id: ownerId,
        last_payment_date: today,
        ...subscriptionPatch,
      },
    ]);
  }

  await patchRows("app_users", `id=eq.${encodeURIComponent(ownerId)}`, { account_status: "Pending" });
  await insertRows("notifications", [
    {
      id: makeId("notification"),
      user_id: ownerId,
      type: "billing",
      title: "Trial ended - subscription required",
      message: promptMessage,
      read: false,
      created_at: new Date().toISOString(),
    },
  ]);

  return send(response, 200, { plan: paidPackage.plan, monthly_fee: paidPackage.fee, status: "Pending" });
}

async function activateAccount(response, ownerId) {
  if (!ownerId) return send(response, 400, { error: "Owner is required." });

  const ownerRows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(ownerId)}&select=*`);
  const owner = ownerRows[0];
  if (!owner || owner.role !== "landlord") return send(response, 404, { error: "Landlord not found." });

  const rows = await supabaseFetch(`/rest/v1/subscriptions?owner_id=eq.${encodeURIComponent(ownerId)}&select=*`);
  const subscription = rows[0];
  const paidPackage = paidPackageForEndedTrial(subscription);
  if (!paidPackage) return send(response, 400, { error: "No paid package is available." });

  const today = isoDate(new Date());
  const activePlan = subscription?.plan && subscription.plan !== "Trial" ? subscription.plan : paidPackage.plan;
  const monthlyFee = PACKAGE_OPTIONS.find((option) => option.plan === activePlan)?.fee || Number(subscription?.monthly_fee || paidPackage.fee || 0);
  const nextBillingDate = addMonths(today, 1);
  const subscriptionPatch = {
    plan: activePlan,
    monthly_fee: monthlyFee,
    status: "Active",
    last_payment_date: today,
    last_payment_method: "Manual",
    last_payment_note: "Account activated manually by super admin after trial ended.",
    next_billing_date: nextBillingDate,
    grace_period_end: null,
    cancel_at_period_end: false,
    cancellation_requested_at: null,
    provider_payment_status: "Manual",
    provider_next_action: null,
  };

  if (subscription) {
    await patchRows("subscriptions", `id=eq.${encodeURIComponent(subscription.id)}`, subscriptionPatch);
  } else {
    await insertRows("subscriptions", [
      {
        id: makeId("subscription"),
        owner_id: ownerId,
        ...subscriptionPatch,
      },
    ]);
  }

  await patchRows("app_users", `id=eq.${encodeURIComponent(ownerId)}`, { account_status: "Active" });
  await insertRows("notifications", [
    {
      id: makeId("notification"),
      user_id: ownerId,
      type: "billing",
      title: "Subscription activated",
      message: `The super admin activated your ${activePlan} plan until ${nextBillingDate}.`,
      read: false,
      created_at: new Date().toISOString(),
    },
  ]);

  return send(response, 200, { plan: activePlan, monthly_fee: monthlyFee, status: "Active", next_billing_date: nextBillingDate });
}

async function deleteAccount(response, ownerId) {
  if (!ownerId) return send(response, 400, { error: "Owner is required." });

  const ownerRows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(ownerId)}&select=id,role`);
  const owner = ownerRows[0];
  if (!owner || owner.role !== "landlord") return send(response, 404, { error: "Landlord not found." });

  const staffRows = await supabaseFetch(
    `/rest/v1/app_users?company_owner_id=eq.${encodeURIComponent(ownerId)}&role=eq.staff&select=id`
  );
  const staffIds = staffRows.map((row) => row.id).filter(Boolean);
  const userIds = [ownerId, ...staffIds];

  const propertyRows = await supabaseFetch(`/rest/v1/properties?owner_id=eq.${encodeURIComponent(ownerId)}&select=id`);
  const propertyIds = propertyRows.map((row) => row.id).filter(Boolean);
  const unitRows = propertyIds.length
    ? await supabaseFetch(`/rest/v1/units?property_id=in.(${inList(propertyIds)})&select=id`)
    : [];
  const unitIds = unitRows.map((row) => row.id).filter(Boolean);
  const tenantRows = unitIds.length ? await supabaseFetch(`/rest/v1/tenants?unit_id=in.(${inList(unitIds)})&select=id`) : [];
  const tenantIds = tenantRows.map((row) => row.id).filter(Boolean);

  if (tenantIds.length) await deleteRows("payments", `tenant_id=in.(${inList(tenantIds)})`);
  if (propertyIds.length) await deleteRows("expenses", `property_id=in.(${inList(propertyIds)})`);
  await deleteRows("support_tickets", `owner_id=eq.${encodeURIComponent(ownerId)}`);
  if (userIds.length) await deleteRows("notifications", `user_id=in.(${inList(userIds)})`);
  if (tenantIds.length) await deleteRows("tenants", `id=in.(${inList(tenantIds)})`);
  if (unitIds.length) await deleteRows("units", `id=in.(${inList(unitIds)})`);
  if (propertyIds.length) await deleteRows("properties", `id=in.(${inList(propertyIds)})`);
  await deleteRows("subscriptions", `owner_id=eq.${encodeURIComponent(ownerId)}`);
  if (staffIds.length) await deleteRows("app_users", `id=in.(${inList(staffIds)})`);
  await deleteRows("app_users", `id=eq.${encodeURIComponent(ownerId)}`);

  await Promise.all(userIds.map((id) => deleteAuthUser(id).catch(() => null)));
  return send(response, 200, { ok: true, deleted_user_ids: userIds });
}

function paidPackageForEndedTrial(subscription) {
  return (
    PACKAGE_OPTIONS.find((option) => option.fee > 0 && option.plan === subscription?.plan) ||
    PACKAGE_OPTIONS.find((option) => option.plan === "Starter") ||
    PACKAGE_OPTIONS.find((option) => option.fee > 0)
  );
}

function formatCurrency(amount) {
  return `USh ${Number(amount || 0).toLocaleString("en-UG")}`;
}

function inList(values) {
  return values.map((value) => encodeURIComponent(String(value))).join(",");
}

async function sendReset(response, userId) {
  if (!userId) return send(response, 400, { error: "User is required." });
  const rows = await supabaseFetch(`/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=email`);
  const user = rows[0];
  if (!user?.email) return send(response, 404, { error: "User email not found." });
  await sendPasswordRecovery(user.email);
  return send(response, 200, { ok: true });
}
