const { fail, send } = require("../server/supabase-admin");
const { extractPaymentEvent, publicBaseUrl } = require("../server/flutterwave");
const { settleSubscriptionPayment } = require("../server/subscription-billing");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });

  try {
    const event = extractPaymentEvent({
      reference: request.query?.reference || request.query?.tx_ref,
      tx_ref: request.query?.tx_ref || request.query?.reference,
      transaction_id: request.query?.transaction_id,
      id: request.query?.charge_id,
      status: request.query?.status || "pending",
    });
    const result = await settleSubscriptionPayment(event);
    const status = result.status || event.status || "Pending";
    return redirect(response, `${publicBaseUrl(request)}/?billing=${encodeURIComponent(status.toLowerCase())}`);
  } catch (error) {
    if (request.query?.json === "1") return fail(response, error);
    return redirect(response, `${publicBaseUrl(request)}/?billing=error`);
  }
};

function redirect(response, location) {
  response.statusCode = 302;
  response.setHeader("Location", location);
  response.end();
}
