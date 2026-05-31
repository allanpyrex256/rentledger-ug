const { fail, send } = require("../supabase-admin");
const { extractPaymentEvent, readRawBody, verifyFlutterwaveWebhook } = require("../flutterwave");
const { extractPesapalPaymentEvent, isPesapalEvent } = require("../pesapal");
const { settleSubscriptionPayment } = require("../subscription-billing");

async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method)) return send(response, 405, { error: "Method not allowed" });

  try {
    const rawBody = request.method === "POST" ? await readRawBody(request) : "";
    const body = rawBody ? JSON.parse(rawBody) : {};
    const query = request.query || {};
    const combined = { ...query, ...body };

    if (request.method === "GET" && Object.keys(combined).length === 0) {
      return send(response, 200, {
        ok: true,
        provider: "pesapal",
        message: "Subscription webhook is ready.",
      });
    }

    if (isPesapalEvent(combined)) {
      const event = extractPesapalPaymentEvent(combined);
      const result = await settleSubscriptionPayment(event);
      return send(response, 200, {
        orderNotificationType: event.event_type || "IPNCHANGE",
        orderTrackingId: event.provider_id,
        orderMerchantReference: event.reference,
        status: result.ok ? 200 : 500,
      });
    }

    if (!verifyFlutterwaveWebhook(rawBody, request.headers || {})) {
      return send(response, 401, { error: "Invalid Flutterwave webhook signature." });
    }
    const event = extractPaymentEvent(body);
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
