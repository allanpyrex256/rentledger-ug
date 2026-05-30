const { fail, send } = require("../server/supabase-admin");
const { extractPaymentEvent, readRawBody, verifyFlutterwaveWebhook } = require("../server/flutterwave");
const { settleSubscriptionPayment } = require("../server/subscription-billing");

async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  try {
    const rawBody = await readRawBody(request);
    if (!verifyFlutterwaveWebhook(rawBody, request.headers || {})) {
      return send(response, 401, { error: "Invalid Flutterwave webhook signature." });
    }
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const event = extractPaymentEvent(payload);
    const result = await settleSubscriptionPayment(event);
    return send(response, 200, result);
  } catch (error) {
    return fail(response, error);
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
