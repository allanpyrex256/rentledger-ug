(function () {
  const STORAGE_KEY = "rentflow_ug_mvp_v1";
  const PLAN_FEATURES = {
    Starter: { publicListings: true },
    Professional: { publicListings: true },
    Enterprise: { publicListings: true },
  };

  const ui = {
    shell: document.getElementById("landlordProfileShell"),
    status: document.getElementById("landlordProfileStatus"),
  };

  initialize();

  async function initialize() {
    const ownerId = new URLSearchParams(window.location.search).get("id") || landlordIdFromPath();
    if (!ownerId) {
      renderError("Choose a landlord from a published vacancy listing.");
      return;
    }

    try {
      const profile = await fetchProfile(ownerId);
      renderProfile(profile);
    } catch (error) {
      console.error("Could not load landlord profile", error);
      const localProfile = loadLocalProfile(ownerId);
      if (localProfile) {
        renderProfile(localProfile);
        return;
      }
      renderError(error.message || "This landlord profile is not available right now.");
    }
  }

  async function fetchProfile(ownerId) {
    const response = await fetch(`/api/landlord-profile?id=${encodeURIComponent(ownerId)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not load landlord profile.");
    return payload;
  }

  function renderProfile(data) {
    const profile = data.profile;
    const listings = data.listings || [];
    const stats = landlordStats(profile, listings);
    const phone = normalizePhone(profile.phone || "");
    const message = `Hello ${profile.name}, I saw your vacancies on RentFlow UG. Are any still available for viewing?`;
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : "#";
    const callUrl = phone ? `tel:+${phone}` : "#";

    document.title = `${profile.name} | Landlord Profile | RentFlow UG`;
    ui.shell.innerHTML = `
      <section class="landlord-profile-hero">
        <div class="landlord-profile-main">
          ${profilePhotoMarkup(profile, "landlord-profile-photo")}
          <div class="landlord-profile-copy">
            <span class="listing-status">Landlord profile</span>
            <h1>${escapeHtml(profile.name)}</h1>
            <div class="profile-badge-row">
              ${verificationBadge(profile)}
            </div>
            <p class="profile-phone-line">
              <span>Phone</span>
              <a href="${escapeHtml(callUrl)}">${escapeHtml(displayPhone(profile.phone))}</a>
            </p>
            <div class="button-row">
              <a class="primary-button link-button" href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noreferrer">WhatsApp</a>
              <a class="text-button link-button" href="${escapeHtml(callUrl)}">Call</a>
              <a class="ghost-button link-button" href="vacancies.html">All Vacancies</a>
            </div>
          </div>
        </div>
        <div class="landlord-stat-grid" aria-label="Landlord profile statistics">
          ${profileStat("Properties", stats.propertyCount)}
          ${profileStat("Occupied units", stats.occupiedUnits)}
          ${profileStat("Published vacancies", stats.publishedVacancies)}
        </div>
      </section>

      <section class="landlord-vacancy-section">
        <div class="section-heading">
          <span class="hero-kicker">Published vacancies</span>
          <h2>${escapeHtml(profile.name)} has ${stats.publishedVacancies} available ${plural(stats.publishedVacancies, "unit", "units")}.</h2>
        </div>
        <div class="public-listing-grid">
          ${listings.map((item) => publicListingCard(item, profile)).join("") || emptyBlock("This landlord has no published vacancies.")}
        </div>
      </section>
    `;
  }

  function renderError(message) {
    ui.shell.innerHTML = `
      <div class="empty-row landlord-profile-error">
        <strong>Profile unavailable</strong>
        <span>${escapeHtml(message)}</span>
        <a class="ghost-button link-button" href="vacancies.html">View Vacant Units</a>
      </div>
    `;
  }

  function publicListingCard({ unit, property }, profile) {
    const phone = normalizePhone(profile.phone || "");
    const message = `Hello ${profile.name}, I saw ${unit.unit_number} at ${property.property_name} in ${property.location} on RentFlow UG. Is it still available for viewing?`;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.property_name} ${property.location} Uganda`)}`;
    return `
      <article class="public-listing-card">
        <img src="${escapeHtml(unit.listing_photo || listingPhotoForProperty(property))}" alt="${escapeHtml(unit.unit_number)} at ${escapeHtml(property.property_name)}" />
        <div class="public-listing-body">
          <div class="landlord-listing-heading">
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
            <a class="text-button link-button" href="tel:+${escapeHtml(phone)}">Call Landlord</a>
            <a class="ghost-button link-button" href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">Map</a>
          </div>
        </div>
      </article>
    `;
  }

  function loadLocalProfile(ownerId) {
    const saved = loadSavedState();
    if (!saved) return null;
    return buildProfileFromState(saved, ownerId);
  }

  function loadSavedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      return null;
    }
  }

  function buildProfileFromState(saved, ownerId) {
    const users = Array.isArray(saved.users) ? saved.users : [];
    const properties = Array.isArray(saved.properties) ? saved.properties : [];
    const units = Array.isArray(saved.units) ? saved.units : [];
    const subscriptions = Array.isArray(saved.subscriptions) ? saved.subscriptions : [];
    const owner = users.find((user) => user.id === ownerId && user.role === "landlord");
    if (!owner) return null;

    const subscription = subscriptions.find((item) => item.owner_id === owner.id);
    const plan = subscription?.plan || owner.subscription_plan || "Trial";
    if (!planCanPublishPublicListings(plan)) return null;

    const ownerProperties = properties.filter((property) => property.owner_id === owner.id);
    const ownerPropertyIds = new Set(ownerProperties.map((property) => property.id));
    const ownerUnits = units.filter((unit) => ownerPropertyIds.has(unit.property_id));
    const publicUnits = ownerUnits.filter((unit) => String(unit.status || "").toLowerCase() === "vacant" && unit.listing_published);
    if (!publicUnits.length) return null;

    const verified = Boolean(owner.verified_badge) || Boolean(owner.verified);
    const profile = {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      profile_photo: owner.profile_photo || "",
      subscription_plan: plan,
      verified,
      verified_badge: verified,
      verification_label: owner.verification_label || (verified ? "Verified" : "RentFlow profile"),
      property_count: ownerProperties.length,
      occupied_units_count: ownerUnits.filter((unit) => String(unit.status || "").toLowerCase() === "occupied").length,
      published_vacancies_count: publicUnits.length,
    };
    const propertyById = new Map(ownerProperties.map((property) => [property.id, property]));
    return {
      profile,
      listings: publicUnits
        .map((unit) => {
          const property = propertyById.get(unit.property_id);
          return property ? { unit, property, owner: profile } : null;
        })
        .filter(Boolean),
      properties: ownerProperties,
    };
  }

  function landlordStats(profile, listings) {
    return {
      propertyCount: Number(profile.property_count || 0),
      occupiedUnits: Number(profile.occupied_units_count || 0),
      publishedVacancies: Number(profile.published_vacancies_count || listings.length || 0),
    };
  }

  function profileStat(label, value) {
    return `
      <article class="landlord-stat">
        <span>${escapeHtml(label)}</span>
        <strong>${Number(value || 0).toLocaleString("en-UG")}</strong>
      </article>
    `;
  }

  function profilePhotoMarkup(profile, className) {
    const src = safeImageSrc(profile.profile_photo);
    if (src) {
      return `<img class="${escapeHtml(className)}" src="${escapeHtml(src)}" alt="${escapeHtml(profile.name)} profile photo" />`;
    }
    return `<span class="${escapeHtml(className)} profile-photo-fallback" aria-label="${escapeHtml(profile.name)} profile photo">${escapeHtml(initials(profile.name))}</span>`;
  }

  function verificationBadge(profile) {
    const verified = Boolean(profile.verified_badge) || Boolean(profile.verified);
    if (verified) {
      return '<span class="verification-badge verified"><span class="verification-tick" aria-hidden="true">&#10003;</span><span>Verified</span></span>';
    }
    const label = profile.verification_label || "RentFlow profile";
    return `<span class="verification-badge pending">${escapeHtml(label)}</span>`;
  }

  function planCanPublishPublicListings(plan) {
    return Boolean(PLAN_FEATURES[plan]?.publicListings);
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

  function landlordIdFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) => part === "landlords" || part === "landlord");
    return index >= 0 ? parts[index + 1] || "" : "";
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

  function normalizePhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("256")) return digits;
    if (digits.startsWith("0")) return `256${digits.slice(1)}`;
    return digits;
  }

  function formatMoney(value) {
    return `USh ${Number(value || 0).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
  }

  function plural(count, singular, pluralValue) {
    return Number(count) === 1 ? singular : pluralValue;
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
