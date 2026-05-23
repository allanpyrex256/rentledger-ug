(function () {
  const STORAGE_KEY = "rentledger_ug_mvp_v1";
  const state = loadState();
  let supabaseClient = null;
  let supabaseReady = false;
  let supabaseHydrating = false;
  let supabaseSaveTimer = null;
  let authVisible = false;

  const SUPABASE_TABLES = [
    { stateKey: "users", table: "app_users" },
    { stateKey: "subscriptions", table: "subscriptions" },
    { stateKey: "properties", table: "properties" },
    { stateKey: "units", table: "units" },
    { stateKey: "tenants", table: "tenants" },
    { stateKey: "payments", table: "payments" },
    { stateKey: "expenses", table: "expenses" },
    { stateKey: "supportTickets", table: "support_tickets" },
    { stateKey: "notifications", table: "notifications" },
  ];

  const SUPABASE_DELETE_ORDER = [
    "notifications",
    "supportTickets",
    "expenses",
    "payments",
    "tenants",
    "units",
    "properties",
    "subscriptions",
    "users",
  ];

  const ui = {
    landingScreen: document.getElementById("landingScreen"),
    authScreen: document.getElementById("authScreen"),
    appShell: document.getElementById("appShell"),
    loadingBar: document.getElementById("loadingBar"),
    signInForm: document.getElementById("signInForm"),
    signInIdentifier: document.getElementById("signInIdentifier"),
    signInPassword: document.getElementById("signInPassword"),
    forgotPasswordButton: document.getElementById("forgotPasswordButton"),
    forgotPasswordForm: document.getElementById("forgotPasswordForm"),
    resetIdentifier: document.getElementById("resetIdentifier"),
    cancelPasswordReset: document.getElementById("cancelPasswordReset"),
    resetPasswordForm: document.getElementById("resetPasswordForm"),
    resetOtpEmail: document.getElementById("resetOtpEmail"),
    resetOtp: document.getElementById("resetOtp"),
    resetNewPassword: document.getElementById("resetNewPassword"),
    resetConfirmPassword: document.getElementById("resetConfirmPassword"),
    resetOtpNotice: document.getElementById("resetOtpNotice"),
    resetPasswordBack: document.getElementById("resetPasswordBack"),
    createAccountForm: document.getElementById("createAccountForm"),
    accountName: document.getElementById("accountName"),
    accountPhone: document.getElementById("accountPhone"),
    accountEmail: document.getElementById("accountEmail"),
    accountPassword: document.getElementById("accountPassword"),
    demoLogin: document.getElementById("demoLogin"),
    logoutButton: document.getElementById("logoutButton"),
    sideNav: document.getElementById("sideNav"),
    mobileTabs: document.getElementById("mobileTabs"),
    currentAccountName: document.getElementById("currentAccountName"),
    currentAccountPhone: document.getElementById("currentAccountPhone"),
    viewTitle: document.getElementById("viewTitle"),
    viewSubtitle: document.getElementById("viewSubtitle"),
    globalSearch: document.getElementById("globalSearch"),
    propertyFilter: document.getElementById("propertyFilter"),
    notificationToggle: document.getElementById("notificationToggle"),
    notificationCount: document.getElementById("notificationCount"),
    notificationPanel: document.getElementById("notificationPanel"),
    notificationList: document.getElementById("notificationList"),
    markNotificationsRead: document.getElementById("markNotificationsRead"),
    roleSelect: document.getElementById("roleSelect"),
    metricGrid: document.getElementById("metricGrid"),
    dashboardPrimaryTitle: document.getElementById("dashboardPrimaryTitle"),
    dashboardSecondaryTitle: document.getElementById("dashboardSecondaryTitle"),
    dashboardRecentTitle: document.getElementById("dashboardRecentTitle"),
    upcomingDuesHead: document.getElementById("upcomingDuesHead"),
    recentPaymentsHead: document.getElementById("recentPaymentsHead"),
    unitStatusGrid: document.getElementById("unitStatusGrid"),
    upcomingDuesTable: document.getElementById("upcomingDuesTable"),
    recentPaymentsTable: document.getElementById("recentPaymentsTable"),
    dashboardChartTitle: document.getElementById("dashboardChartTitle"),
    dashboardChartLabel: document.getElementById("dashboardChartLabel"),
    dashboardChart: document.getElementById("dashboardChart"),
    dashboardActivityTitle: document.getElementById("dashboardActivityTitle"),
    activityCountLabel: document.getElementById("activityCountLabel"),
    activityList: document.getElementById("activityList"),
    propertyForm: document.getElementById("propertyForm"),
    propertyFormTitle: document.getElementById("propertyFormTitle"),
    propertyFormMode: document.getElementById("propertyFormMode"),
    propertyId: document.getElementById("propertyId"),
    propertyName: document.getElementById("propertyName"),
    propertyLocation: document.getElementById("propertyLocation"),
    propertyType: document.getElementById("propertyType"),
    cancelPropertyEdit: document.getElementById("cancelPropertyEdit"),
    propertyTable: document.getElementById("propertyTable"),
    propertyCountLabel: document.getElementById("propertyCountLabel"),
    unitForm: document.getElementById("unitForm"),
    unitProperty: document.getElementById("unitProperty"),
    unitNumber: document.getElementById("unitNumber"),
    unitRent: document.getElementById("unitRent"),
    unitTable: document.getElementById("unitTable"),
    unitCountLabel: document.getElementById("unitCountLabel"),
    tenantForm: document.getElementById("tenantForm"),
    tenantFormTitle: document.getElementById("tenantFormTitle"),
    tenantFormMode: document.getElementById("tenantFormMode"),
    tenantId: document.getElementById("tenantId"),
    tenantName: document.getElementById("tenantName"),
    tenantPhone: document.getElementById("tenantPhone"),
    tenantNationalId: document.getElementById("tenantNationalId"),
    tenantUnit: document.getElementById("tenantUnit"),
    tenantRent: document.getElementById("tenantRent"),
    tenantDeposit: document.getElementById("tenantDeposit"),
    tenantMoveIn: document.getElementById("tenantMoveIn"),
    tenantTable: document.getElementById("tenantTable"),
    tenantSearch: document.getElementById("tenantSearch"),
    cancelTenantEdit: document.getElementById("cancelTenantEdit"),
    staffInviteForm: document.getElementById("staffInviteForm"),
    staffName: document.getElementById("staffName"),
    staffPhone: document.getElementById("staffPhone"),
    staffEmail: document.getElementById("staffEmail"),
    staffPassword: document.getElementById("staffPassword"),
    staffProperties: document.getElementById("staffProperties"),
    staffTable: document.getElementById("staffTable"),
    staffCountLabel: document.getElementById("staffCountLabel"),
    paymentForm: document.getElementById("paymentForm"),
    paymentTenant: document.getElementById("paymentTenant"),
    paymentAmount: document.getElementById("paymentAmount"),
    paymentDate: document.getElementById("paymentDate"),
    paymentMethod: document.getElementById("paymentMethod"),
    paymentReference: document.getElementById("paymentReference"),
    paymentStatusPill: document.getElementById("paymentStatusPill"),
    tenantBalancePreview: document.getElementById("tenantBalancePreview"),
    rentStatusTable: document.getElementById("rentStatusTable"),
    paymentHistoryTable: document.getElementById("paymentHistoryTable"),
    paymentCountLabel: document.getElementById("paymentCountLabel"),
    expenseForm: document.getElementById("expenseForm"),
    expenseProperty: document.getElementById("expenseProperty"),
    expenseType: document.getElementById("expenseType"),
    expenseAmount: document.getElementById("expenseAmount"),
    expenseDate: document.getElementById("expenseDate"),
    expenseTable: document.getElementById("expenseTable"),
    expenseTotalLabel: document.getElementById("expenseTotalLabel"),
    expenseMonthLabel: document.getElementById("expenseMonthLabel"),
    expenseSummary: document.getElementById("expenseSummary"),
    reminderList: document.getElementById("reminderList"),
    reminderCountLabel: document.getElementById("reminderCountLabel"),
    dueTomorrowTemplate: document.getElementById("dueTomorrowTemplate"),
    receivedTemplate: document.getElementById("receivedTemplate"),
    overdueTemplate: document.getElementById("overdueTemplate"),
    occupancyLabel: document.getElementById("occupancyLabel"),
    dueSoonLabel: document.getElementById("dueSoonLabel"),
    monthLabel: document.getElementById("monthLabel"),
    rentStatusLabel: document.getElementById("rentStatusLabel"),
    resetDemo: document.getElementById("resetDemo"),
    ownerLandlordCountLabel: document.getElementById("ownerLandlordCountLabel"),
    ownerLandlordSummary: document.getElementById("ownerLandlordSummary"),
    ownerLandlordTable: document.getElementById("ownerLandlordTable"),
    ownerPaymentForm: document.getElementById("ownerPaymentForm"),
    ownerPaymentLandlord: document.getElementById("ownerPaymentLandlord"),
    ownerPaymentAmount: document.getElementById("ownerPaymentAmount"),
    ownerPaymentDate: document.getElementById("ownerPaymentDate"),
    ownerPaymentMethod: document.getElementById("ownerPaymentMethod"),
    ownerPaymentNote: document.getElementById("ownerPaymentNote"),
    ownerBillingTotalLabel: document.getElementById("ownerBillingTotalLabel"),
    ownerBillingSummary: document.getElementById("ownerBillingSummary"),
    ownerBillingTable: document.getElementById("ownerBillingTable"),
    supportTicketForm: document.getElementById("supportTicketForm"),
    supportOwner: document.getElementById("supportOwner"),
    supportSubject: document.getElementById("supportSubject"),
    supportPriority: document.getElementById("supportPriority"),
    supportStatus: document.getElementById("supportStatus"),
    supportNote: document.getElementById("supportNote"),
    supportTicketCount: document.getElementById("supportTicketCount"),
    supportTicketList: document.getElementById("supportTicketList"),
    adminPasswordResetForm: document.getElementById("adminPasswordResetForm"),
    adminPasswordResetUser: document.getElementById("adminPasswordResetUser"),
    receiptModal: document.getElementById("receiptModal"),
    receiptContent: document.getElementById("receiptContent"),
    closeReceipt: document.getElementById("closeReceipt"),
    printReceipt: document.getElementById("printReceipt"),
    downloadReceipt: document.getElementById("downloadReceipt"),
    toast: document.getElementById("toast"),
  };

  const viewCopy = {
    dashboard: ["Dashboard", "Rent, occupancy, expenses, and balances at a glance."],
    properties: ["Properties", "Set up houses, apartments, units, and monthly rent."],
    tenants: ["Tenants", "Tenant records, units, deposits, and contacts."],
    staff: ["Staff", "Invite managers and assign access to specific properties."],
    rent: ["Rent", "Record payments, partial balances, and Mobile Money references."],
    expenses: ["Expenses", "Repairs, utilities, salaries, and operating costs."],
    reminders: ["Reminders", "SMS and WhatsApp messages for rent collection."],
    platformLandlords: ["Landlords", "Manage landlord accounts, portfolios, plans, and assistance status."],
    platformBilling: ["Billing", "Monitor software revenue, subscriptions, and payment status."],
    platformSupport: ["Support", "Handle landlord assistance requests from the backend."],
  };

  const landlordNav = [
    ["dashboard", "Dashboard"],
    ["properties", "Properties"],
    ["tenants", "Tenants"],
    ["staff", "Staff"],
    ["rent", "Rent"],
    ["expenses", "Expenses"],
    ["reminders", "Reminders"],
  ];

  const ownerNav = [
    ["dashboard", "Owner Dashboard"],
    ["platformLandlords", "Landlords"],
    ["properties", "Properties"],
    ["tenants", "Tenants"],
    ["rent", "Rent"],
    ["platformBilling", "Billing"],
    ["platformSupport", "Support"],
  ];

  const staffNav = [
    ["dashboard", "Dashboard"],
    ["properties", "Properties"],
    ["tenants", "Tenants"],
    ["rent", "Rent"],
    ["reminders", "Reminders"],
  ];

  initialize();

  async function initialize() {
    await hydrateStateFromSupabase();
    setTodayDefaults();
    bindEvents();
    renderSession();
  }

  function bindEvents() {
    document.querySelectorAll("[data-open-auth]").forEach((button) => {
      button.addEventListener("click", () => showAuth(button.dataset.openAuth || "signin"));
    });

    document.querySelectorAll("[data-start-demo]").forEach((button) => {
      button.addEventListener("click", signInDemoAccount);
    });

    document.querySelectorAll("[data-scroll-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.scrollTarget);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
    });

    ui.signInForm.addEventListener("submit", signIn);
    ui.forgotPasswordButton.addEventListener("click", showForgotPassword);
    ui.forgotPasswordForm.addEventListener("submit", requestPasswordReset);
    ui.cancelPasswordReset.addEventListener("click", returnToSignIn);
    ui.resetPasswordForm.addEventListener("submit", resetPassword);
    ui.resetPasswordBack.addEventListener("click", returnToSignIn);
    ui.createAccountForm.addEventListener("submit", createAccount);
    if (ui.demoLogin) ui.demoLogin.addEventListener("click", signInDemoAccount);
    ui.logoutButton.addEventListener("click", signOut);

    ui.sideNav.addEventListener("click", navigateFromEvent);
    ui.mobileTabs.addEventListener("click", navigateFromEvent);
    ui.globalSearch.addEventListener("input", () => {
      state.searchTerm = ui.globalSearch.value;
      saveState();
      renderAll();
    });
    ui.notificationToggle.addEventListener("click", toggleNotifications);
    ui.markNotificationsRead.addEventListener("click", markNotificationsRead);

    ui.propertyFilter.addEventListener("change", () => {
      state.selectedPropertyId = ui.propertyFilter.value;
      saveState();
      renderAll();
    });

    ui.roleSelect.addEventListener("change", () => {
      state.role = ui.roleSelect.value;
      saveState();
      renderAll();
      showToast(
        state.role === "caretaker"
          ? "Caretaker mode limits removals."
          : state.role === "saas-owner"
            ? "Website owner platform mode active."
            : "Landlord mode restored."
      );
    });

    ui.propertyForm.addEventListener("submit", saveProperty);
    ui.cancelPropertyEdit.addEventListener("click", resetPropertyForm);
    ui.unitForm.addEventListener("submit", saveUnit);
    ui.tenantSearch.addEventListener("input", renderTenants);
    ui.tenantUnit.addEventListener("change", syncRentFromUnit);
    ui.cancelTenantEdit.addEventListener("click", resetTenantForm);
    ui.tenantForm.addEventListener("submit", saveTenant);
    ui.staffInviteForm.addEventListener("submit", inviteStaff);
    ui.paymentForm.addEventListener("submit", savePayment);
    ui.paymentTenant.addEventListener("change", updatePaymentPreview);
    ui.paymentAmount.addEventListener("input", updatePaymentPreview);
    ui.expenseForm.addEventListener("submit", saveExpense);
    ui.ownerPaymentForm.addEventListener("submit", saveOwnerPayment);
    ui.supportTicketForm.addEventListener("submit", saveSupportTicket);
    ui.adminPasswordResetForm.addEventListener("submit", sendAdminPasswordReset);
    ui.closeReceipt.addEventListener("click", closeReceipt);
    ui.printReceipt.addEventListener("click", printReceipt);
    ui.downloadReceipt.addEventListener("click", downloadReceipt);
    ui.resetDemo.addEventListener("click", resetDemoData);
  }

  function navigateFromEvent(event) {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    setView(button.dataset.view);
  }

  function setAuthTab(tabName) {
    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.authTab === tabName);
    });
    ui.signInForm.classList.toggle("hidden", tabName !== "signin");
    ui.createAccountForm.classList.toggle("hidden", tabName !== "signup");
    ui.forgotPasswordForm.classList.toggle("hidden", tabName !== "forgot");
    ui.resetPasswordForm.classList.toggle("hidden", tabName !== "reset");
  }

  function showAuth(tabName) {
    authVisible = true;
    setAuthTab(tabName);
    renderSession();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function signIn(event) {
    event.preventDefault();
    const loginIdentifier = ui.signInIdentifier.value;
    const password = ui.signInPassword.value;
    const user = state.users.find(
      (item) => loginIdentifierMatches(item, loginIdentifier) && item.password === password
    );

    if (!user || !["landlord", "saas-owner", "staff"].includes(user.role)) {
      showToast("Use a valid phone or email and password.");
      return;
    }

    openUserSession(user.id);
    ui.signInForm.reset();
    showToast(`Welcome, ${user.name}.`);
  }

  function showForgotPassword() {
    ui.forgotPasswordForm.reset();
    if (ui.signInIdentifier.value.trim()) {
      ui.resetIdentifier.value = ui.signInIdentifier.value.trim();
    }
    setAuthTab("forgot");
  }

  function returnToSignIn() {
    clearPasswordResetForms();
    setAuthTab("signin");
  }

  function requestPasswordReset(event) {
    event.preventDefault();
    const identifier = ui.resetIdentifier.value.trim();
    const user = state.users.find((item) => loginIdentifierMatches(item, identifier));

    if (!user || !["landlord", "saas-owner", "staff"].includes(user.role)) {
      showToast("No account found for those details.");
      return;
    }

    const resetEmail = passwordResetEmail(user);
    if (!resetEmail) {
      showToast("This account does not have a reset email.");
      return;
    }

    const otp = makeOtp();
    state.passwordReset = {
      user_id: user.id,
      email: resetEmail,
      otp,
      expires_at: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    };
    saveState();

    ui.resetPasswordForm.reset();
    ui.resetOtpEmail.value = maskEmailAddress(resetEmail);
    ui.resetOtpNotice.textContent = `Demo OTP: ${otp}`;
    ui.resetOtpNotice.classList.remove("hidden");
    setAuthTab("reset");
    showToast(`OTP sent to ${maskEmailAddress(resetEmail)}.`);
  }

  function resetPassword(event) {
    event.preventDefault();
    const resetRequest = state.passwordReset;
    if (!resetRequest) {
      showToast("Request a new OTP first.");
      setAuthTab("forgot");
      return;
    }
    if (Date.now() > Number(resetRequest.expires_at)) {
      state.passwordReset = null;
      saveState();
      showToast("OTP expired. Request a new one.");
      setAuthTab("forgot");
      return;
    }

    const user = state.users.find((item) => item.id === resetRequest.user_id);
    if (!user) {
      state.passwordReset = null;
      saveState();
      showToast("Account not found.");
      setAuthTab("signin");
      return;
    }

    if (ui.resetOtp.value.trim() !== resetRequest.otp) {
      const attempts = Number(resetRequest.attempts || 0) + 1;
      if (attempts >= 5) {
        state.passwordReset = null;
        saveState();
        showToast("Too many OTP attempts. Request a new one.");
        setAuthTab("forgot");
        return;
      }
      state.passwordReset = { ...resetRequest, attempts };
      saveState();
      showToast("OTP does not match.");
      return;
    }
    if (ui.resetNewPassword.value.length < 4) {
      showToast("Use a password with at least 4 characters.");
      return;
    }
    if (ui.resetNewPassword.value !== ui.resetConfirmPassword.value) {
      showToast("Passwords do not match.");
      return;
    }

    user.password = ui.resetNewPassword.value;
    state.passwordReset = null;
    saveState();
    clearPasswordResetForms();
    ui.signInIdentifier.value = user.email || user.phone || "";
    ui.signInPassword.value = "";
    setAuthTab("signin");
    showToast("Password reset. Sign in with the new password.");
  }

  function signInDemoAccount() {
    const demoUser = state.users.find((user) => user.id === "user-1") || state.users[0];
    if (!demoUser) return;
    openUserSession(demoUser.id);
    showToast(`Demo account opened for ${demoUser.name}.`);
  }

  function createAccount(event) {
    event.preventDefault();
    const phone = ui.accountPhone.value.trim();
    const email = ui.accountEmail.value.trim();
    const normalizedPhone = normalizeLoginPhone(phone);
    const normalizedEmail = normalizeLoginEmail(email);
    const duplicatePhone = state.users.some((user) => normalizeLoginPhone(user.phone) === normalizedPhone);
    const duplicateEmail =
      normalizedEmail && state.users.some((user) => normalizeLoginEmail(user.email) === normalizedEmail);

    if (duplicatePhone) {
      showToast("That phone number already has an account.");
      return;
    }
    if (!normalizedEmail) {
      showToast("Add an email address for password resets.");
      return;
    }
    if (duplicateEmail) {
      showToast("That email address already has an account.");
      return;
    }

    const user = {
      id: makeId("user"),
      name: ui.accountName.value.trim(),
      phone,
      email,
      creator_email: email,
      password: ui.accountPassword.value,
      role: "landlord",
    };

    state.users.push(user);
    state.currentUserId = user.id;
    state.selectedPropertyId = "all";
    state.role = "landlord";
    saveState();
    ui.createAccountForm.reset();
    renderSession();
    setView("properties");
    showToast("Landlord account opened.");
  }

  function openUserSession(userId) {
    const user = state.users.find((item) => item.id === userId);
    state.currentUserId = userId;
    state.selectedPropertyId = "all";
    state.role = user && user.role === "saas-owner" ? "saas-owner" : user && user.role === "staff" ? "staff" : "landlord";
    saveState();
    renderSession();
    setView(defaultView());
  }

  function signOut() {
    state.currentUserId = null;
    saveState();
    authVisible = false;
    renderSession();
    showToast("Signed out.");
  }

  function renderSession() {
    const user = currentUser();
    ui.landingScreen.classList.toggle("hidden", Boolean(user) || authVisible);
    ui.authScreen.classList.toggle("hidden", Boolean(user) || !authVisible);
    ui.appShell.classList.toggle("hidden", !user);

    if (!user) {
      return;
    }

    ui.currentAccountName.textContent = user.name;
    ui.currentAccountPhone.textContent = `${userContactLabel(user)} - ${roleLabel(user.role)}`;
    ui.globalSearch.value = state.searchTerm || "";
    renderNavigation();
    ensureSelectedProperty();
    renderAll();
  }

  function setAppLoading(message) {
    if (!ui.loadingBar) return;
    ui.loadingBar.querySelector("strong").textContent = message;
    ui.loadingBar.classList.remove("hidden");
    window.clearTimeout(setAppLoading.timer);
  }

  function clearAppLoading() {
    if (!ui.loadingBar) return;
    window.clearTimeout(setAppLoading.timer);
    setAppLoading.timer = window.setTimeout(() => {
      ui.loadingBar.classList.add("hidden");
    }, 380);
  }

  function renderNavigation() {
    const items = currentNavItems();
    const activeView = document.querySelector(".view.active-view")?.id || defaultView();
    const activeExists = items.some(([viewName]) => viewName === activeView);
    const nextActive = activeExists ? activeView : defaultView();
    ui.sideNav.innerHTML = items
      .map(([viewName, label]) => navButton("nav-item", viewName, label, viewName === nextActive))
      .join("");
    ui.mobileTabs.innerHTML = items
      .map(([viewName, label]) => navButton("mobile-tab", viewName, label, viewName === nextActive))
      .join("");
    if (!activeExists) setView(nextActive);
  }

  function navButton(className, viewName, label, active) {
    return `<button class="${className}${active ? " active" : ""}" data-view="${viewName}" type="button">${escapeHtml(label)}</button>`;
  }

  function currentNavItems() {
    if (currentUser()?.role === "staff") return staffNav;
    return isSaasOwner() ? ownerNav : landlordNav;
  }

  function defaultView() {
    return "dashboard";
  }

  function populateStaticControls() {
    const properties = ownerProperties();
    const propertyOptions = [
      '<option value="all">All properties</option>',
      ...properties.map((property) => `<option value="${property.id}">${escapeHtml(propertyOptionLabel(property))}</option>`),
    ].join("");

    ui.propertyFilter.innerHTML = propertyOptions;
    ui.propertyFilter.value = state.selectedPropertyId || "all";

    const assignableProperties =
      properties
        .map((property) => `<option value="${property.id}">${escapeHtml(propertyOptionLabel(property))}</option>`)
        .join("") || '<option value="">Add a property first</option>';

    ui.expenseProperty.innerHTML = assignableProperties;
    ui.unitProperty.innerHTML = assignableProperties;
    if (ui.staffProperties) {
      ui.staffProperties.innerHTML = assignableProperties;
    }
    populateOwnerControls();
    populateRoleOptions();
  }

  function populateOwnerControls() {
    if (!isSaasOwner()) return;
    const landlordOptions =
      landlordUsers()
        .map((user) => `<option value="${user.id}">${escapeHtml(user.name)} - ${escapeHtml(userContactLabel(user))}</option>`)
        .join("") || '<option value="">No landlords yet</option>';
    ui.ownerPaymentLandlord.innerHTML = landlordOptions;
    ui.supportOwner.innerHTML = landlordOptions;
    ui.adminPasswordResetUser.innerHTML =
      resettableUsers()
        .map((user) => `<option value="${user.id}">${escapeHtml(adminResetOptionLabel(user))}</option>`)
        .join("") || '<option value="">No resettable accounts</option>';
  }

  function populateRoleOptions() {
    const user = currentUser();
    const options =
      user && user.role === "saas-owner"
        ? [{ value: "saas-owner", label: "Website Owner" }]
        : user && user.role === "staff"
          ? [{ value: "staff", label: "Staff / Manager" }]
        : [
            { value: "landlord", label: "Landlord" },
            { value: "caretaker", label: "Caretaker" },
          ];
    const nextRole = options.some((option) => option.value === state.role) ? state.role : options[0].value;
    if (state.role !== nextRole) {
      state.role = nextRole;
      saveState();
    }
    ui.roleSelect.innerHTML = options
      .map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`)
      .join("");
    ui.roleSelect.value = state.role;
  }

  function renderAll() {
    setAppLoading("Updating dashboard");
    ensureSelectedProperty();
    populateStaticControls();
    populateDynamicSelects();
    renderDashboard();
    renderProperties();
    renderTenants();
    renderStaff();
    renderRent();
    renderExpenses();
    renderReminders();
    renderPlatformViews();
    renderNotifications();
    clearAppLoading();
  }

  function setView(viewName) {
    setAppLoading("Loading view");
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active-view", view.id === viewName);
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewName);
    });
    const [title, subtitle] =
      viewName === "dashboard" && isSaasOwner()
        ? ["Owner Dashboard", "Track SaaS revenue, landlord accounts, billing, and support from one console."]
        : viewCopy[viewName] || viewCopy.dashboard;
    ui.viewTitle.textContent = title;
    ui.viewSubtitle.textContent = subtitle;
    clearAppLoading();
  }

  function renderDashboard() {
    if (isSaasOwner()) {
      renderPlatformDashboard();
      return;
    }

    const scope = getScopedData();
    const rentRows = getRentRows(scope.tenants);
    const currentMonthPayments = getCurrentMonthPayments(scope.payments);
    const currentMonthExpenses = getCurrentMonthExpenses(scope.expenses);
    const occupied = scope.units.filter((unit) => unit.status === "occupied").length;
    const vacant = scope.units.filter((unit) => unit.status === "vacant").length;
    const expectedRent = scope.tenants.reduce((sum, tenant) => sum + Number(tenant.rent_amount), 0);
    const collected = currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const expenses = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const overdueCount = rentRows.filter((row) => row.status === "Overdue").length;
    const dueSoonCount = rentRows.filter((row) => row.daysUntilDue >= 0 && row.daysUntilDue <= 3).length;

    ui.dashboardPrimaryTitle.textContent = "Occupancy";
    ui.dashboardSecondaryTitle.textContent = "Upcoming Dues";
    ui.dashboardRecentTitle.textContent = "Recent Payments";
    ui.dashboardActivityTitle.textContent = "Recent Activity";
    ui.upcomingDuesHead.innerHTML = `
      <th>Tenant</th>
      <th>Unit</th>
      <th>Due</th>
      <th>Status</th>
    `;
    ui.recentPaymentsHead.innerHTML = `
      <th>Tenant</th>
      <th>Amount</th>
      <th>Method</th>
      <th>Date</th>
      <th>Balance</th>
    `;

    ui.metricGrid.innerHTML = [
      metricCard("Properties", scope.properties.length, `${scope.units.length} houses / units`),
      metricCard("Monthly Revenue", formatMoney(collected), `${formatMoney(expectedRent)} expected`),
      metricCard("Late Payments", overdueCount, `${formatMoney(totalBalance(rentRows))} outstanding`),
      metricCard("Net This Month", formatMoney(collected - expenses), `${occupied} occupied, ${vacant} vacant`),
    ].join("");

    ui.occupancyLabel.textContent = `${scope.units.length} units`;
    ui.dueSoonLabel.textContent = `${dueSoonCount} due`;
    ui.monthLabel.textContent = monthName(new Date());

    ui.unitStatusGrid.innerHTML =
      scope.units
        .map((unit) => {
          const property = propertyById(unit.property_id);
          return `
            <article class="unit-tile ${unit.status}">
              <div class="unit-number">${escapeHtml(unit.unit_number)}</div>
              <div class="unit-status">${capitalize(unit.status)} - ${escapeHtml(property ? property.location : "No property")}</div>
            </article>
          `;
        })
        .join("") || emptyBlock("No units available.");

    const upcomingRows = rentRows
      .slice()
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 8);
    ui.upcomingDuesTable.innerHTML =
      upcomingRows.map((row) => rentDueRow(row)).join("") ||
      emptyTableRow(4, "No active tenants.");

    const recent = scope.payments
      .slice()
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
      .slice(0, 8);
    ui.recentPaymentsTable.innerHTML =
      recent
        .map((payment) => {
          const tenant = tenantById(payment.tenant_id);
          return `
            <tr>
              <td>${personCell(tenant ? tenant.name : "Removed tenant", timeAgo(payment.payment_date))}</td>
              <td>${formatMoney(payment.amount)}</td>
              <td>${escapeHtml(payment.payment_method)}</td>
              <td>${formatDate(payment.payment_date)}</td>
              <td>${formatMoney(payment.balance)}</td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(5, "No payments recorded.");

    ui.dashboardChartTitle.textContent = "Income Trend";
    ui.dashboardChartLabel.textContent = monthName(new Date());
    ui.dashboardChart.innerHTML = renderIncomeChart(scope.payments);
    renderActivityFeed(buildActivityItems(scope).slice(0, 8));
  }

  function renderPlatformDashboard() {
    const landlords = landlordUsers();
    const subscriptions = state.subscriptions || [];
    const tickets = state.supportTickets || [];
    const activeSubscriptions = subscriptions.filter((subscription) => subscription.status !== "Paused");
    const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved");
    const portfolios = landlords.map((user) => ownerPortfolio(user.id));
    const totalProperties = portfolios.reduce((sum, item) => sum + item.properties.length, 0);
    const totalUnits = portfolios.reduce((sum, item) => sum + item.units.length, 0);
    const totalTenants = portfolios.reduce((sum, item) => sum + item.tenants.length, 0);
    const rentTracked = portfolios.reduce(
      (sum, item) => sum + getCurrentMonthPayments(item.payments).reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0),
      0
    );
    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const paidThisMonth = subscriptions
      .filter((subscription) => isCurrentMonth(subscription.last_payment_date))
      .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const billingAttention = subscriptions.filter((subscription) => subscription.status === "Overdue").length;

    ui.dashboardPrimaryTitle.textContent = "Platform Health";
    ui.dashboardSecondaryTitle.textContent = "Subscription Watchlist";
    ui.dashboardRecentTitle.textContent = "Support Activity";
    ui.dashboardActivityTitle.textContent = "Operator Activity";
    ui.upcomingDuesHead.innerHTML = `
      <th>Landlord</th>
      <th>Plan</th>
      <th>Monthly Fee</th>
      <th>Next Billing</th>
      <th>Status</th>
    `;
    ui.recentPaymentsHead.innerHTML = `
      <th>Landlord</th>
      <th>Issue</th>
      <th>Priority</th>
      <th>Updated</th>
      <th>Status</th>
    `;

    ui.metricGrid.innerHTML = [
      metricCard("SaaS MRR", formatMoney(monthlyRecurringRevenue), `${activeSubscriptions.length} paying accounts`),
      metricCard("Paid This Month", formatMoney(paidThisMonth), "Software subscription income"),
      metricCard("Landlords", landlords.length, `${totalProperties} properties managed`),
      metricCard("Open Support", openTickets.length, `${billingAttention} billing account needs attention`),
    ].join("");

    ui.occupancyLabel.textContent = `${totalUnits} managed units`;
    ui.dueSoonLabel.textContent = `${billingAttention} billing alerts`;
    ui.monthLabel.textContent = "Owner console";

    ui.unitStatusGrid.innerHTML = [
      ownerSummaryTile("Properties", totalProperties),
      ownerSummaryTile("Units", totalUnits),
      ownerSummaryTile("Tenants", totalTenants),
      ownerSummaryTile("Rent Tracked", formatMoney(rentTracked)),
      ownerSummaryTile("Subscriptions", subscriptions.length),
      ownerSummaryTile("Support Tickets", tickets.length),
    ].join("");

    ui.upcomingDuesTable.innerHTML =
      subscriptions
        .slice()
        .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))
        .map((subscription) => {
          const user = userById(subscription.owner_id);
          return `
            <tr>
              <td>${escapeHtml(user ? user.name : "Unknown landlord")}</td>
              <td>${escapeHtml(subscription.plan)}</td>
              <td>${formatMoney(subscription.monthly_fee)}</td>
              <td>${formatDate(subscription.next_billing_date)}</td>
              <td>${statusPill(subscription.status)}</td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(5, "No subscriptions yet.");

    ui.recentPaymentsTable.innerHTML =
      tickets
        .slice()
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 8)
        .map((ticket) => {
          const user = userById(ticket.owner_id);
          return `
            <tr>
              <td>${personCell(user ? user.name : "Unknown landlord", timeAgo(ticket.updated_at))}</td>
              <td>${escapeHtml(ticket.subject)}</td>
              <td>${statusPill(ticket.priority)}</td>
              <td>${formatDate(ticket.updated_at)}</td>
              <td>${statusPill(ticket.status)}</td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(5, "No support activity yet.");

    ui.dashboardChartTitle.textContent = "Platform Revenue";
    ui.dashboardChartLabel.textContent = "MRR + billing";
    ui.dashboardChart.innerHTML = renderOwnerChart(subscriptions);
    renderActivityFeed(buildPlatformActivityItems().slice(0, 8));
  }

  function renderPlatformViews() {
    if (!isSaasOwner()) return;
    renderPlatformLandlords();
    renderPlatformBilling();
    renderPlatformSupport();
  }

  function renderActivityFeed(items) {
    ui.activityCountLabel.textContent = `${items.length} updates`;
    ui.activityList.innerHTML =
      items
        .map((item) => `
          <article class="activity-item">
            ${avatar(item.name || item.title)}
            <div class="activity-copy">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.detail)}</span>
            </div>
            <time>${escapeHtml(timeAgo(item.date))}</time>
          </article>
        `)
        .join("") || emptyBlock("No recent activity yet.");
  }

  function buildActivityItems(scope) {
    const paymentItems = scope.payments.map((payment) => {
      const tenant = tenantById(payment.tenant_id);
      return {
        title: "Payment recorded",
        detail: `${tenant ? tenant.name : "Removed tenant"} paid ${formatMoney(payment.amount)} by ${payment.payment_method}.`,
        date: payment.payment_date,
        name: tenant ? tenant.name : "Payment",
      };
    });
    const expenseItems = scope.expenses.map((expense) => {
      const property = propertyById(expense.property_id);
      return {
        title: "Expense added",
        detail: `${expense.type} at ${property ? property.property_name : "Unknown property"} for ${formatMoney(expense.amount)}.`,
        date: expense.date,
        name: expense.type,
      };
    });
    const tenantItems = scope.tenants.map((tenant) => ({
      title: "Tenant active",
      detail: `${tenant.name} is assigned to ${unitById(tenant.unit_id)?.unit_number || "a unit"}.`,
      date: tenant.move_in_date,
      name: tenant.name,
    }));
    return [...paymentItems, ...expenseItems, ...tenantItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function buildPlatformActivityItems() {
    const ticketItems = (state.supportTickets || []).map((ticket) => {
      const user = userById(ticket.owner_id);
      return {
        title: ticket.subject,
        detail: `${user ? user.name : "Landlord"} support is ${ticket.status.toLowerCase()}.`,
        date: ticket.updated_at,
        name: user ? user.name : ticket.subject,
      };
    });
    const billingItems = (state.subscriptions || []).map((subscription) => {
      const user = userById(subscription.owner_id);
      return {
        title: `${subscription.plan} subscription`,
        detail: `${user ? user.name : "Landlord"} is ${subscription.status.toLowerCase()} at ${formatMoney(subscription.monthly_fee)}/month.`,
        date: subscription.last_payment_date || subscription.next_billing_date,
        name: user ? user.name : subscription.plan,
      };
    });
    return [...ticketItems, ...billingItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderIncomeChart(payments) {
    const days = [5, 10, 15, 20, 25, 30];
    const buckets = days.map((day) => {
      const total = payments
        .filter((payment) => new Date(`${payment.payment_date}T00:00:00`).getDate() <= day)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      return { label: `${day}`, total };
    });
    return chartMarkup(buckets, "UGX");
  }

  function renderOwnerChart(subscriptions) {
    const buckets = subscriptions.map((subscription) => ({
      label: subscription.plan.slice(0, 4),
      total: Number(subscription.monthly_fee),
    }));
    return chartMarkup(buckets, "MRR");
  }

  function chartMarkup(buckets, caption) {
    const max = Math.max(...buckets.map((bucket) => bucket.total), 1);
    return `
      <div class="bar-chart" aria-label="${escapeHtml(caption)} chart">
        ${buckets
          .map((bucket) => {
            const height = Math.max(10, Math.round((bucket.total / max) * 100));
            return `
              <div class="bar-item">
                <div class="bar-track"><span style="height:${height}%"></span></div>
                <strong>${escapeHtml(bucket.label)}</strong>
                <small>${formatCompactMoney(bucket.total)}</small>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPlatformLandlords() {
    const landlords = landlordUsers();
    const subscriptions = state.subscriptions || [];
    const tickets = state.supportTickets || [];
    const totalMrr = subscriptions
      .filter((subscription) => subscription.status !== "Paused")
      .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const totalOpenTickets = tickets.filter((ticket) => ticket.status !== "Resolved").length;

    ui.ownerLandlordCountLabel.textContent = `${landlords.length} landlords`;
    ui.ownerLandlordSummary.innerHTML = [
      ownerSummaryItem("Monthly SaaS Revenue", formatMoney(totalMrr)),
      ownerSummaryItem("Open Support", totalOpenTickets),
      ownerSummaryItem("Total Properties", state.properties.length),
      ownerSummaryItem("Total Units", state.units.length),
    ].join("");

    ui.ownerLandlordTable.innerHTML =
      landlords
        .filter((user) => {
          const subscription = subscriptionByOwner(user.id);
          const portfolio = ownerPortfolio(user.id);
          return matchesSearch([user.name, user.phone, user.email, subscription ? subscription.plan : "", portfolio.properties.map((property) => property.property_name).join(" ")]);
        })
        .map((user) => {
          const portfolio = ownerPortfolio(user.id);
          const subscription = subscriptionByOwner(user.id);
          const openTicketCount = tickets.filter((ticket) => ticket.owner_id === user.id && ticket.status !== "Resolved").length;
          const rentTracked = getCurrentMonthPayments(portfolio.payments).reduce((sum, payment) => sum + Number(payment.amount), 0);
          return `
            <tr>
              <td>
                <strong>${escapeHtml(user.name)}</strong>
                <small class="table-subtext">${escapeHtml(userContactLabel(user))}</small>
              </td>
              <td>
                ${escapeHtml(subscription ? subscription.plan : "No plan")}
                <small class="table-subtext">${subscription ? statusPill(subscription.status) : ""}</small>
              </td>
              <td>${portfolio.properties.length} properties / ${portfolio.units.length} units</td>
              <td>${formatMoney(rentTracked)}</td>
              <td>${openTicketCount} open</td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-open-landlord="${user.id}" type="button">Open Portfolio</button>
                  <button class="text-button" data-admin-reset-user="${user.id}" type="button">Send Reset OTP</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No landlord accounts yet.");

    ui.ownerLandlordTable.querySelectorAll("[data-open-landlord]").forEach((button) => {
      button.addEventListener("click", () => openLandlordPortfolio(button.dataset.openLandlord));
    });
    ui.ownerLandlordTable.querySelectorAll("[data-admin-reset-user]").forEach((button) => {
      button.addEventListener("click", () => createAdminPasswordReset(button.dataset.adminResetUser));
    });
  }

  function renderPlatformBilling() {
    const subscriptions = state.subscriptions || [];
    const currentMrr = subscriptions
      .filter((subscription) => subscription.status !== "Paused")
      .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const paidThisMonth = subscriptions
      .filter((subscription) => isCurrentMonth(subscription.last_payment_date))
      .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const overdue = subscriptions.filter((subscription) => subscription.status === "Overdue").length;

    ui.ownerBillingTotalLabel.textContent = formatMoney(currentMrr);
    ui.ownerBillingSummary.innerHTML = [
      ownerSummaryItem("MRR", formatMoney(currentMrr)),
      ownerSummaryItem("Paid This Month", formatMoney(paidThisMonth)),
      ownerSummaryItem("Overdue Accounts", overdue),
      ownerSummaryItem("Active Plans", subscriptions.filter((subscription) => subscription.status === "Active").length),
    ].join("");

    ui.ownerBillingTable.innerHTML =
      subscriptions
        .slice()
        .filter((subscription) => {
          const user = userById(subscription.owner_id);
          return matchesSearch([user ? user.name : "", subscription.plan, subscription.status, subscription.monthly_fee]);
        })
        .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))
        .map((subscription) => {
          const user = userById(subscription.owner_id);
          return `
            <tr>
              <td>${escapeHtml(user ? user.name : "Unknown landlord")}</td>
              <td>${escapeHtml(subscription.plan)}</td>
              <td>${formatMoney(subscription.monthly_fee)}</td>
              <td>${formatDate(subscription.last_payment_date)}</td>
              <td>${formatDate(subscription.next_billing_date)}</td>
              <td>${statusPill(subscription.status)}</td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No subscription records yet.");
  }

  function renderPlatformSupport() {
    const tickets = state.supportTickets || [];
    const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved");
    ui.supportTicketCount.textContent = `${openTickets.length} open`;
    ui.supportTicketList.innerHTML =
      tickets
        .slice()
        .filter((ticket) => {
          const user = userById(ticket.owner_id);
          return matchesSearch([ticket.subject, ticket.priority, ticket.status, ticket.note, user ? user.name : ""]);
        })
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .map((ticket) => {
          const user = userById(ticket.owner_id);
          const resolved = ticket.status === "Resolved";
          return `
            <article class="support-card">
              <div class="support-card-header">
                <div class="support-card-title">
                  <strong>${escapeHtml(ticket.subject)}</strong>
                  <small>${escapeHtml(user ? user.name : "Unknown landlord")} - ${formatDate(ticket.updated_at)}</small>
                </div>
                <div class="button-row">
                  ${statusPill(ticket.priority)}
                  ${statusPill(ticket.status)}
                </div>
              </div>
              <p class="support-note">${escapeHtml(ticket.note || "No support note added.")}</p>
              <div class="button-row">
                <button class="text-button" data-open-landlord="${ticket.owner_id}" type="button">Open Account</button>
                <button class="${resolved ? "text-button" : "primary-button"}" data-toggle-ticket="${ticket.id}" type="button">
                  ${resolved ? "Reopen" : "Mark Resolved"}
                </button>
              </div>
            </article>
          `;
        })
        .join("") || emptyBlock("No support tickets yet.");

    ui.supportTicketList.querySelectorAll("[data-toggle-ticket]").forEach((button) => {
      button.addEventListener("click", () => toggleSupportTicket(button.dataset.toggleTicket));
    });
    ui.supportTicketList.querySelectorAll("[data-open-landlord]").forEach((button) => {
      button.addEventListener("click", () => openLandlordPortfolio(button.dataset.openLandlord));
    });
  }

  function renderProperties() {
    const scope = getScopedData();
    const allOwnerProperties = ownerProperties();
    const removeDisabled = state.role === "caretaker" || currentUser()?.role === "staff" ? "disabled" : "";
    const properties = scope.properties.filter((property) =>
      matchesSearch([property.property_name, property.location, property.property_type, ownerName(property.owner_id)])
    );
    const units = scope.units.filter((unit) => {
      const property = propertyById(unit.property_id);
      return matchesSearch([unit.unit_number, unit.status, unit.rent_amount, property ? property.property_name : ""]);
    });

    ui.propertyCountLabel.textContent = `${allOwnerProperties.length} properties`;
    ui.unitCountLabel.textContent = `${scope.units.length} units`;

    ui.propertyTable.innerHTML =
      properties
        .map((property) => {
          const units = state.units.filter((unit) => unit.property_id === property.id);
          const occupied = units.filter((unit) => unit.status === "occupied").length;
          const expectedRent = units.reduce((sum, unit) => sum + Number(unit.rent_amount), 0);
          return `
            <tr>
              <td>
                <strong>${escapeHtml(property.property_name)}</strong>
                ${isSaasOwner() ? `<small class="table-subtext">Owner: ${escapeHtml(ownerName(property.owner_id))}</small>` : ""}
              </td>
              <td>${escapeHtml(property.location)}</td>
              <td>${escapeHtml(property.property_type || "Apartment")}</td>
              <td>${units.length}</td>
              <td>${occupied}/${units.length}</td>
              <td>${formatMoney(expectedRent)}</td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-edit-property="${property.id}" type="button">Edit</button>
                  <button class="danger-button" data-remove-property="${property.id}" ${removeDisabled} type="button">Remove</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(7, "No properties yet.");

    ui.unitTable.innerHTML =
      units
        .map((unit) => {
          const property = propertyById(unit.property_id);
          const hasTenant = Boolean(state.tenants.find((tenant) => tenant.unit_id === unit.id));
          return `
            <tr>
              <td>${escapeHtml(unit.unit_number)}</td>
              <td>${escapeHtml(property ? property.property_name : "Unknown")}</td>
              <td>${formatMoney(unit.rent_amount)}</td>
              <td>${statusPill(capitalize(unit.status))}</td>
              <td>
                <button class="danger-button" data-remove-unit="${unit.id}" ${removeDisabled || hasTenant ? "disabled" : ""} type="button">
                  ${hasTenant ? "Tenant assigned" : "Remove"}
                </button>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(5, "No houses or units yet.");

    document.querySelectorAll("[data-edit-property]").forEach((button) => {
      button.addEventListener("click", () => startPropertyEdit(button.dataset.editProperty));
    });
    document.querySelectorAll("[data-remove-property]").forEach((button) => {
      button.addEventListener("click", () => removeProperty(button.dataset.removeProperty));
    });
    document.querySelectorAll("[data-remove-unit]").forEach((button) => {
      button.addEventListener("click", () => removeUnit(button.dataset.removeUnit));
    });
  }

  function renderTenants() {
    const scope = getScopedData();
    const search = ui.tenantSearch.value.trim().toLowerCase();
    const tenants = scope.tenants.filter((tenant) => {
      const unit = unitById(tenant.unit_id);
      const property = unit ? propertyById(unit.property_id) : null;
      return matchesSearch([tenant.name, tenant.phone, tenant.national_id, unit ? unit.unit_number : "", property ? property.property_name : ""]) &&
        [tenant.name, tenant.phone, tenant.national_id, unit ? unit.unit_number : ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

    ui.tenantTable.innerHTML =
      tenants
        .map((tenant) => {
          const unit = unitById(tenant.unit_id);
          const removeDisabled = state.role === "caretaker" || currentUser()?.role === "staff" ? "disabled" : "";
          return `
            <tr>
              <td>${escapeHtml(tenant.name)}</td>
              <td>${escapeHtml(tenant.phone)}</td>
              <td>${escapeHtml(unit ? unit.unit_number : "Unassigned")}</td>
              <td>${formatMoney(tenant.rent_amount)}</td>
              <td>${formatMoney(tenant.deposit_paid)}</td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-edit-tenant="${tenant.id}" type="button">Edit</button>
                  <button class="danger-button" data-remove-tenant="${tenant.id}" ${removeDisabled} type="button">Remove</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No tenants match this view.");

    document.querySelectorAll("[data-edit-tenant]").forEach((button) => {
      button.addEventListener("click", () => startTenantEdit(button.dataset.editTenant));
    });
    document.querySelectorAll("[data-remove-tenant]").forEach((button) => {
      button.addEventListener("click", () => removeTenant(button.dataset.removeTenant));
    });
  }

  function renderStaff() {
    if (!ui.staffTable) return;
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      ui.staffCountLabel.textContent = "0 staff";
      ui.staffTable.innerHTML = emptyTableRow(4, "Staff invitations are available to landlord admins.");
      return;
    }

    const staff = staffUsersForOwner(user.id).filter((member) =>
      matchesSearch([member.name, member.phone, member.email, roleLabel(member.role), assignedPropertyNames(member).join(" ")])
    );
    ui.staffCountLabel.textContent = `${staff.length} staff`;
    ui.staffTable.innerHTML =
      staff
        .map((member) => `
          <tr>
            <td>
              <strong>${escapeHtml(member.name)}</strong>
              <small class="table-subtext">${escapeHtml(userContactLabel(member))}</small>
            </td>
            <td>${escapeHtml(assignedPropertyNames(member).join(", ") || "No properties assigned")}</td>
            <td>${statusPill(member.invitation_status || "Invited")}</td>
            <td>
              <div class="button-row">
                <button class="text-button" data-copy-staff-login="${member.id}" type="button">Copy Login</button>
                <button class="danger-button" data-remove-staff="${member.id}" type="button">Remove</button>
              </div>
            </td>
          </tr>
        `)
        .join("") || emptyTableRow(4, "No staff invited yet.");

    ui.staffTable.querySelectorAll("[data-copy-staff-login]").forEach((button) => {
      button.addEventListener("click", () => copyStaffLogin(button.dataset.copyStaffLogin));
    });
    ui.staffTable.querySelectorAll("[data-remove-staff]").forEach((button) => {
      button.addEventListener("click", () => removeStaff(button.dataset.removeStaff));
    });
  }

  function renderRent() {
    const scope = getScopedData();
    const rentRows = getRentRows(scope.tenants).filter((row) =>
      matchesSearch([row.tenant.name, row.unit ? row.unit.unit_number : "", row.status, row.balance])
    );
    ui.rentStatusLabel.textContent = monthName(new Date());
    ui.rentStatusTable.innerHTML =
      rentRows
        .map((row) => `
          <tr>
            <td>${escapeHtml(row.tenant.name)}</td>
            <td>${escapeHtml(row.unit ? row.unit.unit_number : "Unassigned")}</td>
            <td>${formatMoney(row.paid)}</td>
            <td>${formatMoney(row.balance)}</td>
            <td>${statusPill(row.status)}</td>
          </tr>
        `)
        .join("") || emptyTableRow(5, "No active rent records.");

    const payments = scope.payments
      .slice()
      .filter((payment) => {
        const tenant = tenantById(payment.tenant_id);
        const unit = tenant ? unitById(tenant.unit_id) : null;
        return matchesSearch([tenant ? tenant.name : "", unit ? unit.unit_number : "", payment.payment_method, payment.reference, payment.amount]);
      })
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
    ui.paymentCountLabel.textContent = `${payments.length} payments`;
    ui.paymentHistoryTable.innerHTML =
      payments
        .map((payment) => {
          const tenant = tenantById(payment.tenant_id);
          return `
            <tr>
              <td>${escapeHtml(tenant ? tenant.name : "Removed tenant")}</td>
              <td>${formatMoney(payment.amount)}</td>
              <td>${escapeHtml(payment.payment_method)}</td>
              <td>${escapeHtml(payment.reference || "-")}</td>
              <td>${formatDate(payment.payment_date)}</td>
              <td>${formatMoney(payment.balance)}</td>
              <td><button class="text-button" data-receipt-payment="${payment.id}" type="button">Receipt</button></td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(7, "No payment history yet.");

    ui.paymentHistoryTable.querySelectorAll("[data-receipt-payment]").forEach((button) => {
      button.addEventListener("click", () => openReceipt(button.dataset.receiptPayment));
    });

    updatePaymentPreview();
  }

  function renderExpenses() {
    const scope = getScopedData();
    const currentExpenses = getCurrentMonthExpenses(scope.expenses);
    const total = currentExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    ui.expenseTotalLabel.textContent = formatMoney(total);
    ui.expenseMonthLabel.textContent = monthName(new Date());

    const byType = currentExpenses.reduce((groups, expense) => {
      groups[expense.type] = (groups[expense.type] || 0) + Number(expense.amount);
      return groups;
    }, {});
    ui.expenseSummary.innerHTML =
      Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(
          ([type, amount]) => `
            <article class="expense-chip">
              <strong>${escapeHtml(type)}</strong>
              <span>${formatMoney(amount)}</span>
            </article>
          `
        )
        .join("") || emptyBlock("No expenses this month.");

    const removeDisabled = state.role === "caretaker" || currentUser()?.role === "staff" ? "disabled" : "";
    ui.expenseTable.innerHTML =
      scope.expenses
        .slice()
        .filter((expense) => {
          const property = propertyById(expense.property_id);
          return matchesSearch([expense.type, expense.amount, expense.date, property ? property.property_name : ""]);
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((expense) => {
          const property = propertyById(expense.property_id);
          return `
            <tr>
              <td>${escapeHtml(expense.type)}</td>
              <td>${escapeHtml(property ? property.property_name : "Unknown")}</td>
              <td>${formatMoney(expense.amount)}</td>
              <td>${formatDate(expense.date)}</td>
              <td><button class="danger-button" data-remove-expense="${expense.id}" ${removeDisabled} type="button">Remove</button></td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(5, "No expenses recorded.");

    document.querySelectorAll("[data-remove-expense]").forEach((button) => {
      button.addEventListener("click", () => removeExpense(button.dataset.removeExpense));
    });
  }

  function renderReminders() {
    const scope = getScopedData();
    const rows = getRentRows(scope.tenants);
    const reminders = rows
      .filter((row) => row.balance > 0 && (row.daysUntilDue <= 1 || row.status === "Overdue"))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    ui.reminderCountLabel.textContent = `${reminders.length} reminders`;
    ui.reminderList.innerHTML =
      reminders
        .map((row) => {
          const message = reminderMessage(row);
          const phone = normalizePhone(row.tenant.phone);
          return `
            <article class="reminder-item">
              <div class="reminder-main">
                <div class="reminder-title">${escapeHtml(row.tenant.name)} - ${escapeHtml(row.unit ? row.unit.unit_number : "Unit")}</div>
                <div class="reminder-copy">${escapeHtml(message)}</div>
              </div>
              <div class="button-row">
                <button class="text-button" data-copy-message="${encodeURIComponent(message)}" type="button">Copy SMS</button>
                <a class="primary-button link-button" href="https://wa.me/${phone}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </article>
          `;
        })
        .join("") || emptyBlock("No reminders in queue.");

    document.querySelectorAll("[data-copy-message]").forEach((button) => {
      button.addEventListener("click", () => copyText(decodeURIComponent(button.dataset.copyMessage)));
    });

    const sampleTenant = scope.tenants[0];
    ui.dueTomorrowTemplate.textContent = sampleTenant
      ? `Hello ${sampleTenant.name}, your rent of ${formatMoney(sampleTenant.rent_amount)} is due tomorrow. Thank you.`
      : "No tenant available.";
    ui.receivedTemplate.textContent = sampleTenant
      ? `Hello ${sampleTenant.name}, payment received. Your rent receipt has been recorded. Thank you.`
      : "No tenant available.";
    ui.overdueTemplate.textContent = sampleTenant
      ? `Hello ${sampleTenant.name}, your rent balance is overdue. Please clear it as soon as possible.`
      : "No tenant available.";
  }

  function populateDynamicSelects() {
    const scope = getScopedData();
    const editingTenantId = ui.tenantId.value;
    const editingTenant = editingTenantId ? tenantById(editingTenantId) : null;
    const unitOptions = scope.units
      .filter((unit) => unit.status === "vacant" || (editingTenant && editingTenant.unit_id === unit.id))
      .map((unit) => {
        const property = propertyById(unit.property_id);
        return `<option value="${unit.id}" data-rent="${unit.rent_amount}">${escapeHtml(unit.unit_number)} - ${escapeHtml(property ? property.property_name : "Property")}</option>`;
      })
      .join("");
    const previousUnit = ui.tenantUnit.value;
    ui.tenantUnit.innerHTML = unitOptions || '<option value="">Add a vacant unit first</option>';
    if (previousUnit && [...ui.tenantUnit.options].some((option) => option.value === previousUnit)) {
      ui.tenantUnit.value = previousUnit;
    }
    if (!ui.tenantId.value && !ui.tenantRent.value) {
      syncRentFromUnit();
    }

    const tenantOptions =
      scope.tenants
        .map((tenant) => {
          const unit = unitById(tenant.unit_id);
          return `<option value="${tenant.id}">${escapeHtml(tenant.name)} - ${escapeHtml(unit ? unit.unit_number : "Unit")}</option>`;
        })
        .join("") || '<option value="">No tenants</option>';
    ui.paymentTenant.innerHTML = tenantOptions;
  }

  function saveProperty(event) {
    event.preventDefault();
    const user = currentUser();
    if (!user) return;
    if (user.role === "staff") {
      showToast("Staff cannot create properties.");
      return;
    }

    const id = ui.propertyId.value || makeId("property");
    const property = {
      id,
      property_name: ui.propertyName.value.trim(),
      location: ui.propertyLocation.value.trim(),
      property_type: ui.propertyType.value,
      owner_id: state.properties.find((item) => item.id === id)?.owner_id || user.id,
    };

    if (ui.propertyId.value) {
      state.properties = state.properties.map((item) => (item.id === id ? property : item));
      showToast("Property updated.");
    } else {
      state.properties.push(property);
      state.selectedPropertyId = property.id;
      showToast("Property added.");
    }

    saveState();
    resetPropertyForm();
    renderAll();
  }

  function startPropertyEdit(id) {
    const property = ownerProperties().find((item) => item.id === id);
    if (!property) return;
    ui.propertyId.value = property.id;
    ui.propertyName.value = property.property_name;
    ui.propertyLocation.value = property.location;
    ui.propertyType.value = property.property_type || "Apartment";
    ui.propertyFormTitle.textContent = "Edit Property";
    ui.propertyFormMode.textContent = "Editing";
    ui.cancelPropertyEdit.classList.remove("hidden");
    setView("properties");
  }

  function resetPropertyForm() {
    ui.propertyForm.reset();
    ui.propertyId.value = "";
    ui.propertyFormTitle.textContent = "Add Property";
    ui.propertyFormMode.textContent = "New";
    ui.cancelPropertyEdit.classList.add("hidden");
  }

  function removeProperty(id) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Your role cannot remove properties.");
      return;
    }
    const property = ownerProperties().find((item) => item.id === id);
    if (!property) return;

    const unitIds = state.units.filter((unit) => unit.property_id === id).map((unit) => unit.id);
    const tenantIds = state.tenants
      .filter((tenant) => unitIds.includes(tenant.unit_id))
      .map((tenant) => tenant.id);

    state.properties = state.properties.filter((item) => item.id !== id);
    state.units = state.units.filter((unit) => unit.property_id !== id);
    state.tenants = state.tenants.filter((tenant) => !unitIds.includes(tenant.unit_id));
    state.payments = state.payments.filter((payment) => !tenantIds.includes(payment.tenant_id));
    state.expenses = state.expenses.filter((expense) => expense.property_id !== id);
    state.selectedPropertyId = "all";
    saveState();
    resetPropertyForm();
    renderAll();
    showToast("Property removed.");
  }

  function saveUnit(event) {
    event.preventDefault();
    if (currentUser()?.role === "staff") {
      showToast("Staff cannot create units.");
      return;
    }
    if (!ui.unitProperty.value) {
      showToast("Add a property before adding units.");
      return;
    }

    const property = ownerProperties().find((item) => item.id === ui.unitProperty.value);
    if (!property) {
      showToast("Choose one of your properties.");
      return;
    }

    state.units.push({
      id: makeId("unit"),
      property_id: property.id,
      unit_number: ui.unitNumber.value.trim(),
      rent_amount: Number(ui.unitRent.value),
      status: "vacant",
    });

    saveState();
    ui.unitForm.reset();
    populateStaticControls();
    renderAll();
    showToast("House / unit added.");
  }

  function removeUnit(id) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Your role cannot remove units.");
      return;
    }
    const hasTenant = state.tenants.some((tenant) => tenant.unit_id === id);
    if (hasTenant) {
      showToast("Remove the tenant before removing this unit.");
      return;
    }
    state.units = state.units.filter((unit) => unit.id !== id);
    saveState();
    renderAll();
    showToast("Unit removed.");
  }

  function saveTenant(event) {
    event.preventDefault();
    const id = ui.tenantId.value || makeId("tenant");
    const previous = tenantById(id);
    const tenant = {
      id,
      unit_id: ui.tenantUnit.value,
      name: ui.tenantName.value.trim(),
      phone: ui.tenantPhone.value.trim(),
      national_id: ui.tenantNationalId.value.trim(),
      rent_amount: Number(ui.tenantRent.value),
      deposit_paid: Number(ui.tenantDeposit.value),
      move_in_date: ui.tenantMoveIn.value,
    };

    if (!tenant.unit_id) {
      showToast("Choose an available unit first.");
      return;
    }

    const ownedUnit = getScopedData().units.find((unit) => unit.id === tenant.unit_id);
    if (!ownedUnit) {
      showToast("Choose a unit from your own properties.");
      return;
    }

    if (previous) {
      state.tenants = state.tenants.map((item) => (item.id === id ? tenant : item));
      setUnitStatus(previous.unit_id, "vacant");
      setUnitStatus(tenant.unit_id, "occupied");
      showToast("Tenant updated.");
    } else {
      state.tenants.push(tenant);
      setUnitStatus(tenant.unit_id, "occupied");
      showToast("Tenant added.");
    }

    saveState();
    resetTenantForm();
    renderAll();
  }

  function startTenantEdit(id) {
    const tenant = getScopedData().tenants.find((item) => item.id === id);
    if (!tenant) return;
    ui.tenantId.value = tenant.id;
    ui.tenantName.value = tenant.name;
    ui.tenantPhone.value = tenant.phone;
    ui.tenantNationalId.value = tenant.national_id;
    ui.tenantRent.value = tenant.rent_amount;
    ui.tenantDeposit.value = tenant.deposit_paid;
    ui.tenantMoveIn.value = tenant.move_in_date;
    populateDynamicSelects();
    ui.tenantUnit.value = tenant.unit_id;
    ui.tenantFormTitle.textContent = "Edit Tenant";
    ui.tenantFormMode.textContent = "Editing";
    ui.cancelTenantEdit.classList.remove("hidden");
    setView("tenants");
  }

  function resetTenantForm() {
    ui.tenantForm.reset();
    ui.tenantId.value = "";
    ui.tenantFormTitle.textContent = "Add Tenant";
    ui.tenantFormMode.textContent = "New";
    ui.cancelTenantEdit.classList.add("hidden");
    ui.tenantMoveIn.value = isoDate(new Date());
    populateDynamicSelects();
    syncRentFromUnit();
  }

  function inviteStaff(event) {
    event.preventDefault();
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      showToast("Only landlord admins can invite staff.");
      return;
    }

    const phone = ui.staffPhone.value.trim();
    const email = ui.staffEmail.value.trim();
    const normalizedPhone = normalizeLoginPhone(phone);
    const normalizedEmail = normalizeLoginEmail(email);
    const duplicatePhone = state.users.some((item) => normalizeLoginPhone(item.phone) === normalizedPhone);
    const duplicateEmail =
      normalizedEmail && state.users.some((item) => normalizeLoginEmail(item.email) === normalizedEmail);
    if (duplicatePhone) {
      showToast("That phone number already has an account.");
      return;
    }
    if (duplicateEmail) {
      showToast("That email address already has an account.");
      return;
    }

    const assignedPropertyIds = [...ui.staffProperties.selectedOptions]
      .map((option) => option.value)
      .filter(Boolean);
    if (!assignedPropertyIds.length) {
      showToast("Assign at least one property.");
      return;
    }

    const staffUser = {
      id: makeId("staff"),
      name: ui.staffName.value.trim(),
      phone,
      email,
      creator_email: user.email || user.creator_email || "",
      password: ui.staffPassword.value,
      role: "staff",
      company_owner_id: user.id,
      assigned_property_ids: assignedPropertyIds,
      invitation_status: "Invited",
    };

    state.users.push(staffUser);
    addNotification({
      type: "staff",
      title: "Staff invitation created",
      message: `${staffUser.name} can now access ${assignedPropertyNames(staffUser).join(", ")}.`,
    });
    saveState();
    ui.staffInviteForm.reset();
    renderAll();
    showToast("Staff invitation saved.");
  }

  function copyStaffLogin(id) {
    const staffUser = userById(id);
    if (!staffUser) return;
    const loginLines = ["RentLedger UG staff login", `Phone: ${staffUser.phone}`];
    if (staffUser.email) loginLines.push(`Email: ${staffUser.email}`);
    loginLines.push(`Password: ${staffUser.password}`);
    copyText(loginLines.join("\n"));
  }

  function removeStaff(id) {
    const staffUser = userById(id);
    if (!staffUser || staffUser.company_owner_id !== currentUser()?.id) return;
    state.users = state.users.filter((user) => user.id !== id);
    saveState();
    renderAll();
    showToast("Staff access removed.");
  }

  function removeTenant(id) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Your role cannot remove tenants.");
      return;
    }
    const tenant = getScopedData().tenants.find((item) => item.id === id);
    if (!tenant) return;
    state.tenants = state.tenants.filter((item) => item.id !== id);
    state.payments = state.payments.filter((payment) => payment.tenant_id !== id);
    setUnitStatus(tenant.unit_id, "vacant");
    saveState();
    renderAll();
    showToast("Tenant removed.");
  }

  function savePayment(event) {
    event.preventDefault();
    const tenant = getScopedData().tenants.find((item) => item.id === ui.paymentTenant.value);
    if (!tenant) {
      showToast("Choose a tenant first.");
      return;
    }
    const existingPaid = currentMonthPaid(tenant.id);
    const amount = Number(ui.paymentAmount.value);
    const balance = Math.max(0, Number(tenant.rent_amount) - existingPaid - amount);
    const method = ui.paymentMethod.value;
    const reference = ui.paymentReference.value.trim() || autoReference(method);

    state.payments.push({
      id: makeId("payment"),
      tenant_id: tenant.id,
      amount,
      payment_method: method,
      payment_date: ui.paymentDate.value,
      balance,
      reference,
    });
    addNotification({
      type: "payment",
      title: "Payment recorded",
      message: `${tenant.name} paid ${formatMoney(amount)} by ${method}.`,
    });

    saveState();
    ui.paymentForm.reset();
    setTodayDefaults();
    renderAll();
    ui.paymentStatusPill.textContent = method.includes("Money") || method.includes("MoMo") ? "MoMo confirmed" : "Recorded";
    ui.paymentStatusPill.className = "pill success";
    showToast(`Payment recorded for ${tenant.name}.`);
  }

  function saveExpense(event) {
    event.preventDefault();
    if (currentUser()?.role === "staff") {
      showToast("Staff cannot record expenses.");
      return;
    }
    const property = ownerProperties().find((item) => item.id === ui.expenseProperty.value);
    if (!property) {
      showToast("Add a property before recording expenses.");
      return;
    }

    state.expenses.push({
      id: makeId("expense"),
      property_id: property.id,
      type: ui.expenseType.value,
      amount: Number(ui.expenseAmount.value),
      date: ui.expenseDate.value,
    });
    addNotification({
      type: "expense",
      title: "Expense saved",
      message: `${ui.expenseType.value} expense of ${formatMoney(ui.expenseAmount.value)} was recorded.`,
    });
    saveState();
    ui.expenseForm.reset();
    setTodayDefaults();
    renderAll();
    showToast("Expense saved.");
  }

  function removeExpense(id) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Your role cannot remove expenses.");
      return;
    }
    const expense = getScopedData().expenses.find((item) => item.id === id);
    if (!expense) return;
    state.expenses = state.expenses.filter((item) => item.id !== id);
    saveState();
    renderAll();
    showToast("Expense removed.");
  }

  function saveOwnerPayment(event) {
    event.preventDefault();
    const ownerId = ui.ownerPaymentLandlord.value;
    const subscription = subscriptionByOwner(ownerId);
    if (!subscription) {
      showToast("Choose a landlord subscription first.");
      return;
    }

    const amount = Number(ui.ownerPaymentAmount.value);
    state.subscriptions = state.subscriptions.map((item) =>
      item.id === subscription.id
        ? {
            ...item,
            monthly_fee: amount || item.monthly_fee,
            status: "Active",
            last_payment_date: ui.ownerPaymentDate.value,
            last_payment_method: ui.ownerPaymentMethod.value,
            last_payment_note: ui.ownerPaymentNote.value.trim(),
            next_billing_date: addMonths(ui.ownerPaymentDate.value, 1),
          }
        : item
    );

    saveState();
    ui.ownerPaymentForm.reset();
    setTodayDefaults();
    renderAll();
    showToast("Subscription payment saved.");
  }

  function saveSupportTicket(event) {
    event.preventDefault();
    const ownerId = ui.supportOwner.value;
    if (!ownerId) {
      showToast("Choose a landlord first.");
      return;
    }

    state.supportTickets.push({
      id: makeId("ticket"),
      owner_id: ownerId,
      subject: ui.supportSubject.value.trim(),
      priority: ui.supportPriority.value,
      status: ui.supportStatus.value,
      note: ui.supportNote.value.trim(),
      updated_at: isoDate(new Date()),
    });

    saveState();
    ui.supportTicketForm.reset();
    renderAll();
    showToast("Support ticket saved.");
  }

  function sendAdminPasswordReset(event) {
    event.preventDefault();
    createAdminPasswordReset(ui.adminPasswordResetUser.value);
  }

  function createAdminPasswordReset(userId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can send reset OTPs.");
      return;
    }

    const targetUser = userById(userId);
    if (!targetUser || targetUser.id === currentUser()?.id) {
      showToast("Choose another account to reset.");
      return;
    }

    const resetEmail = passwordResetEmail(targetUser);
    if (!resetEmail) {
      showToast("That account does not have a creator email.");
      return;
    }

    const otp = makeOtp();
    state.passwordReset = {
      user_id: targetUser.id,
      email: resetEmail,
      otp,
      expires_at: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      admin_initiated_by: currentUser()?.id || null,
    };
    addNotification({
      type: "support",
      title: "Password reset OTP sent",
      message: `${targetUser.name} reset OTP was sent to ${maskEmailAddress(resetEmail)}.`,
    });
    saveState();
    renderNotifications();
    showToast(`Reset OTP sent to ${maskEmailAddress(resetEmail)}. Demo OTP: ${otp}`);
  }

  function toggleSupportTicket(id) {
    state.supportTickets = state.supportTickets.map((ticket) =>
      ticket.id === id
        ? {
            ...ticket,
            status: ticket.status === "Resolved" ? "Open" : "Resolved",
            updated_at: isoDate(new Date()),
          }
        : ticket
    );
    saveState();
    renderAll();
    showToast("Support ticket updated.");
  }

  function openLandlordPortfolio(ownerId) {
    const portfolio = ownerPortfolio(ownerId);
    state.selectedPropertyId = portfolio.properties[0]?.id || "all";
    saveState();
    renderAll();
    setView("properties");
    showToast(`Opened ${ownerName(ownerId)} portfolio.`);
  }

  function openReceipt(paymentId) {
    const payment = state.payments.find((item) => item.id === paymentId);
    if (!payment) return;
    const tenant = tenantById(payment.tenant_id);
    const unit = tenant ? unitById(tenant.unit_id) : null;
    const property = unit ? propertyById(unit.property_id) : null;
    const owner = property ? userById(property.owner_id) : currentUser();
    const receiptNo = payment.reference || payment.id;
    ui.receiptContent.innerHTML = `
      <div class="receipt-brand">
        <strong>RentLedger UG</strong>
        <span>Receipt ${escapeHtml(receiptNo)}</span>
      </div>
      <div class="receipt-grid">
        <span>Landlord</span><strong>${escapeHtml(owner ? owner.name : "Landlord")}</strong>
        <span>Tenant</span><strong>${escapeHtml(tenant ? tenant.name : "Removed tenant")}</strong>
        <span>Property</span><strong>${escapeHtml(property ? property.property_name : "Unknown")}</strong>
        <span>Unit</span><strong>${escapeHtml(unit ? unit.unit_number : "Unassigned")}</strong>
        <span>Amount Paid</span><strong>${formatMoney(payment.amount)}</strong>
        <span>Balance</span><strong>${formatMoney(payment.balance)}</strong>
        <span>Method</span><strong>${escapeHtml(payment.payment_method)}</strong>
        <span>Date</span><strong>${formatDate(payment.payment_date)}</strong>
      </div>
      <p class="receipt-note">This receipt confirms rent payment captured in RentLedger UG.</p>
    `;
    ui.receiptModal.dataset.paymentId = paymentId;
    ui.receiptModal.classList.remove("hidden");
  }

  function closeReceipt() {
    ui.receiptModal.classList.add("hidden");
  }

  function printReceipt() {
    window.print();
  }

  function downloadReceipt() {
    const text = ui.receiptContent.innerText.trim();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rentledger-receipt-${ui.receiptModal.dataset.paymentId || "payment"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function currentUser() {
    return state.users.find((user) => user.id === state.currentUserId) || null;
  }

  function userById(id) {
    return state.users.find((user) => user.id === id) || null;
  }

  function landlordUsers() {
    return state.users.filter((user) => user.role === "landlord");
  }

  function staffUsersForOwner(ownerId) {
    return state.users.filter((user) => user.role === "staff" && user.company_owner_id === ownerId);
  }

  function resettableUsers() {
    const current = currentUser();
    return state.users.filter(
      (user) => user.id !== current?.id && ["landlord", "staff"].includes(user.role)
    );
  }

  function adminResetOptionLabel(user) {
    const owner = user.company_owner_id ? userById(user.company_owner_id) : null;
    const ownerLabel = owner ? ` - ${owner.name}` : "";
    return `${user.name} (${roleLabel(user.role)}${ownerLabel})`;
  }

  function ownerProperties() {
    const user = currentUser();
    if (!user) return [];
    if (isSaasOwner(user)) return state.properties;
    if (user.role === "staff") {
      const assigned = new Set(user.assigned_property_ids || []);
      return state.properties.filter((property) => assigned.has(property.id));
    }
    return state.properties.filter((property) => property.owner_id === user.id);
  }

  function ownerPortfolio(ownerId) {
    const properties = state.properties.filter((property) => property.owner_id === ownerId);
    const propertyIds = new Set(properties.map((property) => property.id));
    const units = state.units.filter((unit) => propertyIds.has(unit.property_id));
    const unitIds = new Set(units.map((unit) => unit.id));
    const tenants = state.tenants.filter((tenant) => unitIds.has(tenant.unit_id));
    const tenantIds = new Set(tenants.map((tenant) => tenant.id));
    const payments = state.payments.filter((payment) => tenantIds.has(payment.tenant_id));
    const expenses = state.expenses.filter((expense) => propertyIds.has(expense.property_id));
    return { properties, units, tenants, payments, expenses };
  }

  function subscriptionByOwner(ownerId) {
    return (state.subscriptions || []).find((subscription) => subscription.owner_id === ownerId) || null;
  }

  function isSaasOwner(user = currentUser()) {
    return Boolean(user && user.role === "saas-owner");
  }

  function roleLabel(role) {
    if (role === "saas-owner") return "Website Owner";
    if (role === "staff") return "Staff / Manager";
    if (role === "caretaker") return "Caretaker";
    return "Landlord";
  }

  function ownerName(ownerId) {
    const user = state.users.find((item) => item.id === ownerId);
    return user ? user.name : "Unassigned";
  }

  function assignedPropertyNames(user) {
    return (user.assigned_property_ids || [])
      .map((id) => propertyById(id))
      .filter(Boolean)
      .map((property) => property.property_name);
  }

  function propertyOptionLabel(property) {
    return isSaasOwner()
      ? `${property.property_name} - ${ownerName(property.owner_id)}`
      : property.property_name;
  }

  function ensureSelectedProperty() {
    const properties = ownerProperties();
    const selectedExists = properties.some((property) => property.id === state.selectedPropertyId);
    if (state.selectedPropertyId !== "all" && !selectedExists) {
      state.selectedPropertyId = "all";
      saveState();
    }
  }

  function getScopedData() {
    const propertyId = state.selectedPropertyId || "all";
    const ownerOwnedProperties = ownerProperties();
    const properties =
      propertyId === "all"
        ? ownerOwnedProperties
        : ownerOwnedProperties.filter((property) => property.id === propertyId);
    const propertyIds = new Set(properties.map((property) => property.id));
    const units = state.units.filter((unit) => propertyIds.has(unit.property_id));
    const unitIds = new Set(units.map((unit) => unit.id));
    const tenants = state.tenants.filter((tenant) => unitIds.has(tenant.unit_id));
    const tenantIds = new Set(tenants.map((tenant) => tenant.id));
    const payments = state.payments.filter((payment) => tenantIds.has(payment.tenant_id));
    const expenses = state.expenses.filter((expense) => propertyIds.has(expense.property_id));
    return { properties, units, tenants, payments, expenses };
  }

  function searchTerm() {
    return String(state.searchTerm || "").trim().toLowerCase();
  }

  function matchesSearch(values) {
    const term = searchTerm();
    if (!term) return true;
    return values
      .map((value) => String(value || "").toLowerCase())
      .join(" ")
      .includes(term);
  }

  function addNotification(notification) {
    state.notifications = state.notifications || [];
    state.notifications.unshift({
      id: makeId("notification"),
      created_at: new Date().toISOString(),
      read: false,
      ...notification,
    });
  }

  function platformNotifications() {
    const rows = [];
    getRentRows(getScopedData().tenants)
      .filter((row) => row.balance > 0 && (row.status === "Overdue" || row.daysUntilDue <= 1))
      .forEach((row) => {
        rows.push({
          id: `rent-${row.tenant.id}-${row.status}`,
          title: `${row.status} rent`,
          message: `${row.tenant.name} has ${formatMoney(row.balance)} outstanding.`,
          type: "rent",
          date: isoDate(row.dueDate),
          read: Boolean((state.dismissedNotificationIds || []).includes(`rent-${row.tenant.id}-${row.status}`)),
        });
      });
    return [...(state.notifications || []), ...rows];
  }

  function renderNotifications() {
    const notifications = platformNotifications();
    const unread = notifications.filter((item) => !item.read);
    ui.notificationCount.textContent = unread.length;
    ui.notificationList.innerHTML =
      notifications
        .slice(0, 8)
        .map((item) => `
          <article class="notification-item ${item.read ? "read" : ""}">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.message)}</span>
            <time>${escapeHtml(timeAgo(item.created_at || item.date))}</time>
          </article>
        `)
        .join("") || emptyBlock("No notifications yet.");
  }

  function toggleNotifications() {
    ui.notificationPanel.classList.toggle("hidden");
  }

  function markNotificationsRead() {
    state.notifications = (state.notifications || []).map((item) => ({ ...item, read: true }));
    const derivedIds = platformNotifications()
      .filter((item) => item.id && !String(item.id).startsWith("notification"))
      .map((item) => item.id);
    state.dismissedNotificationIds = [...new Set([...(state.dismissedNotificationIds || []), ...derivedIds])];
    saveState();
    renderNotifications();
    showToast("Notifications marked read.");
  }

  function getRentRows(tenants) {
    const today = stripTime(new Date());
    return tenants.map((tenant) => {
      const dueDate = getMonthlyDueDate(tenant.move_in_date);
      const paid = currentMonthPaid(tenant.id);
      const balance = Math.max(0, Number(tenant.rent_amount) - paid);
      const daysUntilDue = Math.round((dueDate - today) / 86400000);
      let status = "Paid";
      if (balance > 0 && daysUntilDue < 0) status = "Overdue";
      if (balance > 0 && daysUntilDue >= 0) status = paid > 0 ? "Partial" : "Due";
      return {
        tenant,
        unit: unitById(tenant.unit_id),
        paid,
        balance,
        dueDate,
        daysUntilDue,
        status,
      };
    });
  }

  function rentDueRow(row) {
    return `
      <tr>
        <td>${escapeHtml(row.tenant.name)}</td>
        <td>${escapeHtml(row.unit ? row.unit.unit_number : "Unassigned")}</td>
        <td>${formatDate(isoDate(row.dueDate))}</td>
        <td>${statusPill(row.status)}</td>
      </tr>
    `;
  }

  function updatePaymentPreview() {
    const tenant = getScopedData().tenants.find((item) => item.id === ui.paymentTenant.value);
    if (!tenant) {
      ui.tenantBalancePreview.textContent = "No tenant selected.";
      return;
    }
    const paid = currentMonthPaid(tenant.id);
    const amount = Number(ui.paymentAmount.value || 0);
    const afterBalance = Math.max(0, Number(tenant.rent_amount) - paid - amount);
    ui.tenantBalancePreview.innerHTML = `
      <strong>${escapeHtml(tenant.name)}</strong><br>
      Rent ${formatMoney(tenant.rent_amount)} - Paid ${formatMoney(paid)} - Balance after payment ${formatMoney(afterBalance)}
    `;
  }

  function syncRentFromUnit() {
    const option = ui.tenantUnit.selectedOptions[0];
    if (!option || ui.tenantId.value) return;
    ui.tenantRent.value = option.dataset.rent || "";
  }

  function currentMonthPaid(tenantId) {
    return state.payments
      .filter((payment) => payment.tenant_id === tenantId && isCurrentMonth(payment.payment_date))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
  }

  function getCurrentMonthPayments(payments) {
    return payments.filter((payment) => isCurrentMonth(payment.payment_date));
  }

  function getCurrentMonthExpenses(expenses) {
    return expenses.filter((expense) => isCurrentMonth(expense.date));
  }

  function totalBalance(rows) {
    return rows.reduce((sum, row) => sum + Number(row.balance), 0);
  }

  function setUnitStatus(unitId, status) {
    state.units = state.units.map((unit) => (unit.id === unitId ? { ...unit, status } : unit));
  }

  function tenantById(id) {
    return state.tenants.find((tenant) => tenant.id === id);
  }

  function unitById(id) {
    return state.units.find((unit) => unit.id === id);
  }

  function propertyById(id) {
    return state.properties.find((property) => property.id === id);
  }

  function isCurrentMonth(value) {
    const date = new Date(`${value}T00:00:00`);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  function getMonthlyDueDate(moveInDate) {
    const moveIn = new Date(`${moveInDate}T00:00:00`);
    const now = new Date();
    const day = Math.min(moveIn.getDate(), 28);
    return stripTime(new Date(now.getFullYear(), now.getMonth(), day));
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function reminderMessage(row) {
    if (row.status === "Overdue") {
      return `Hello ${row.tenant.name}, your rent balance of ${formatMoney(row.balance)} for ${row.unit ? row.unit.unit_number : "your unit"} is overdue. Please clear it as soon as possible.`;
    }
    if (row.daysUntilDue === 1) {
      return `Hello ${row.tenant.name}, your rent of ${formatMoney(row.tenant.rent_amount)} is due tomorrow for ${row.unit ? row.unit.unit_number : "your unit"}. Thank you.`;
    }
    return `Hello ${row.tenant.name}, your rent balance is ${formatMoney(row.balance)} for ${row.unit ? row.unit.unit_number : "your unit"}. Thank you.`;
  }

  function copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast("Message copied."));
      return;
    }
    showToast(text);
  }

  function normalizePhone(phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("256")) return digits;
    if (digits.startsWith("0")) return `256${digits.slice(1)}`;
    return digits;
  }

  function normalizeLoginPhone(phone) {
    return normalizePhone(phone);
  }

  function normalizeLoginEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function loginIdentifierMatches(user, value) {
    const identifier = String(value || "").trim();
    if (!identifier) return false;
    if (identifier.includes("@")) {
      return normalizeLoginEmail(user.email) === normalizeLoginEmail(identifier);
    }
    return normalizeLoginPhone(user.phone) === normalizeLoginPhone(identifier);
  }

  function userContactLabel(user) {
    return [user.phone, user.email].filter(Boolean).join(" / ") || "No contact set";
  }

  function passwordResetEmail(user) {
    const owner = user.company_owner_id ? userById(user.company_owner_id) : null;
    return (
      normalizeLoginEmail(user.creator_email) ||
      normalizeLoginEmail(owner?.email) ||
      normalizeLoginEmail(owner?.creator_email) ||
      normalizeLoginEmail(user.email)
    );
  }

  function makeOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function maskEmailAddress(email) {
    const [name, domain] = String(email || "").split("@");
    if (!name || !domain) return email || "";
    const visibleName = name.length <= 2 ? name[0] : `${name.slice(0, 2)}***${name.slice(-1)}`;
    return `${visibleName}@${domain}`;
  }

  function clearPasswordResetForms() {
    ui.forgotPasswordForm.reset();
    ui.resetPasswordForm.reset();
    ui.resetOtpNotice.textContent = "";
    ui.resetOtpNotice.classList.add("hidden");
  }

  function setTodayDefaults() {
    const today = isoDate(new Date());
    ui.tenantMoveIn.value = ui.tenantMoveIn.value || today;
    ui.paymentDate.value = today;
    ui.expenseDate.value = today;
    if (ui.ownerPaymentDate) ui.ownerPaymentDate.value = today;
  }

  function resetDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = seedState();
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, fresh);
    saveState();
    renderSession();
    showToast("Demo data reset.");
  }

  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seedState();
    try {
      return migrateState(JSON.parse(saved));
    } catch (error) {
      return seedState();
    }
  }

  async function hydrateStateFromSupabase() {
    const client = await createSupabaseClient();
    if (!client) return;

    supabaseHydrating = true;
    try {
      const remote = await fetchSupabaseState(client);
      const hasRemoteRows = SUPABASE_TABLES.some(({ stateKey }) => remote[stateKey]?.length);
      supabaseReady = true;

      if (hasRemoteRows) {
        const sessionState = {
          currentUserId: state.currentUserId,
          selectedPropertyId: state.selectedPropertyId,
          role: state.role,
          searchTerm: state.searchTerm,
        };
        replaceState(migrateState({ ...remote, ...sessionState }));
        saveLocalStateOnly();
        showToast("Supabase data loaded.");
      } else {
        await persistSupabaseState(state);
        showToast("Supabase connected. Demo data uploaded.");
      }
    } catch (error) {
      supabaseReady = false;
      console.error("Supabase sync failed", error);
      showToast("Supabase is not ready. Using browser storage.");
    } finally {
      supabaseHydrating = false;
    }
  }

  async function createSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const config = window.RENTLEDGER_SUPABASE;
    if (!isSupabaseConfigReady(config)) return null;

    const loaded = await loadSupabaseLibrary();
    if (!loaded || !window.supabase?.createClient) {
      showToast("Supabase library could not load.");
      return null;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return supabaseClient;
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

  async function fetchSupabaseState(client) {
    const remote = {};
    for (const { stateKey, table } of SUPABASE_TABLES) {
      const { data, error } = await client.from(table).select("*");
      if (error) throw error;
      remote[stateKey] = (data || []).map((row) => fromSupabaseRow(stateKey, row));
    }

    const { data: settings, error: settingsError } = await client.from("app_settings").select("*");
    if (settingsError) throw settingsError;
    remote.dismissedNotificationIds = settingValue(settings, "dismissed_notification_ids", []);
    remote.passwordReset = settingValue(settings, "password_reset", null);
    return remote;
  }

  function settingValue(settings, key, fallback) {
    const row = (settings || []).find((item) => item.setting_key === key);
    return row && row.value !== undefined && row.value !== null ? row.value : fallback;
  }

  function fromSupabaseRow(stateKey, row) {
    if (stateKey === "users") {
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email || "",
        creator_email: row.creator_email || "",
        password: row.password || "demo123",
        role: row.role,
        company_owner_id: row.company_owner_id || undefined,
        assigned_property_ids: row.assigned_property_ids || [],
        invitation_status: row.invitation_status || undefined,
      };
    }
    return { ...row };
  }

  function replaceState(nextState) {
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, nextState);
  }

  function saveLocalStateOnly() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function scheduleSupabaseSave() {
    if (!supabaseReady || supabaseHydrating || !supabaseClient) return;
    const snapshot = JSON.parse(JSON.stringify(state));
    window.clearTimeout(supabaseSaveTimer);
    supabaseSaveTimer = window.setTimeout(() => {
      persistSupabaseState(snapshot).catch((error) => {
        console.error("Supabase save failed", error);
        showToast("Could not save to Supabase. Browser copy kept.");
      });
    }, 450);
  }

  async function persistSupabaseState(snapshot) {
    if (!supabaseClient) return;
    const tableByStateKey = new Map(SUPABASE_TABLES.map((item) => [item.stateKey, item]));

    for (const stateKey of SUPABASE_DELETE_ORDER) {
      const tableConfig = tableByStateKey.get(stateKey);
      await deleteRemovedSupabaseRows(tableConfig.table, snapshot[stateKey] || []);
    }

    for (const { stateKey, table } of SUPABASE_TABLES) {
      const rows = (snapshot[stateKey] || []).map((row) => toSupabaseRow(stateKey, row));
      if (!rows.length) continue;
      const { error } = await supabaseClient.from(table).upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    const settings = [
      { setting_key: "dismissed_notification_ids", value: snapshot.dismissedNotificationIds || [] },
      { setting_key: "password_reset", value: snapshot.passwordReset || null },
    ];
    const { error } = await supabaseClient.from("app_settings").upsert(settings, { onConflict: "setting_key" });
    if (error) throw error;
  }

  async function deleteRemovedSupabaseRows(table, rows) {
    const keepIds = new Set(rows.map((row) => row.id));
    const { data, error } = await supabaseClient.from(table).select("id");
    if (error) throw error;
    const staleIds = (data || []).map((row) => row.id).filter((id) => !keepIds.has(id));
    if (!staleIds.length) return;
    const deleteResult = await supabaseClient.from(table).delete().in("id", staleIds);
    if (deleteResult.error) throw deleteResult.error;
  }

  function toSupabaseRow(stateKey, row) {
    if (stateKey === "users") {
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email || null,
        creator_email: row.creator_email || row.email || null,
        password: row.password || "demo123",
        role: row.role,
        company_owner_id: row.company_owner_id || null,
        assigned_property_ids: row.assigned_property_ids || [],
        invitation_status: row.invitation_status || null,
      };
    }
    if (stateKey === "subscriptions") {
      return pick(row, [
        "id",
        "owner_id",
        "plan",
        "monthly_fee",
        "status",
        "last_payment_date",
        "last_payment_method",
        "last_payment_note",
        "next_billing_date",
      ]);
    }
    if (stateKey === "properties") return pick(row, ["id", "owner_id", "property_name", "location", "property_type"]);
    if (stateKey === "units") return pick(row, ["id", "property_id", "unit_number", "rent_amount", "status"]);
    if (stateKey === "tenants") {
      return pick(row, ["id", "unit_id", "name", "phone", "national_id", "rent_amount", "deposit_paid", "move_in_date"]);
    }
    if (stateKey === "payments") {
      return pick(row, ["id", "tenant_id", "amount", "payment_method", "payment_date", "balance", "reference"]);
    }
    if (stateKey === "expenses") return pick(row, ["id", "property_id", "type", "amount", "date"]);
    if (stateKey === "supportTickets") {
      return pick(row, ["id", "owner_id", "subject", "priority", "status", "note", "updated_at"]);
    }
    if (stateKey === "notifications") {
      return {
        id: row.id,
        user_id: row.user_id || null,
        type: row.type,
        title: row.title,
        message: row.message,
        read: Boolean(row.read),
        created_at: row.created_at || new Date().toISOString(),
      };
    }
    return { ...row };
  }

  function pick(row, keys) {
    return keys.reduce((picked, key) => {
      picked[key] = row[key] === undefined ? null : row[key];
      return picked;
    }, {});
  }

  function migrateState(saved) {
    const seeded = seedState();
    const migrated = { ...seeded, ...saved };
    migrated.users = Array.isArray(saved.users) ? saved.users : seeded.users;
    migrated.properties = Array.isArray(saved.properties) ? saved.properties : seeded.properties;
    migrated.units = Array.isArray(saved.units) ? saved.units : seeded.units;
    migrated.tenants = Array.isArray(saved.tenants) ? saved.tenants : seeded.tenants;
    migrated.payments = Array.isArray(saved.payments) ? saved.payments : seeded.payments;
    migrated.expenses = Array.isArray(saved.expenses) ? saved.expenses : seeded.expenses;
    migrated.subscriptions = Array.isArray(saved.subscriptions) ? saved.subscriptions : seeded.subscriptions;
    migrated.supportTickets = Array.isArray(saved.supportTickets) ? saved.supportTickets : seeded.supportTickets;
    migrated.notifications = Array.isArray(saved.notifications) ? saved.notifications : seeded.notifications;
    migrated.dismissedNotificationIds = Array.isArray(saved.dismissedNotificationIds) ? saved.dismissedNotificationIds : [];
    migrated.passwordReset = saved.passwordReset || null;

    const seedUsersById = new Map(seeded.users.map((user) => [user.id, user]));
    migrated.users = migrated.users.map((user) => {
      const seedUser = seedUsersById.get(user.id);
      return {
        password: "demo123",
        role: "landlord",
        ...user,
        email: user.email || (seedUser ? seedUser.email : ""),
        creator_email: user.creator_email || (seedUser ? seedUser.creator_email : "") || user.email || "",
      };
    });
    seeded.users.forEach((seedUser) => {
      const exists = migrated.users.some(
        (user) =>
          user.id === seedUser.id ||
          normalizeLoginPhone(user.phone) === normalizeLoginPhone(seedUser.phone) ||
          normalizeLoginEmail(user.email) === normalizeLoginEmail(seedUser.email)
      );
      if (!exists) migrated.users.push(seedUser);
    });
    migrated.users = migrated.users.map((user) => ({
      invitation_status: user.role === "staff" ? "Invited" : undefined,
      assigned_property_ids: [],
      ...user,
    }));
    migrated.users = migrated.users.map((user) => {
      if (user.id === "user-1" && user.name === "Sarah Nakato") {
        return { ...user, name: "Landlord Demo" };
      }
      if (user.id === "user-saas-owner") {
        return {
          ...user,
          name: user.name || "Super Admin",
          email: "allanpyrex5@gmail.com",
          creator_email: "allanpyrex5@gmail.com",
          password: "Etochu@2727",
          role: "saas-owner",
        };
      }
      if (user.id === "staff-1") {
        return {
          ...user,
          name: user.name === "Joseph Manager" ? "Staff Demo" : user.name,
          assigned_property_ids: ["property-1", "property-4"],
          invitation_status: user.invitation_status || "Invited",
        };
      }
      return user;
    });
    migrated.properties = migrated.properties.map((property) => ({
      property_type: "Apartment",
      owner_id: "user-1",
      ...property,
    }));
    appendMissingSeedRows(migrated.properties, seeded.properties);
    appendMissingSeedRows(migrated.units, seeded.units);
    appendMissingSeedRows(migrated.tenants, seeded.tenants);
    appendMissingSeedRows(migrated.payments, seeded.payments);
    appendMissingSeedRows(migrated.expenses, seeded.expenses);
    const occupiedUnitIds = new Set(migrated.tenants.map((tenant) => tenant.unit_id));
    migrated.units = migrated.units.map((unit) =>
      occupiedUnitIds.has(unit.id) ? { ...unit, status: "occupied" } : unit
    );
    seeded.subscriptions.forEach((seedSubscription) => {
      const exists = migrated.subscriptions.some((subscription) => subscription.id === seedSubscription.id);
      if (!exists) migrated.subscriptions.push(seedSubscription);
    });
    seeded.supportTickets.forEach((seedTicket) => {
      const exists = migrated.supportTickets.some((ticket) => ticket.id === seedTicket.id);
      if (!exists) migrated.supportTickets.push(seedTicket);
    });
    migrated.selectedPropertyId = migrated.selectedPropertyId || "all";
    migrated.role = migrated.role || "landlord";
    migrated.searchTerm = migrated.searchTerm || "";
    if (!migrated.users.some((user) => user.id === migrated.currentUserId)) {
      migrated.currentUserId = null;
    }
    return migrated;
  }

  function appendMissingSeedRows(target, source) {
    source.forEach((row) => {
      if (!target.some((item) => item.id === row.id)) {
        target.push(row);
      }
    });
  }

  function saveState() {
    saveLocalStateOnly();
    scheduleSupabaseSave();
  }

  function seedState() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const date = (day) => isoDate(new Date(currentYear, currentMonth, day));
    const previousDate = (day) => isoDate(new Date(currentYear, currentMonth - 1, day));

    return {
      currentUserId: null,
      selectedPropertyId: "all",
      role: "landlord",
      searchTerm: "",
      passwordReset: null,
      users: [
        {
          id: "user-saas-owner",
          name: "Super Admin",
          phone: "0700000000",
          email: "allanpyrex5@gmail.com",
          creator_email: "allanpyrex5@gmail.com",
          password: "Etochu@2727",
          role: "saas-owner",
        },
        {
          id: "user-1",
          name: "Landlord Demo",
          phone: "0772123456",
          email: "landlord@rentledger.ug",
          creator_email: "landlord@rentledger.ug",
          password: "demo123",
          role: "landlord",
        },
        {
          id: "user-2",
          name: "Daniel Kigozi",
          phone: "0788001100",
          email: "daniel@rentledger.ug",
          creator_email: "daniel@rentledger.ug",
          password: "demo123",
          role: "landlord",
        },
        {
          id: "staff-1",
          name: "Staff Demo",
          phone: "0700111222",
          email: "staff@rentledger.ug",
          creator_email: "landlord@rentledger.ug",
          password: "staff123",
          role: "staff",
          company_owner_id: "user-1",
          assigned_property_ids: ["property-1", "property-4"],
          invitation_status: "Invited",
        },
      ],
      properties: [
        {
          id: "property-1",
          property_name: "Kira Road Apartments",
          location: "Kira",
          property_type: "Apartment",
          owner_id: "user-1",
        },
        {
          id: "property-2",
          property_name: "Ntinda Court",
          location: "Ntinda",
          property_type: "Apartment",
          owner_id: "user-1",
        },
        {
          id: "property-3",
          property_name: "Mukono Family Houses",
          location: "Mukono",
          property_type: "House",
          owner_id: "user-2",
        },
        {
          id: "property-4",
          property_name: "Kololo Heights Villas",
          location: "Kololo",
          property_type: "Mixed",
          owner_id: "user-1",
        },
        {
          id: "property-5",
          property_name: "Entebbe Road Suites",
          location: "Entebbe Road",
          property_type: "Apartment",
          owner_id: "user-1",
        },
        {
          id: "property-6",
          property_name: "Najjera Garden Homes",
          location: "Najjera",
          property_type: "House",
          owner_id: "user-1",
        },
      ],
      units: [
        { id: "unit-1", property_id: "property-1", unit_number: "A1", rent_amount: 450000, status: "occupied" },
        { id: "unit-2", property_id: "property-1", unit_number: "A2", rent_amount: 450000, status: "occupied" },
        { id: "unit-3", property_id: "property-1", unit_number: "B1", rent_amount: 520000, status: "occupied" },
        { id: "unit-4", property_id: "property-1", unit_number: "B2", rent_amount: 520000, status: "occupied" },
        { id: "unit-5", property_id: "property-2", unit_number: "N1", rent_amount: 380000, status: "occupied" },
        { id: "unit-6", property_id: "property-2", unit_number: "N2", rent_amount: 380000, status: "vacant" },
        { id: "unit-7", property_id: "property-2", unit_number: "N3", rent_amount: 420000, status: "occupied" },
        { id: "unit-8", property_id: "property-2", unit_number: "N4", rent_amount: 420000, status: "vacant" },
        { id: "unit-9", property_id: "property-3", unit_number: "House 1", rent_amount: 600000, status: "occupied" },
        { id: "unit-10", property_id: "property-3", unit_number: "House 2", rent_amount: 600000, status: "vacant" },
        { id: "unit-11", property_id: "property-4", unit_number: "K1", rent_amount: 950000, status: "occupied" },
        { id: "unit-12", property_id: "property-4", unit_number: "K2", rent_amount: 950000, status: "occupied" },
        { id: "unit-13", property_id: "property-4", unit_number: "K3", rent_amount: 1200000, status: "occupied" },
        { id: "unit-14", property_id: "property-4", unit_number: "K4", rent_amount: 1200000, status: "occupied" },
        { id: "unit-15", property_id: "property-4", unit_number: "K5", rent_amount: 850000, status: "vacant" },
        { id: "unit-16", property_id: "property-5", unit_number: "E1", rent_amount: 520000, status: "occupied" },
        { id: "unit-17", property_id: "property-5", unit_number: "E2", rent_amount: 520000, status: "occupied" },
        { id: "unit-18", property_id: "property-5", unit_number: "E3", rent_amount: 560000, status: "occupied" },
        { id: "unit-19", property_id: "property-5", unit_number: "E4", rent_amount: 560000, status: "occupied" },
        { id: "unit-20", property_id: "property-5", unit_number: "E5", rent_amount: 600000, status: "occupied" },
        { id: "unit-21", property_id: "property-5", unit_number: "E6", rent_amount: 600000, status: "vacant" },
        { id: "unit-22", property_id: "property-6", unit_number: "G1", rent_amount: 700000, status: "occupied" },
        { id: "unit-23", property_id: "property-6", unit_number: "G2", rent_amount: 700000, status: "occupied" },
        { id: "unit-24", property_id: "property-6", unit_number: "G3", rent_amount: 760000, status: "occupied" },
        { id: "unit-25", property_id: "property-6", unit_number: "G4", rent_amount: 760000, status: "occupied" },
        { id: "unit-26", property_id: "property-6", unit_number: "G5", rent_amount: 820000, status: "occupied" },
        { id: "unit-27", property_id: "property-6", unit_number: "G6", rent_amount: 820000, status: "vacant" },
      ],
      tenants: [
        {
          id: "tenant-1",
          unit_id: "unit-1",
          name: "Brian Ssemanda",
          phone: "0772456781",
          national_id: "CM910001AA1",
          rent_amount: 450000,
          deposit_paid: 450000,
          move_in_date: date(5),
        },
        {
          id: "tenant-2",
          unit_id: "unit-2",
          name: "Grace Atim",
          phone: "0755123400",
          national_id: "CF930008BB2",
          rent_amount: 450000,
          deposit_paid: 450000,
          move_in_date: date(20),
        },
        {
          id: "tenant-3",
          unit_id: "unit-4",
          name: "Moses Kato",
          phone: "0701987650",
          national_id: "CM880021CC3",
          rent_amount: 520000,
          deposit_paid: 520000,
          move_in_date: date(12),
        },
        {
          id: "tenant-4",
          unit_id: "unit-5",
          name: "Ruth Nansubuga",
          phone: "0783445551",
          national_id: "CF960044DD4",
          rent_amount: 380000,
          deposit_paid: 380000,
          move_in_date: date(18),
        },
        {
          id: "tenant-5",
          unit_id: "unit-7",
          name: "Ivan Mugisha",
          phone: "0778123123",
          national_id: "CM900087EE5",
          rent_amount: 420000,
          deposit_paid: 420000,
          move_in_date: date(23),
        },
        {
          id: "tenant-6",
          unit_id: "unit-9",
          name: "Allen Nambi",
          phone: "0700441188",
          national_id: "CF920073FF6",
          rent_amount: 600000,
          deposit_paid: 600000,
          move_in_date: date(9),
        },
        {
          id: "tenant-7",
          unit_id: "unit-11",
          name: "Patricia Namuli",
          phone: "0759001101",
          national_id: "CF910077GG7",
          rent_amount: 950000,
          deposit_paid: 950000,
          move_in_date: date(3),
        },
        {
          id: "tenant-8",
          unit_id: "unit-12",
          name: "Samuel Okello",
          phone: "0776002202",
          national_id: "CM870034HH8",
          rent_amount: 950000,
          deposit_paid: 950000,
          move_in_date: date(8),
        },
        {
          id: "tenant-9",
          unit_id: "unit-13",
          name: "Esther Kirabo",
          phone: "0785003303",
          national_id: "CF940055II9",
          rent_amount: 1200000,
          deposit_paid: 1200000,
          move_in_date: date(14),
        },
        {
          id: "tenant-10",
          unit_id: "unit-14",
          name: "Peter Mugerwa",
          phone: "0704004404",
          national_id: "CM890066JJ0",
          rent_amount: 1200000,
          deposit_paid: 1200000,
          move_in_date: date(22),
        },
        {
          id: "tenant-11",
          unit_id: "unit-16",
          name: "Joan Akello",
          phone: "0753005505",
          national_id: "CF950088KK1",
          rent_amount: 520000,
          deposit_paid: 520000,
          move_in_date: date(6),
        },
        {
          id: "tenant-12",
          unit_id: "unit-17",
          name: "Andrew Lutaaya",
          phone: "0772006606",
          national_id: "CM920099LL2",
          rent_amount: 520000,
          deposit_paid: 520000,
          move_in_date: date(11),
        },
        {
          id: "tenant-13",
          unit_id: "unit-18",
          name: "Mariam Nakiwunga",
          phone: "0781007707",
          national_id: "CF900011MM3",
          rent_amount: 560000,
          deposit_paid: 560000,
          move_in_date: date(15),
        },
        {
          id: "tenant-14",
          unit_id: "unit-19",
          name: "David Opio",
          phone: "0709008808",
          national_id: "CM850022NN4",
          rent_amount: 560000,
          deposit_paid: 560000,
          move_in_date: date(19),
        },
        {
          id: "tenant-15",
          unit_id: "unit-20",
          name: "Lydia Namutebi",
          phone: "0758009909",
          national_id: "CF970033OO5",
          rent_amount: 600000,
          deposit_paid: 600000,
          move_in_date: date(24),
        },
        {
          id: "tenant-16",
          unit_id: "unit-22",
          name: "Ronald Sserwadda",
          phone: "0777010101",
          national_id: "CM880044PP6",
          rent_amount: 700000,
          deposit_paid: 700000,
          move_in_date: date(4),
        },
        {
          id: "tenant-17",
          unit_id: "unit-23",
          name: "Peace Auma",
          phone: "0786020202",
          national_id: "CF930055QQ7",
          rent_amount: 700000,
          deposit_paid: 700000,
          move_in_date: date(10),
        },
        {
          id: "tenant-18",
          unit_id: "unit-24",
          name: "Fred Mutebi",
          phone: "0705030303",
          national_id: "CM910066RR8",
          rent_amount: 760000,
          deposit_paid: 760000,
          move_in_date: date(13),
        },
        {
          id: "tenant-19",
          unit_id: "unit-25",
          name: "Scovia Nakirya",
          phone: "0754040404",
          national_id: "CF960077SS9",
          rent_amount: 760000,
          deposit_paid: 760000,
          move_in_date: date(17),
        },
        {
          id: "tenant-20",
          unit_id: "unit-26",
          name: "Henry Bukenya",
          phone: "0773050505",
          national_id: "CM860088TT0",
          rent_amount: 820000,
          deposit_paid: 820000,
          move_in_date: date(25),
        },
        {
          id: "tenant-21",
          unit_id: "unit-3",
          name: "Nora Kansiime",
          phone: "0782060606",
          national_id: "CF980099UU1",
          rent_amount: 520000,
          deposit_paid: 520000,
          move_in_date: date(27),
        },
      ],
      payments: [
        {
          id: "payment-1",
          tenant_id: "tenant-1",
          amount: 450000,
          payment_method: "MTN MoMo",
          payment_date: date(4),
          balance: 0,
          reference: "MOMO-18423",
        },
        {
          id: "payment-2",
          tenant_id: "tenant-3",
          amount: 260000,
          payment_method: "Airtel Money",
          payment_date: date(12),
          balance: 260000,
          reference: "AIRTEL-57392",
        },
        {
          id: "payment-3",
          tenant_id: "tenant-4",
          amount: 380000,
          payment_method: "Cash",
          payment_date: date(18),
          balance: 0,
          reference: "CASH-001",
        },
        {
          id: "payment-4",
          tenant_id: "tenant-6",
          amount: 600000,
          payment_method: "MTN MoMo",
          payment_date: date(8),
          balance: 0,
          reference: "MOMO-90931",
        },
        {
          id: "payment-5",
          tenant_id: "tenant-7",
          amount: 950000,
          payment_method: "Bank Transfer",
          payment_date: date(3),
          balance: 0,
          reference: "BANK-44210",
        },
        {
          id: "payment-6",
          tenant_id: "tenant-8",
          amount: 950000,
          payment_method: "MTN MoMo",
          payment_date: date(8),
          balance: 0,
          reference: "MOMO-23188",
        },
        {
          id: "payment-7",
          tenant_id: "tenant-9",
          amount: 800000,
          payment_method: "Airtel Money",
          payment_date: date(14),
          balance: 400000,
          reference: "AIRTEL-11902",
        },
        {
          id: "payment-8",
          tenant_id: "tenant-10",
          amount: 1200000,
          payment_method: "Bank Transfer",
          payment_date: date(20),
          balance: 0,
          reference: "BANK-87421",
        },
        {
          id: "payment-9",
          tenant_id: "tenant-11",
          amount: 520000,
          payment_method: "MTN MoMo",
          payment_date: date(6),
          balance: 0,
          reference: "MOMO-55342",
        },
        {
          id: "payment-10",
          tenant_id: "tenant-12",
          amount: 260000,
          payment_method: "Cash",
          payment_date: date(11),
          balance: 260000,
          reference: "CASH-026",
        },
        {
          id: "payment-11",
          tenant_id: "tenant-13",
          amount: 560000,
          payment_method: "Airtel Money",
          payment_date: date(15),
          balance: 0,
          reference: "AIRTEL-66213",
        },
        {
          id: "payment-12",
          tenant_id: "tenant-14",
          amount: 560000,
          payment_method: "MTN MoMo",
          payment_date: date(19),
          balance: 0,
          reference: "MOMO-79211",
        },
        {
          id: "payment-13",
          tenant_id: "tenant-15",
          amount: 300000,
          payment_method: "Cash",
          payment_date: date(21),
          balance: 300000,
          reference: "CASH-030",
        },
        {
          id: "payment-14",
          tenant_id: "tenant-16",
          amount: 700000,
          payment_method: "Bank Transfer",
          payment_date: date(4),
          balance: 0,
          reference: "BANK-44389",
        },
        {
          id: "payment-15",
          tenant_id: "tenant-17",
          amount: 700000,
          payment_method: "MTN MoMo",
          payment_date: date(10),
          balance: 0,
          reference: "MOMO-88201",
        },
        {
          id: "payment-16",
          tenant_id: "tenant-18",
          amount: 500000,
          payment_method: "Airtel Money",
          payment_date: date(13),
          balance: 260000,
          reference: "AIRTEL-72104",
        },
        {
          id: "payment-17",
          tenant_id: "tenant-19",
          amount: 760000,
          payment_method: "MTN MoMo",
          payment_date: date(17),
          balance: 0,
          reference: "MOMO-45091",
        },
        {
          id: "payment-18",
          tenant_id: "tenant-20",
          amount: 820000,
          payment_method: "Bank Transfer",
          payment_date: date(20),
          balance: 0,
          reference: "BANK-12980",
        },
        {
          id: "payment-19",
          tenant_id: "tenant-21",
          amount: 520000,
          payment_method: "MTN MoMo",
          payment_date: date(22),
          balance: 0,
          reference: "MOMO-66420",
        },
      ],
      expenses: [
        { id: "expense-1", property_id: "property-1", type: "Repairs", amount: 120000, date: date(7) },
        { id: "expense-2", property_id: "property-1", type: "Water Bill", amount: 85000, date: date(10) },
        { id: "expense-3", property_id: "property-2", type: "Caretaker Salary", amount: 250000, date: date(15) },
        { id: "expense-4", property_id: "property-3", type: "Security", amount: 90000, date: date(11) },
        { id: "expense-5", property_id: "property-4", type: "Security", amount: 320000, date: date(5) },
        { id: "expense-6", property_id: "property-4", type: "Repairs", amount: 180000, date: date(13) },
        { id: "expense-7", property_id: "property-5", type: "Water Bill", amount: 160000, date: date(9) },
        { id: "expense-8", property_id: "property-5", type: "Electricity", amount: 110000, date: date(16) },
        { id: "expense-9", property_id: "property-6", type: "Caretaker Salary", amount: 280000, date: date(18) },
        { id: "expense-10", property_id: "property-6", type: "Repairs", amount: 95000, date: date(21) },
      ],
      subscriptions: [
        {
          id: "subscription-1",
          owner_id: "user-1",
          plan: "Professional",
          monthly_fee: 120000,
          status: "Active",
          last_payment_date: date(3),
          last_payment_method: "MTN MoMo",
          last_payment_note: "Monthly platform subscription",
          next_billing_date: date(28),
        },
        {
          id: "subscription-2",
          owner_id: "user-2",
          plan: "Starter",
          monthly_fee: 50000,
          status: "Overdue",
          last_payment_date: previousDate(12),
          last_payment_method: "Airtel Money",
          last_payment_note: "Previous month subscription",
          next_billing_date: date(12),
        },
      ],
      supportTickets: [
        {
          id: "ticket-1",
          owner_id: "user-1",
          subject: "Import tenant rent balances",
          priority: "High",
          status: "In Progress",
          note: "Sarah needs assistance moving tenant arrears from her notebook into RentLedger.",
          updated_at: date(21),
        },
        {
          id: "ticket-2",
          owner_id: "user-2",
          subject: "Subscription payment confirmation",
          priority: "Medium",
          status: "Open",
          note: "Daniel says he paid by Airtel Money and needs the account marked active.",
          updated_at: date(20),
        },
        {
          id: "ticket-3",
          owner_id: "user-1",
          subject: "Caretaker access question",
          priority: "Low",
          status: "Resolved",
          note: "Explained caretaker mode and removal restrictions.",
          updated_at: date(16),
        },
      ],
      notifications: [
        {
          id: "notification-1",
          type: "system",
          title: "Welcome to RentLedger",
          message: "Your dashboard is ready for rent tracking and account monitoring.",
          created_at: date(1),
          read: false,
        },
      ],
      dismissedNotificationIds: [],
    };
  }

  function metricCard(label, value, note) {
    return `
      <article class="metric-card">
        <div class="metric-label">${escapeHtml(label)}</div>
        <div class="metric-value">${escapeHtml(String(value))}</div>
        <div class="metric-note">${escapeHtml(note)}</div>
      </article>
    `;
  }

  function ownerSummaryTile(label, value) {
    return `
      <article class="unit-tile platform-tile">
        <div class="unit-number">${escapeHtml(String(value))}</div>
        <div class="unit-status">${escapeHtml(label)}</div>
      </article>
    `;
  }

  function ownerSummaryItem(label, value) {
    return `
      <article class="owner-summary-item">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </article>
    `;
  }

  function personCell(name, meta) {
    return `
      <div class="person-cell">
        ${avatar(name)}
        <span>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(meta || "")}</small>
        </span>
      </div>
    `;
  }

  function avatar(name) {
    const initials = String(name || "RL")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "RL";
    const palette = ["teal", "amber", "blue", "rose", "green"];
    const index = initials.charCodeAt(0) % palette.length;
    return `<span class="avatar ${palette[index]}">${escapeHtml(initials)}</span>`;
  }

  function statusPill(status) {
    const className =
      status === "Paid" || status === "Occupied" || status === "Active" || status === "Resolved" || status === "Low"
        ? "success"
        : status === "Overdue" || status === "Open" || status === "High"
          ? "danger"
          : status === "Partial" || status === "Vacant" || status === "Due" || status === "Medium" || status === "In Progress" || status === "Invited"
            ? "warning"
            : "info";
    return `<span class="pill ${className}">${escapeHtml(status)}</span>`;
  }

  function emptyTableRow(colspan, message) {
    return `<tr><td class="empty-row" colspan="${colspan}">${escapeHtml(message)}</td></tr>`;
  }

  function emptyBlock(message) {
    return `<div class="empty-row">${escapeHtml(message)}</div>`;
  }

  function formatMoney(value) {
    return `UGX ${Number(value || 0).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
  }

  function formatCompactMoney(value) {
    const amount = Number(value || 0);
    if (amount >= 1000000) return `UGX ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `UGX ${Math.round(amount / 1000)}K`;
    return formatMoney(amount);
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("en-UG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function monthName(value) {
    return value.toLocaleDateString("en-UG", { month: "long", year: "numeric" });
  }

  function timeAgo(value) {
    if (!value) return "Just now";
    const date = typeof value === "string" && value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Just now";
    const diff = Date.now() - date.getTime();
    const minutes = Math.max(0, Math.floor(diff / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return formatDate(isoDate(date));
  }

  function isoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addMonths(value, count) {
    const date = new Date(`${value}T00:00:00`);
    date.setMonth(date.getMonth() + count);
    return isoDate(date);
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function autoReference(method) {
    const prefix = method.includes("Airtel") ? "AIRTEL" : method.includes("MTN") || method.includes("MoMo") ? "MOMO" : "PAY";
    return `${prefix}-${Math.floor(10000 + Math.random() * 89999)}`;
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    const duration = Math.min(Math.max(String(message).length * 45, 2200), 6500);
    showToast.timer = window.setTimeout(() => {
      ui.toast.classList.remove("show");
    }, duration);
  }
})();
