const {
  PACKAGE_OPTIONS,
  addMonths,
  createAuthUser,
  deleteAuthUser,
  fail,
  findUserByEmailOrPhone,
  insertRows,
  isoDate,
  normalizeEmail,
  readBody,
  requireFields,
  send,
} = require("../server/supabase-admin");

const SIGNUP_PAYMENT_METHODS = ["MTN MoMo", "Airtel Money", "Visa / Mastercard"];

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return send(response, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readBody(request);
    requireFields(body, ["name", "phone", "email", "password"]);

    if (String(body.password).length < 8) {
      return send(response, 400, { error: "Use a password with at least 8 characters." });
    }

    const selectedPlan = normalizeSignupPlan(body.plan || body.selectedPlan);
    const planOption = signupPlanOption(selectedPlan);
    if (!planOption) {
      return send(response, 400, { error: "Choose Starter or Professional before starting the free trial." });
    }

    const paymentMethod = normalizeSignupPaymentMethod(body.payment_method || body.paymentMethod);
    if (!paymentMethod) {
      return send(response, 400, { error: "Choose a payment method for automatic billing after the trial." });
    }

    const billingContact = String(body.billing_contact || body.billingContact || "").trim();
    if (!billingContact) {
      return send(response, 400, { error: "Add the billing phone or authorization reference." });
    }
    if (paymentMethod === "Visa / Mastercard" && looksLikeFullCardNumber(billingContact)) {
      return send(response, 400, { error: "Use a card authorization reference, not a full card number." });
    }

    if (!billingAuthorizationAccepted(body.auto_collect_authorized || body.autoCollectAuthorized)) {
      return send(response, 400, { error: "Automatic collection authorization is required to start a trial." });
    }

    const email = normalizeEmail(body.email);
    const existing = await findUserByEmailOrPhone({ email, phone: body.phone });
    if (existing) {
      return send(response, 409, { error: "That phone or email already has an account." });
    }

    const authUser = await createAuthUser({
      email,
      password: body.password,
      name: body.name,
      phone: body.phone,
      role: "landlord",
    });

    try {
      const user = {
        id: authUser.id,
        name: String(body.name).trim(),
        phone: String(body.phone).trim(),
        email,
        creator_email: email,
        platform_owner_id: null,
        role: "landlord",
        account_status: "Trial",
        company_owner_id: null,
        assigned_property_ids: [],
        invitation_status: null,
        created_at: new Date().toISOString(),
      };

      const today = isoDate(new Date());
      const nextBillingDate = addMonths(today, 1);

      await insertRows("app_users", [user]);
      await insertRows("subscriptions", [
        {
          id: `subscription-${authUser.id}`,
          owner_id: authUser.id,
          plan: planOption.plan,
          monthly_fee: planOption.fee,
          status: "Trial",
          last_payment_date: today,
          last_payment_method: paymentMethod,
          last_payment_note: `Free trial opened from public signup. Auto-collect authorized for ${paymentMethod} (${billingContact}) after trial unless cancelled.`,
          next_billing_date: nextBillingDate,
        },
      ]);

      return send(response, 200, { user });
    } catch (error) {
      await deleteAuthUser(authUser.id).catch(() => null);
      throw error;
    }
  } catch (error) {
    return fail(response, error);
  }
};

function normalizeSignupPlan(value) {
  return String(value || "").trim();
}

function signupPlanOption(plan) {
  return PACKAGE_OPTIONS.find((option) => option.plan === plan && option.fee > 0 && option.plan !== "Enterprise") || null;
}

function normalizeSignupPaymentMethod(value) {
  const raw = String(value || "").trim();
  return SIGNUP_PAYMENT_METHODS.find((method) => method.toLowerCase() === raw.toLowerCase()) || "";
}

function billingAuthorizationAccepted(value) {
  if (value === true) return true;
  return ["true", "yes", "on", "1"].includes(String(value || "").trim().toLowerCase());
}

function looksLikeFullCardNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 12;
}
