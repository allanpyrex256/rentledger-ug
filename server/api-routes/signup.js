const {
  PACKAGE_OPTIONS,
  addDays,
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
} = require("../supabase-admin");

const SIGNUP_PAYMENT_METHODS = ["MTN MoMo", "Airtel Money", "Visa / Mastercard"];
const TRIAL_DAYS = 30;

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
      return send(response, 400, { error: "Choose Starter or Professional before starting the 30-day free trial." });
    }

    const paymentMethod = normalizeSignupPaymentMethod(body.payment_method || body.paymentMethod);
    if (!paymentMethod) {
      return send(response, 400, { error: "Choose a payment method for subscription billing after the 30-day free trial." });
    }

    const billingContact = String(body.billing_contact || body.billingContact || "").trim();
    if (!billingContact) {
      return send(response, 400, { error: "Add the billing phone or authorization reference." });
    }
    if (paymentMethod === "Visa / Mastercard" && looksLikeFullCardNumber(billingContact)) {
      return send(response, 400, { error: "Use a card authorization reference, not a full card number." });
    }

    if (!billingAuthorizationAccepted(body.auto_collect_authorized || body.autoCollectAuthorized)) {
      return send(response, 400, { error: "Terms and conditions must be accepted to start the 30-day free trial." });
    }

    const onboardingDetails = normalizeSignupOnboardingDetails(body);
    if (onboardingDetails.error) {
      return send(response, 400, { error: onboardingDetails.error });
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
      const nextBillingDate = addDays(today, TRIAL_DAYS);
      const maskedBillingContact = maskBillingContact(billingContact);
      const onboardingNote = signupOnboardingNote(onboardingDetails);

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
          last_payment_note: `30-day free trial opened from public signup. Terms and conditions accepted for ${paymentMethod} subscription billing after the trial unless cancelled.${onboardingNote}`,
          next_billing_date: nextBillingDate,
          billing_method: paymentMethod,
          billing_contact_masked: maskedBillingContact,
          auto_collect_authorized: true,
          cancel_at_period_end: false,
          grace_period_end: nextBillingDate,
          payment_provider: normalizeSignupPaymentProvider(process.env.PAYMENT_PROVIDER || "pesapal"),
          provider_payment_status: "Not started",
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

function normalizeSignupPaymentProvider(value) {
  return String(value || "").trim().toLowerCase() === "flutterwave" ? "flutterwave" : "pesapal";
}

function billingAuthorizationAccepted(value) {
  if (value === true) return true;
  return ["true", "yes", "on", "1"].includes(String(value || "").trim().toLowerCase());
}

function normalizeSignupOnboardingDetails(body = {}) {
  const propertyName = String(body.property_name || body.propertyName || body.business_name || body.businessName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
  const rawUnitCount = body.unit_count ?? body.unitCount ?? body.number_of_units ?? body.numberOfUnits ?? "";
  const unitCountText = String(rawUnitCount || "").trim();

  if (!unitCountText) return { propertyName, unitCount: null };

  const unitCount = Number(unitCountText);
  if (!Number.isInteger(unitCount) || unitCount < 1) {
    return { propertyName, unitCount: null, error: "Enter a valid number of units." };
  }
  return { propertyName, unitCount };
}

function signupOnboardingNote(details = {}) {
  const parts = [];
  if (details.propertyName) parts.push(`Property/business: ${details.propertyName}`);
  if (details.unitCount) parts.push(`Units: ${details.unitCount}`);
  return parts.length ? ` Onboarding: ${parts.join("; ")}.` : "";
}

function looksLikeFullCardNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 12;
}

function maskBillingContact(value) {
  const raw = String(value || "").trim();
  if (raw.includes("@")) {
    const [name, domain] = raw.split("@");
    return `${name.slice(0, 2)}***@${domain || "email"}`;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 4) return "***";
  return `${"*".repeat(Math.max(3, digits.length - 4))}${digits.slice(-4)}`;
}

module.exports._internal = {
  maskBillingContact,
  normalizeSignupOnboardingDetails,
  normalizeSignupPaymentProvider,
  signupOnboardingNote,
  signupPlanOption,
  normalizeSignupPaymentMethod,
};
