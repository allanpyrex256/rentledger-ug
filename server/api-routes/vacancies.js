const { fail, planCanPublishPublicListings, send, supabaseFetch } = require("../supabase-admin");
const VERIFIED_BADGE_REQUEST_SUBJECT = "Verified badge request";

module.exports = async function handler(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return send(response, 204, {});
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });

  try {
    const units = await supabaseFetch(
      "/rest/v1/units?status=eq.vacant&listing_published=eq.true&select=*&order=rent_amount.asc"
    );
    if (!units.length) return send(response, 200, { listings: [] });

    const propertyIds = unique(units.map((unit) => unit.property_id));
    const properties = await supabaseFetch(
      `/rest/v1/properties?id=in.(${propertyIds.map(encodeListValue).join(",")})&select=id,owner_id,property_name,location,property_type`
    );
    const ownerIds = unique(properties.map((property) => property.owner_id));
    const owners = ownerIds.length
      ? await supabaseFetch(
          `/rest/v1/app_users?id=in.(${ownerIds.map(encodeListValue).join(",")})&select=id,name,phone,account_status,created_at`
        )
      : [];
    const ownerProperties = ownerIds.length
      ? await supabaseFetch(
          `/rest/v1/properties?owner_id=in.(${ownerIds.map(encodeListValue).join(",")})&select=id,owner_id,property_name,location,property_type`
        )
      : [];
    const ownerPropertyIds = unique(ownerProperties.map((property) => property.id));
    const ownerUnits = ownerPropertyIds.length
      ? await supabaseFetch(
          `/rest/v1/units?property_id=in.(${ownerPropertyIds.map(encodeListValue).join(",")})&select=id,property_id,status,listing_published`
        )
      : [];
    const subscriptions = ownerIds.length
      ? await supabaseFetch(
          `/rest/v1/subscriptions?owner_id=in.(${ownerIds.map(encodeListValue).join(",")})&select=owner_id,plan,status`
        )
      : [];
    const verifiedTickets = ownerIds.length
      ? await supabaseFetch(
          `/rest/v1/support_tickets?owner_id=in.(${ownerIds.map(encodeListValue).join(",")})&subject=eq.${encodeURIComponent(
            VERIFIED_BADGE_REQUEST_SUBJECT
          )}&status=eq.Resolved&select=owner_id`
        )
      : [];
    const subscriptionByOwnerId = new Map(subscriptions.map((subscription) => [subscription.owner_id, subscription]));
    const verifiedOwnerIds = new Set(verifiedTickets.map((ticket) => ticket.owner_id).filter(Boolean));

    const propertyById = new Map(properties.map((property) => [property.id, property]));
    const ownerById = new Map(
      owners.map((owner) => [
        owner.id,
        publicLandlordProfile(owner, ownerProperties, ownerUnits, subscriptionByOwnerId.get(owner.id), verifiedOwnerIds.has(owner.id)),
      ])
    );
    const listings = units
      .map((unit) => {
        const property = propertyById.get(unit.property_id);
        const owner = property ? ownerById.get(property.owner_id) : null;
        return property && owner && profileIsPublic(owner) && planCanPublishPublicListings(owner.subscription_plan)
          ? { unit, property, owner }
          : null;
      })
      .filter(Boolean)
      .sort(publicListingSort);

    return send(response, 200, { listings });
  } catch (error) {
    return fail(response, error);
  }
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function encodeListValue(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function publicLandlordProfile(owner, properties, units, subscription = null, verified = false) {
  const plan = subscription?.plan || "Trial";
  const ownedPropertyIds = new Set(properties.filter((property) => property.owner_id === owner.id).map((property) => property.id));
  const ownedUnits = units.filter((unit) => ownedPropertyIds.has(unit.property_id));
  const activeListings = planCanPublishPublicListings(plan) ? ownedUnits.filter((unit) => isPublishedVacancy(unit)).length : 0;
  return {
    id: owner.id,
    name: owner.name,
    phone: owner.phone,
    account_status: owner.account_status || "Trial",
    created_at: owner.created_at || null,
    subscription_plan: plan,
    verified,
    verified_badge: verified,
    verification_label: verified ? "Verified" : "RentLedger profile",
    profile_photo: "",
    property_count: ownedPropertyIds.size,
    occupied_units_count: ownedUnits.filter((unit) => String(unit.status || "").toLowerCase() === "occupied").length,
    published_vacancies_count: activeListings,
  };
}

function publicListingSort(left, right) {
  const verifiedDelta = Number(Boolean(right.owner?.verified_badge)) - Number(Boolean(left.owner?.verified_badge));
  if (verifiedDelta) return verifiedDelta;
  const freshDelta =
    Number(isToday(right.unit?.created_at || right.unit?.updated_at)) -
    Number(isToday(left.unit?.created_at || left.unit?.updated_at));
  if (freshDelta) return freshDelta;
  return Number(left.unit.rent_amount) - Number(right.unit.rent_amount);
}

function isToday(value) {
  if (!value) return false;
  const date = typeof value === "string" && value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isPublishedVacancy(unit) {
  return String(unit.status || "").toLowerCase() === "vacant" && Boolean(unit.listing_published);
}

function profileIsPublic(owner) {
  const status = String(owner.account_status || "").toLowerCase();
  return status !== "suspended" && status !== "inactive";
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
