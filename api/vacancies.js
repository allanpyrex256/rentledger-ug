const { fail, send, supabaseFetch } = require("../server/supabase-admin");

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
          `/rest/v1/app_users?id=in.(${ownerIds.map(encodeListValue).join(",")})&select=id,name,phone,email`
        )
      : [];

    const propertyById = new Map(properties.map((property) => [property.id, property]));
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
    const listings = units
      .map((unit) => {
        const property = propertyById.get(unit.property_id);
        const owner = property ? ownerById.get(property.owner_id) : null;
        return property && owner ? { unit, property, owner } : null;
      })
      .filter(Boolean);

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

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.API_CORS_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
