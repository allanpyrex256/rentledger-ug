const {
  fail,
  findUserByEmailOrPhone,
  normalizeEmail,
  readBody,
  send,
  sendPasswordRecovery,
} = require("../server/supabase-admin");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const body = await readBody(request);
    const identifier = String(body.identifier || "").trim();
    if (!identifier) return send(response, 400, { error: "Account phone or email is required." });

    const profile = identifier.includes("@")
      ? await findUserByEmailOrPhone({ email: normalizeEmail(identifier) })
      : await findUserByEmailOrPhone({ phone: identifier });
    if (profile?.email && profile.account_status !== "Suspended") await sendPasswordRecovery(profile.email);

    return send(response, 200, { ok: true });
  } catch (error) {
    return fail(response, error);
  }
};
