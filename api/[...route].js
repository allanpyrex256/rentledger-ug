const routes = {
  "admin-user": require("../server/api-routes/admin-user"),
  "bootstrap-admin": require("../server/api-routes/bootstrap-admin"),
  health: require("../server/api-routes/health"),
  "landlord-profile": require("../server/api-routes/landlord-profile"),
  "password-reset": require("../server/api-routes/password-reset"),
  payments: require("../server/api-routes/payments"),
  signin: require("../server/api-routes/signin"),
  signup: require("../server/api-routes/signup"),
  "staff-user": require("../server/api-routes/staff-user"),
  "subscription-callback": require("../server/api-routes/subscription-callback"),
  "subscription-payment": require("../server/api-routes/subscription-payment"),
  "subscription-webhook": require("../server/api-routes/subscription-webhook"),
  "supabase-config": require("../server/api-routes/supabase-config"),
  "sync-state": require("../server/api-routes/sync-state"),
  vacancies: require("../server/api-routes/vacancies"),
  whatsapp: require("../server/api-routes/whatsapp"),
};

module.exports = async function handler(request, response) {
  const route = routeName(request.query?.route);
  const routeHandler = routes[route];

  if (!routeHandler) {
    return response.status(404).json({ error: "API route not found." });
  }

  request.query = stripCatchAllRouteParam(request.query || {});
  return routeHandler(request, response);
};

function routeName(value) {
  if (Array.isArray(value)) return value.join("/");
  return String(value || "");
}

function stripCatchAllRouteParam(query) {
  const { route, ...rest } = query;
  return rest;
}

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
