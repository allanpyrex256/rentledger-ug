const { fail, planCanPublishPublicListings, send, supabaseFetch } = require("../supabase-admin");
const VERIFIED_BADGE_REQUEST_SUBJECT = "Verified badge request";

module.exports = async function handler(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return send(response, 204, {});
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });

  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const ownerId = String(url.searchParams.get("id") || "").trim();
    if (!ownerId) return send(response, 400, { error: "Landlord id is required." });

    const owners = await supabaseFetch(
      `/rest/v1/app_users?id=eq.${encodeURIComponent(ownerId)}&role=eq.landlord&select=id,name,phone,account_status,verified_badge,verification_label,created_at`
    );
    const owner = owners[0];
    if (!owner || !profileIsPublic(owner)) return send(response, 404, { error: "Landlord profile was not found." });

    const properties = await supabaseFetch(
      `/rest/v1/properties?owner_id=eq.${encodeURIComponent(owner.id)}&select=id,owner_id,property_name,location,property_type&order=property_name.asc`
    );
    const propertyIds = unique(properties.map((property) => property.id));
    const units = propertyIds.length
      ? await supabaseFetch(
          `/rest/v1/units?property_id=in.(${propertyIds.map(encodeListValue).join(",")})&select=*&order=rent_amount.asc`
        )
      : [];
    const subscriptions = await supabaseFetch(
      `/rest/v1/subscriptions?owner_id=eq.${encodeURIComponent(owner.id)}&select=owner_id,plan,status`
    );
    const verifiedTickets = await supabaseFetch(
      `/rest/v1/support_tickets?owner_id=eq.${encodeURIComponent(owner.id)}&subject=eq.${encodeURIComponent(
        VERIFIED_BADGE_REQUEST_SUBJECT
      )}&status=eq.Resolved&select=id`
    );
    const subscription = subscriptions[0] || null;
    const publicUnits = planCanPublishPublicListings(subscription?.plan || "Trial") ? units.filter(isPublishedVacancy) : [];
    if (!publicUnits.length) return send(response, 404, { error: "This landlord has no published vacancies." });

    const profile = publicLandlordProfile(
      owner,
      properties,
      units,
      subscription,
      Boolean(owner.verified_badge) || Boolean(owner.verified) || Boolean(verifiedTickets.length)
    );
    const propertyById = new Map(properties.map((property) => [property.id, property]));
    const listings = publicUnits
      .map((unit) => {
        const property = propertyById.get(unit.property_id);
        return property ? { unit, property, owner: profile } : null;
      })
      .filter(Boolean);

    return send(response, 200, {
      profile,
      listings,
      properties: properties.map((property) => ({
        id: property.id,
        property_name: property.property_name,
        location: property.location,
        property_type: property.property_type,
      })),
    });
  } catch (error) {
    return fail(response, error);
  }
};

function publicLandlordProfile(owner, properties, units, subscription = null, verified = false) {
  const plan = subscription?.plan || "Trial";
  const activeListings = planCanPublishPublicListings(plan) ? units.filter(isPublishedVacancy).length : 0;
  return {
    id: owner.id,
    name: owner.name,
    phone: owner.phone,
    account_status: owner.account_status || "Trial",
    created_at: owner.created_at || null,
    subscription_plan: plan,
    verified,
    verified_badge: verified,
    verification_label: verified ? owner.verification_label || "Verified" : "RentLedger profile",
    profile_photo: "",
    property_count: properties.length,
    occupied_units_count: units.filter((unit) => String(unit.status || "").toLowerCase() === "occupied").length,
    published_vacancies_count: activeListings,
  };
}

function isPublishedVacancy(unit) {
  return String(unit.status || "").toLowerCase() === "vacant" && Boolean(unit.listing_published);
}

function profileIsPublic(owner) {
  const status = String(owner.account_status || "").toLowerCase();
  return status !== "suspended" && status !== "inactive";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function encodeListValue(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", apiCorsOrigin());
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function apiCorsOrigin() {
  if (process.env.API_CORS_ORIGIN) return process.env.API_CORS_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
