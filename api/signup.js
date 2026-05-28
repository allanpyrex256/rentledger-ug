const {
  createAuthUser,
  deleteAuthUser,
  fail,
  findUserByEmailOrPhone,
  insertRows,
  normalizeEmail,
  readBody,
  requireFields,
  send,
} = require("../server/supabase-admin");

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

      await insertRows("app_users", [user]);
      await insertRows("subscriptions", [
        {
          id: `subscription-${authUser.id}`,
          owner_id: authUser.id,
          plan: "Trial",
          monthly_fee: 0,
          status: "Trial",
          last_payment_date: new Date().toISOString().slice(0, 10),
          last_payment_method: "Signup",
          last_payment_note: "Trial account opened from public signup",
          next_billing_date: null,
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
