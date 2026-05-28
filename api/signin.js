const { fail, findUserByEmailOrPhone, normalizeEmail, readBody, send, supabaseFetch } = require("../server/supabase-admin");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const body = await readBody(request);
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "");
    if (!identifier || !password) return send(response, 400, { error: "Account and password are required." });

    const profile = identifier.includes("@")
      ? await findUserByEmailOrPhone({ email: normalizeEmail(identifier) })
      : await findUserByEmailOrPhone({ phone: identifier });
    if (!profile?.email || profile.account_status === "Suspended") {
      return send(response, 401, { error: "Invalid login." });
    }

    const session = await supabaseFetch("/auth/v1/token?grant_type=password", {
      method: "POST",
      service: false,
      body: { email: profile.email, password },
    });

    return send(response, 200, { session });
  } catch (error) {
    error.status = error.status === 400 ? 401 : error.status;
    return fail(response, error);
  }
};
