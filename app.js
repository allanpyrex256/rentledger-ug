const products = [
  {
    name: "Midnight Essence",
    price: "UGX 85,000",
    seller: "Essence Connect",
    creator: "Anime Creator Hub",
    category: "creator",
    label: "Midnight",
    visual: {
      bg: "linear-gradient(145deg, rgba(196,111,130,.24), rgba(10,9,8,.92))",
      a: "#171019",
      b: "#c46f82",
    },
  },
  {
    name: "Royal Oud",
    price: "UGX 120,000",
    seller: "Luxury Scents UG",
    creator: "Creator Wave",
    category: "premium",
    label: "Royal Oud",
    visual: {
      bg: "linear-gradient(145deg, rgba(220,166,79,.28), rgba(24,17,10,.92))",
      a: "#5b3419",
      b: "#dca64f",
    },
  },
  {
    name: "Velvet Bloom",
    price: "UGX 95,000",
    seller: "Essence Connect",
    creator: "Viral Studio",
    category: "creator",
    label: "Velvet",
    visual: {
      bg: "linear-gradient(145deg, rgba(117,156,113,.26), rgba(12,15,12,.92))",
      a: "#31533d",
      b: "#d8989d",
    },
  },
];

const features = [
  "AI Marketing Generation",
  "Affiliate Creator System",
  "Seller Dashboards",
  "Reputation & Trust Scores",
  "Mobile Money Ready",
  "Scalable Ecosystem Architecture",
];

const roadmap = [
  "Fashion",
  "Beauty",
  "AI Automation",
  "Creator Economy",
  "Marketplace Expansion",
  "Finance Infrastructure",
  "Smart Recommendations",
  "Autonomous AI Agents",
];

const campaignIdeas = [
  {
    caption: "Turn every entrance into a signature moment with Royal Oud.",
    tags: ["#RoyalOud", "#LuxuryScentsUG", "#CreatorCommerce"],
  },
  {
    caption: "Velvet Bloom brings soft confidence to every everyday ritual.",
    tags: ["#VelvetBloom", "#BeautyUG", "#EssenceConnect"],
  },
  {
    caption: "Midnight Essence was made for late nights, bold plans, and lasting impressions.",
    tags: ["#MidnightEssence", "#FragranceTok", "#KampalaStyle"],
  },
];

const registeredAccounts = [
  {
    name: "App Owner",
    email: "owner@essenceconnect.ug",
    phone: "+256700000000",
    password: "owner2026",
    role: "Super Admin",
  },
  {
    name: "Luxury Scents UG",
    email: "sales@luxuryscents.ug",
    phone: "+256700123456",
    password: "essence2026",
    role: "Seller",
  },
  {
    name: "Creator Wave",
    email: "hello@creatorwave.ug",
    phone: "+256701555777",
    password: "creator2026",
    role: "Creator Admin",
  },
];

const storedAccounts = loadStoredAccounts();

if (storedAccounts.length) {
  registeredAccounts.splice(0, registeredAccounts.length, ...storedAccounts);
}

const adminMetrics = [
  {
    label: "Platform Sales",
    value: "UGX 4.8M",
    detail: "+18% this month",
  },
  {
    label: "Active Sellers",
    value: "12",
    detail: "3 waiting review",
  },
  {
    label: "Creator Partners",
    value: "42",
    detail: "8 campaigns live",
  },
  {
    label: "System Trust",
    value: "96%",
    detail: "2 alerts open",
  },
];

const adminControls = [
  {
    title: "Seller approvals",
    status: "3 pending",
    action: "Open Queue",
  },
  {
    title: "Product moderation",
    status: "7 checks",
    action: "Review Items",
  },
  {
    title: "Payout control",
    status: "UGX 710k due",
    action: "Manage Payouts",
  },
  {
    title: "Role permissions",
    status: "Super Admin only",
    action: "Edit Access",
  },
];

const adminUsers = [
  {
    name: "App Owner",
    email: "owner@essenceconnect.ug",
    role: "Super Admin",
    access: "Full platform",
    status: "Owner",
  },
  {
    name: "Luxury Scents UG",
    email: "sales@luxuryscents.ug",
    role: "Seller",
    access: "Store dashboard",
    status: "Trusted",
  },
  {
    name: "Creator Wave",
    email: "hello@creatorwave.ug",
    role: "Creator Admin",
    access: "Campaigns",
    status: "Active",
  },
  {
    name: "Support Agent",
    email: "support@essenceconnect.ug",
    role: "Support",
    access: "Tickets only",
    status: "Limited",
  },
];

const adminActivity = [
  {
    label: "Seller account submitted",
    time: "8 min ago",
  },
  {
    label: "Royal Oud payout cleared",
    time: "26 min ago",
  },
  {
    label: "Creator campaign flagged for review",
    time: "1 hr ago",
  },
  {
    label: "Trust score rules synced",
    time: "Today",
  },
];

const productGrid = document.querySelector("#productGrid");
const featureGrid = document.querySelector("#featureGrid");
const roadmapGrid = document.querySelector("#roadmapGrid");
const adminMetricGrid = document.querySelector("#adminMetricGrid");
const adminControlGrid = document.querySelector("#adminControlGrid");
const adminUserTable = document.querySelector("#adminUserTable");
const adminActivityFeed = document.querySelector("#adminActivityFeed");
const campaignCaption = document.querySelector("#campaignCaption");
const tagCloud = document.querySelector("#tagCloud");
const generateCampaign = document.querySelector("#generateCampaign");
const filterButtons = document.querySelectorAll("[data-filter]");
const creatorLoginButton = document.querySelector("#creatorLoginButton");
const ownerDashboardButton = document.querySelector("#ownerDashboardButton");
const ownerDashboard = document.querySelector("#owner");
const openAccountButton = document.querySelector("#openAccountButton");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
const authModal = document.querySelector("#authModal");
const closeAuthModal = document.querySelector("#closeAuthModal");
const loginStep = document.querySelector("#loginStep");
const registerStep = document.querySelector("#registerStep");
const resetRequestStep = document.querySelector("#resetRequestStep");
const otpVerifyStep = document.querySelector("#otpVerifyStep");
const loginForm = document.querySelector("#loginForm");
const loginIdentifier = document.querySelector("#loginIdentifier");
const loginPassword = document.querySelector("#loginPassword");
const loginMessage = document.querySelector("#loginMessage");
const switchToRegister = document.querySelector("#switchToRegister");
const switchToReset = document.querySelector("#switchToReset");
const backToLogin = document.querySelector("#backToLogin");
const backToLoginFromRegister = document.querySelector("#backToLoginFromRegister");
const registerForm = document.querySelector("#registerForm");
const registerName = document.querySelector("#registerName");
const registerEmail = document.querySelector("#registerEmail");
const registerPhone = document.querySelector("#registerPhone");
const registerRole = document.querySelector("#registerRole");
const registerPassword = document.querySelector("#registerPassword");
const registerConfirmPassword = document.querySelector("#registerConfirmPassword");
const registerMessage = document.querySelector("#registerMessage");
const otpRequestForm = document.querySelector("#otpRequestForm");
const resetIdentifier = document.querySelector("#resetIdentifier");
const resetRequestMessage = document.querySelector("#resetRequestMessage");
const otpDeliveryLabel = document.querySelector("#otpDeliveryLabel");
const demoOtpLabel = document.querySelector("#demoOtpLabel");
const passwordResetForm = document.querySelector("#passwordResetForm");
const otpCode = document.querySelector("#otpCode");
const newPassword = document.querySelector("#newPassword");
const confirmPassword = document.querySelector("#confirmPassword");
const passwordResetMessage = document.querySelector("#passwordResetMessage");
const resendOtpButton = document.querySelector("#resendOtpButton");
const toast = document.querySelector("#toast");

let campaignIndex = 0;
let resetSession = null;
let toastTimer = null;

function loadStoredAccounts() {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem("essenceConnectAccounts") || "[]");
  } catch {
    return [];
  }
}

function saveRegisteredAccounts() {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem("essenceConnectAccounts", JSON.stringify(registeredAccounts));
}

function syncAdminUsersFromAccounts() {
  registeredAccounts.forEach((account) => {
    const exists = adminUsers.some(
      (user) => normalizeEmail(user.email || "") === normalizeEmail(account.email || ""),
    );

    if (exists) {
      return;
    }

    adminUsers.push({
      name: account.name,
      email: account.email,
      role: account.role,
      access: account.role === "Seller" ? "Store dashboard" : "Campaigns",
      status: account.role === "Super Admin" ? "Owner" : "New",
    });
  });
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    return `256${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `256${digits}`;
  }

  return digits;
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function findAccountByIdentifier(identifier) {
  const value = identifier.trim();
  const email = normalizeEmail(value);
  const phone = normalizePhone(value);

  return registeredAccounts.find(
    (account) =>
      normalizeEmail(account.email || "") === email ||
      (phone && normalizePhone(account.phone || "") === phone),
  );
}

function maskPhone(phone) {
  const digits = normalizePhone(phone);
  const countryCode = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const tail = digits.slice(-3);

  return `+${countryCode} ${prefix} *** ${tail}`;
}

function maskEmail(email) {
  const [name, domain] = normalizeEmail(email).split("@");

  if (!name || !domain) {
    return email;
  }

  const visibleName = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${visibleName}${"*".repeat(Math.max(3, name.length - visibleName.length))}@${domain}`;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sendPasswordResetOtp(account, otp) {
  // Static MVP fallback. Replace this with a backend email endpoint in production.
  console.info(`[Essence Connect Email OTP] ${otp} sent to ${account.email}`);
  return Promise.resolve({ deliveredTo: account.email });
}

function setMessage(element, message = "", type = "") {
  element.textContent = message;
  element.className = "form-message";

  if (type) {
    element.classList.add(`is-${type}`);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function showAuthStep(step) {
  [loginStep, registerStep, resetRequestStep, otpVerifyStep].forEach((item) => {
    item.hidden = item !== step;
  });

  const focusTarget =
    step === loginStep
      ? loginIdentifier
      : step === registerStep
        ? registerName
        : step === resetRequestStep
          ? resetIdentifier
          : otpCode;

  setTimeout(() => focusTarget.focus(), 0);
}

function clearAuthMessages() {
  [loginMessage, registerMessage, resetRequestMessage, passwordResetMessage].forEach((element) => {
    setMessage(element);
  });
}

function openAuthModal(step = loginStep) {
  authModal.hidden = false;
  clearAuthMessages();
  showAuthStep(step);
}

function closeAuthDialog() {
  authModal.hidden = true;
}

async function startPasswordReset(account) {
  const otp = generateOtp();
  resetSession = {
    account,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  await sendPasswordResetOtp(account, otp);
  passwordResetForm.reset();
  setMessage(passwordResetMessage);
  otpDeliveryLabel.textContent = `OTP sent to ${maskEmail(account.email)}.`;
  demoOtpLabel.textContent = `Demo email OTP: ${otp}`;
  showAuthStep(otpVerifyStep);
  showToast(`OTP sent to ${maskEmail(account.email)}.`);
}

function renderProducts(filter = "all") {
  const visibleProducts =
    filter === "all" ? products : products.filter((product) => product.category === filter);

  productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="product-card">
          <div
            class="product-visual"
            style="--visual-bg: ${product.visual.bg}; --bottle-a: ${product.visual.a}; --bottle-b: ${product.visual.b};"
          >
            <div class="bottle" data-label="${product.label}" aria-hidden="true"></div>
          </div>
          <div class="product-body">
            <div class="product-title-row">
              <h3>${product.name}</h3>
              <span class="price">${product.price}</span>
            </div>
            <div class="product-meta">
              <span>Seller: ${product.seller}</span>
              <span>Promoted by: ${product.creator}</span>
            </div>
            <div class="product-actions">
              <button class="primary-button" type="button">Buy Now</button>
              <button class="secondary-button" type="button">Promote</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderFeatures() {
  const accents = ["#dca64f", "#c46f82", "#759c71", "#6aa0b8", "#e0c59e", "#b9aea0"];

  featureGrid.innerHTML = features
    .map(
      (feature, index) => `
        <article class="feature-card" style="--accent: ${accents[index % accents.length]}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <h3>${feature}</h3>
        </article>
      `,
    )
    .join("");
}

function renderRoadmap() {
  roadmapGrid.innerHTML = roadmap.map((item) => `<span>${item}</span>`).join("");
}

function renderAdminMetrics() {
  adminMetricGrid.innerHTML = adminMetrics
    .map(
      (metric) => `
        <article class="admin-metric">
          <span>${metric.label}</span>
          <strong>${metric.value}</strong>
          <small>${metric.detail}</small>
        </article>
      `,
    )
    .join("");
}

function renderAdminControls() {
  adminControlGrid.innerHTML = adminControls
    .map(
      (control) => `
        <div class="admin-control">
          <span>${control.title}</span>
          <strong>${control.status}</strong>
          <button class="link-button" type="button" data-admin-action="${control.title}">
            ${control.action}
          </button>
        </div>
      `,
    )
    .join("");
}

function renderAdminUsers() {
  adminUserTable.innerHTML = `
    <div class="admin-table-row admin-table-head">
      <span>User</span>
      <span>Email</span>
      <span>Role</span>
      <span>Access</span>
      <span>Status</span>
    </div>
    ${adminUsers
      .map(
        (user) => `
          <div class="admin-table-row">
            <strong>${user.name}</strong>
            <span>${user.email}</span>
            <span>${user.role}</span>
            <span>${user.access}</span>
            <span>${user.status}</span>
          </div>
        `,
      )
      .join("")}
  `;
}

function renderAdminActivity() {
  adminActivityFeed.innerHTML = adminActivity
    .map(
      (item) => `
        <div>
          <span>${item.label}</span>
          <small>${item.time}</small>
        </div>
      `,
    )
    .join("");
}

function renderCampaign() {
  const idea = campaignIdeas[campaignIndex % campaignIdeas.length];
  campaignCaption.textContent = idea.caption;
  tagCloud.innerHTML = idea.tags.map((tag) => `<span>${tag}</span>`).join("");
  campaignIndex += 1;
}

function openOwnerDashboard(message = "Super Admin dashboard opened.") {
  ownerDashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(message);
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderProducts(button.dataset.filter);
  });
});

generateCampaign.addEventListener("click", renderCampaign);

creatorLoginButton.addEventListener("click", () => {
  openAuthModal(loginStep);
});

ownerDashboardButton.addEventListener("click", () => {
  openOwnerDashboard();
});

openAccountButton.addEventListener("click", () => {
  openAuthModal(registerStep);
});

forgotPasswordButton.addEventListener("click", () => {
  openAuthModal(resetRequestStep);
});

closeAuthModal.addEventListener("click", closeAuthDialog);

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) {
    closeAuthDialog();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !authModal.hidden) {
    closeAuthDialog();
  }
});

switchToRegister.addEventListener("click", () => {
  showAuthStep(registerStep);
  setMessage(loginMessage);
});

switchToReset.addEventListener("click", () => {
  showAuthStep(resetRequestStep);
  setMessage(loginMessage);
});

backToLogin.addEventListener("click", () => {
  showAuthStep(loginStep);
  setMessage(resetRequestMessage);
});

backToLoginFromRegister.addEventListener("click", () => {
  showAuthStep(loginStep);
  setMessage(registerMessage);
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const account = findAccountByIdentifier(loginIdentifier.value);

  if (!account || account.password !== loginPassword.value) {
    setMessage(loginMessage, "Email, phone number, or password is incorrect.", "error");
    return;
  }

  setMessage(loginMessage, `Welcome back, ${account.name}. Role: ${account.role}.`, "success");
  showToast(`Logged in as ${account.name}.`);

  if (account.role === "Super Admin") {
    closeAuthDialog();
    openOwnerDashboard("Super Admin access confirmed.");
  }
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = normalizeEmail(registerEmail.value);
  const phone = normalizePhone(registerPhone.value);

  if (registeredAccounts.some((account) => normalizeEmail(account.email || "") === email)) {
    setMessage(registerMessage, "An account already exists with that email.", "error");
    return;
  }

  if (
    phone &&
    registeredAccounts.some((account) => normalizePhone(account.phone || "") === phone)
  ) {
    setMessage(registerMessage, "An account already exists with that phone number.", "error");
    return;
  }

  if (registerPassword.value !== registerConfirmPassword.value) {
    setMessage(registerMessage, "The passwords do not match.", "error");
    return;
  }

  const account = {
    name: registerName.value.trim(),
    email,
    phone: phone ? `+${phone}` : "",
    password: registerPassword.value,
    role: registerRole.value,
  };

  registeredAccounts.push(account);
  saveRegisteredAccounts();
  adminUsers.push({
    name: account.name,
    email: account.email,
    role: account.role,
    access: account.role === "Seller" ? "Store dashboard" : "Campaigns",
    status: "New",
  });
  renderAdminUsers();

  loginIdentifier.value = account.email;
  loginPassword.value = "";
  registerForm.reset();
  setMessage(loginMessage, "Account created. You can log in with your email now.", "success");
  showAuthStep(loginStep);
  showToast(`Account opened for ${account.name}.`);
});

ownerDashboard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-action]");

  if (!button) {
    return;
  }

  showToast(`Super Admin action ready: ${button.dataset.adminAction}.`);
});

otpRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const account = findAccountByIdentifier(resetIdentifier.value);

  if (!account) {
    setMessage(resetRequestMessage, "No account is registered with that email or phone.", "error");
    return;
  }

  if (!account.email) {
    setMessage(resetRequestMessage, "This account has no recovery email attached.", "error");
    return;
  }

  setMessage(resetRequestMessage);
  await startPasswordReset(account);
});

resendOtpButton.addEventListener("click", async () => {
  if (!resetSession) {
    showAuthStep(resetRequestStep);
    return;
  }

  await startPasswordReset(resetSession.account);
});

passwordResetForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!resetSession) {
    setMessage(passwordResetMessage, "Request a new OTP before resetting your password.", "error");
    return;
  }

  if (Date.now() > resetSession.expiresAt) {
    setMessage(passwordResetMessage, "That OTP has expired. Resend OTP to continue.", "error");
    return;
  }

  if (otpCode.value.trim() !== resetSession.otp) {
    setMessage(passwordResetMessage, "The OTP code is incorrect.", "error");
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    setMessage(passwordResetMessage, "The passwords do not match.", "error");
    return;
  }

  resetSession.account.password = newPassword.value;
  saveRegisteredAccounts();
  loginIdentifier.value = resetSession.account.email;
  loginPassword.value = "";
  resetSession = null;
  passwordResetForm.reset();
  setMessage(loginMessage, "Password reset complete. You can log in with your email now.", "success");
  showAuthStep(loginStep);
  showToast("Password reset complete.");
});

renderProducts();
renderFeatures();
renderAdminMetrics();
renderAdminControls();
syncAdminUsersFromAccounts();
renderAdminUsers();
renderAdminActivity();
renderRoadmap();
