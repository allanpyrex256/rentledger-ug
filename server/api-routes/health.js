const { send, supabaseFetch } = require("../supabase-admin");
const { isPesapalConfigured, pesapalConfig } = require("../pesapal");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });

  const supabase = {
    url: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    anonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY),
    reachable: false,
  };
  const pesapal = pesapalConfig();
  const checks = {
    appBaseUrl: Boolean(process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || process.env.SITE_URL || process.env.VERCEL_URL),
    apiCorsOrigin: Boolean(process.env.API_CORS_ORIGIN),
    supabase,
    pesapal: {
      env: pesapal.env,
      currency: pesapal.currency,
      consumerKey: Boolean(pesapal.consumerKey),
      consumerSecret: Boolean(pesapal.consumerSecret),
      ipnId: Boolean(pesapal.ipnId),
      configured: isPesapalConfigured(pesapal),
    },
  };

  try {
    await supabaseFetch("/rest/v1/app_settings?select=id&limit=1");
    supabase.reachable = true;
  } catch (error) {
    supabase.error = error.message || "Supabase check failed";
  }

  const ok =
    checks.appBaseUrl &&
    checks.apiCorsOrigin &&
    supabase.url &&
    supabase.anonKey &&
    supabase.serviceRoleKey &&
    supabase.reachable &&
    checks.pesapal.configured;

  return send(response, ok ? 200 : 503, {
    ok,
    checks,
  });
};
