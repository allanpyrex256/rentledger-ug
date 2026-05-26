(function () {
  const STORAGE_KEY = "rentledger_ug_mvp_v1";
  let supabaseClient = null;
  let supabaseReady = false;
  let supabaseHydrating = false;
  let supabaseSaveTimer = null;
  let authVisible = false;
  let highlightedUnitId = null;

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

  const PACKAGE_OPTIONS = [
    { plan: "Trial", fee: 0, status: "Trial" },
    { plan: "Starter", fee: 50000, status: "Active" },
    { plan: "Professional", fee: 120000, status: "Active" },
    { plan: "Enterprise", fee: 250000, status: "Active" },
  ];

  const SUPER_ADMIN_USER_ID = "user-saas-owner";
  const SUPER_ADMIN_EMAIL = "allanpyrex5@gmail.com";
  const DEMO_ACCOUNT_IDS = [SUPER_ADMIN_USER_ID, "user-1", "staff-1"];
  const state = loadState();

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
    listingLocationFilter: document.getElementById("listingLocationFilter"),
    listingPriceFilter: document.getElementById("listingPriceFilter"),
    listingTypeFilter: document.getElementById("listingTypeFilter"),
    listingFurnishedFilter: document.getElementById("listingFurnishedFilter"),
    publicListingGrid: document.getElementById("publicListingGrid"),
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
    notificationModal: document.getElementById("notificationModal"),
    notificationModalTitle: document.getElementById("notificationModalTitle"),
    notificationModalMeta: document.getElementById("notificationModalMeta"),
    notificationModalMessage: document.getElementById("notificationModalMessage"),
    closeNotificationModal: document.getElementById("closeNotificationModal"),
    moveOutModal: document.getElementById("moveOutModal"),
    moveOutForm: document.getElementById("moveOutForm"),
    moveOutTenantId: document.getElementById("moveOutTenantId"),
    moveOutTenantMeta: document.getElementById("moveOutTenantMeta"),
    moveOutBalance: document.getElementById("moveOutBalance"),
    moveOutDamages: document.getElementById("moveOutDamages"),
    moveOutRefund: document.getElementById("moveOutRefund"),
    moveOutNote: document.getElementById("moveOutNote"),
    cancelMoveOut: document.getElementById("cancelMoveOut"),
    roleSelect: document.getElementById("roleSelect"),
    adminMetricGrid: document.getElementById("adminMetricGrid"),
    adminAnalyticsChart: document.getElementById("adminAnalyticsChart"),
    adminActivityCountLabel: document.getElementById("adminActivityCountLabel"),
    adminActivityList: document.getElementById("adminActivityList"),
    adminSubscriptionCountLabel: document.getElementById("adminSubscriptionCountLabel"),
    adminSubscriptionTable: document.getElementById("adminSubscriptionTable"),
    adminSupportCountLabel: document.getElementById("adminSupportCountLabel"),
    adminSupportList: document.getElementById("adminSupportList"),
    metricGrid: document.getElementById("metricGrid"),
    dailyOpsGrid: document.getElementById("dailyOpsGrid"),
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
    expenseTodayLabel: document.getElementById("expenseTodayLabel"),
    dashboardExpenseList: document.getElementById("dashboardExpenseList"),
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
    downloadRentReport: document.getElementById("downloadRentReport"),
    expenseForm: document.getElementById("expenseForm"),
    expenseProperty: document.getElementById("expenseProperty"),
    expenseType: document.getElementById("expenseType"),
    expenseAmount: document.getElementById("expenseAmount"),
    expenseDate: document.getElementById("expenseDate"),
    expenseTable: document.getElementById("expenseTable"),
    expenseTotalLabel: document.getElementById("expenseTotalLabel"),
    downloadExpenseReport: document.getElementById("downloadExpenseReport"),
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
    createDemoAccountButton: document.getElementById("createDemoAccountButton"),
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
    systemStorageLabel: document.getElementById("systemStorageLabel"),
    systemMonitorSummary: document.getElementById("systemMonitorSummary"),
    systemSignalList: document.getElementById("systemSignalList"),
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
    superAdminDashboard: ["RentLedger UG Admin", "SaaS analytics for landlords, subscriptions, revenue, support, and account health."],
    dashboard: ["Daily Control Center", "Who paid, who is late, vacant rooms, and expenses at a glance."],
    properties: ["Properties", "Set up rooms, shops, boys quarters, houses, and monthly rent."],
    tenants: ["Tenants", "Tenant move-in records, deposits, balances, and contacts."],
    staff: ["Staff", "Invite managers and assign access to specific properties."],
    rent: ["Rent Collection", "Record paid, partial, overdue, balances, and Mobile Money references."],
    expenses: ["Expenses & Maintenance", "Broken taps, wiring, painting, plumbing, utilities, and caretaker costs."],
    reminders: ["Reminders", "SMS and WhatsApp messages for rent collection."],
    platformLandlords: ["Account Management", "Approve landlords, create demos, reset passwords, and manage packages."],
    platformBilling: ["Billing", "Track subscriptions, pending payments, expiring plans, and revenue analytics."],
    platformSupport: ["System Monitoring", "Watch notifications, support tickets, errors, and storage health."],
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
    ["superAdminDashboard", "Overview"],
    ["platformLandlords", "Accounts"],
    ["platformBilling", "Billing"],
    ["platformSupport", "Monitoring"],
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
    renderPublicListings();
    renderSession();
  }

  function bindEvents() {
    document.querySelectorAll("[data-open-auth]").forEach((button) => {
      button.addEventListener("click", () => showAuth(button.dataset.openAuth || "signin"));
    });

    document.querySelectorAll("[data-start-demo]").forEach((button) => {
      button.addEventListener("click", signInDemoAccount);
    });

    document.querySelectorAll("[data-demo-account]").forEach((button) => {
      button.addEventListener("click", () => signInDemoAccount(button.dataset.demoAccount));
    });

    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => togglePasswordVisibility(button));
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
    [ui.listingLocationFilter, ui.listingPriceFilter, ui.listingTypeFilter, ui.listingFurnishedFilter]
      .filter(Boolean)
      .forEach((input) => {
        input.addEventListener("input", renderPublicListings);
        input.addEventListener("change", renderPublicListings);
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
    document.addEventListener("click", handleActionClick);

    ui.sideNav.addEventListener("click", navigateFromEvent);
    ui.mobileTabs.addEventListener("click", navigateFromEvent);
    ui.globalSearch.addEventListener("input", () => {
      state.searchTerm = ui.globalSearch.value;
      saveState();
      renderAll();
    });
    ui.notificationToggle.addEventListener("click", toggleNotifications);
    ui.markNotificationsRead.addEventListener("click", markNotificationsRead);
    ui.closeNotificationModal.addEventListener("click", closeNotificationModal);
    ui.notificationModal.addEventListener("click", (event) => {
      if (event.target === ui.notificationModal) closeNotificationModal();
    });
    ui.cancelMoveOut.addEventListener("click", closeMoveOutModal);
    ui.moveOutModal.addEventListener("click", (event) => {
      if (event.target === ui.moveOutModal) closeMoveOutModal();
    });

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
            ? "Super admin platform mode active."
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
    ui.moveOutForm.addEventListener("submit", completeTenantMoveOut);
    ui.staffInviteForm.addEventListener("submit", inviteStaff);
    ui.paymentForm.addEventListener("submit", savePayment);
    ui.paymentTenant.addEventListener("change", updatePaymentPreview);
    ui.paymentAmount.addEventListener("input", updatePaymentPreview);
    ui.downloadRentReport.addEventListener("click", downloadMonthlyRentReport);
    ui.expenseForm.addEventListener("submit", saveExpense);
    ui.downloadExpenseReport.addEventListener("click", downloadExpenseReport);
    ui.createDemoAccountButton.addEventListener("click", createDemoLandlordAccount);
    ui.ownerPaymentLandlord.addEventListener("change", () => syncOwnerPaymentDefaults(true));
    ui.ownerPaymentDate.addEventListener("change", () => syncOwnerPaymentDefaults(false));
    ui.ownerPaymentForm.addEventListener("submit", saveOwnerPayment);
    ui.supportTicketForm.addEventListener("submit", saveSupportTicket);
    ui.adminPasswordResetForm.addEventListener("submit", sendAdminPasswordReset);
    ui.closeReceipt.addEventListener("click", closeReceipt);
    ui.printReceipt.addEventListener("click", printReceipt);
    ui.downloadReceipt.addEventListener("click", downloadReceipt);
    ui.resetDemo.addEventListener("click", resetDemoData);
  }

  function handleActionClick(event) {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const actions = [
      ["openActivity", openActivity],
      ["toggleAccountStatus", toggleLandlordAccountStatus],
      ["cyclePlan", cycleSubscriptionPackage],
      ["adminResetUser", createAdminPasswordReset],
      ["focusLandlord", focusLandlordAccount],
      ["toggleTicket", toggleSupportTicket],
      ["editProperty", startPropertyEdit],
      ["removeProperty", removeProperty],
      ["removeUnit", removeUnit],
      ["toggleListing", togglePublicListing],
      ["editTenant", startTenantEdit],
      ["moveOutTenant", startTenantMoveOut],
      ["removeTenant", removeTenant],
      ["copyStaffLogin", copyStaffLogin],
      ["removeStaff", removeStaff],
      ["receiptPayment", openReceipt],
      ["removeExpense", removeExpense],
      ["openNotification", openNotification],
      ["closeMoveOut", closeMoveOutModal],
    ];

    for (const [key, handler] of actions) {
      const value = button.dataset[key];
      if (value === undefined) continue;
      event.preventDefault();
      handler(value);
      return;
    }

    if (button.dataset.copyMessage !== undefined) {
      event.preventDefault();
      copyText(decodeURIComponent(button.dataset.copyMessage));
    }
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
    if (isAccountSuspended(user)) {
      showToast("This account is suspended. Contact support.");
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

  function togglePasswordVisibility(button) {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    const nextVisible = input.type === "password";
    input.type = nextVisible ? "text" : "password";
    button.classList.toggle("is-visible", nextVisible);
    button.setAttribute("aria-pressed", String(nextVisible));
    button.setAttribute("aria-label", nextVisible ? "Hide password" : "Show password");
    button.setAttribute("title", nextVisible ? "Hide password" : "Show password");
    input.focus();
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

  function signInDemoAccount(accountId) {
    const resolvedAccountId = typeof accountId === "string" && accountId ? accountId : "user-1";
    const demoUser =
      state.users.find((user) => user.id === resolvedAccountId) ||
      DEMO_ACCOUNT_IDS.map((id) => state.users.find((user) => user.id === id)).find(Boolean);
    if (!demoUser) {
      showToast("Reset demo data to restore test accounts.");
      return;
    }
    if (isAccountSuspended(demoUser)) {
      showToast("This demo account is suspended.");
      return;
    }
    openUserSession(demoUser.id);
    ui.signInForm.reset();
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
      platform_owner_id: SUPER_ADMIN_USER_ID,
      password: ui.accountPassword.value,
      role: "landlord",
      account_status: "Active",
      created_at: new Date().toISOString(),
    };
    const adminOtpDelivery = createAdminSignupOtp(user);

    state.users.push(user);
    state.currentUserId = user.id;
    state.selectedPropertyId = "all";
    state.role = "landlord";
    saveState();
    ui.createAccountForm.reset();
    renderSession();
    setView("properties");
    showToast(`Landlord account opened. Admin OTP sent to ${adminOtpDelivery}.`);
  }

  function createAdminSignupOtp(user) {
    const otp = makeOtp();
    const admin = superAdminUser();
    const adminEmail = admin?.email || SUPER_ADMIN_EMAIL;
    const adminPhone = admin?.phone || "";
    addNotification({
      user_id: SUPER_ADMIN_USER_ID,
      type: "support",
      title: "New account OTP",
      message: [
        `${user.name} created a landlord account.`,
        `OTP: ${otp}`,
        `Email: ${user.email}`,
        `Phone: ${user.phone}`,
        `Demo delivery: ${adminEmail}${adminPhone ? ` or SMS ${adminPhone}` : ""}.`,
      ].join("\n"),
    });
    return adminPhone ? `${maskEmailAddress(adminEmail)} / SMS ${maskPhoneNumber(adminPhone)}` : maskEmailAddress(adminEmail);
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
    ui.propertyFilter.classList.toggle("hidden", isSaasOwner(user));
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
    else updateViewHeader(nextActive);
  }

  function navButton(className, viewName, label, active) {
    return `<button class="${className}${active ? " active" : ""}" data-view="${viewName}" type="button">${escapeHtml(label)}</button>`;
  }

  function currentNavItems() {
    if (currentUser()?.role === "staff") return staffNav;
    return isSaasOwner() ? ownerNav : landlordNav;
  }

  function defaultView() {
    return isSaasOwner() ? "superAdminDashboard" : "dashboard";
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
    const selectedPaymentOwnerId = ui.ownerPaymentLandlord.value;
    const landlordOptions =
      landlordUsers()
        .map((user) => `<option value="${user.id}">${escapeHtml(user.name)} - ${escapeHtml(userContactLabel(user))}</option>`)
        .join("") || '<option value="">No landlords yet</option>';
    ui.ownerPaymentLandlord.innerHTML = landlordOptions;
    if (selectedPaymentOwnerId && landlordUsers().some((user) => user.id === selectedPaymentOwnerId)) {
      ui.ownerPaymentLandlord.value = selectedPaymentOwnerId;
    }
    ui.supportOwner.innerHTML = landlordOptions;
    ui.adminPasswordResetUser.innerHTML =
      resettableUsers()
        .map((user) => `<option value="${user.id}">${escapeHtml(adminResetOptionLabel(user))}</option>`)
        .join("") || '<option value="">No resettable accounts</option>';
    syncOwnerPaymentDefaults(false);
  }

  function populateRoleOptions() {
    const user = currentUser();
    const options =
      user && user.role === "saas-owner"
        ? [{ value: "saas-owner", label: "Super Admin" }]
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
    renderSuperAdminDashboard();
    renderProperties();
    renderTenants();
    renderStaff();
    renderRent();
    renderExpenses();
    renderReminders();
    renderPlatformViews();
    renderNotifications();
    renderPublicListings();
    clearAppLoading();
  }

  function setView(viewName) {
    setAppLoading("Loading view");
    const allowedViewNames = currentNavItems().map(([itemViewName]) => itemViewName);
    const resolvedViewName = allowedViewNames.includes(viewName) ? viewName : defaultView();
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active-view", view.id === resolvedViewName);
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === resolvedViewName);
    });
    updateViewHeader(resolvedViewName);
    if (resolvedViewName === "platformBilling") syncOwnerPaymentDefaults(false);
    clearAppLoading();
  }

  function updateViewHeader(viewName) {
    const [title, subtitle] = viewCopy[viewName] || viewCopy.dashboard;
    ui.viewTitle.textContent = title;
    ui.viewSubtitle.textContent = subtitle;
  }

  function renderPublicListings() {
    if (!ui.publicListingGrid) return;
    const locationFilter = String(ui.listingLocationFilter?.value || "").trim().toLowerCase();
    const maxRent = Number(ui.listingPriceFilter?.value || 0);
    const typeFilter = ui.listingTypeFilter?.value || "all";
    const furnishedFilter = ui.listingFurnishedFilter?.value || "all";
    const listings = publicListingItems().filter((item) => {
      const typeText = `${item.property.property_type} ${item.unit.unit_number}`.toLowerCase();
      const matchesLocation =
        !locationFilter ||
        item.property.location.toLowerCase().includes(locationFilter) ||
        item.property.property_name.toLowerCase().includes(locationFilter);
      const matchesPrice = !maxRent || Number(item.unit.rent_amount) <= maxRent;
      const matchesType = typeFilter === "all" || typeText.includes(typeFilter);
      const furnished = Boolean(item.unit.listing_furnished);
      const matchesFurnished =
        furnishedFilter === "all" ||
        (furnishedFilter === "furnished" && furnished) ||
        (furnishedFilter === "unfurnished" && !furnished);
      return matchesLocation && matchesPrice && matchesType && matchesFurnished;
    });

    ui.publicListingGrid.innerHTML =
      listings.map((item) => publicListingCard(item)).join("") ||
      emptyBlock("No public vacancies match these filters.");
  }

  function publicListingItems() {
    return state.units
      .filter((unit) => unit.status === "vacant" && unit.listing_published)
      .map((unit) => {
        const property = propertyById(unit.property_id);
        const owner = property ? userById(property.owner_id) : null;
        return property && owner ? { unit, property, owner } : null;
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.unit.rent_amount) - Number(b.unit.rent_amount));
  }

  function publicListingCard({ unit, property, owner }) {
    const phone = normalizePhone(owner.phone || "");
    const message = `Hello ${owner.name}, I saw ${unit.unit_number} at ${property.property_name} on RentLedger. Is it still available?`;
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
            <a class="primary-button link-button" href="https://wa.me/${phone}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">Chat Landlord</a>
            <a class="text-button link-button" href="tel:${escapeHtml(phone)}">Call</a>
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
    if (type.includes("room") || type.includes("boys")) return "assets/apartment-exterior.jpg";
    return "assets/apartment-exterior.jpg";
  }

  function renderDashboard() {
    if (isSaasOwner()) return;

    const scope = getScopedData();
    const rentRows = getRentRows(scope.tenants);
    const todayPayments = scope.payments.filter((payment) => isToday(payment.created_at || payment.payment_date));
    const currentMonthPayments = getCurrentMonthPayments(scope.payments);
    const currentMonthExpenses = getCurrentMonthExpenses(scope.expenses);
    const occupied = scope.units.filter((unit) => unit.status === "occupied").length;
    const vacant = scope.units.filter((unit) => unit.status === "vacant").length;
    const vacantUnits = scope.units.filter((unit) => unit.status === "vacant");
    const expectedRent = scope.tenants.reduce((sum, tenant) => sum + Number(tenant.rent_amount), 0);
    const collected = currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const collectedToday = todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const expenses = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const todayExpenses = scope.expenses.filter((expense) => isToday(expense.created_at || expense.date));
    const recentExpenses = scope.expenses
      .slice()
      .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
      .slice(0, 6);
    const overdueRows = rentRows
      .filter((row) => row.status === "Overdue")
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    const overdueCount = overdueRows.length;
    const dueSoonCount = rentRows.filter((row) => row.daysUntilDue >= 0 && row.daysUntilDue <= 3).length;

    ui.dashboardPrimaryTitle.textContent = "Vacant Rooms";
    ui.dashboardSecondaryTitle.textContent = "Late Tenants";
    ui.dashboardRecentTitle.textContent = "Recent Payments";
    ui.dashboardActivityTitle.textContent = "Recent Activity";
    ui.upcomingDuesHead.innerHTML = `
      <th>Tenant</th>
      <th>Room</th>
      <th>Days</th>
      <th>Balance</th>
      <th>Phone</th>
    `;
    ui.recentPaymentsHead.innerHTML = `
      <th>Tenant</th>
      <th>Room</th>
      <th>Amount</th>
      <th>Time</th>
      <th>Method</th>
    `;

    ui.metricGrid.innerHTML = [
      metricCard("Rent Collected", formatMoney(collected), `${formatMoney(expectedRent)} expected this month`),
      metricCard("Late Tenants", overdueCount, `${formatMoney(totalBalance(overdueRows))} still unpaid`),
      metricCard("Vacant Rooms", vacant, vacantUnitSummary(vacantUnits)),
      metricCard("Expenses", formatMoney(expenses), `${todayExpenses.length} added today`),
    ].join("");

    ui.dailyOpsGrid.innerHTML = [
      dailyOpsCard("Came in today", formatMoney(collectedToday), `${todayPayments.length} rent payments recorded`, "success"),
      dailyOpsCard("Rent due soon", dueSoonCount, "Tenants due in the next 3 days", "warning"),
      dailyOpsCard("Vacant rentals", vacant, vacantUnitSummary(vacantUnits), "info"),
      dailyOpsCard("Expenses added", formatMoney(todayExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)), `${todayExpenses.length} records today`, "danger"),
    ].join("");

    ui.occupancyLabel.textContent = `${vacant} vacant`;
    ui.dueSoonLabel.textContent = `${overdueCount} late`;
    ui.monthLabel.textContent = monthName(new Date());

    ui.unitStatusGrid.innerHTML =
      vacantUnits
        .map((unit) => {
          const property = propertyById(unit.property_id);
          return `
            <article class="unit-tile vacant">
              <div class="unit-number">${escapeHtml(unit.unit_number)}</div>
              <div class="unit-status">${escapeHtml(property ? property.property_name : "No property")}</div>
              <strong>${formatMoney(unit.rent_amount)}</strong>
            </article>
          `;
        })
        .join("") || emptyBlock("All rooms, shops, and houses are occupied.");

    ui.upcomingDuesTable.innerHTML =
      overdueRows.slice(0, 8).map((row) => lateTenantRow(row)).join("") ||
      emptyTableRow(5, "No late tenants today.");

    const recent = scope.payments
      .slice()
      .sort((a, b) => new Date(b.created_at || b.payment_date) - new Date(a.created_at || a.payment_date))
      .slice(0, 8);
    ui.recentPaymentsTable.innerHTML =
      recent
        .map((payment) => {
          const tenant = tenantById(payment.tenant_id);
          const unit = tenant ? unitById(tenant.unit_id) : null;
          return `
            <tr>
              <td>${personCell(tenant ? tenant.name : "Removed tenant", payment.reference || payment.payment_method)}</td>
              <td>${escapeHtml(unit ? unit.unit_number : "Unassigned")}</td>
              <td><strong>${formatMoney(payment.amount)}</strong></td>
              <td>${escapeHtml(paymentTimeLabel(payment))}</td>
              <td>${escapeHtml(payment.payment_method)}</td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(5, "No payments recorded yet.");

    ui.dashboardChartTitle.textContent = "Monthly Revenue Graph";
    ui.dashboardChartLabel.textContent = monthName(new Date());
    ui.dashboardChart.innerHTML = renderIncomeChart(scope.payments);
    ui.expenseTodayLabel.textContent = `${todayExpenses.length} today`;
    ui.dashboardExpenseList.innerHTML =
      recentExpenses
        .map((expense) => {
          const property = propertyById(expense.property_id);
          return `
            <article class="compact-list-item">
              <span>
                <strong>${escapeHtml(expense.type)}</strong>
                <small>${escapeHtml(property ? property.property_name : "Unknown property")} - ${formatDate(expense.date)}</small>
              </span>
              <b>${formatMoney(expense.amount)}</b>
            </article>
          `;
        })
        .join("") || emptyBlock("No expenses recorded yet.");
    renderActivityFeed(buildActivityItems(scope).slice(0, 8));
  }

  function renderSuperAdminDashboard() {
    if (!isSaasOwner()) return;
    const landlords = landlordUsers();
    const subscriptions = state.subscriptions || [];
    const tickets = state.supportTickets || [];
    const activeAccounts = landlords.filter((user) => accountStatus(user) === "Active");
    const newSignups = newLandlordSignups();
    const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved");
    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === "Active" && !isSubscriptionExpired(subscription)
    );
    const monthlyRecurringRevenue = activeSubscriptions.reduce(
      (sum, subscription) => sum + Number(subscription.monthly_fee),
      0
    );
    const pendingPayments = pendingSubscriptions().length;
    const expiredAccounts = expiredSubscriptions();
    const expiringPlans = expiringSubscriptions().length;

    ui.adminMetricGrid.innerHTML = [
      adminMetricCard("Total Landlords", landlords.length, `${activeAccounts.length} active accounts`, "teal"),
      adminMetricCard("Active Subscriptions", activeSubscriptions.length, `${pendingPayments} pending payments`, "blue"),
      adminMetricCard("Monthly Revenue", formatMoney(monthlyRecurringRevenue), "Subscription MRR", "green"),
      adminMetricCard("New Signups", newSignups.length, "This month", "amber"),
      adminMetricCard("Support Tickets", tickets.length, `${openTickets.length} open`, "rose"),
      adminMetricCard("Expired Accounts", expiredAccounts.length, `${expiringPlans} plans expiring soon`, "slate"),
    ].join("");

    ui.adminAnalyticsChart.innerHTML = renderAdminAnalyticsCharts(subscriptions, landlords, tickets);

    ui.adminSubscriptionCountLabel.textContent = `${pendingPayments + expiredAccounts.length + expiringPlans} alerts`;
    ui.adminSubscriptionTable.innerHTML =
      subscriptions
        .slice()
        .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))
        .slice(0, 10)
        .map((subscription) => {
          const user = userById(subscription.owner_id);
          const status = isSubscriptionExpired(subscription)
            ? "Expired"
            : isSubscriptionExpiring(subscription) && subscription.status === "Active"
              ? "Expiring"
              : subscription.status;
          return `
            <tr>
              <td>${escapeHtml(user ? user.name : "Unknown landlord")}</td>
              <td>${escapeHtml(subscription.plan)}</td>
              <td>${formatDate(subscription.next_billing_date)}</td>
              <td>${formatMoney(subscription.monthly_fee)}</td>
              <td>${statusPill(status)}</td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(5, "No subscriptions yet.");

    ui.adminSupportCountLabel.textContent = `${openTickets.length} open`;
    ui.adminSupportList.innerHTML =
      tickets
        .slice()
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 5)
        .map((ticket) => {
          const user = userById(ticket.owner_id);
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
            </article>
          `;
        })
        .join("") || emptyBlock("No support tickets yet.");

    const activityItems = buildPlatformActivityItems().slice(0, 8);
    ui.adminActivityCountLabel.textContent = `${activityItems.length} updates`;
    ui.adminActivityList.innerHTML = activityFeedMarkup(activityItems);
  }

  function renderPlatformViews() {
    if (!isSaasOwner()) return;
    renderPlatformLandlords();
    renderPlatformBilling();
    renderPlatformSupport();
  }

  function renderActivityFeed(items) {
    ui.activityCountLabel.textContent = `${items.length} updates`;
    ui.activityList.innerHTML = activityFeedMarkup(items);
  }

  function activityFeedMarkup(items) {
    return items
      .map((item) => `
        <button class="activity-item" data-open-activity="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(item.title)}" type="button">
          ${avatar(item.name || item.title)}
          <span class="activity-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </span>
          <time>${escapeHtml(timeAgo(item.date))}</time>
        </button>
      `)
      .join("") || emptyBlock("No recent activity yet.");
  }

  function buildActivityItems(scope) {
    const paymentItems = scope.payments.map((payment) => {
      const tenant = tenantById(payment.tenant_id);
      return {
        id: `payment:${payment.id}`,
        category: "Payment",
        title: "Payment recorded",
        detail: `${tenant ? tenant.name : "Removed tenant"} paid ${formatMoney(payment.amount)} by ${payment.payment_method}.`,
        message: [
          `${tenant ? tenant.name : "Removed tenant"} paid ${formatMoney(payment.amount)} by ${payment.payment_method}.`,
          `Reference: ${payment.reference || "Not recorded"}`,
          `Balance after payment: ${formatMoney(payment.balance)}`,
          `Payment date: ${formatDate(payment.payment_date)}`,
        ].join("\n"),
        date: payment.payment_date,
        name: tenant ? tenant.name : "Payment",
      };
    });
    const expenseItems = scope.expenses.map((expense) => {
      const property = propertyById(expense.property_id);
      return {
        id: `expense:${expense.id}`,
        category: "Expense",
        title: "Expense added",
        detail: `${expense.type} at ${property ? property.property_name : "Unknown property"} for ${formatMoney(expense.amount)}.`,
        message: [
          `${expense.type} was recorded at ${property ? property.property_name : "Unknown property"}.`,
          `Amount: ${formatMoney(expense.amount)}`,
          `Date: ${formatDate(expense.date)}`,
        ].join("\n"),
        date: expense.date,
        name: expense.type,
      };
    });
    const tenantItems = scope.tenants.map((tenant) => ({
      id: `tenant:${tenant.id}`,
      category: "Tenant",
      title: "Tenant active",
      detail: `${tenant.name} is assigned to ${unitById(tenant.unit_id)?.unit_number || "a room"}.`,
      message: [
        `${tenant.name} is assigned to ${unitById(tenant.unit_id)?.unit_number || "a room"}.`,
        `Phone: ${tenant.phone || "Not recorded"}`,
        `Rent: ${formatMoney(tenant.rent_amount)}`,
        `Move-in date: ${formatDate(tenant.move_in_date)}`,
      ].join("\n"),
      date: tenant.move_in_date,
      name: tenant.name,
    }));
    return [...paymentItems, ...expenseItems, ...tenantItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function buildPlatformActivityItems() {
    const signupItems = landlordUsers().map((user) => ({
      id: `landlord:${user.id}`,
      category: "Account",
      title: "Landlord signup",
      detail: `${user.name} joined RentLedger UG as ${accountStatus(user).toLowerCase()}.`,
      message: [
        `${user.name} joined RentLedger UG as ${accountStatus(user).toLowerCase()}.`,
        `Phone: ${user.phone || "Not recorded"}`,
        `Email: ${user.email || "Not recorded"}`,
        `Joined: ${formatDate(user.created_at || isoDate(new Date()))}`,
      ].join("\n"),
      date: user.created_at || new Date().toISOString(),
      name: user.name,
    }));
    const ticketItems = (state.supportTickets || []).map((ticket) => {
      const user = userById(ticket.owner_id);
      return {
        id: `ticket:${ticket.id}`,
        category: "Support",
        title: ticket.subject,
        detail: `${user ? user.name : "Landlord"} support is ${ticket.status.toLowerCase()}.`,
        message: [
          ticket.note || "No support note added.",
          `Landlord: ${user ? user.name : "Unknown landlord"}`,
          `Priority: ${ticket.priority}`,
          `Status: ${ticket.status}`,
          `Updated: ${formatDate(ticket.updated_at)}`,
        ].join("\n"),
        date: ticket.updated_at,
        name: user ? user.name : ticket.subject,
      };
    });
    const billingItems = (state.subscriptions || []).map((subscription) => {
      const user = userById(subscription.owner_id);
      return {
        id: `subscription:${subscription.id}`,
        category: "Billing",
        title: `${subscription.plan} subscription`,
        detail: `${user ? user.name : "Landlord"} is ${subscription.status.toLowerCase()} at ${formatMoney(subscription.monthly_fee)}/month.`,
        message: [
          `${user ? user.name : "Landlord"} is ${subscription.status.toLowerCase()} on the ${subscription.plan} plan.`,
          `Monthly fee: ${formatMoney(subscription.monthly_fee)}`,
          `Last paid: ${formatDate(subscription.last_payment_date || subscription.next_billing_date)}`,
          `Next billing: ${formatDate(subscription.next_billing_date)}`,
        ].join("\n"),
        date: subscription.last_payment_date || subscription.next_billing_date,
        name: user ? user.name : subscription.plan,
      };
    });
    return [...signupItems, ...ticketItems, ...billingItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function openActivity(activityId) {
    const activityItem = findActivityItem(activityId);
    if (!activityItem) return;
    ui.notificationModalTitle.textContent = activityItem.title;
    ui.notificationModalMeta.textContent = `${activityItem.category || "Recent activity"} - ${timeAgo(activityItem.date)}`;
    ui.notificationModalMessage.textContent = activityItem.message || activityItem.detail;
    ui.notificationModal.classList.remove("hidden");
    ui.notificationPanel.classList.add("hidden");
  }

  function findActivityItem(activityId) {
    const scopedItems = buildActivityItems(getScopedData());
    const platformItems = isSaasOwner() ? buildPlatformActivityItems() : [];
    return [...platformItems, ...scopedItems].find((item) => item.id === activityId);
  }

  function buildSystemMonitorRows() {
    const supportRows = (state.supportTickets || []).map((ticket) => {
      const user = userById(ticket.owner_id);
      return {
        title: ticket.subject,
        detail: user ? user.name : "Unknown landlord",
        type: "Support",
        date: `${ticket.updated_at}T00:00:00`,
        dateLabel: formatDate(ticket.updated_at),
        status: ticket.status,
      };
    });
    const notificationRows = (state.notifications || []).map((notification) => ({
      title: notification.title,
      detail: notification.message,
      type: "Notification",
      date: notification.created_at,
      dateLabel: timeAgo(notification.created_at),
      status: notification.read ? "Read" : "Open",
    }));
    const storage = estimateStorageUsage();
    const systemRows = [
      {
        title: "Database / storage usage",
        detail: `${storage.records} records, ${storage.label}`,
        type: "Storage",
        date: new Date().toISOString(),
        dateLabel: "Now",
        status: supabaseReady ? "Active" : "In Progress",
      },
      {
        title: "Bugs and runtime errors",
        detail: "No captured error reports in this MVP.",
        type: "Bugs",
        date: new Date().toISOString(),
        dateLabel: "Now",
        status: "Resolved",
      },
    ];
    return [...supportRows, ...notificationRows, ...systemRows].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function pendingSubscriptions() {
    return (state.subscriptions || []).filter((subscription) => ["Overdue", "Pending"].includes(subscription.status));
  }

  function newLandlordSignups() {
    return landlordUsers().filter((user) => isCurrentMonth(user.created_at));
  }

  function expiredSubscriptions() {
    return (state.subscriptions || []).filter(isSubscriptionExpired);
  }

  function isSubscriptionExpired(subscription) {
    if (subscription.status === "Expired" || subscription.status === "Overdue") return true;
    if (!subscription.next_billing_date) return false;
    const today = new Date();
    const nextBilling = new Date(`${subscription.next_billing_date}T00:00:00`);
    return nextBilling < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  function expiringSubscriptions() {
    return (state.subscriptions || []).filter(isSubscriptionExpiring);
  }

  function isSubscriptionExpiring(subscription) {
    if (!subscription.next_billing_date) return false;
    const today = new Date();
    const soon = new Date(today);
    soon.setDate(today.getDate() + 14);
    const nextBilling = new Date(`${subscription.next_billing_date}T00:00:00`);
    return nextBilling >= today && nextBilling <= soon;
  }

  function isTrialAccount(user) {
    const subscription = subscriptionByOwner(user.id);
    return accountStatus(user) === "Trial" || subscription?.plan === "Trial" || subscription?.status === "Trial";
  }

  function systemHealthLabel() {
    if (!supabaseReady) return "Local";
    const storage = estimateStorageUsage();
    const openHighPriority = (state.supportTickets || []).some(
      (ticket) => ticket.status !== "Resolved" && ticket.priority === "High"
    );
    if (storage.bytes > 4 * 1024 * 1024 || openHighPriority) return "Attention";
    return "Healthy";
  }

  function estimateStorageUsage() {
    const payload = JSON.stringify({
      users: state.users,
      properties: state.properties,
      units: state.units,
      tenants: state.tenants,
      payments: state.payments,
      expenses: state.expenses,
      subscriptions: state.subscriptions,
      supportTickets: state.supportTickets,
      notifications: state.notifications,
    });
    const bytes = new Blob([payload]).size;
    const records = SUPABASE_TABLES.reduce((sum, table) => sum + ((state[table.stateKey] || []).length || 0), 0);
    const label = bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return { bytes, label, records };
  }

  function renderIncomeChart(payments) {
    const days = [5, 10, 15, 20, 25, 30];
    const buckets = days.map((day) => {
      const total = payments
        .filter((payment) => new Date(`${payment.payment_date}T00:00:00`).getDate() <= day)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      return { label: `${day}`, total };
    });
    return chartMarkup(buckets, "USh");
  }

  function renderOwnerChart(subscriptions) {
    const buckets = subscriptions.map((subscription) => ({
      label: subscription.plan.slice(0, 4),
      total: Number(subscription.monthly_fee),
    }));
    return chartMarkup(buckets, "MRR");
  }

  function renderAdminAnalyticsCharts(subscriptions, landlords, tickets) {
    const packageTotals = PACKAGE_OPTIONS.map((option) => ({
      label: option.plan.slice(0, 5),
      total: subscriptions
        .filter((subscription) => subscription.plan === option.plan)
        .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0),
    }));
    const accountMix = [
      { label: "Active", total: landlords.filter((user) => accountStatus(user) === "Active").length },
      { label: "Trial", total: landlords.filter((user) => isTrialAccount(user)).length },
      { label: "Expired", total: expiredSubscriptions().length },
      { label: "Paused", total: landlords.filter((user) => accountStatus(user) === "Suspended").length },
    ];
    const supportMix = [
      { label: "Open", total: tickets.filter((ticket) => ticket.status === "Open").length },
      { label: "Prog", total: tickets.filter((ticket) => ticket.status === "In Progress").length },
      { label: "Done", total: tickets.filter((ticket) => ticket.status === "Resolved").length },
      { label: "High", total: tickets.filter((ticket) => ticket.priority === "High" && ticket.status !== "Resolved").length },
    ];

    return `
      <div class="analytics-chart-grid">
        <article class="mini-chart">
          <strong>Revenue by Package</strong>
          ${chartMarkup(packageTotals, "Package revenue")}
        </article>
        <article class="mini-chart">
          <strong>Account Status</strong>
          ${chartMarkup(accountMix, "Account status")}
        </article>
        <article class="mini-chart">
          <strong>Support Load</strong>
          ${chartMarkup(supportMix, "Support load")}
        </article>
      </div>
    `;
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
      .filter((subscription) => subscription.status !== "Paused" && subscription.status !== "Trial")
      .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const totalOpenTickets = tickets.filter((ticket) => ticket.status !== "Resolved").length;
    const activeAccounts = landlords.filter((user) => accountStatus(user) === "Active").length;
    const inactiveAccounts = landlords.filter((user) => accountStatus(user) === "Suspended" || accountStatus(user) === "Inactive").length;
    const trialAccounts = landlords.filter((user) => isTrialAccount(user)).length;

    ui.ownerLandlordCountLabel.textContent = `${landlords.length} landlords`;
    ui.ownerLandlordSummary.innerHTML = [
      ownerSummaryItem("Active Accounts", activeAccounts),
      ownerSummaryItem("Inactive Accounts", inactiveAccounts),
      ownerSummaryItem("Trial Accounts", trialAccounts),
      ownerSummaryItem("Monthly SaaS Revenue", formatMoney(totalMrr)),
      ownerSummaryItem("Pending Payments", pendingSubscriptions().length),
      ownerSummaryItem("Open Support", totalOpenTickets),
    ].join("");

    ui.ownerLandlordTable.innerHTML =
      landlords
        .filter((user) => {
          const subscription = subscriptionByOwner(user.id);
          const portfolio = ownerPortfolio(user.id);
          return matchesSearch([
            user.name,
            user.phone,
            user.email,
            accountStatus(user),
            platformOwnerText(user),
            subscription ? subscription.plan : "",
            subscription ? subscription.status : "",
            portfolio.properties.map((property) => property.property_name).join(" "),
          ]);
        })
        .map((user) => {
          const portfolio = ownerPortfolio(user.id);
          const subscription = subscriptionByOwner(user.id);
          const openTicketCount = tickets.filter((ticket) => ticket.owner_id === user.id && ticket.status !== "Resolved").length;
          const status = accountStatus(user);
          const nextAction = status === "Suspended" || status === "Inactive" ? "Approve" : "Suspend";
          return `
            <tr>
              <td>
                <strong>${escapeHtml(user.name)}</strong>
                <small class="table-subtext">${escapeHtml(userContactLabel(user))}</small>
                <small class="table-subtext">${escapeHtml(platformOwnerText(user))}</small>
              </td>
              <td>
                ${escapeHtml(subscription ? subscription.plan : "No plan")}
                <small class="table-subtext">${subscription ? statusPill(subscription.status) : ""}</small>
              </td>
              <td>${statusPill(status)}</td>
              <td>${portfolio.properties.length} properties / ${portfolio.units.length} rooms</td>
              <td>
                ${escapeHtml(openTicketCount ? `${openTicketCount} support open` : "No open support")}
                <small class="table-subtext">${subscription ? `Next: ${formatDate(subscription.next_billing_date)}` : "No subscription"}</small>
              </td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-toggle-account-status="${user.id}" type="button">${nextAction}</button>
                  <button class="text-button" data-cycle-plan="${user.id}" type="button">Package</button>
                  <button class="text-button" data-admin-reset-user="${user.id}" type="button">Send Reset OTP</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No landlord accounts yet.");

  }

  function renderPlatformBilling() {
    const subscriptions = state.subscriptions || [];
    const currentMrr = subscriptions
      .filter((subscription) => subscription.status !== "Paused")
      .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const paidThisMonth = subscriptions
      .filter((subscription) => isCurrentMonth(subscription.last_payment_date))
      .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const expiring = expiringSubscriptions().length;
    const trials = subscriptions.filter((subscription) => subscription.plan === "Trial" || subscription.status === "Trial").length;

    ui.ownerBillingTotalLabel.textContent = formatMoney(currentMrr);
    ui.ownerBillingSummary.innerHTML = [
      ownerSummaryItem("MRR", formatMoney(currentMrr)),
      ownerSummaryItem("Paid This Month", formatMoney(paidThisMonth)),
      ownerSummaryItem("Pending Payments", pendingSubscriptions().length),
      ownerSummaryItem("Expiring Plans", expiring),
      ownerSummaryItem("Trial Accounts", trials),
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
          const status = isSubscriptionExpiring(subscription) && subscription.status === "Active" ? "Expiring" : subscription.status;
          return `
            <tr>
              <td>${escapeHtml(user ? user.name : "Unknown landlord")}</td>
              <td>${escapeHtml(subscription.plan)}</td>
              <td>${formatMoney(subscription.monthly_fee)}</td>
              <td>${formatDate(subscription.last_payment_date)}</td>
              <td>${formatDate(subscription.next_billing_date)}</td>
              <td>${statusPill(status)}</td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No subscription records yet.");
  }

  function renderPlatformSupport() {
    const tickets = state.supportTickets || [];
    const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved");
    const notifications = state.notifications || [];
    const unreadNotifications = notifications.filter((notification) => !notification.read).length;
    const storage = estimateStorageUsage();
    const systemRows = buildSystemMonitorRows();
    ui.systemStorageLabel.textContent = supabaseReady ? "Supabase active" : "Browser fallback";
    ui.systemStorageLabel.className = `pill ${supabaseReady ? "success" : "warning"}`;
    ui.systemMonitorSummary.innerHTML = [
      ownerSummaryItem("Notifications", notifications.length),
      ownerSummaryItem("Unread Alerts", unreadNotifications),
      ownerSummaryItem("Support Tickets", tickets.length),
      ownerSummaryItem("Open Requests", openTickets.length),
      ownerSummaryItem("Bug Reports", 0),
      ownerSummaryItem("Storage Used", storage.label),
    ].join("");
    ui.systemSignalList.innerHTML =
      systemRows
        .slice(0, 8)
        .map(
          (row) => `
            <article class="support-card">
              <div class="support-card-header">
                <div class="support-card-title">
                  <strong>${escapeHtml(row.title)}</strong>
                  <small>${escapeHtml(row.type)} - ${escapeHtml(row.dateLabel)}</small>
                </div>
                ${statusPill(row.status)}
              </div>
              <p class="support-note">${escapeHtml(row.detail)}</p>
            </article>
          `
        )
        .join("") || emptyBlock("No system signals yet.");

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
                <button class="text-button" data-focus-landlord="${ticket.owner_id}" type="button">View Account</button>
                <button class="${resolved ? "text-button" : "primary-button"}" data-toggle-ticket="${ticket.id}" type="button">
                  ${resolved ? "Reopen" : "Mark Resolved"}
                </button>
              </div>
            </article>
          `;
        })
        .join("") || emptyBlock("No support tickets yet.");

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
    ui.unitCountLabel.textContent = `${scope.units.length} rooms`;

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
          const canPublish = unit.status === "vacant" && !removeDisabled;
          const listingAction = unit.listing_published ? "Unpublish" : "Publish Vacancy";
          return `
            <tr data-unit-row="${escapeHtml(unit.id)}" class="${unit.id === highlightedUnitId ? "row-highlight" : ""}">
              <td>${escapeHtml(unit.unit_number)}</td>
              <td>${escapeHtml(property ? property.property_name : "Unknown")}</td>
              <td>${formatMoney(unit.rent_amount)}</td>
              <td>${statusPill(capitalize(unit.status))}</td>
              <td>
                ${statusPill(unit.listing_published ? "Published" : "Private")}
                <small class="table-subtext">${unit.status === "vacant" ? "Can appear on public listings" : "Occupied rooms are hidden"}</small>
              </td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-toggle-listing="${unit.id}" ${canPublish ? "" : "disabled"} type="button">${listingAction}</button>
                  <button class="danger-button" data-remove-unit="${unit.id}" ${removeDisabled || hasTenant ? "disabled" : ""} type="button">
                    ${hasTenant ? "Tenant assigned" : "Remove"}
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No rooms, shops, or houses yet.");

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
                  <button class="danger-button" data-move-out-tenant="${tenant.id}" ${removeDisabled} type="button">Move Out</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No tenants match this view.");

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
                <div class="reminder-title">${escapeHtml(row.tenant.name)} - ${escapeHtml(row.unit ? row.unit.unit_number : "Room")}</div>
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
    ui.tenantUnit.innerHTML = unitOptions || '<option value="">Add a vacant room first</option>';
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
          return `<option value="${tenant.id}">${escapeHtml(tenant.name)} - ${escapeHtml(unit ? unit.unit_number : "Room")}</option>`;
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
      showToast("Staff cannot create rooms.");
      return;
    }
    if (!ui.unitProperty.value) {
      showToast("Add a property before adding rooms.");
      return;
    }

    const property = ownerProperties().find((item) => item.id === ui.unitProperty.value);
    if (!property) {
      showToast("Choose one of your properties.");
      return;
    }

    const unitId = makeId("unit");
    state.units.push({
      id: unitId,
      property_id: property.id,
      unit_number: ui.unitNumber.value.trim(),
      rent_amount: Number(ui.unitRent.value),
      status: "vacant",
    });
    state.selectedPropertyId = property.id;
    state.searchTerm = "";
    ui.globalSearch.value = "";
    highlightedUnitId = unitId;

    saveState();
    ui.unitForm.reset();
    renderAll();
    revealUnitRow(unitId);
    showToast("Room / shop added.");
  }

  function revealUnitRow(unitId) {
    const row = document.querySelector(`[data-unit-row="${unitId}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    window.clearTimeout(revealUnitRow.timer);
    revealUnitRow.timer = window.setTimeout(() => {
      if (highlightedUnitId === unitId) highlightedUnitId = null;
      row.classList.remove("row-highlight");
    }, 3000);
  }

  function removeUnit(id) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Your role cannot remove rooms.");
      return;
    }
    const hasTenant = state.tenants.some((tenant) => tenant.unit_id === id);
    if (hasTenant) {
      showToast("Remove the tenant before removing this room.");
      return;
    }
    state.units = state.units.filter((unit) => unit.id !== id);
    saveState();
    renderAll();
    showToast("Room removed.");
  }

  function togglePublicListing(unitId) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Only the owner can publish public vacancies.");
      return;
    }
    const unit = ownerProperties()
      .flatMap((property) => state.units.filter((item) => item.property_id === property.id))
      .find((item) => item.id === unitId);
    if (!unit) return;
    if (unit.status !== "vacant") {
      showToast("Only vacant rooms can be published publicly.");
      return;
    }
    const nextPublished = !unit.listing_published;
    state.units = state.units.map((item) =>
      item.id === unitId
        ? {
            ...item,
            listing_published: nextPublished,
            listing_bedrooms: item.listing_bedrooms || 1,
            listing_bathrooms: item.listing_bathrooms || 1,
            listing_furnished: Boolean(item.listing_furnished),
            listing_photo: item.listing_photo || listingPhotoForProperty(propertyById(item.property_id)),
            listing_note: item.listing_note || "Vacant and ready for viewing. Contact the landlord on WhatsApp.",
          }
        : item
    );
    addNotification({
      type: "property",
      title: nextPublished ? "Vacancy published" : "Vacancy unpublished",
      message: `${unit.unit_number} ${nextPublished ? "is now visible on public listings." : "has been removed from public listings."}`,
    });
    saveState();
    renderAll();
    showToast(nextPublished ? "Vacancy published publicly." : "Vacancy unpublished.");
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
      showToast("Choose an available room first.");
      return;
    }

    const ownedUnit = getScopedData().units.find((unit) => unit.id === tenant.unit_id);
    if (!ownedUnit) {
      showToast("Choose a room from your own properties.");
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
      account_status: "Active",
      company_owner_id: user.id,
      assigned_property_ids: assignedPropertyIds,
      invitation_status: "Invited",
      created_at: new Date().toISOString(),
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

  function startTenantMoveOut(id) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Your role cannot move out tenants.");
      return;
    }
    const tenant = getScopedData().tenants.find((item) => item.id === id);
    if (!tenant) return;
    const unit = unitById(tenant.unit_id);
    const rentRow = getRentRows([tenant])[0];
    ui.moveOutTenantId.value = tenant.id;
    ui.moveOutTenantMeta.textContent = `${tenant.name} - ${unit ? unit.unit_number : "Unassigned room"}`;
    ui.moveOutBalance.value = formatMoney(rentRow ? rentRow.balance : 0);
    ui.moveOutBalance.dataset.amount = String(rentRow ? rentRow.balance : 0);
    ui.moveOutDamages.value = "0";
    ui.moveOutRefund.value = "0";
    ui.moveOutNote.value = "";
    ui.moveOutModal.classList.remove("hidden");
  }

  function closeMoveOutModal() {
    ui.moveOutModal.classList.add("hidden");
    ui.moveOutForm.reset();
    ui.moveOutBalance.dataset.amount = "0";
  }

  function completeTenantMoveOut(event) {
    event.preventDefault();
    const tenant = getScopedData().tenants.find((item) => item.id === ui.moveOutTenantId.value);
    if (!tenant) {
      closeMoveOutModal();
      return;
    }
    const unit = unitById(tenant.unit_id);
    const balance = Number(ui.moveOutBalance.dataset.amount || 0);
    const damages = Number(ui.moveOutDamages.value || 0);
    const refund = Number(ui.moveOutRefund.value || 0);
    const note = ui.moveOutNote.value.trim();

    setUnitStatus(tenant.unit_id, "vacant");
    state.tenants = state.tenants.filter((item) => item.id !== tenant.id);
    addNotification({
      type: "tenant",
      title: "Tenant moved out",
      message: [
        `${tenant.name} moved out of ${unit ? unit.unit_number : "a room"}.`,
        `Balance: ${formatMoney(balance)}`,
        `Damages: ${formatMoney(damages)}`,
        `Refund: ${formatMoney(refund)}`,
        note ? `Note: ${note}` : "No move-out note added.",
      ].join("\n"),
    });
    saveState();
    closeMoveOutModal();
    renderAll();
    showToast(`${tenant.name} moved out. Room marked vacant.`);
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
      created_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
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

    syncOwnerPaymentDefaults(false);
    const owner = userById(ownerId);
    const paymentDate = ui.ownerPaymentDate.value || isoDate(new Date());
    const amount = Number(ui.ownerPaymentAmount.value || subscription.monthly_fee || 0);
    const note = ui.ownerPaymentNote.value.trim() || defaultOwnerPaymentNote(owner, subscription, paymentDate);
    state.subscriptions = state.subscriptions.map((item) =>
      item.id === subscription.id
        ? {
            ...item,
            monthly_fee: Number.isFinite(amount) ? amount : item.monthly_fee,
            status: "Active",
            last_payment_date: paymentDate,
            last_payment_method: ui.ownerPaymentMethod.value,
            last_payment_note: note,
            next_billing_date: addMonths(paymentDate, 1),
          }
        : item
    );

    saveState();
    ui.ownerPaymentForm.reset();
    setTodayDefaults();
    renderAll();
    showToast("Subscription payment saved.");
  }

  function syncOwnerPaymentDefaults(force) {
    if (!ui.ownerPaymentLandlord || !isSaasOwner()) return;
    const ownerId = ui.ownerPaymentLandlord.value;
    const subscription = subscriptionByOwner(ownerId);
    const owner = userById(ownerId);
    const today = isoDate(new Date());

    if (!subscription || !owner) {
      if (force) {
        ui.ownerPaymentAmount.value = "";
        ui.ownerPaymentNote.value = "";
        ui.ownerPaymentNote.dataset.generatedNote = "";
      }
      ui.ownerPaymentDate.value = ui.ownerPaymentDate.value || today;
      return;
    }

    const packageAmount = Number(subscription.monthly_fee || packageFee(subscription.plan) || 0);
    const paymentDate = ui.ownerPaymentDate.value || today;
    const generatedNote = defaultOwnerPaymentNote(owner, subscription, paymentDate);
    const noteWasGenerated = !ui.ownerPaymentNote.value.trim() || ui.ownerPaymentNote.value === ui.ownerPaymentNote.dataset.generatedNote;

    ui.ownerPaymentDate.value = paymentDate;
    if (force || !ui.ownerPaymentAmount.value) {
      ui.ownerPaymentAmount.value = packageAmount;
    }
    if (force || noteWasGenerated) {
      ui.ownerPaymentNote.value = generatedNote;
      ui.ownerPaymentNote.dataset.generatedNote = generatedNote;
    }
    if (!ui.ownerPaymentMethod.value) {
      ui.ownerPaymentMethod.value = "MTN MoMo";
    }
  }

  function defaultOwnerPaymentNote(owner, subscription, paymentDate) {
    const date = new Date(`${paymentDate || isoDate(new Date())}T00:00:00`);
    return `${monthName(date)} ${subscription.plan} subscription for ${owner ? owner.name : "landlord"}`;
  }

  function packageFee(plan) {
    return PACKAGE_OPTIONS.find((option) => option.plan === plan)?.fee || 0;
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

  function createDemoLandlordAccount() {
    if (!isSaasOwner()) {
      showToast("Only the super admin can create demo accounts.");
      return;
    }

    state.subscriptions = state.subscriptions || [];
    const demoNumber = landlordUsers().filter((user) => user.name.startsWith("Demo Landlord")).length + 1;
    const userId = makeId("user");
    const propertyId = makeId("property");
    const occupiedUnitId = makeId("unit");
    const vacantUnitId = makeId("unit");
    const tenantId = makeId("tenant");
    const paymentId = makeId("payment");
    const today = isoDate(new Date());
    const email = `demo.landlord.${Date.now()}@rentledger.ug`;

    const demoUser = {
      id: userId,
      name: `Demo Landlord ${demoNumber}`,
      phone: `0799${String(100000 + demoNumber).slice(-6)}`,
      email,
      creator_email: currentUser()?.email || currentUser()?.creator_email || SUPER_ADMIN_EMAIL,
      platform_owner_id: currentUser()?.id || SUPER_ADMIN_USER_ID,
      password: "demo123",
      role: "landlord",
      account_status: "Trial",
      created_at: new Date().toISOString(),
    };
    const property = {
      id: propertyId,
      property_name: `Demo Estate ${demoNumber}`,
      location: "Kampala",
      property_type: "Rooms",
      owner_id: userId,
    };
    const units = [
      { id: occupiedUnitId, property_id: propertyId, unit_number: "A1", rent_amount: 650000, status: "occupied" },
      {
        id: vacantUnitId,
        property_id: propertyId,
        unit_number: "A2",
        rent_amount: 650000,
        status: "vacant",
        listing_published: true,
        listing_bedrooms: 1,
        listing_bathrooms: 1,
        listing_furnished: false,
        listing_photo: "assets/apartment-exterior.jpg",
        listing_note: "Demo vacancy published from the owner dashboard.",
      },
    ];
    const tenant = {
      id: tenantId,
      unit_id: occupiedUnitId,
      name: "Demo Tenant",
      phone: "0770000001",
      national_id: "DEMO-001",
      rent_amount: 650000,
      deposit_paid: 650000,
      move_in_date: today,
    };
    const payment = {
      id: paymentId,
      tenant_id: tenantId,
      amount: 650000,
      payment_method: "MTN MoMo",
      payment_date: today,
      balance: 0,
      reference: autoReference("MTN MoMo"),
      created_at: new Date().toISOString(),
    };
    const subscription = {
      id: makeId("subscription"),
      owner_id: userId,
      plan: "Trial",
      monthly_fee: 0,
      status: "Trial",
      last_payment_date: today,
      last_payment_method: "Trial",
      last_payment_note: "Demo trial account created by super admin",
      next_billing_date: addMonths(today, 1),
    };

    state.users.push(demoUser);
    state.properties.push(property);
    state.units.push(...units);
    state.tenants.push(tenant);
    state.payments.push(payment);
    state.subscriptions.push(subscription);
    addNotification({
      type: "support",
      title: "Demo account created",
      message: `${demoUser.name} was created with trial access.`,
    });
    saveState();
    renderAll();
    showToast(`Demo account created: ${email} / demo123`);
  }

  function toggleLandlordAccountStatus(userId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can approve or suspend accounts.");
      return;
    }

    const user = userById(userId);
    if (!user || user.role !== "landlord") return;
    const nextStatus = accountStatus(user) === "Suspended" || accountStatus(user) === "Inactive" ? "Active" : "Suspended";
    state.users = state.users.map((item) =>
      item.id === userId
        ? {
            ...item,
            account_status: nextStatus,
          }
        : item
    );
    saveState();
    renderAll();
    showToast(`${user.name} ${nextStatus === "Active" ? "approved" : "suspended"}.`);
  }

  function cycleSubscriptionPackage(ownerId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can manage packages.");
      return;
    }

    state.subscriptions = state.subscriptions || [];
    const subscription = subscriptionByOwner(ownerId);
    const today = isoDate(new Date());
    const currentIndex = Math.max(0, PACKAGE_OPTIONS.findIndex((option) => option.plan === subscription?.plan));
    const nextPackage = PACKAGE_OPTIONS[(currentIndex + 1) % PACKAGE_OPTIONS.length];

    if (subscription) {
      state.subscriptions = state.subscriptions.map((item) =>
        item.id === subscription.id
          ? {
              ...item,
              plan: nextPackage.plan,
              monthly_fee: nextPackage.fee,
              status: nextPackage.status,
              next_billing_date: item.next_billing_date || addMonths(today, 1),
            }
          : item
      );
    } else {
      state.subscriptions.push({
        id: makeId("subscription"),
        owner_id: ownerId,
        plan: nextPackage.plan,
        monthly_fee: nextPackage.fee,
        status: nextPackage.status,
        last_payment_date: today,
        last_payment_method: "Manual",
        last_payment_note: "Package assigned by super admin",
        next_billing_date: addMonths(today, 1),
      });
    }

    state.users = state.users.map((item) =>
      item.id === ownerId
        ? { ...item, account_status: nextPackage.status === "Trial" ? "Trial" : "Active" }
        : item
    );
    saveState();
    renderAll();
    showToast(`Package changed to ${nextPackage.plan}.`);
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

  function focusLandlordAccount(ownerId) {
    const user = userById(ownerId);
    if (!user) return;
    state.searchTerm = user.name;
    saveState();
    ui.globalSearch.value = state.searchTerm;
    renderAll();
    setView("platformLandlords");
    showToast(`Showing account for ${user.name}.`);
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
        <span>Room</span><strong>${escapeHtml(unit ? unit.unit_number : "Unassigned")}</strong>
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
    downloadTextFile(`rentledger-receipt-${ui.receiptModal.dataset.paymentId || "payment"}.txt`, text);
  }

  function downloadMonthlyRentReport() {
    const scope = getScopedData();
    const payments = getCurrentMonthPayments(scope.payments);
    const total = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const lines = [
      "RentLedger UG Monthly Rent Report",
      monthName(new Date()),
      "",
      `Total collected: ${formatMoney(total)}`,
      `Payments recorded: ${payments.length}`,
      "",
      "Tenant | Room | Amount | Method | Date | Balance",
      ...payments.map((payment) => {
        const tenant = tenantById(payment.tenant_id);
        const unit = tenant ? unitById(tenant.unit_id) : null;
        return [
          tenant ? tenant.name : "Removed tenant",
          unit ? unit.unit_number : "Unassigned",
          formatMoney(payment.amount),
          payment.payment_method,
          formatDate(payment.payment_date),
          formatMoney(payment.balance),
        ].join(" | ");
      }),
      payments.length ? "" : "No payments recorded this month.",
    ];
    downloadTextFile(`rentledger-rent-report-${isoDate(new Date())}.txt`, lines.join("\n"));
    showToast("Monthly rent report downloaded.");
  }

  function downloadExpenseReport() {
    const scope = getScopedData();
    const expenses = getCurrentMonthExpenses(scope.expenses);
    const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const lines = [
      "RentLedger UG Expense Report",
      monthName(new Date()),
      "",
      `Total expenses: ${formatMoney(total)}`,
      `Expenses recorded: ${expenses.length}`,
      "",
      "Type | Property | Amount | Date",
      ...expenses.map((expense) => {
        const property = propertyById(expense.property_id);
        return [
          expense.type,
          property ? property.property_name : "Unknown property",
          formatMoney(expense.amount),
          formatDate(expense.date),
        ].join(" | ");
      }),
      expenses.length ? "" : "No expenses recorded this month.",
    ];
    downloadTextFile(`rentledger-expense-report-${isoDate(new Date())}.txt`, lines.join("\n"));
    showToast("Expense report downloaded.");
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function currentUser() {
    return state.users.find((user) => user.id === state.currentUserId) || null;
  }

  function userById(id) {
    return state.users.find((user) => user.id === id) || null;
  }

  function superAdminUser() {
    return userById(SUPER_ADMIN_USER_ID);
  }

  function accountStatus(user) {
    if (!user) return "Inactive";
    return user.account_status || (user.role === "staff" ? user.invitation_status || "Invited" : "Active");
  }

  function isAccountSuspended(user) {
    if (accountStatus(user) === "Suspended") return true;
    const owner = user.company_owner_id ? userById(user.company_owner_id) : null;
    return accountStatus(owner) === "Suspended";
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
    const platformOwner = user.platform_owner_id ? userById(user.platform_owner_id) : null;
    const ownerLabel = owner ? ` - ${owner.name}` : "";
    const platformOwnerLabel = platformOwner && platformOwner.id !== owner?.id ? ` - linked to ${platformOwner.name}` : "";
    return `${user.name} (${roleLabel(user.role)}${ownerLabel}${platformOwnerLabel})`;
  }

  function platformOwnerText(user) {
    const owner = user?.platform_owner_id ? userById(user.platform_owner_id) : null;
    return owner ? `Linked to ${owner.name}` : "No platform link";
  }

  function isSuperAdminLinkedDemoAccount(user) {
    return Boolean(
      user &&
        (DEMO_ACCOUNT_IDS.includes(user.id) ||
          user.id === "user-2" ||
          /^Demo Landlord\b/.test(String(user.name || "")))
    );
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
    if (role === "saas-owner") return "Super Admin";
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
    const user = currentUser();
    const storedNotifications = (state.notifications || []).filter(
      (notification) => !notification.user_id || notification.user_id === user?.id
    );
    const rows = [];
    const scope = getScopedData();
    const rentRows = getRentRows(scope.tenants);
    const dismissed = state.dismissedNotificationIds || [];
    const overdueRows = rentRows.filter((row) => row.status === "Overdue");
    const dueTomorrowRows = rentRows.filter((row) => row.daysUntilDue === 1 && row.balance > 0);
    const vacantUnits = scope.units.filter((unit) => unit.status === "vacant");
    const electricityRecorded = getCurrentMonthExpenses(scope.expenses).some((expense) =>
      String(expense.type || "").toLowerCase().includes("electric")
    );

    if (overdueRows.length) {
      const id = "daily-late-tenants";
      rows.push({
        id,
        title: `${overdueRows.length} tenants late this week`,
        message: `${formatMoney(totalBalance(overdueRows))} is still outstanding. Open Late Tenants and call the tenants today.`,
        type: "rent",
        date: new Date().toISOString(),
        read: dismissed.includes(id),
      });
    }

    if (dueTomorrowRows.length) {
      const id = "daily-rent-due-tomorrow";
      rows.push({
        id,
        title: `${dueTomorrowRows.length} rent due tomorrow`,
        message: "Send SMS or WhatsApp reminders before the due date.",
        type: "rent",
        date: new Date().toISOString(),
        read: dismissed.includes(id),
      });
    }

    if (vacantUnits.length) {
      const id = "daily-vacant-rooms";
      rows.push({
        id,
        title: `${vacantUnits.length} vacant rooms`,
        message: `${vacantUnitSummary(vacantUnits)} available for follow-up or listing.`,
        type: "property",
        date: new Date().toISOString(),
        read: dismissed.includes(id),
      });
    }

    if (!electricityRecorded && scope.properties.length) {
      const id = "daily-electricity-unpaid";
      rows.push({
        id,
        title: "Electricity bill not recorded",
        message: "No electricity expense has been added this month.",
        type: "expense",
        date: new Date().toISOString(),
        read: dismissed.includes(id),
      });
    }

    rentRows
      .filter((row) => row.balance > 0 && (row.status === "Overdue" || row.daysUntilDue <= 1))
      .forEach((row) => {
        const id = `rent-${row.tenant.id}-${row.status}`;
        rows.push({
          id,
          title: `${row.status} rent`,
          message: `${row.tenant.name} has ${formatMoney(row.balance)} outstanding.`,
          type: "rent",
          date: isoDate(row.dueDate),
          read: dismissed.includes(id),
        });
      });
    return [...storedNotifications, ...rows];
  }

  function renderNotifications() {
    const notifications = platformNotifications();
    const unread = notifications.filter((item) => !item.read);
    ui.notificationCount.textContent = unread.length;
    ui.notificationList.innerHTML =
      notifications
        .slice(0, 8)
        .map((item) => `
          <button class="notification-item ${item.read ? "read" : ""}" data-open-notification="${escapeHtml(item.id)}" type="button">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.message)}</span>
            <time>${escapeHtml(timeAgo(item.created_at || item.date))}</time>
          </button>
        `)
        .join("") || emptyBlock("No notifications yet.");
  }

  function toggleNotifications() {
    const shouldOpen = ui.notificationPanel.classList.contains("hidden");
    ui.notificationPanel.classList.toggle("hidden", !shouldOpen);
    ui.notificationToggle.setAttribute("aria-expanded", String(shouldOpen));
  }

  function openNotification(id) {
    const item = platformNotifications().find((notification) => notification.id === id);
    if (!item) return;
    ui.notificationModalTitle.textContent = item.title;
    ui.notificationModalMeta.textContent = `${notificationTypeLabel(item.type)} - ${timeAgo(item.created_at || item.date)}`;
    ui.notificationModalMessage.textContent = item.message;
    ui.notificationModal.classList.remove("hidden");
    markNotificationRead(id);
    ui.notificationPanel.classList.add("hidden");
    ui.notificationToggle.setAttribute("aria-expanded", "false");
  }

  function closeNotificationModal() {
    ui.notificationModal.classList.add("hidden");
  }

  function markNotificationRead(id) {
    if (String(id).startsWith("notification")) {
      state.notifications = (state.notifications || []).map((item) =>
        item.id === id ? { ...item, read: true } : item
      );
    } else {
      state.dismissedNotificationIds = [...new Set([...(state.dismissedNotificationIds || []), id])];
    }
    saveState();
    renderNotifications();
  }

  function markNotificationsRead() {
    const user = currentUser();
    state.notifications = (state.notifications || []).map((item) =>
      !item.user_id || item.user_id === user?.id ? { ...item, read: true } : item
    );
    const derivedIds = platformNotifications()
      .filter((item) => item.id && !String(item.id).startsWith("notification"))
      .map((item) => item.id);
    state.dismissedNotificationIds = [...new Set([...(state.dismissedNotificationIds || []), ...derivedIds])];
    saveState();
    renderNotifications();
    showToast("Notifications marked read.");
  }

  function notificationTypeLabel(type) {
    if (type === "rent") return "Rent alert";
    if (type === "expense") return "Expense";
    if (type === "property") return "Property";
    if (type === "tenant") return "Tenant";
    if (type === "support") return "Support";
    if (type === "billing") return "Billing";
    if (type === "staff") return "Staff";
    return "Notification";
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
    state.units = state.units.map((unit) =>
      unit.id === unitId
        ? {
            ...unit,
            status,
            listing_published: status === "vacant" ? Boolean(unit.listing_published) : false,
          }
        : unit
    );
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
      return `Hello ${row.tenant.name}, your rent balance of ${formatMoney(row.balance)} for ${row.unit ? row.unit.unit_number : "your room"} is overdue. Please clear it as soon as possible.`;
    }
    if (row.daysUntilDue === 1) {
      return `Hello ${row.tenant.name}, your rent of ${formatMoney(row.tenant.rent_amount)} is due tomorrow for ${row.unit ? row.unit.unit_number : "your room"}. Thank you.`;
    }
    return `Hello ${row.tenant.name}, your rent balance is ${formatMoney(row.balance)} for ${row.unit ? row.unit.unit_number : "your room"}. Thank you.`;
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

  function maskPhoneNumber(phone) {
    const value = String(phone || "").trim();
    if (value.length <= 4) return value;
    return `${value.slice(0, 4)}***${value.slice(-3)}`;
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
        platform_owner_id: row.platform_owner_id || undefined,
        password: row.password || "demo123",
        role: row.role,
        account_status: row.account_status || "Active",
        created_at: row.created_at || new Date().toISOString(),
        company_owner_id: row.company_owner_id || undefined,
        assigned_property_ids: row.assigned_property_ids || [],
        invitation_status: row.invitation_status || undefined,
      };
    }
    if (stateKey === "units") {
      return {
        ...row,
        listing_published: Boolean(row.listing_published),
        listing_bedrooms: Number(row.listing_bedrooms || 1),
        listing_bathrooms: Number(row.listing_bathrooms || 1),
        listing_furnished: Boolean(row.listing_furnished),
        listing_photo: row.listing_photo || "",
        listing_note: row.listing_note || "",
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
        platform_owner_id: row.platform_owner_id || null,
        password: row.password || "demo123",
        role: row.role,
        account_status: row.account_status || "Active",
        created_at: row.created_at || new Date().toISOString(),
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
    if (stateKey === "units") {
      return pick(row, [
        "id",
        "property_id",
        "unit_number",
        "rent_amount",
        "status",
        "listing_published",
        "listing_bedrooms",
        "listing_bathrooms",
        "listing_furnished",
        "listing_photo",
        "listing_note",
      ]);
    }
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
        account_status: user.account_status || (seedUser ? seedUser.account_status : "") || "Active",
        created_at: user.created_at || (seedUser ? seedUser.created_at : "") || new Date().toISOString(),
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
          email: SUPER_ADMIN_EMAIL,
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          password: "Etochu@2727",
          role: "saas-owner",
          account_status: "Active",
        };
      }
      if (user.id === "staff-1") {
        return {
          ...user,
          name: user.name === "Joseph Manager" ? "Staff Demo" : user.name,
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          company_owner_id: "user-1",
          assigned_property_ids: ["property-1", "property-4"],
          invitation_status: user.invitation_status || "Invited",
        };
      }
      if (isSuperAdminLinkedDemoAccount(user)) {
        return {
          ...user,
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
        };
      }
      return user;
    });
    migrated.properties = migrated.properties.map((property) => ({
      property_type: "Apartment",
      owner_id: "user-1",
      ...property,
    }));
    const localizedPropertyTypes = {
      "property-1": "Double Room",
      "property-2": "Single Room",
      "property-3": "House",
      "property-4": "Shops",
      "property-5": "Rooms",
      "property-6": "Boys Quarters",
    };
    migrated.properties = migrated.properties.map((property) =>
      localizedPropertyTypes[property.id] && ["Apartment", "Mixed"].includes(property.property_type)
        ? { ...property, property_type: localizedPropertyTypes[property.id] }
        : property
    );
    appendMissingSeedRows(migrated.properties, seeded.properties);
    appendMissingSeedRows(migrated.units, seeded.units);
    const seedUnitsById = new Map(seeded.units.map((unit) => [unit.id, unit]));
    migrated.units = migrated.units.map((unit) => {
      const seedUnit = seedUnitsById.get(unit.id) || {};
      const status = unit.status || seedUnit.status || "vacant";
      return {
        ...unit,
        listing_published: status === "vacant" && Boolean(unit.listing_published ?? seedUnit.listing_published),
        listing_bedrooms: Number(unit.listing_bedrooms ?? seedUnit.listing_bedrooms ?? 1),
        listing_bathrooms: Number(unit.listing_bathrooms ?? seedUnit.listing_bathrooms ?? 1),
        listing_furnished: Boolean(unit.listing_furnished ?? seedUnit.listing_furnished ?? false),
        listing_photo: unit.listing_photo || seedUnit.listing_photo || "",
        listing_note: unit.listing_note || seedUnit.listing_note || "",
      };
    });
    appendMissingSeedRows(migrated.tenants, seeded.tenants);
    appendMissingSeedRows(migrated.payments, seeded.payments);
    appendMissingSeedRows(migrated.expenses, seeded.expenses);
    const occupiedUnitIds = new Set(migrated.tenants.map((tenant) => tenant.unit_id));
    migrated.units = migrated.units.map((unit) =>
      occupiedUnitIds.has(unit.id) ? { ...unit, status: "occupied", listing_published: false } : unit
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
          email: SUPER_ADMIN_EMAIL,
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          password: "Etochu@2727",
          role: "saas-owner",
          account_status: "Active",
          created_at: date(1),
        },
        {
          id: "user-1",
          name: "Landlord Demo",
          phone: "0772123456",
          email: "landlord@rentledger.ug",
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          password: "demo123",
          role: "landlord",
          account_status: "Active",
          created_at: date(2),
        },
        {
          id: "user-2",
          name: "Daniel Kigozi",
          phone: "0788001100",
          email: "daniel@rentledger.ug",
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          password: "demo123",
          role: "landlord",
          account_status: "Active",
          created_at: previousDate(14),
        },
        {
          id: "staff-1",
          name: "Staff Demo",
          phone: "0700111222",
          email: "staff@rentledger.ug",
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          password: "staff123",
          role: "staff",
          account_status: "Active",
          company_owner_id: "user-1",
          assigned_property_ids: ["property-1", "property-4"],
          invitation_status: "Invited",
          created_at: date(5),
        },
      ],
      properties: [
        {
          id: "property-1",
          property_name: "Kira Road Apartments",
          location: "Kira",
          property_type: "Double Room",
          owner_id: "user-1",
        },
        {
          id: "property-2",
          property_name: "Ntinda Court",
          location: "Ntinda",
          property_type: "Single Room",
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
          property_type: "Shops",
          owner_id: "user-1",
        },
        {
          id: "property-5",
          property_name: "Entebbe Road Suites",
          location: "Entebbe Road",
          property_type: "Rooms",
          owner_id: "user-1",
        },
        {
          id: "property-6",
          property_name: "Najjera Garden Homes",
          location: "Najjera",
          property_type: "Boys Quarters",
          owner_id: "user-1",
        },
      ],
      units: [
        { id: "unit-1", property_id: "property-1", unit_number: "A1", rent_amount: 450000, status: "occupied" },
        { id: "unit-2", property_id: "property-1", unit_number: "A2", rent_amount: 450000, status: "occupied" },
        { id: "unit-3", property_id: "property-1", unit_number: "B1", rent_amount: 520000, status: "occupied" },
        { id: "unit-4", property_id: "property-1", unit_number: "B2", rent_amount: 520000, status: "occupied" },
        { id: "unit-5", property_id: "property-2", unit_number: "N1", rent_amount: 380000, status: "occupied" },
        {
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
        },
        { id: "unit-7", property_id: "property-2", unit_number: "N3", rent_amount: 420000, status: "occupied" },
        { id: "unit-8", property_id: "property-2", unit_number: "N4", rent_amount: 420000, status: "vacant" },
        { id: "unit-9", property_id: "property-3", unit_number: "House 1", rent_amount: 600000, status: "occupied" },
        {
          id: "unit-10",
          property_id: "property-3",
          unit_number: "House 2",
          rent_amount: 600000,
          status: "vacant",
          listing_published: true,
          listing_bedrooms: 2,
          listing_bathrooms: 1,
          listing_furnished: false,
          listing_photo: "assets/property-keys.jpg",
          listing_note: "Standalone house with compound space in Mukono.",
        },
        { id: "unit-11", property_id: "property-4", unit_number: "K1", rent_amount: 950000, status: "occupied" },
        { id: "unit-12", property_id: "property-4", unit_number: "K2", rent_amount: 950000, status: "occupied" },
        { id: "unit-13", property_id: "property-4", unit_number: "K3", rent_amount: 1200000, status: "occupied" },
        { id: "unit-14", property_id: "property-4", unit_number: "K4", rent_amount: 1200000, status: "occupied" },
        {
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
        },
        { id: "unit-16", property_id: "property-5", unit_number: "E1", rent_amount: 520000, status: "occupied" },
        { id: "unit-17", property_id: "property-5", unit_number: "E2", rent_amount: 520000, status: "occupied" },
        { id: "unit-18", property_id: "property-5", unit_number: "E3", rent_amount: 560000, status: "occupied" },
        { id: "unit-19", property_id: "property-5", unit_number: "E4", rent_amount: 560000, status: "occupied" },
        { id: "unit-20", property_id: "property-5", unit_number: "E5", rent_amount: 600000, status: "occupied" },
        {
          id: "unit-21",
          property_id: "property-5",
          unit_number: "E6",
          rent_amount: 600000,
          status: "vacant",
          listing_published: false,
          listing_bedrooms: 1,
          listing_bathrooms: 1,
          listing_furnished: false,
          listing_photo: "assets/apartment-exterior.jpg",
          listing_note: "Double room close to Entebbe Road transport.",
        },
        { id: "unit-22", property_id: "property-6", unit_number: "G1", rent_amount: 700000, status: "occupied" },
        { id: "unit-23", property_id: "property-6", unit_number: "G2", rent_amount: 700000, status: "occupied" },
        { id: "unit-24", property_id: "property-6", unit_number: "G3", rent_amount: 760000, status: "occupied" },
        { id: "unit-25", property_id: "property-6", unit_number: "G4", rent_amount: 760000, status: "occupied" },
        { id: "unit-26", property_id: "property-6", unit_number: "G5", rent_amount: 820000, status: "occupied" },
        {
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
        },
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
          payment_method: "Bank transfer",
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
          payment_method: "Bank transfer",
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
          payment_method: "Bank transfer",
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
          payment_method: "Bank transfer",
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

  function dailyOpsCard(label, value, note, tone) {
    return `
      <article class="daily-ops-card ${escapeHtml(tone || "info")}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(note)}</small>
      </article>
    `;
  }

  function lateTenantRow(row) {
    const daysLate = Math.abs(Math.min(0, row.daysUntilDue));
    const phone = normalizePhone(row.tenant.phone);
    return `
      <tr>
        <td>${personCell(row.tenant.name, row.tenant.phone)}</td>
        <td>${escapeHtml(row.unit ? row.unit.unit_number : "Unassigned")}</td>
        <td>${statusPill(`${daysLate} day${daysLate === 1 ? "" : "s"} late`)}</td>
        <td><strong>${formatMoney(row.balance)}</strong></td>
        <td><a class="text-button link-button compact-link-button" href="tel:${escapeHtml(phone)}">Call</a></td>
      </tr>
    `;
  }

  function vacantUnitSummary(units) {
    if (!units.length) return "No vacant rooms";
    const counts = units.reduce((summary, unit) => {
      const label = unitTypeLabel(unit);
      summary[label] = (summary[label] || 0) + 1;
      return summary;
    }, {});
    return Object.entries(counts)
      .slice(0, 2)
      .map(([label, total]) => `${total} ${label}${total === 1 ? "" : "s"}`)
      .join(", ");
  }

  function unitTypeLabel(unit) {
    const property = propertyById(unit.property_id);
    const label = String(property?.property_type || unit.unit_number || "room").toLowerCase();
    if (label.includes("shop")) return "empty shop";
    if (label.includes("boys")) return "boys quarter";
    if (label.includes("house")) return "empty house";
    if (label.includes("double")) return "double room";
    if (label.includes("single")) return "single room";
    return "vacant room";
  }

  function adminMetricCard(label, value, note, tone) {
    return `
      <article class="admin-metric-card ${escapeHtml(tone)}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(note)}</small>
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
    const normalizedStatus = String(status || "");
    const className =
      normalizedStatus === "Paid" || normalizedStatus === "Occupied" || normalizedStatus === "Active" || normalizedStatus === "Resolved" || normalizedStatus === "Low" || normalizedStatus === "Read"
        ? "success"
        : normalizedStatus === "Overdue" || normalizedStatus.includes("late") || normalizedStatus === "Open" || normalizedStatus === "High" || normalizedStatus === "Suspended" || normalizedStatus === "Inactive" || normalizedStatus === "Expired"
          ? "danger"
          : normalizedStatus === "Partial" || normalizedStatus === "Vacant" || normalizedStatus === "Due" || normalizedStatus === "Medium" || normalizedStatus === "In Progress" || normalizedStatus === "Invited" || normalizedStatus === "Pending" || normalizedStatus === "Expiring" || normalizedStatus === "Attention" || normalizedStatus === "Local"
            ? "warning"
            : "info";
    return `<span class="pill ${className}">${escapeHtml(normalizedStatus)}</span>`;
  }

  function emptyTableRow(colspan, message) {
    return `<tr><td class="empty-row" colspan="${colspan}">${escapeHtml(message)}</td></tr>`;
  }

  function emptyBlock(message) {
    return `<div class="empty-row">${escapeHtml(message)}</div>`;
  }

  function formatMoney(value) {
    return `USh ${Number(value || 0).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
  }

  function formatCompactMoney(value) {
    const amount = Number(value || 0);
    if (amount >= 1000000) return `USh ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `USh ${Math.round(amount / 1000)}K`;
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

  function paymentTimeLabel(payment) {
    const value = payment.created_at || payment.payment_date;
    const date = typeof value === "string" && value.includes("T") ? new Date(value) : new Date(`${value}T09:00:00`);
    if (Number.isNaN(date.getTime())) return "Recorded";
    if (isToday(value)) {
      return date.toLocaleTimeString("en-UG", { hour: "numeric", minute: "2-digit" });
    }
    return timeAgo(value);
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
