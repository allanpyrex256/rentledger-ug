(function () {
  const state = {
    listings: [],
  };

  const ui = {
    status: document.getElementById("vacancyStatus"),
    grid: document.getElementById("publicListingGrid"),
    location: document.getElementById("listingLocationFilter"),
    price: document.getElementById("listingPriceFilter"),
    type: document.getElementById("listingTypeFilter"),
    furnished: document.getElementById("listingFurnishedFilter"),
  };

  initialize();

  async function initialize() {
    [ui.location, ui.price, ui.type, ui.furnished].forEach((input) => {
      input.addEventListener("input", renderListings);
      input.addEventListener("change", renderListings);
    });

    const client = await createSupabaseClient();
    if (!client) {
      ui.status.textContent = "Vacancy database is not connected yet. Please check back soon.";
      ui.grid.innerHTML = emptyBlock("Landlord listings will appear here once Supabase is connected.");
      return;
    }

    try {
      ui.status.textContent = "Loading vacant units...";
      state.listings = await fetchListings(client);
      renderListings();
    } catch (error) {
      console.error("Could not load vacancies", error);
      ui.status.textContent = "Could not load vacant units right now.";
      ui.grid.innerHTML = emptyBlock("Please try again later or contact the landlord directly.");
    }
  }

  async function createSupabaseClient() {
    const config = await resolveSupabaseConfig();
    if (!isSupabaseConfigReady(config)) return null;
    const loaded = await loadSupabaseLibrary();
    if (!loaded || !window.supabase?.createClient) return null;
    return window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async function resolveSupabaseConfig() {
    if (isSupabaseConfigReady(window.RENTLEDGER_SUPABASE)) return window.RENTLEDGER_SUPABASE;
    try {
      const response = await fetch("/api/supabase-config", { cache: "no-store" });
      if (!response.ok) return window.RENTLEDGER_SUPABASE || null;
      const config = await response.json();
      if (isSupabaseConfigReady(config)) {
        window.RENTLEDGER_SUPABASE = config;
        return config;
      }
    } catch (error) {
      return window.RENTLEDGER_SUPABASE || null;
    }
    return window.RENTLEDGER_SUPABASE || null;
  }

  function isSupabaseConfigReady(config) {
    return Boolean(
      config &&
        config.url &&
        config.anonKey &&
        !config.url.includes("your-project") &&
        !config.anonKey.includes("your-public")
    );
  }

  function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return Promise.resolve(true);
    if (loadSupabaseLibrary.promise) return loadSupabaseLibrary.promise;
    loadSupabaseLibrary.promise = new Promise((resolve) => {
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => resolve(false), 8000);
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = () => {
        window.clearTimeout(timeout);
        resolve(true);
      };
      script.onerror = () => {
        window.clearTimeout(timeout);
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return loadSupabaseLibrary.promise;
  }

  async function fetchListings(client) {
    const [{ data: units, error: unitsError }, { data: properties, error: propertiesError }, { data: users, error: usersError }] =
      await Promise.all([
        client.from("units").select("*").eq("status", "vacant").eq("listing_published", true),
        client.from("properties").select("*"),
        client.from("app_users").select("id,name,phone,email"),
      ]);

    if (unitsError) throw unitsError;
    if (propertiesError) throw propertiesError;
    if (usersError) throw usersError;

    const propertyById = new Map((properties || []).map((property) => [property.id, property]));
    const userById = new Map((users || []).map((user) => [user.id, user]));

    return (units || [])
      .map((unit) => {
        const property = propertyById.get(unit.property_id);
        const owner = property ? userById.get(property.owner_id) : null;
        return property && owner ? { unit, property, owner } : null;
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.unit.rent_amount) - Number(b.unit.rent_amount));
  }

  function renderListings() {
    const locationFilter = String(ui.location.value || "").trim().toLowerCase();
    const maxRent = Number(ui.price.value || 0);
    const typeFilter = ui.type.value || "all";
    const furnishedFilter = ui.furnished.value || "all";
    const listings = state.listings.filter(({ unit, property }) => {
      const typeText = `${property.property_type} ${unit.unit_number}`.toLowerCase();
      const matchesLocation =
        !locationFilter ||
        property.location.toLowerCase().includes(locationFilter) ||
        property.property_name.toLowerCase().includes(locationFilter);
      const matchesPrice = !maxRent || Number(unit.rent_amount) <= maxRent;
      const matchesType = typeFilter === "all" || typeText.includes(typeFilter);
      const furnished = Boolean(unit.listing_furnished);
      const matchesFurnished =
        furnishedFilter === "all" ||
        (furnishedFilter === "furnished" && furnished) ||
        (furnishedFilter === "unfurnished" && !furnished);
      return matchesLocation && matchesPrice && matchesType && matchesFurnished;
    });

    ui.status.textContent = listings.length
      ? `${listings.length} vacant unit${listings.length === 1 ? "" : "s"} available`
      : "No vacant units match those filters.";
    ui.grid.innerHTML = listings.map((item) => publicListingCard(item)).join("") || emptyBlock("Try another location or price range.");
  }

  function publicListingCard({ unit, property, owner }) {
    const phone = normalizePhone(owner.phone || "");
    const message = `Hello ${owner.name}, I saw ${unit.unit_number} at ${property.property_name} in ${property.location} on RentLedger UG. Is it still available for viewing?`;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.property_name} ${property.location} Uganda`)}`;
    return `
      <article class="public-listing-card">
        <img src="${escapeHtml(unit.listing_photo || listingPhotoForProperty(property))}" alt="${escapeHtml(unit.unit_number)} at ${escapeHtml(property.property_name)}" />
        <div class="public-listing-body">
          <div>
            <span class="listing-status">Available now</span>
            <h3>${escapeHtml(listingTitle(unit, property))}</h3>
            <p>${escapeHtml(property.property_name)} - ${escapeHtml(property.location)}</p>
          </div>
          <strong>${formatMoney(unit.rent_amount)}<small>/month</small></strong>
          <div class="listing-specs">
            <span>${Number(unit.listing_bedrooms || 1)} bed</span>
            <span>${Number(unit.listing_bathrooms || 1)} bath</span>
            <span>${unit.listing_furnished ? "Furnished" : "Unfurnished"}</span>
          </div>
          <p>${escapeHtml(unit.listing_note || "Vacant rental published directly from the landlord dashboard.")}</p>
          <div class="button-row">
            <a class="primary-button link-button" href="https://wa.me/${phone}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">WhatsApp Inquiry</a>
            <a class="text-button link-button" href="tel:${escapeHtml(phone)}">Call Landlord</a>
            <a class="ghost-button link-button" href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">Map</a>
          </div>
        </div>
      </article>
    `;
  }

  function listingTitle(unit, property) {
    const type = property.property_type || "Room";
    return `${type} - ${property.location}`;
  }

  function listingPhotoForProperty(property) {
    const type = String(property.property_type || "").toLowerCase();
    if (type.includes("shop")) return "assets/property-keys.jpg";
    return "assets/apartment-exterior.jpg";
  }

  function normalizePhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("256")) return digits;
    if (digits.startsWith("0")) return `256${digits.slice(1)}`;
    return digits;
  }

  function formatMoney(value) {
    return `USh ${Number(value || 0).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function emptyBlock(message) {
    return `<div class="empty-row">${escapeHtml(message)}</div>`;
  }
})();
