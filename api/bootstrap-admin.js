const {
  authUserFromRequest,
  fail,
  normalizeEmail,
  patchRows,
  send,
  supabaseFetch,
  upsertRows,
} = require("../server/supabase-admin");

const DEFAULT_PLATFORM_OWNER_EMAIL = "allanpyrex5@gmail.com";

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const authUser = await authUserFromRequest(request);
    const email = normalizeEmail(authUser.email);
    const allowedEmail = normalizeEmail(
      process.env.PLATFORM_OWNER_EMAIL || process.env.SUPER_ADMIN_EMAIL || DEFAULT_PLATFORM_OWNER_EMAIL
    );

    if (!email || email !== allowedEmail) {
      return send(response, 403, { error: "This email is not allowed to bootstrap the super admin." });
    }

    const existingProfiles = await supabaseFetch(
      `/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&select=*`
    );
    const existingProfile = existingProfiles[0] || null;
    const phone = await resolveAdminPhone(authUser, existingProfile);
    const profile = {
      id: authUser.id,
      name: existingProfile?.name || authUser.user_metadata?.name || "Super Admin",
      phone,
      email,
      creator_email: email,
      platform_owner_id: authUser.id,
      role: "saas-owner",
      account_status: "Active",
      company_owner_id: null,
      assigned_property_ids: [],
      invitation_status: null,
      created_at: existingProfile?.created_at || new Date().toISOString(),
    };

    const rows =
      existingProfile && existingProfile.id !== authUser.id
        ? await patchRows("app_users", `email=eq.${encodeURIComponent(email)}`, profile)
        : await upsertRows("app_users", [profile], "id");

    return send(response, 200, { user: rows[0] || profile });
  } catch (error) {
    return fail(response, error);
  }
};

async function resolveAdminPhone(authUser, existingProfile) {
  if (existingProfile?.phone) return existingProfile.phone;

  const preferredPhone = authUser.phone || "0700000000";
  const phoneRows = await supabaseFetch(
    `/rest/v1/app_users?phone=eq.${encodeURIComponent(preferredPhone)}&select=id`
  );
  const phoneIsAvailable = !phoneRows.some((row) => row.id !== authUser.id);
  return phoneIsAvailable ? preferredPhone : `admin-${authUser.id.slice(0, 8)}`;
}
