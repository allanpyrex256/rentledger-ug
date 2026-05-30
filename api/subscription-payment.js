const { fail, readBody, requireProfile, send } = require("../server/supabase-admin");
const { startSubscriptionCollection } = require("../server/subscription-billing");

module.exports = async function handler(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return send(response, 204, {});
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const { profile } = await requireProfile(request);
    const body = await readBody(request);
    const result = await startSubscriptionCollection({ request, profile, body });
    return send(response, 200, result);
  } catch (error) {
    return fail(response, error);
  }
};

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", apiCorsOrigin());
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function apiCorsOrigin() {
  if (process.env.API_CORS_ORIGIN) return process.env.API_CORS_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
