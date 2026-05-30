const { fail, send } = require("../server/supabase-admin");
const { extractPaymentEvent, publicBaseUrl } = require("../server/flutterwave");
const { extractPesapalPaymentEvent, isPesapalEvent } = require("../server/pesapal");
const { settleSubscriptionPayment } = require("../server/subscription-billing");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });

  try {
    const query = request.query || {};
    const event = isPesapalEvent(query)
      ? extractPesapalPaymentEvent(query)
      : extractPaymentEvent({
          reference: query.reference || query.tx_ref,
          tx_ref: query.tx_ref || query.reference,
          transaction_id: query.transaction_id,
          id: query.charge_id,
          status: query.status || "pending",
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
