(function () {
  const state = {
    listings: [],
  };

  const ui = {
    status: document.getElementById("vacancyStatus"),
    grid: document.getElementById("publicListingGrid"),
    featuredSection: document.getElementById("featuredListingSection"),
    featuredGrid: document.getElementById("featuredListingGrid"),
    location: document.getElementById("listingLocationFilter"),
    price: document.getElementById("listingPriceFilter"),
    type: document.getElementById("listingTypeFilter"),
    furnished: document.getElementById("listingFurnishedFilter"),
    search: document.getElementById("listingSearchButton"),
  };

  initialize();

  async function initialize() {
    [ui.location, ui.price, ui.type, ui.furnished].forEach((input) => {
      input.addEventListener("change", renderListings);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") renderListings();
      });
    });
    if (ui.search) ui.search.addEventListener("click", renderListings);

    try {
      ui.status.textContent = "Loading rental marketplace...";
      state.listings = await fetchListings();
      renderListings();
    } catch (error) {
      console.error("Could not load vacancies", error);
      ui.status.textContent = "Could not load rentals right now.";
      ui.grid.innerHTML = emptyBlock("Please try again later or contact the landlord directly.");
    }
  }

  async function fetchListings() {
    try {
      const response = await fetch("/api/vacancies", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load vacancies.");
      const listings = (payload.listings || []).sort(publicListingSort);
      return listings.length || !shouldUsePreviewFallback() ? listings : fallbackListings();
    } catch (error) {
      console.error("Public vacancies API failed", error);
      const listings = fallbackListings();
      if (listings.length) return listings;
      throw error;
    }
  }

  function shouldUsePreviewFallback() {
    return (
      window.location.protocol === "file:" ||
      ["localhost", "127.0.0.1", ""].includes(window.location.hostname)
    );
  }

  function fallbackListings() {
    const today = new Date().toISOString();
    const owner = {
      id: "user-1",
      name: "Landlord Demo",
      phone: "0772123456",
      email: "landlord@rentflow.ug",
      account_status: "Active",
      property_count: 5,
      occupied_units_count: 19,
      verified_badge: false,
      verification_label: "RentFlow profile",
    };
    return [
      {
        owner,
        property: {
          id: "property-2",
          owner_id: owner.id,
          property_name: "Ntinda Court",
          location: "Ntinda",
          property_type: "Single Room",
        },
        unit: {
          id: "unit-6",
          property_id: "property-2",
          unit_number: "N2",
          rent_amount: 380000,
          status: "vacant",
          listing_published: true,
          listing_bedrooms: 1,
          listing_bathrooms: 1,
          listing_furnished: false,
          listing_photo: "assets/apartment-exterior.jpg",
          listing_note: "Single room near Ntinda trading center. Water and power available.",
          listing_published_at: today,
          created_at: today,
        },
      },
      {
        owner,
        property: {
          id: "property-4",
          owner_id: owner.id,
          property_name: "Kololo Heights Villas",
          location: "Kololo",
          property_type: "Shops",
        },
        unit: {
          id: "unit-15",
          property_id: "property-4",
          unit_number: "K5",
          rent_amount: 850000,
          status: "vacant",
          listing_published: true,
          listing_bedrooms: 1,
          listing_bathrooms: 1,
          listing_furnished: true,
          listing_photo: "assets/property-keys.jpg",
          listing_note: "Empty shop space on a busy Kololo access road.",
          listing_published_at: today,
          created_at: today,
        },
      },
      {
        owner,
        property: {
          id: "property-6",
          owner_id: owner.id,
          property_name: "Najjera Garden Homes",
          location: "Najjera",
          property_type: "Boys Quarters",
        },
        unit: {
          id: "unit-27",
          property_id: "property-6",
          unit_number: "G6",
          rent_amount: 820000,
          status: "vacant",
          listing_published: true,
          listing_bedrooms: 1,
          listing_bathrooms: 1,
          listing_furnished: true,
          listing_photo: "assets/apartment-exterior.jpg",
          listing_note: "Boys quarter with secure compound access in Najjera.",
          listing_published_at: today,
          created_at: today,
        },
      },
    ].sort(publicListingSort);
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
      ? `${listings.length} rental${listings.length === 1 ? "" : "s"} available`
      : "No rentals match those filters.";
    const featuredListings = featuredListingItems(listings);
    const featuredIds = new Set(featuredListings.map((item) => item.unit.id));
    if (ui.featuredSection && ui.featuredGrid) {
      ui.featuredSection.classList.toggle("hidden", !featuredListings.length);
      ui.featuredGrid.innerHTML = featuredListings.map((item) => publicListingCard(item, { featured: true })).join("");
    }
    const regularListings = listings.filter((item) => !featuredIds.has(item.unit.id));
    ui.grid.innerHTML =
      regularListings.map((item) => publicListingCard(item)).join("") ||
      (featuredListings.length ? "" : emptyBlock("Try another district, budget, or room type."));
  }

  function featuredListingItems(listings) {
    return listings
      .slice()
      .sort((left, right) => featuredScore(right) - featuredScore(left) || Number(left.unit.rent_amount) - Number(right.unit.rent_amount))
      .slice(0, Math.min(3, listings.length))
      .filter((item) => featuredScore(item) > 0);
  }

  function publicListingSort(left, right) {
    const verifiedDelta = Number(ownerHasVerifiedBadge(right.owner)) - Number(ownerHasVerifiedBadge(left.owner));
    if (verifiedDelta) return verifiedDelta;
    const freshDelta =
      Number(isToday(right.unit.created_at || right.unit.updated_at)) -
      Number(isToday(left.unit.created_at || left.unit.updated_at));
    if (freshDelta) return freshDelta;
    return Number(left.unit.rent_amount) - Number(right.unit.rent_amount);
  }

  function featuredScore({ unit, owner }) {
    return (
      (ownerHasVerifiedBadge(owner) ? 10 : 0) +
      (isToday(unit.created_at || unit.updated_at) ? 3 : 0) +
      (unit.listing_photo ? 4 : 0) +
      (unit.listing_furnished ? 1 : 0)
    );
  }

  function publicListingCard({ unit, property, owner }, options = {}) {
    const phone = normalizePhone(owner.phone || "");
    const message = `Hello ${owner.name}, I saw ${unit.unit_number} at ${property.property_name} in ${property.location} on RentFlow UG. Is it still available for viewing?`;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.property_name} ${property.location} Uganda`)}`;
    const profileUrl = landlordProfileUrl(owner.id);
    const stats = landlordStats(owner);
    const postedBadge = listingPostedBadge(unit);
    return `
      <article class="public-listing-card${options.featured ? " featured" : ""}">
        <div class="listing-media">
          <img src="${escapeHtml(unit.listing_photo || listingPhotoForProperty(property))}" alt="${escapeHtml(unit.unit_number)} at ${escapeHtml(property.property_name)}" />
          <div class="listing-badge-stack">
            ${options.featured ? '<span class="listing-featured-ribbon">Featured</span>' : ""}
            ${postedBadge}
          </div>
        </div>
        <div class="public-listing-body">
          <div>
            <div class="listing-card-meta">
              <span class="listing-status">Available now</span>
              <span>${escapeHtml(listingDistrict(property))}</span>
            </div>
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
          <div class="listing-landlord">
            ${profilePhotoMarkup(owner, "listing-landlord-photo")}
            <div>
              <a href="${escapeHtml(profileUrl)}">${escapeHtml(owner.name)}</a>
              ${verificationBadge(owner)}
              <small>${formatLandlordStats(stats)}</small>
              <small>Phone: <a href="tel:+${escapeHtml(phone)}">${escapeHtml(displayPhone(owner.phone))}</a></small>
            </div>
          </div>
          <div class="button-row">
            <a class="primary-button link-button whatsapp-listing-button" href="https://wa.me/${phone}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">WhatsApp Landlord</a>
            <a class="text-button link-button" href="tel:${escapeHtml(phone)}">Call Landlord</a>
            <a class="ghost-button link-button" href="${escapeHtml(profileUrl)}">View Landlord</a>
            <a class="ghost-button link-button" href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">Map</a>
          </div>
        </div>
      </article>
    `;
  }

  function listingPostedBadge(unit) {
    const postedAt = unit.listing_published_at || unit.created_at || unit.updated_at;
    if (!postedAt || !isToday(postedAt)) return "";
    return '<span class="listing-posted-badge">Posted today</span>';
  }

  function listingDistrict(property) {
    return String(property.location || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)[0] || "Uganda";
  }

  function landlordStats(owner) {
    if (owner.property_count !== undefined || owner.occupied_units_count !== undefined) {
      return {
        propertyCount: Number(owner.property_count || 0),
        occupiedUnits: Number(owner.occupied_units_count || 0),
      };
    }
    const ownerListings = state.listings.filter((item) => item.owner?.id === owner.id);
    return {
      propertyCount: new Set(ownerListings.map((item) => item.property?.id).filter(Boolean)).size,
      occupiedUnits: 0,
    };
  }

  function formatLandlordStats(stats) {
    return `${stats.propertyCount} ${stats.propertyCount === 1 ? "property" : "properties"} - ${stats.occupiedUnits} occupied ${stats.occupiedUnits === 1 ? "unit" : "units"}`;
  }

  function landlordProfileUrl(ownerId) {
    return `landlord.html?id=${encodeURIComponent(ownerId)}`;
  }

  function profilePhotoMarkup(owner, className) {
    const src = safeImageSrc(owner.profile_photo);
    if (src) return `<img class="${escapeHtml(className)}" src="${escapeHtml(src)}" alt="${escapeHtml(owner.name)} profile photo" />`;
    return `<span class="${escapeHtml(className)} profile-photo-fallback" aria-label="${escapeHtml(owner.name)} profile photo">${escapeHtml(initials(owner.name))}</span>`;
  }

  function verificationBadge(owner) {
    const verified = ownerHasVerifiedBadge(owner);
    if (verified) {
      return '<span class="verification-badge verified"><span class="verification-tick" aria-hidden="true">&#10003;</span><span>Verified</span></span>';
    }
    const label = owner.verification_label || "RentFlow profile";
    return `<span class="verification-badge pending">${escapeHtml(label)}</span>`;
  }

  function ownerHasVerifiedBadge(owner) {
    return Boolean(owner?.verified_badge) || Boolean(owner?.verified);
  }

  function safeImageSrc(value) {
    const src = String(value || "").trim();
    if (/^(https?:\/\/|data:image\/|assets\/)/i.test(src)) return src;
    return "";
  }

  function initials(name) {
    return (
      String(name || "RL")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "RL"
    );
  }

  function displayPhone(phone) {
    return String(phone || "Phone unavailable");
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
