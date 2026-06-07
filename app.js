(function () {
  const STORAGE_KEY = "rentledger_ug_mvp_v1";
  const BROWSER_DB_NAME = "rentledger_ug_mvp_store";
  const BROWSER_DB_STORE = "app_state";
  const BROWSER_DB_STATE_KEY = "latest";
  let supabaseClient = null;
  let supabaseReady = false;
  let supabaseHydrating = false;
  let supabaseSaveTimer = null;
  let supabaseSessionActive = false;
  let authVisible = false;
  let highlightedUnitId = null;
  let highlightedOwnerId = null;
  let unitPhotoPreviewUrl = null;
  let activeDashboardMonthKey = monthKey(new Date());
  let dashboardMonthPinned = false;
  let activePlatformDetailType = "";
  let activePlatformDetailReturnView = "platformLandlords";
  let activeSupportTab = "tickets";
  let impersonationContext = null;

  const SUPABASE_TABLES = [
    { stateKey: "users", table: "app_users" },
    { stateKey: "subscriptions", table: "subscriptions" },
    { stateKey: "properties", table: "properties" },
    { stateKey: "units", table: "units" },
    { stateKey: "tenants", table: "tenants" },
    { stateKey: "payments", table: "payments" },
    { stateKey: "expenses", table: "expenses" },
    { stateKey: "supportTickets", table: "support_tickets", optional: true },
    { stateKey: "supportMessages", table: "landlord_messages", optional: true },
    { stateKey: "auditLogs", table: "audit_logs", optional: true },
    { stateKey: "notifications", table: "notifications", optional: true },
  ];

  const SUPABASE_DELETE_ORDER = [
    "notifications",
    "auditLogs",
    "supportMessages",
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
    { plan: "Enterprise", fee: 500000, status: "Active" },
  ];
  const TRIAL_DAYS = 14;
  const VERIFIED_BADGE_REQUEST_SUBJECT = "Verified badge request";
  const VERIFIED_BADGE_REQUEST_NOTE =
    "Please review my landlord account and public rental listings for a verified landlord badge.";

  const PLAN_LIMITS = {
    Trial: { properties: 1, units: 5, caretakers: 0, publicListings: false },
    Starter: { properties: 1, units: 20, caretakers: 1, publicListings: false },
    Professional: { properties: 5, units: 100, caretakers: 10, publicListings: true },
    Enterprise: {
      properties: Number.POSITIVE_INFINITY,
      units: Number.POSITIVE_INFINITY,
      caretakers: Number.POSITIVE_INFINITY,
      publicListings: true,
    },
  };

  const SUPER_ADMIN_USER_ID = "user-saas-owner";
  const SUPER_ADMIN_EMAIL = "rentledgerugsupport@etohubs.com";
  const DEMO_ACCOUNT_IDS = [SUPER_ADMIN_USER_ID, "user-1", "staff-1"];
  const PUBLIC_DEMO_ACCOUNT_IDS = ["user-1", "staff-1"];
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
    resetOtpLabel: document.getElementById("resetOtpLabel"),
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
    accountConfirmPassword: document.getElementById("accountConfirmPassword"),
    accountPlan: document.getElementById("accountPlan"),
    accountPaymentMethod: document.getElementById("accountPaymentMethod"),
    accountBillingContact: document.getElementById("accountBillingContact"),
    accountBillingConsent: document.getElementById("accountBillingConsent"),
    accountTrialSummary: document.getElementById("accountTrialSummary"),
    demoLogin: document.getElementById("demoLogin"),
    listingLocationFilter: document.getElementById("listingLocationFilter"),
    listingPriceFilter: document.getElementById("listingPriceFilter"),
    listingTypeFilter: document.getElementById("listingTypeFilter"),
    listingFurnishedFilter: document.getElementById("listingFurnishedFilter"),
    listingSearchButton: document.getElementById("listingSearchButton"),
    publicListingGrid: document.getElementById("publicListingGrid"),
    featuredListingSection: document.getElementById("featuredListingSection"),
    featuredListingGrid: document.getElementById("featuredListingGrid"),
    logoutButton: document.getElementById("logoutButton"),
    sideNav: document.getElementById("sideNav"),
    mobileTabs: document.getElementById("mobileTabs"),
    currentAccountName: document.getElementById("currentAccountName"),
    currentAccountPhone: document.getElementById("currentAccountPhone"),
    viewTitle: document.getElementById("viewTitle"),
    viewSubtitle: document.getElementById("viewSubtitle"),
    impersonationBanner: document.getElementById("impersonationBanner"),
    impersonationBannerText: document.getElementById("impersonationBannerText"),
    subscriptionLockStatus: document.getElementById("subscriptionLockStatus"),
    subscriptionLockMessage: document.getElementById("subscriptionLockMessage"),
    subscriptionLockPlan: document.getElementById("subscriptionLockPlan"),
    subscriptionLockAmount: document.getElementById("subscriptionLockAmount"),
    subscriptionLockDueDate: document.getElementById("subscriptionLockDueDate"),
    subscriptionLockMethod: document.getElementById("subscriptionLockMethod"),
    subscriptionLockPay: document.getElementById("subscriptionLockPay"),
    subscriptionLockNote: document.getElementById("subscriptionLockNote"),
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
    roleSelectLabel: document.querySelector('label[for="roleSelect"]'),
    roleSelect: document.getElementById("roleSelect"),
    adminDashboardMonthLabel: document.getElementById("adminDashboardMonthLabel"),
    adminDashboardDateLabel: document.getElementById("adminDashboardDateLabel"),
    adminDashboardMonthStart: document.getElementById("adminDashboardMonthStart"),
    adminDashboardNextMonth: document.getElementById("adminDashboardNextMonth"),
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
    dashboardCalendarMonth: document.getElementById("dashboardCalendarMonth"),
    dashboardCalendarStatus: document.getElementById("dashboardCalendarStatus"),
    dashboardCalendarSummary: document.getElementById("dashboardCalendarSummary"),
    dashboardCalendarGrid: document.getElementById("dashboardCalendarGrid"),
    dashboardMonthPicker: document.getElementById("dashboardMonthPicker"),
    dashboardMonthCurrent: document.getElementById("dashboardMonthCurrent"),
    dashboardCalendarToggle: document.getElementById("dashboardCalendarToggle"),
    dashboardMonthInsight: document.getElementById("dashboardMonthInsight"),
    dashboardReportPaymentCount: document.getElementById("dashboardReportPaymentCount"),
    dashboardReportPayments: document.getElementById("dashboardReportPayments"),
    onboardingPanel: document.getElementById("onboardingPanel"),
    onboardingProgressLabel: document.getElementById("onboardingProgressLabel"),
    onboardingChecklist: document.getElementById("onboardingChecklist"),
    planLimitNotice: document.getElementById("planLimitNotice"),
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
    unitPhoto: document.getElementById("unitPhoto"),
    unitPhotoPreview: document.getElementById("unitPhotoPreview"),
    unitPhotoPicker: document.getElementById("unitPhotoPicker"),
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
    tenantImportFile: document.getElementById("tenantImportFile"),
    importTenantsButton: document.getElementById("importTenantsButton"),
    exportTenantsCsv: document.getElementById("exportTenantsCsv"),
    cancelTenantEdit: document.getElementById("cancelTenantEdit"),
    staffInviteForm: document.getElementById("staffInviteForm"),
    staffName: document.getElementById("staffName"),
    staffPhone: document.getElementById("staffPhone"),
    staffEmail: document.getElementById("staffEmail"),
    staffPassword: document.getElementById("staffPassword"),
    staffProperties: document.getElementById("staffProperties"),
    staffPlanNotice: document.getElementById("staffPlanNotice"),
    staffInviteButton: document.getElementById("staffInviteButton"),
    staffTable: document.getElementById("staffTable"),
    staffCountLabel: document.getElementById("staffCountLabel"),
    paymentForm: document.getElementById("paymentForm"),
    paymentTenant: document.getElementById("paymentTenant"),
    paymentAmount: document.getElementById("paymentAmount"),
    paymentDate: document.getElementById("paymentDate"),
    paymentMethod: document.getElementById("paymentMethod"),
    paymentReference: document.getElementById("paymentReference"),
    paymentProof: document.getElementById("paymentProof"),
    paymentVerification: document.getElementById("paymentVerification"),
    paymentStatusPill: document.getElementById("paymentStatusPill"),
    tenantBalancePreview: document.getElementById("tenantBalancePreview"),
    rentStatusTable: document.getElementById("rentStatusTable"),
    paymentHistoryTable: document.getElementById("paymentHistoryTable"),
    paymentCountLabel: document.getElementById("paymentCountLabel"),
    downloadRentReport: document.getElementById("downloadRentReport"),
    landlordSupportForm: document.getElementById("landlordSupportForm"),
    landlordSupportSubject: document.getElementById("landlordSupportSubject"),
    landlordSupportPriority: document.getElementById("landlordSupportPriority"),
    landlordSupportNote: document.getElementById("landlordSupportNote"),
    verifiedBadgeRequestStatus: document.getElementById("verifiedBadgeRequestStatus"),
    requestVerifiedBadgeButton: document.getElementById("requestVerifiedBadgeButton"),
    landlordSupportCount: document.getElementById("landlordSupportCount"),
    landlordSupportList: document.getElementById("landlordSupportList"),
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
    queueReminderAlerts: document.getElementById("queueReminderAlerts"),
    occupancyLabel: document.getElementById("occupancyLabel"),
    dueSoonLabel: document.getElementById("dueSoonLabel"),
    monthLabel: document.getElementById("monthLabel"),
    rentStatusLabel: document.getElementById("rentStatusLabel"),
    resetDemo: document.getElementById("resetDemo"),
    downloadBackup: document.getElementById("downloadBackup"),
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
    ownerPaymentStatus: document.getElementById("ownerPaymentStatus"),
    ownerBillingTotalLabel: document.getElementById("ownerBillingTotalLabel"),
    ownerBillingLandlordFilter: document.getElementById("ownerBillingLandlordFilter"),
    ownerBillingSummary: document.getElementById("ownerBillingSummary"),
    ownerBillingTable: document.getElementById("ownerBillingTable"),
    supportTicketForm: document.getElementById("supportTicketForm"),
    supportOwner: document.getElementById("supportOwner"),
    supportSubject: document.getElementById("supportSubject"),
    supportPriority: document.getElementById("supportPriority"),
    supportStatus: document.getElementById("supportStatus"),
    supportNote: document.getElementById("supportNote"),
    supportTicketCount: document.getElementById("supportTicketCount"),
    supportTicketSearch: document.getElementById("supportTicketSearch"),
    supportTicketOwnerFilter: document.getElementById("supportTicketOwnerFilter"),
    supportTicketStatusFilter: document.getElementById("supportTicketStatusFilter"),
    supportTicketPriorityFilter: document.getElementById("supportTicketPriorityFilter"),
    supportTicketList: document.getElementById("supportTicketList"),
    adminMessageForm: document.getElementById("adminMessageForm"),
    adminMessageOwner: document.getElementById("adminMessageOwner"),
    adminMessageTemplate: document.getElementById("adminMessageTemplate"),
    adminMessageTitle: document.getElementById("adminMessageTitle"),
    adminMessageBody: document.getElementById("adminMessageBody"),
    adminMessageCount: document.getElementById("adminMessageCount"),
    adminMessageList: document.getElementById("adminMessageList"),
    supportNotificationCount: document.getElementById("supportNotificationCount"),
    supportNotificationList: document.getElementById("supportNotificationList"),
    auditLogCount: document.getElementById("auditLogCount"),
    auditLogList: document.getElementById("auditLogList"),
    platformReportSummary: document.getElementById("platformReportSummary"),
    backendSupportForm: document.getElementById("backendSupportForm"),
    backendSupportOwner: document.getElementById("backendSupportOwner"),
    backendSupportType: document.getElementById("backendSupportType"),
    backendSupportRecord: document.getElementById("backendSupportRecord"),
    backendSupportAction: document.getElementById("backendSupportAction"),
    backendSupportValue: document.getElementById("backendSupportValue"),
    backendSupportNote: document.getElementById("backendSupportNote"),
    backendSupportPreview: document.getElementById("backendSupportPreview"),
    backendSupportOpenAccount: document.getElementById("backendSupportOpenAccount"),
    systemStorageLabel: document.getElementById("systemStorageLabel"),
    systemMonitorSummary: document.getElementById("systemMonitorSummary"),
    systemSignalList: document.getElementById("systemSignalList"),
    adminPasswordResetForm: document.getElementById("adminPasswordResetForm"),
    adminPasswordResetUser: document.getElementById("adminPasswordResetUser"),
    dashboardDetailModal: document.getElementById("dashboardDetailModal"),
    dashboardDetailTitle: document.getElementById("dashboardDetailTitle"),
    dashboardDetailMeta: document.getElementById("dashboardDetailMeta"),
    dashboardDetailBody: document.getElementById("dashboardDetailBody"),
    platformDetailTitle: document.getElementById("platformDetailTitle"),
    platformDetailMeta: document.getElementById("platformDetailMeta"),
    platformDetailBody: document.getElementById("platformDetailBody"),
    closeDashboardDetail: document.getElementById("closeDashboardDetail"),
    receiptModal: document.getElementById("receiptModal"),
    receiptContent: document.getElementById("receiptContent"),
    shareReceiptWhatsApp: document.getElementById("shareReceiptWhatsApp"),
    closeReceipt: document.getElementById("closeReceipt"),
    printReceipt: document.getElementById("printReceipt"),
    downloadReceipt: document.getElementById("downloadReceipt"),
    toast: document.getElementById("toast"),
  };

  const viewCopy = {
    superAdminDashboard: ["RentLedger UG Admin", "SaaS analytics for landlords, subscriptions, revenue, support, and account health."],
    subscriptionLocked: ["Trial ended", "Subscribe to continue using RentLedger UG."],
    dashboard: ["Daily Control Center", "Who paid, who is late, and which rooms are vacant."],
    properties: ["Properties", "Set up rooms, shops, boys quarters, houses, and monthly rent."],
    tenants: ["Tenants", "Tenant move-in records, deposits, balances, and contacts."],
    staff: ["Caretakers", "Invite caretakers and assign access to specific properties."],
    rent: ["Rent Collection", "Record paid, partial, overdue, balances, and Mobile Money references."],
    support: ["Support", "Send help requests to the super admin and track ticket status."],
    expenses: ["Expenses & Maintenance", "Broken taps, wiring, painting, plumbing, utilities, and caretaker costs."],
    reminders: ["Reminders", "SMS and WhatsApp messages for rent collection."],
    platformLandlords: ["Account Management", "Approve landlords, create demos, reset passwords, and manage packages."],
    platformBilling: ["Billing", "Track subscriptions, pending payments, expiring plans, and revenue analytics."],
    platformSupport: ["Support Center", "Resolve tickets, correct records, audit changes, and monitor platform health."],
    platformMessages: ["Messages", "Send landlord updates with reusable templates and message history."],
    platformReports: ["Reports", "Platform performance, support workload, and billing health."],
    platformSettings: ["Settings", "Super admin controls, roles, and system preferences."],
  };

  const landlordNav = [
    ["dashboard", "Dashboard"],
    ["properties", "Setup"],
    ["tenants", "Tenants"],
    ["staff", "Caretakers"],
    ["rent", "Rent"],
    ["expenses", "Expenses"],
    ["reminders", "Reminders"],
    ["support", "Support"],
  ];

  const lockedLandlordNav = [["subscriptionLocked", "Subscribe"]];

  const ownerNav = [
    ["superAdminDashboard", "Dashboard"],
    ["platformLandlords", "Landlords"],
    ["platformBilling", "Subscriptions"],
    ["platformSupport", "Support Center"],
    ["platformMessages", "Messages"],
    ["platformReports", "Reports"],
    ["platformSettings", "Settings"],
  ];

  const staffNav = [
    ["dashboard", "Dashboard"],
    ["tenants", "Tenants"],
    ["rent", "Rent"],
    ["reminders", "Reminders"],
  ];

  initialize();

  async function initialize() {
    try {
      await hydrateStateFromBrowserStore();
      await hydrateStateFromSupabase();
      toggleProductionDemoControls();
      bindAuthRecovery();
      setTodayDefaults();
      bindEvents();
      startMonthRolloverWatcher();
      renderPublicListings();
      renderSession();
    } catch (error) {
      console.error("App startup failed", error);
      renderSession();
    }
  }

  function startMonthRolloverWatcher() {
    window.setInterval(() => {
      const currentMonthKey = monthKey(new Date());
      if (currentMonthKey === activeDashboardMonthKey) return;
      if (dashboardMonthPinned) return;
      activeDashboardMonthKey = currentMonthKey;
      setTodayDefaults();
      if (currentUser()) {
        renderAll();
        showToast(`Dashboard moved to ${monthName(new Date())}.`);
      }
    }, 60000);
  }

  function bindEvents() {
    window.addEventListener("pagehide", flushPendingSupabaseSave);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushPendingSupabaseSave();
    });

    document.querySelectorAll("[data-open-auth]").forEach((button) => {
      button.addEventListener("click", () =>
        showAuth(button.dataset.openAuth || "signin", { plan: button.dataset.signupPlan || "" })
      );
    });

    document.querySelectorAll("[data-start-demo]").forEach((button) => {
      button.addEventListener("click", () => signInDemoAccount(button.dataset.startDemo || "user-1"));
    });

    document.querySelectorAll("[data-demo-account]").forEach((button) => {
      button.addEventListener("click", () => signInDemoAccount(button.dataset.demoAccount));
    });

    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => togglePasswordVisibility(button));
    });

    document.querySelectorAll("[data-scroll-target]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const target = document.getElementById(button.dataset.scrollTarget);
        if (target) event.preventDefault();
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
    });
    [ui.listingLocationFilter, ui.listingPriceFilter, ui.listingTypeFilter, ui.listingFurnishedFilter]
      .filter(Boolean)
      .forEach((input) => {
        input.addEventListener("change", renderPublicListings);
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") renderPublicListings();
        });
      });
    if (ui.listingSearchButton) ui.listingSearchButton.addEventListener("click", renderPublicListings);

    ui.signInForm.addEventListener("submit", signIn);
    ui.forgotPasswordButton.addEventListener("click", showForgotPassword);
    ui.forgotPasswordForm.addEventListener("submit", requestPasswordReset);
    ui.cancelPasswordReset.addEventListener("click", returnToSignIn);
    ui.resetPasswordForm.addEventListener("submit", resetPassword);
    ui.resetPasswordBack.addEventListener("click", returnToSignIn);
    ui.createAccountForm.addEventListener("submit", createAccount);
    [ui.accountPlan, ui.accountPaymentMethod].filter(Boolean).forEach((input) => {
      input.addEventListener("change", updateSignupBillingSummary);
    });
    if (ui.accountBillingContact) ui.accountBillingContact.addEventListener("input", updateSignupBillingSummary);
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
        state.role === "staff"
          ? "Caretaker dashboard active."
          : state.role === "caretaker"
          ? "Caretaker mode limits removals."
          : state.role === "saas-owner"
            ? "Super admin platform mode active."
            : "Landlord mode restored."
      );
    });

    ui.propertyForm.addEventListener("submit", saveProperty);
    ui.cancelPropertyEdit.addEventListener("click", resetPropertyForm);
    ui.unitForm.addEventListener("submit", saveUnit);
    if (ui.unitPhoto) ui.unitPhoto.addEventListener("change", previewNewUnitPhoto);
    if (ui.unitPhotoPicker) ui.unitPhotoPicker.addEventListener("change", saveExistingUnitPhoto);
    ui.tenantSearch.addEventListener("input", renderTenants);
    if (ui.importTenantsButton) ui.importTenantsButton.addEventListener("click", () => ui.tenantImportFile.click());
    if (ui.tenantImportFile) ui.tenantImportFile.addEventListener("change", importTenantsCsv);
    if (ui.exportTenantsCsv) ui.exportTenantsCsv.addEventListener("click", exportTenantsCsv);
    ui.tenantUnit.addEventListener("change", syncRentFromUnit);
    ui.cancelTenantEdit.addEventListener("click", resetTenantForm);
    ui.tenantForm.addEventListener("submit", saveTenant);
    ui.moveOutForm.addEventListener("submit", completeTenantMoveOut);
    ui.staffInviteForm.addEventListener("submit", inviteStaff);
    ui.paymentForm.addEventListener("submit", savePayment);
    ui.paymentTenant.addEventListener("change", updatePaymentPreview);
    ui.paymentAmount.addEventListener("input", updatePaymentPreview);
    if (ui.landlordSupportForm) ui.landlordSupportForm.addEventListener("submit", saveLandlordSupportTicket);
    if (ui.requestVerifiedBadgeButton) ui.requestVerifiedBadgeButton.addEventListener("click", requestVerifiedBadge);
    if (ui.dashboardMonthPicker) {
      ui.dashboardMonthPicker.addEventListener("change", () => {
        activeDashboardMonthKey = ui.dashboardMonthPicker.value || monthKey(new Date());
        dashboardMonthPinned = activeDashboardMonthKey !== monthKey(new Date());
        renderAll();
      });
    }
    if (ui.dashboardMonthCurrent) ui.dashboardMonthCurrent.addEventListener("click", setDashboardReportToCurrentMonth);
    if (ui.dashboardCalendarToggle) ui.dashboardCalendarToggle.addEventListener("click", toggleDashboardCalendarView);
    ui.downloadRentReport.addEventListener("click", downloadMonthlyRentReport);
    ui.expenseForm.addEventListener("submit", saveExpense);
    ui.downloadExpenseReport.addEventListener("click", downloadExpenseReport);
    if (ui.queueReminderAlerts) ui.queueReminderAlerts.addEventListener("click", queueReminderNotifications);
    ui.createDemoAccountButton.addEventListener("click", createDemoLandlordAccount);
    ui.ownerPaymentLandlord.addEventListener("change", () => syncOwnerPaymentDefaults(true));
    if (ui.ownerBillingLandlordFilter) ui.ownerBillingLandlordFilter.addEventListener("change", updateOwnerBillingLandlordFilter);
    ui.ownerPaymentDate.addEventListener("change", () => syncOwnerPaymentDefaults(false));
    ui.ownerPaymentForm.addEventListener("submit", saveOwnerPayment);
    ui.supportTicketForm.addEventListener("submit", saveSupportTicket);
    [ui.supportTicketSearch, ui.supportTicketOwnerFilter, ui.supportTicketStatusFilter, ui.supportTicketPriorityFilter]
      .filter(Boolean)
      .forEach((input) => {
        input.addEventListener("input", updateSupportTicketFilters);
        input.addEventListener("change", updateSupportTicketFilters);
      });
    if (ui.adminMessageForm) ui.adminMessageForm.addEventListener("submit", sendLandlordMessage);
    if (ui.adminMessageTemplate) ui.adminMessageTemplate.addEventListener("change", applyAdminMessageTemplate);
    if (ui.backendSupportForm) ui.backendSupportForm.addEventListener("submit", applyBackendSupportCorrection);
    if (ui.backendSupportOwner) ui.backendSupportOwner.addEventListener("change", () => syncBackendSupportControls(true));
    if (ui.backendSupportType) ui.backendSupportType.addEventListener("change", () => syncBackendSupportControls(true));
    if (ui.backendSupportRecord) ui.backendSupportRecord.addEventListener("change", () => syncBackendSupportActions(true));
    if (ui.backendSupportAction) ui.backendSupportAction.addEventListener("change", syncBackendSupportValue);
    if (ui.backendSupportOpenAccount) ui.backendSupportOpenAccount.addEventListener("click", openBackendSupportAccount);
    ui.adminPasswordResetForm.addEventListener("submit", sendAdminPasswordReset);
    ui.closeDashboardDetail.addEventListener("click", closeDashboardDetailModal);
    ui.dashboardDetailModal.addEventListener("click", (event) => {
      if (event.target === ui.dashboardDetailModal) closeDashboardDetailModal();
    });
    ui.closeReceipt.addEventListener("click", closeReceipt);
    ui.printReceipt.addEventListener("click", printReceipt);
    ui.downloadReceipt.addEventListener("click", downloadReceipt);
    ui.resetDemo.addEventListener("click", resetDemoData);
    ui.downloadBackup.addEventListener("click", downloadBackup);
  }

  function setDashboardReportToCurrentMonth() {
    activeDashboardMonthKey = monthKey(new Date());
    dashboardMonthPinned = false;
    renderAll();
  }

  function toggleDashboardCalendarView() {
    if (!ui.dashboardCalendarGrid || !ui.dashboardCalendarToggle || !ui.dashboardCalendarStatus) return;
    const willShow = ui.dashboardCalendarGrid.classList.contains("hidden");
    ui.dashboardCalendarGrid.classList.toggle("hidden", !willShow);
    ui.dashboardCalendarStatus.classList.toggle("hidden", !willShow);
    ui.dashboardCalendarToggle.textContent = willShow ? "Hide Calendar" : "Show Calendar";
    ui.dashboardCalendarToggle.setAttribute("aria-expanded", String(willShow));
  }

  function handleActionClick(event) {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const actions = [
      ["openActivity", openActivity],
      ["toggleAccountStatus", toggleLandlordAccountStatus],
      ["cyclePlan", cycleSubscriptionPackage],
      ["toggleVerifiedBadge", toggleVerifiedBadge],
      ["endOwnerTrial", endOwnerTrial],
      ["activateOwnerAccount", activateOwnerAccount],
      ["deleteOwnerAccount", deleteOwnerAccount],
      ["currentSubscriptionPay", startCurrentUserSubscriptionPayment],
      ["subscriptionCollect", startSubscriptionCollection],
      ["subscriptionCancel", toggleSubscriptionCancellation],
      ["adminResetUser", createAdminPasswordReset],
      ["focusLandlord", focusLandlordAccount],
      ["openTicket", openSupportTicket],
      ["toggleTicket", toggleSupportTicket],
      ["updateTicket", updateSupportTicket],
      ["supportTab", setSupportCenterTab],
      ["impersonateLandlord", startLandlordImpersonation],
      ["exitImpersonation", exitLandlordImpersonation],
      ["platformDetailPage", openPlatformDetailPage],
      ["platformDetailBack", closePlatformDetailPage],
      ["editProperty", startPropertyEdit],
      ["removeProperty", removeProperty],
      ["removeUnit", removeUnit],
      ["unitPhoto", startUnitPhotoUpdate],
      ["toggleListing", togglePublicListing],
      ["editTenant", startTenantEdit],
      ["moveOutTenant", startTenantMoveOut],
      ["removeTenant", removeTenant],
      ["copyStaffLogin", copyStaffLogin],
      ["removeStaff", removeStaff],
      ["sendWhatsapp", sendWhatsAppMessage],
      ["receiptPayment", openReceipt],
      ["removeExpense", removeExpense],
      ["openNotification", openNotification],
      ["dashboardDetail", openDashboardDetail],
      ["dashboardView", openDashboardView],
      ["unitDetail", openUnitDetail],
      ["tenantDetail", openTenantDetail],
      ["paymentDetail", openPaymentDetail],
      ["expenseDetail", openExpenseDetail],
      ["closeMoveOut", closeMoveOutModal],
    ];

    for (const [key, handler] of actions) {
      const value = button.dataset[key];
      if (value === undefined) continue;
      event.preventDefault();
      handler(value, button);
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
    if (tabName === "signup") updateSignupBillingSummary();
  }

  function showAuth(tabName, options = {}) {
    authVisible = true;
    if (tabName === "signup" && options.plan && ui.accountPlan) {
      ui.accountPlan.value = options.plan;
    }
    setAuthTab(tabName);
    renderSession();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function requireSupabaseWriteSession(message = "Sign in again to sync changes across devices.") {
    if (!supabaseReady || !supabaseClient?.auth) return true;
    if (await hasActiveSupabaseSession()) return true;
    promptSupabaseSignIn(message);
    return false;
  }

  async function hasActiveSupabaseSession() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      supabaseSessionActive = Boolean(data.session?.access_token);
      return supabaseSessionActive;
    } catch (error) {
      console.error("Supabase session check failed", error);
      supabaseSessionActive = false;
      return false;
    }
  }

  function promptSupabaseSignIn(message = "Sign in again to sync changes across devices.") {
    supabaseSessionActive = false;
    if (supabaseReady) {
      state.currentUserId = null;
      state.selectedPropertyId = "all";
      state.role = "landlord";
      saveLocalStateOnly();
      showAuth("signin");
    }
    showToast(message);
  }

  async function signIn(event) {
    event.preventDefault();
    const loginIdentifier = ui.signInIdentifier.value.trim();
    const password = ui.signInPassword.value;

    if (supabaseReady && supabaseClient) {
      try {
        setAppLoading("Signing in");
        const authUserId = await authenticateSupabaseUser(loginIdentifier, password);
        if (isSuperAdminIdentifier(loginIdentifier)) await ensureSuperAdminProfile();
        const user = await openUserSession(authUserId);
        if (!user) {
          await supabaseClient.auth.signOut().catch(() => null);
          showToast(profileMissingMessage(loginIdentifier));
          return;
        }
        if (isAccountSuspended(user)) {
          await supabaseClient.auth.signOut().catch(() => null);
          state.currentUserId = null;
          saveLocalStateOnly();
          renderSession();
          showToast("This account is suspended. Contact support.");
          return;
        }
        ui.signInForm.reset();
        showToast("Welcome back.");
      } catch (error) {
        console.error("Supabase sign-in failed", error);
        showToast(signInErrorMessage(error, loginIdentifier));
      } finally {
        clearAppLoading();
      }
      return;
    }

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

  async function authenticateSupabaseUser(identifier, password) {
    if (identifier.includes("@")) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: normalizeLoginEmail(identifier),
        password,
      });
      if (error) throw error;
      supabaseSessionActive = Boolean(data.session?.access_token);
      return data.user.id;
    }

    const { session } = await apiRequest("/api/signin", { identifier, password });
    const { data, error } = await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) throw error;
    supabaseSessionActive = Boolean(data.session?.access_token);
    return data.user.id;
  }

  async function ensureSuperAdminProfile() {
    await apiRequest("/api/bootstrap-admin");
  }

  function signInErrorMessage(error, identifier = "") {
    const message = String(error?.message || "").trim();
    if (missingSupabaseSchemaItem(error)) {
      return "Database migration is pending. Run supabase-support-center-migration.sql in Supabase, then retry.";
    }
    if (!message || message === "Invalid login." || message === "Invalid login credentials") {
      if (isSuperAdminIdentifier(identifier)) {
        return "Super admin must be created in Supabase Auth first.";
      }
      return "Use a valid email or phone and password.";
    }
    if (message.includes("Supabase server credentials")) {
      return "Server login is not configured. Add Supabase service credentials.";
    }
    if (message.includes("permission denied for table")) {
      return "Database permissions need updating. Run the latest Supabase schema grants.";
    }
    return message;
  }

  function isSuperAdminIdentifier(identifier) {
    const value = String(identifier || "").trim();
    return normalizeLoginEmail(value) === SUPER_ADMIN_EMAIL || normalizeLoginPhone(value) === "256700000000";
  }

  function profileMissingMessage(identifier = "") {
    if (isSuperAdminIdentifier(identifier)) {
      return "Super admin profile is missing. Check Supabase service credentials.";
    }
    return "Account profile is not active. Contact support.";
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

  function bindAuthRecovery() {
    if (!supabaseClient?.auth) return;
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event !== "PASSWORD_RECOVERY") return;
      startSupabasePasswordRecovery(session);
    });
    if (window.location.href.includes("type=recovery")) {
      supabaseClient.auth.getSession().then(({ data }) => startSupabasePasswordRecovery(data.session));
    }
  }

  function startSupabasePasswordRecovery(session) {
    state.passwordReset = {
      supabaseRecovery: true,
      email: session?.user?.email || "",
    };
    ui.resetPasswordForm.reset();
    ui.resetOtpEmail.value = session?.user?.email || "";
    if (ui.resetOtpLabel) ui.resetOtpLabel.classList.add("hidden");
    ui.resetOtp.required = false;
    ui.resetOtpNotice.textContent = "Enter a new password for your account.";
    ui.resetOtpNotice.classList.remove("hidden");
    authVisible = true;
    setAuthTab("reset");
    renderSession();
  }

  async function apiRequest(path, body = {}, options = {}) {
    const headers = { "Content-Type": "application/json" };
    if (supabaseClient?.auth) {
      const { data } = await supabaseClient.auth.getSession();
      supabaseSessionActive = Boolean(data.session?.access_token);
      if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    }

    const response = await fetch(path, {
      method: options.method || "POST",
      headers,
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.error || payload.message || payload.details || "Request failed";
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
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

  async function requestPasswordReset(event) {
    event.preventDefault();
    const identifier = ui.resetIdentifier.value.trim();

    if (supabaseReady && supabaseClient) {
      try {
        await apiRequest("/api/password-reset", { identifier });
        clearPasswordResetForms();
        setAuthTab("signin");
        showToast("Password reset link sent. Check your email.");
      } catch (error) {
        console.error("Password reset failed", error);
        showToast("Could not send reset link right now.");
      }
      return;
    }

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

  async function resetPassword(event) {
    event.preventDefault();

    if (supabaseReady && supabaseClient && state.passwordReset?.supabaseRecovery) {
      if (ui.resetNewPassword.value.length < 8) {
        showToast("Use a password with at least 8 characters.");
        return;
      }
      if (ui.resetNewPassword.value !== ui.resetConfirmPassword.value) {
        showToast("Passwords do not match.");
        return;
      }
      const { error } = await supabaseClient.auth.updateUser({ password: ui.resetNewPassword.value });
      if (error) {
        showToast("Could not update password. Open the reset link again.");
        return;
      }
      state.passwordReset = null;
      clearPasswordResetForms();
      await supabaseClient.auth.signOut();
      setAuthTab("signin");
      showToast("Password updated. Sign in with the new password.");
      return;
    }

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
    if (supabaseReady) {
      showToast("Demo accounts are disabled on the live app.");
      return;
    }
    const resolvedAccountId = typeof accountId === "string" && accountId ? accountId : "user-1";
    const demoUser =
      state.users.find((user) => user.id === resolvedAccountId) ||
      PUBLIC_DEMO_ACCOUNT_IDS.map((id) => state.users.find((user) => user.id === id)).find(Boolean);
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

  async function createAccount(event) {
    event.preventDefault();
    if (!supabaseReady) {
      showToast("Connect Supabase before creating real landlord accounts.");
      return;
    }
    const phone = ui.accountPhone.value.trim();
    const email = ui.accountEmail.value.trim();
    const password = ui.accountPassword.value;
    const confirmPassword = ui.accountConfirmPassword.value;
    const selectedPlan = ui.accountPlan.value;
    const selectedPlanOption = signupPlanOption(selectedPlan);
    const paymentMethod = ui.accountPaymentMethod.value;
    const billingContact = ui.accountBillingContact.value.trim();
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
    if (password !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }
    if (!selectedPlanOption) {
      showToast("Choose Starter or Professional before starting the 14-day free trial.");
      return;
    }
    if (!paymentMethod) {
      showToast("Choose a payment method before accepting the terms and conditions.");
      return;
    }
    if (!billingContact) {
      showToast("Add the billing phone or authorization reference.");
      return;
    }
    if (paymentMethod === "Visa / Mastercard" && looksLikeFullCardNumber(billingContact)) {
      showToast("Use a card authorization reference, not a full card number.");
      return;
    }
    if (!ui.accountBillingConsent.checked) {
      showToast("Accept the terms and conditions to start the 14-day free trial.");
      return;
    }

    try {
      setAppLoading("Creating account");
      await apiRequest("/api/signup", {
        name: ui.accountName.value.trim(),
        phone,
        email,
        password,
        plan: selectedPlan,
        payment_method: paymentMethod,
        billing_contact: billingContact,
        auto_collect_authorized: true,
      });
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await openUserSession(data.user.id);
      ui.createAccountForm.reset();
      updateSignupBillingSummary();
      setView("properties");
      showToast(`${selectedPlanOption.plan} 14-day free trial opened.`);
    } catch (error) {
      console.error("Account creation failed", error);
      showToast(error.message || "Could not create account.");
    } finally {
      clearAppLoading();
    }
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

  async function openUserSession(userId) {
    if (supabaseReady && supabaseClient) {
      const remote = applyDeletedRowIdsToStateRows(await fetchSupabaseState(supabaseClient), state.deletedRowIds);
      const sessionState = {
        currentUserId: userId,
        selectedPropertyId: "all",
        role: state.role,
        searchTerm: state.searchTerm,
      };
      replaceState(migrateState({ ...emptyState(), ...remote, ...sessionState }));
      saveLocalStateOnly();
      await syncPendingDeletedRows();
    }

    const user = state.users.find((item) => item.id === userId);
    if (!user) {
      state.currentUserId = null;
      saveLocalStateOnly();
      renderSession();
      return null;
    }

    state.currentUserId = userId;
    state.selectedPropertyId = "all";
    state.role = user && user.role === "saas-owner" ? "saas-owner" : user && user.role === "staff" ? "staff" : "landlord";
    saveState();
    renderSession();
    setView(defaultView());
    return user;
  }

  async function refreshSupabaseState() {
    if (!supabaseReady || !supabaseClient) return;
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const remote = applyDeletedRowIdsToStateRows(await fetchSupabaseState(supabaseClient), state.deletedRowIds);
    replaceState(
      migrateState({
        ...emptyState(),
        ...remote,
        currentUserId: sessionData.session?.user?.id || state.currentUserId,
        selectedPropertyId: state.selectedPropertyId || "all",
        role: state.role,
        searchTerm: state.searchTerm,
      })
    );
    saveLocalStateOnly();
    await syncPendingDeletedRows();
    renderSession();
  }

  async function signOut() {
    if (supabaseReady && supabaseClient) {
      await persistStateBeforeSignOut();
      try {
        await supabaseClient.auth.signOut();
      } catch (error) {
        console.error("Supabase sign-out failed", error);
      }
    }
    supabaseSessionActive = false;
    state.currentUserId = null;
    state.selectedPropertyId = "all";
    state.role = "landlord";
    saveLocalStateOnly();
    authVisible = false;
    renderSession();
    showToast("Signed out.");
  }

  async function persistStateBeforeSignOut() {
    if (!supabaseReady || !supabaseClient || !currentUser()) return;
    window.clearTimeout(supabaseSaveTimer);
    supabaseSaveTimer = null;
    try {
      await persistSupabaseState(JSON.parse(JSON.stringify(state)));
    } catch (error) {
      console.error("Supabase save before sign-out failed", error);
      showToast("Some recent changes may only be saved in this browser.");
    }
  }

  function renderSession() {
    const user = currentUser();
    ui.landingScreen.classList.toggle("hidden", Boolean(user) || authVisible);
    ui.authScreen.classList.toggle("hidden", Boolean(user) || !authVisible);
    ui.appShell.classList.toggle("hidden", !user);

    if (!user) {
      return;
    }

    const accessLocked = landlordAccessLocked(user);
    ui.currentAccountName.textContent = user.name;
    ui.currentAccountPhone.textContent = `${userContactLabel(user)} - ${roleLabel(user.role)}`;
    ui.globalSearch.value = state.searchTerm || "";
    populateRoleOptions();
    ui.roleSelectLabel?.classList.toggle("hidden", accessLocked);
    ui.roleSelect.classList.toggle("hidden", accessLocked);
    ui.globalSearch.classList.toggle("hidden", accessLocked);
    ui.propertyFilter.classList.toggle("hidden", isSaasOwner(user) || accessLocked);
    ui.downloadBackup.classList.toggle("hidden", accessLocked);
    ui.resetDemo.classList.toggle("hidden", accessLocked || supabaseReady || !DEMO_ACCOUNT_IDS.includes(user.id));
    renderImpersonationBanner();
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
    if (landlordAccessLocked()) return lockedLandlordNav;
    return isSaasOwner() ? ownerNav : landlordNav;
  }

  function defaultView() {
    if (landlordAccessLocked()) return "subscriptionLocked";
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
    const selectedMessageOwnerId = ui.adminMessageOwner?.value;
    const selectedBackendOwnerId = ui.backendSupportOwner?.value;
    const selectedBillingOwnerId = state.billingLandlordFilter || "all";
    const selectedSupportOwnerId = supportTicketFilters().owner;
    const landlords = landlordUsers();
    const landlordOptions =
      landlords
        .map((user) => `<option value="${user.id}">${escapeHtml(user.name)} - ${escapeHtml(userContactLabel(user))}</option>`)
        .join("") || '<option value="">No landlords yet</option>';
    ui.ownerPaymentLandlord.innerHTML = landlordOptions;
    if (selectedPaymentOwnerId && landlords.some((user) => user.id === selectedPaymentOwnerId)) {
      ui.ownerPaymentLandlord.value = selectedPaymentOwnerId;
    }
    if (ui.ownerBillingLandlordFilter) {
      ui.ownerBillingLandlordFilter.innerHTML = [
        '<option value="all">All landlords</option>',
        ...landlords.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} - ${escapeHtml(userContactLabel(user))}</option>`),
      ].join("");
      ui.ownerBillingLandlordFilter.value = landlords.some((user) => user.id === selectedBillingOwnerId) ? selectedBillingOwnerId : "all";
    }
    ui.supportOwner.innerHTML = landlordOptions;
    if (ui.supportTicketOwnerFilter) {
      ui.supportTicketOwnerFilter.innerHTML = [
        '<option value="all">All landlords</option>',
        ...landlords.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} - ${escapeHtml(userContactLabel(user))}</option>`),
      ].join("");
      ui.supportTicketOwnerFilter.value = landlords.some((user) => user.id === selectedSupportOwnerId) ? selectedSupportOwnerId : "all";
    }
    if (ui.adminMessageOwner) {
      ui.adminMessageOwner.innerHTML = landlordOptions;
      if (selectedMessageOwnerId && landlords.some((user) => user.id === selectedMessageOwnerId)) {
        ui.adminMessageOwner.value = selectedMessageOwnerId;
      }
    }
    if (ui.backendSupportOwner) {
      ui.backendSupportOwner.innerHTML = landlordOptions;
      if (selectedBackendOwnerId && landlords.some((user) => user.id === selectedBackendOwnerId)) {
        ui.backendSupportOwner.value = selectedBackendOwnerId;
      }
      syncBackendSupportControls(false);
    }
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
          ? [{ value: "staff", label: "Caretaker" }]
          : [{ value: "landlord", label: "Landlord" }];
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
    if (landlordAccessLocked()) {
      renderSubscriptionLocked();
      renderNotifications();
      clearAppLoading();
      return;
    }
    ensureSelectedProperty();
    populateStaticControls();
    populateDynamicSelects();
    renderDashboard();
    renderSuperAdminDashboard();
    renderProperties();
    renderTenants();
    renderStaff();
    renderRent();
    renderLandlordSupport();
    renderExpenses();
    renderReminders();
    renderPlatformViews();
    renderNotifications();
    renderPublicListings();
    clearAppLoading();
  }

  function renderSubscriptionLocked() {
    if (!ui.subscriptionLockPlan) return;
    const user = currentUser();
    if (!user) return;

    const subscription = subscriptionByOwner(user.id);
    const paidPlan = paidPlanForEndedTrial(subscription);
    const plan = subscription?.plan && subscription.plan !== "Trial" ? subscription.plan : paidPlan?.plan || "Starter";
    const billableMonthlyFee = subscriptionPlanFee(subscription);
    const displayMonthlyFee = billableMonthlyFee || packageFee(plan) || paidPlan?.fee || 0;
    const status = subscription ? billingSubscriptionStatus(subscription) : "No subscription";
    const dueDate = subscription?.next_billing_date || trialEndDateForAccount(user, subscription);
    const method = subscriptionCheckoutOptionLabel(subscription);
    const canPay = Boolean(subscription?.id && billableMonthlyFee > 0);

    ui.subscriptionLockStatus.textContent = trialHasEnded(user, subscription) || status === "Pending" ? "Trial ended" : status;
    ui.subscriptionLockStatus.className = `pill ${canPay ? "danger" : "warning"}`;
    ui.subscriptionLockPlan.textContent = plan;
    ui.subscriptionLockAmount.textContent = displayMonthlyFee > 0 ? `${formatMoney(displayMonthlyFee)}/month` : "-";
    ui.subscriptionLockDueDate.textContent = formatOptionalDate(dueDate);
    ui.subscriptionLockMethod.textContent = method;
    ui.subscriptionLockMessage.textContent = canPay
      ? `Your 14-day trial has ended. Subscribe to ${plan} at ${formatMoney(billableMonthlyFee)}/month to continue using RentLedger UG.`
      : "Your trial has ended, but billing is not ready for this account. Contact support to activate a paid plan.";
    ui.subscriptionLockPay.disabled = !canPay;
    ui.subscriptionLockPay.textContent = canPay ? "Subscribe" : "Billing setup needed";
    ui.subscriptionLockNote.textContent = canPay
      ? subscription?.provider_next_action || ""
      : "Super admin needs to start billing for this account.";
  }

  function setView(viewName) {
    setAppLoading("Loading view");
    const secondaryViews = isSaasOwner() ? ["platformDetail"] : [];
    const allowedViewNames = [...currentNavItems().map(([itemViewName]) => itemViewName), ...secondaryViews];
    const requestedViewName = normalizeRequestedView(viewName);
    const resolvedViewName = allowedViewNames.includes(requestedViewName) ? requestedViewName : defaultView();
    if (resolvedViewName !== "platformDetail") activePlatformDetailType = "";
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

  function normalizeRequestedView(viewName) {
    if (isSaasOwner() && viewName === "properties") return "superAdminDashboard";
    return viewName;
  }

  function updateViewHeader(viewName) {
    if (viewName === "platformDetail") {
      const detail = buildPlatformDashboardDetail(activePlatformDetailType);
      ui.viewTitle.textContent = detail?.title || "Details";
      ui.viewSubtitle.textContent = detail?.meta || "Filtered platform records.";
      return;
    }
    const copy =
      viewName === "dashboard" && currentUser()?.role === "staff"
        ? ["Caretaker Dashboard", "Assigned tenants, follow-ups, and payments only."]
        : viewCopy[viewName] || viewCopy.dashboard;
    const [title, subtitle] = copy;
    ui.viewTitle.textContent = title;
    ui.viewSubtitle.textContent = subtitle;
  }

  function renderPublicListings() {
    if (!ui.publicListingGrid) return;
    if (!currentUser() && !supabaseReady) {
      ui.publicListingGrid.innerHTML = emptyBlock("Rental listings will appear here once the Supabase database is connected.");
      return;
    }
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

    const featuredListings = featuredListingItems(listings);
    const featuredIds = new Set(featuredListings.map((item) => item.unit.id));
    if (ui.featuredListingSection && ui.featuredListingGrid) {
      ui.featuredListingSection.classList.toggle("hidden", !featuredListings.length);
      ui.featuredListingGrid.innerHTML = featuredListings.map((item) => publicListingCard(item, { featured: true })).join("");
    }

    const regularListings = listings.filter((item) => !featuredIds.has(item.unit.id));
    ui.publicListingGrid.innerHTML =
      regularListings.map((item) => publicListingCard(item)).join("") ||
      (featuredListings.length ? "" : emptyBlock("No rentals match these filters."));
  }

  function publicListingItems() {
    return state.units
      .filter((unit) => unit.status === "vacant" && unit.listing_published)
      .map((unit) => {
        const property = propertyById(unit.property_id);
        const owner = property ? userById(property.owner_id) : null;
        return property && owner && ownerCanPublishPublicListings(owner.id, owner) ? { unit, property, owner } : null;
      })
      .filter(Boolean)
      .sort(publicListingSort);
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
    const message = `Hello ${owner.name}, I saw ${unit.unit_number} at ${property.property_name} in ${property.location} on RentLedger UG. Is it still available for viewing?`;
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
    const properties = state.properties.filter((property) => property.owner_id === owner.id);
    const propertyIds = new Set(properties.map((property) => property.id));
    return {
      propertyCount: properties.length,
      occupiedUnits: state.units.filter(
        (unit) => propertyIds.has(unit.property_id) && String(unit.status || "").toLowerCase() === "occupied"
      ).length,
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
    const label = owner.verification_label || "RentLedger profile";
    return `<span class="verification-badge pending">${escapeHtml(label)}</span>`;
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
    if (type.includes("room") || type.includes("boys")) return "assets/apartment-exterior.jpg";
    return "assets/apartment-exterior.jpg";
  }

  function renderOnboardingChecklist(scope) {
    if (!ui.onboardingPanel || !ui.onboardingChecklist) return;
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      ui.onboardingPanel.classList.add("hidden");
      return;
    }

    const activeTenants = scope.tenants.filter(isActiveTenant);
    const publicVacancies = scope.units.filter((unit) => unit.status === "vacant" && unit.listing_published);
    const steps = [
      {
        label: "Add your first property",
        done: scope.properties.length > 0,
        view: "properties",
      },
      {
        label: "Add rooms, shops, or houses",
        done: scope.units.length > 0,
        view: "properties",
      },
      {
        label: "Register an active tenant",
        done: activeTenants.length > 0,
        view: "tenants",
      },
      {
        label: "Record a rent payment",
        done: scope.payments.length > 0,
        view: "rent",
      },
      {
        label: "Publish a vacant unit",
        done: publicVacancies.length > 0,
        view: "properties",
      },
    ];
    const completed = steps.filter((step) => step.done).length;
    ui.onboardingProgressLabel.textContent = `${completed}/${steps.length} done`;
    ui.onboardingProgressLabel.className = `pill ${completed === steps.length ? "success" : "neutral"}`;
    ui.onboardingChecklist.innerHTML = steps
      .map(
        (step) => `
          <button class="onboarding-step ${step.done ? "done" : ""}" data-dashboard-view="${escapeHtml(step.view)}" type="button">
            <span>${step.done ? "Done" : "Next"}</span>
            <strong>${escapeHtml(step.label)}</strong>
          </button>
        `
      )
      .join("");
    ui.onboardingPanel.classList.toggle("hidden", completed === steps.length);
  }

  function renderDashboard() {
    if (isSaasOwner()) return;
    if (currentUser()?.role === "staff") {
      if (ui.onboardingPanel) ui.onboardingPanel.classList.add("hidden");
      renderCaretakerDashboard();
      return;
    }

    const scope = getScopedData();
    renderOnboardingChecklist(scope);
    const activeTenants = scope.tenants.filter(isActiveTenant);
    const rentRows = getRentRows(activeTenants);
    const todayPayments = scope.payments.filter((payment) => isToday(payment.created_at || payment.payment_date));
    const currentMonthPayments = getCurrentMonthPayments(scope.payments);
    const currentMonthExpenses = getCurrentMonthExpenses(scope.expenses);
    const occupied = scope.units.filter((unit) => unit.status === "occupied").length;
    const vacant = scope.units.filter((unit) => unit.status === "vacant").length;
    const vacantUnits = scope.units.filter((unit) => unit.status === "vacant");
    const expectedRent = activeTenants.reduce((sum, tenant) => sum + Number(tenant.rent_amount), 0);
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
      <th>Actions</th>
    `;
    ui.recentPaymentsHead.innerHTML = `
      <th>Tenant</th>
      <th>Room</th>
      <th>Amount</th>
      <th>Time</th>
      <th>Method</th>
      <th>Actions</th>
    `;

    ui.metricGrid.innerHTML = [
      metricCard("Rent Collected", formatMoney(collected), `${formatMoney(expectedRent)} expected this month`, "rentCollected"),
      metricCard("Late Tenants", overdueCount, `${formatMoney(totalBalance(overdueRows))} still unpaid`, "lateTenants"),
      metricCard("Vacant Rooms", vacant, vacantUnitSummary(vacantUnits), "vacantRooms"),
    ].join("");

    ui.dailyOpsGrid.innerHTML = [
      dailyOpsCard("Came in today", formatMoney(collectedToday), `${todayPayments.length} rent payments recorded`, "success", "todayPayments"),
      dailyOpsCard("Rent due soon", dueSoonCount, "Tenants due in the next 3 days", "warning", "dueSoon"),
      dailyOpsCard("Vacant rentals", vacant, vacantUnitSummary(vacantUnits), "info", "vacantRooms"),
    ].join("");

    ui.occupancyLabel.textContent = `${vacant} vacant`;
    ui.dueSoonLabel.textContent = `${overdueCount} late`;
    ui.monthLabel.textContent = "Latest";
    renderDashboardMonthReport(scope);

    ui.unitStatusGrid.innerHTML =
      vacantUnits
        .map((unit) => {
          const property = propertyById(unit.property_id);
          return `
            <button class="unit-tile vacant dashboard-action-card" data-unit-detail="${escapeHtml(unit.id)}" type="button">
              <div class="unit-number">${escapeHtml(unit.unit_number)}</div>
              <div class="unit-status">${escapeHtml(property ? property.property_name : "No property")}</div>
              <strong>${formatMoney(unit.rent_amount)}</strong>
            </button>
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
              <td><button class="text-button compact-link-button" data-payment-detail="${escapeHtml(payment.id)}" type="button">Details</button></td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No payments recorded yet.");

    ui.dashboardChartTitle.textContent = "Rent Collected This Month";
    ui.dashboardChartLabel.textContent = monthName(new Date());
    ui.dashboardChart.innerHTML = renderIncomeChart(scope.payments, expectedRent);
    ui.expenseTodayLabel.textContent = `${todayExpenses.length} today`;
    ui.dashboardExpenseList.closest(".panel")?.classList.add("hidden");
    ui.dashboardExpenseList.innerHTML =
      recentExpenses
        .map((expense) => {
          const property = propertyById(expense.property_id);
          return `
            <button class="compact-list-item dashboard-action-card" data-expense-detail="${escapeHtml(expense.id)}" type="button">
              <span>
                <strong>${escapeHtml(expense.type)}</strong>
                <small>${escapeHtml(property ? property.property_name : "Unknown property")} - ${formatDate(expense.date)}</small>
              </span>
              <b>${formatMoney(expense.amount)}</b>
            </button>
          `;
        })
        .join("") || emptyBlock("No expenses recorded yet.");
    renderActivityFeed(buildActivityItems(scope).slice(0, 8));
  }

  function renderCaretakerDashboard() {
    if (ui.onboardingPanel) ui.onboardingPanel.classList.add("hidden");
    const scope = getScopedData();
    const activeTenants = scope.tenants.filter(isActiveTenant);
    const rentRows = getRentRows(activeTenants);
    const todayPayments = scope.payments.filter((payment) => isToday(payment.created_at || payment.payment_date));
    const collectedToday = todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const overdueRows = rentRows
      .filter((row) => row.status === "Overdue")
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    const dueSoonRows = rentRows
      .filter((row) => row.daysUntilDue >= 0 && row.daysUntilDue <= 3)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    const vacantUnits = scope.units.filter((unit) => unit.status === "vacant");

    ui.dashboardPrimaryTitle.textContent = "Assigned Vacant Rooms";
    ui.dashboardSecondaryTitle.textContent = "Tenants To Follow Up";
    ui.dashboardRecentTitle.textContent = "Recent Assigned Payments";
    ui.dashboardActivityTitle.textContent = "Caretaker Activity";
    ui.upcomingDuesHead.innerHTML = `
      <th>Tenant</th>
      <th>Room</th>
      <th>Days</th>
      <th>Balance</th>
      <th>Actions</th>
    `;
    ui.recentPaymentsHead.innerHTML = `
      <th>Tenant</th>
      <th>Room</th>
      <th>Amount</th>
      <th>Time</th>
      <th>Method</th>
      <th>Actions</th>
    `;

    ui.metricGrid.innerHTML = [
      metricCard("Assigned Properties", scope.properties.length, `${scope.units.length} rooms and shops assigned`, "assignedProperties"),
      metricCard("Active Tenants", activeTenants.length, `${dueSoonRows.length} due soon`, "dueSoon"),
      metricCard("Late Tenants", overdueRows.length, `${formatMoney(totalBalance(overdueRows))} still unpaid`, "lateTenants"),
    ].join("");

    ui.dailyOpsGrid.innerHTML = [
      dailyOpsCard("Collected today", formatMoney(collectedToday), `${todayPayments.length} payments in assigned rooms`, "success", "todayPayments"),
      dailyOpsCard("Due soon", dueSoonRows.length, "Tenants due in the next 3 days", "warning", "dueSoon"),
      dailyOpsCard("Vacant assigned", vacantUnits.length, vacantUnitSummary(vacantUnits), "info", "vacantRooms"),
    ].join("");

    ui.occupancyLabel.textContent = `${vacantUnits.length} vacant`;
    ui.dueSoonLabel.textContent = `${overdueRows.length} late`;
    ui.monthLabel.textContent = "Latest";
    renderDashboardMonthReport(scope);

    ui.unitStatusGrid.innerHTML =
      vacantUnits
        .map((unit) => {
          const property = propertyById(unit.property_id);
          return `
            <button class="unit-tile vacant dashboard-action-card" data-unit-detail="${escapeHtml(unit.id)}" type="button">
              <div class="unit-number">${escapeHtml(unit.unit_number)}</div>
              <div class="unit-status">${escapeHtml(property ? property.property_name : "No property")}</div>
              <strong>${formatMoney(unit.rent_amount)}</strong>
            </button>
          `;
        })
        .join("") || emptyBlock("No vacant rooms in your assigned properties.");

    ui.upcomingDuesTable.innerHTML =
      overdueRows.slice(0, 8).map((row) => lateTenantRow(row)).join("") ||
      emptyTableRow(5, "No late tenants in your assigned properties.");

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
              <td><button class="text-button compact-link-button" data-payment-detail="${escapeHtml(payment.id)}" type="button">Details</button></td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No payments recorded for assigned tenants yet.");

    ui.dashboardChartTitle.textContent = "Caretaker Tasks";
    ui.dashboardChartLabel.textContent = `${scope.properties.length} assigned`;
    ui.dashboardChart.innerHTML = renderCaretakerTaskList({ overdueRows, dueSoonRows, vacantUnits });
    ui.dashboardExpenseList.closest(".panel")?.classList.add("hidden");
    renderActivityFeed(buildActivityItems(scope).slice(0, 8));
  }

  function dashboardSnapshot() {
    const scope = getScopedData();
    const activeTenants = scope.tenants.filter(isActiveTenant);
    const rentRows = getRentRows(activeTenants);
    const currentMonthPayments = getCurrentMonthPayments(scope.payments);
    const currentMonthExpenses = getCurrentMonthExpenses(scope.expenses);
    const todayPayments = scope.payments.filter((payment) => isToday(payment.created_at || payment.payment_date));
    const todayExpenses = scope.expenses.filter((expense) => isToday(expense.created_at || expense.date));
    const overdueRows = rentRows
      .filter((row) => row.status === "Overdue")
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    const dueSoonRows = rentRows
      .filter((row) => row.daysUntilDue >= 0 && row.daysUntilDue <= 3)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    return {
      scope,
      rentRows,
      currentMonthPayments,
      currentMonthExpenses,
      todayPayments,
      todayExpenses,
      overdueRows,
      dueSoonRows,
      vacantUnits: scope.units.filter((unit) => unit.status === "vacant"),
      expectedRent: activeTenants.reduce((sum, tenant) => sum + Number(tenant.rent_amount), 0),
    };
  }

  function openDashboardDetail(type) {
    const data = dashboardSnapshot();
    const month = monthName(new Date());
    if (type === "assignedProperties") {
      openDashboardDetailModal(
        "Assigned Properties",
        `${data.scope.properties.length} properties assigned to you`,
        [
          propertyDetailList(data.scope.properties, "No properties assigned yet."),
          detailActions([["tenants", "Open Tenants"], ["rent", "Open Rent Collection"]]),
        ].join("")
      );
      return;
    }
    if (type === "rentCollected") {
      const collected = data.currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      openDashboardDetailModal(
        "Rent Collected",
        `${month} rent performance`,
        [
          detailGrid([
            ["Collected", formatMoney(collected)],
            ["Expected", formatMoney(data.expectedRent)],
            ["Balance", formatMoney(Math.max(0, data.expectedRent - collected))],
            ["Payments", data.currentMonthPayments.length],
          ]),
          paymentDetailList(data.currentMonthPayments, "No rent payments recorded this month."),
          detailActions([["rent", "Open Rent Collection"]]),
        ].join("")
      );
      return;
    }
    if (type === "todayPayments") {
      const total = data.todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      openDashboardDetailModal(
        "Payments Today",
        `${formatMoney(total)} received today`,
        [
          detailGrid([
            ["Amount", formatMoney(total)],
            ["Payments", data.todayPayments.length],
          ]),
          paymentDetailList(data.todayPayments, "No rent payments were recorded today."),
          detailActions([["rent", "Open Rent Collection"]]),
        ].join("")
      );
      return;
    }
    if (type === "lateTenants") {
      openDashboardDetailModal(
        "Late Tenants",
        `${data.overdueRows.length} tenants still have overdue balances`,
        [
          detailGrid([
            ["Late tenants", data.overdueRows.length],
            ["Total balance", formatMoney(totalBalance(data.overdueRows))],
          ]),
          tenantBalanceDetailList(data.overdueRows, "No late tenants for the selected property."),
          detailActions([["rent", "Open Rent Collection"]]),
        ].join("")
      );
      return;
    }
    if (type === "dueSoon") {
      openDashboardDetailModal(
        "Rent Due Soon",
        `${data.dueSoonRows.length} tenants due in the next 3 days`,
        [
          tenantBalanceDetailList(data.dueSoonRows, "No tenants are due in the next 3 days."),
          detailActions([["rent", "Open Rent Collection"]]),
        ].join("")
      );
      return;
    }
    if (type === "vacantRooms") {
      const vacancyActions =
        currentUser()?.role === "staff"
          ? [["tenants", "Open Tenants"], ["rent", "Open Rent Collection"]]
          : [["properties", "Open Properties"], ["tenants", "Add Tenant"]];
      openDashboardDetailModal(
        "Vacant Rooms",
        vacantUnitSummary(data.vacantUnits),
        [
          unitDetailList(data.vacantUnits, "No vacant rooms for the selected property."),
          detailActions(vacancyActions),
        ].join("")
      );
      return;
    }
    if (type === "expenses") {
      const total = data.currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      openDashboardDetailModal(
        "Expenses",
        `${month} expenses`,
        [
          detailGrid([
            ["Total", formatMoney(total)],
            ["Records", data.currentMonthExpenses.length],
            ["Today", formatMoney(data.todayExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0))],
          ]),
          expenseDetailList(data.currentMonthExpenses, "No expenses recorded this month."),
          detailActions([["expenses", "Open Expenses"]]),
        ].join("")
      );
      return;
    }
    if (type === "todayExpenses") {
      const total = data.todayExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      openDashboardDetailModal(
        "Expenses Today",
        `${data.todayExpenses.length} expense records today`,
        [
          detailGrid([
            ["Total", formatMoney(total)],
            ["Records", data.todayExpenses.length],
          ]),
          expenseDetailList(data.todayExpenses, "No expenses were added today."),
          detailActions([["expenses", "Open Expenses"]]),
        ].join("")
      );
      return;
    }
    if (isSaasOwner() && openPlatformDashboardDetail(type)) return;
    showToast("No dashboard details available.");
  }

  function buildPlatformDashboardDetail(type) {
    const landlords = landlordUsers();
    const subscriptions = state.subscriptions || [];
    const tickets = state.supportTickets || [];
    const notifications = state.notifications || [];
    const paidSubscriptions = subscriptions.filter(isPaidSubscription);
    const pending = pendingSubscriptions();
    const expiring = expiringSubscriptions();
    const expired = expiredSubscriptions();
    const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved");
    const trialSubscriptions = subscriptions.filter((subscription) => subscription.plan === "Trial" || billingSubscriptionStatus(subscription) === "Trial");
    const paidThisMonth = paidSubscriptions.filter((subscription) => isCurrentMonth(subscription.last_payment_date));
    const detailConfig = {
      adminTotalLandlords: {
        title: "Total Landlords",
        meta: `${landlords.length} landlord accounts`,
        body: [
          detailGrid([
            ["All landlords", landlords.length],
            ["Paid active", landlords.filter((user) => isPaidSubscription(subscriptionByOwner(user.id))).length],
            ["Trial", landlords.filter((user) => isTrialAccount(user)).length],
            ["Pending payment", pending.length],
          ]),
          landlordDetailList(landlords, "No landlord accounts yet."),
          detailActions([["platformLandlords", "Open Accounts"]]),
        ],
      },
      adminActiveSubscriptions: {
        title: "Active Subscriptions",
        meta: `${paidSubscriptions.length} paid subscription records`,
        body: [
          detailGrid([
            ["Paid active plans", paidSubscriptions.length],
            ["Pending payments", pending.length],
          ]),
          subscriptionDetailList(paidSubscriptions, "No paid active subscriptions yet."),
          detailActions([["platformBilling", "Open Billing"]]),
        ],
      },
      adminMonthlyRevenue: {
        title: "Monthly Revenue",
        meta: `${formatMoney(paidSubscriptions.reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0))} current MRR`,
        body: [
          detailGrid([
            ["MRR", formatMoney(paidSubscriptions.reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0))],
            ["Paid active plans", paidSubscriptions.length],
          ]),
          subscriptionDetailList(paidSubscriptions, "No paid subscriptions are contributing to MRR yet."),
          detailActions([["platformBilling", "Open Billing"]]),
        ],
      },
      adminNewSignups: {
        title: "New Signups",
        meta: "Landlords created this month",
        body: [landlordDetailList(newLandlordSignups(), "No new landlord signups this month."), detailActions([["platformLandlords", "Open Accounts"]])],
      },
      adminSupportTickets: {
        title: "Support Tickets",
        meta: `${openTickets.length} open requests`,
        body: [supportTicketDetailList(tickets, "No support tickets yet."), detailActions([["platformSupport", "Open Monitoring"]])],
      },
      adminExpiredAccounts: {
        title: "Expired Accounts",
        meta: `${expired.length} expired, ${expiring.length} expiring soon`,
        body: [
          detailGrid([
            ["Expired", expired.length],
            ["Expiring soon", expiring.length],
          ]),
          subscriptionDetailList([...expired, ...expiring], "No expired or expiring subscriptions."),
          detailActions([["platformBilling", "Open Billing"]]),
        ],
      },
      platformPaidAccounts: {
        title: "Paid Active Accounts",
        meta: "Landlords with confirmed payment",
        body: [landlordDetailList(landlords.filter((user) => isPaidSubscription(subscriptionByOwner(user.id))), "No paid active landlord accounts yet.")],
      },
      platformInactiveAccounts: {
        title: "Inactive Accounts",
        meta: "Suspended or inactive landlord accounts",
        body: [landlordDetailList(landlords.filter((user) => ["Suspended", "Inactive"].includes(accountStatus(user))), "No inactive landlord accounts.")],
      },
      platformTrialAccounts: {
        title: "Trial Accounts",
        meta: "Landlords still on trial access",
        body: [landlordDetailList(landlords.filter((user) => isTrialAccount(user)), "No trial landlord accounts.")],
      },
      platformMonthlyRevenue: {
        title: "Monthly SaaS Revenue",
        meta: "Paid subscriptions included in revenue",
        body: [subscriptionDetailList(paidSubscriptions, "No paid subscriptions are contributing to revenue yet."), detailActions([["platformBilling", "Open Billing"]])],
      },
      platformPendingPayments: {
        title: "Pending Payments",
        meta: `${pending.length} subscriptions need payment`,
        body: [subscriptionDetailList(pending, "No pending subscription payments."), detailActions([["platformBilling", "Open Billing"]])],
      },
      platformOpenSupport: {
        title: "Open Support",
        meta: `${openTickets.length} unresolved support requests`,
        body: [supportTicketDetailList(openTickets, "No open support requests."), detailActions([["platformSupport", "Open Monitoring"]])],
      },
      billingMrr: {
        title: "MRR",
        meta: "Confirmed paid subscriptions",
        body: [subscriptionDetailList(paidSubscriptions, "No paid subscriptions yet.")],
      },
      billingPaidThisMonth: {
        title: "Paid This Month",
        meta: `${formatMoney(paidThisMonth.reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0))} confirmed this month`,
        body: [subscriptionDetailList(paidThisMonth, "No subscription payments confirmed this month.")],
      },
      billingPendingPayments: {
        title: "Pending Payments",
        meta: `${pending.length} subscriptions need collection`,
        body: [subscriptionDetailList(pending, "No pending payments.")],
      },
      billingExpiringPlans: {
        title: "Expiring Plans",
        meta: "Paid plans expiring in the next 14 days",
        body: [subscriptionDetailList(expiring, "No plans expiring soon.")],
      },
      billingTrialAccounts: {
        title: "Trial Accounts",
        meta: `${trialSubscriptions.length} trial subscription records`,
        body: [subscriptionDetailList(trialSubscriptions, "No trial subscriptions.")],
      },
      billingPaidActivePlans: {
        title: "Paid Active Plans",
        meta: `${paidSubscriptions.length} plans with confirmed payment`,
        body: [subscriptionDetailList(paidSubscriptions, "No paid active plans.")],
      },
      systemNotifications: {
        title: "Notifications",
        meta: `${notifications.length} notifications recorded`,
        body: [notificationDetailList(notifications, "No notifications yet.")],
      },
      systemUnreadAlerts: {
        title: "Unread Alerts",
        meta: `${notifications.filter((notification) => !isNotificationRead(notification)).length} unread notifications`,
        body: [notificationDetailList(notifications.filter((notification) => !isNotificationRead(notification)), "No unread alerts.")],
      },
      systemSupportTickets: {
        title: "Support Tickets",
        meta: `${tickets.length} support tickets recorded`,
        body: [supportTicketDetailList(tickets, "No support tickets yet.")],
      },
      systemOpenRequests: {
        title: "Open Requests",
        meta: `${openTickets.length} unresolved support requests`,
        body: [supportTicketDetailList(openTickets, "No open requests.")],
      },
      systemBugReports: {
        title: "Bug Reports",
        meta: "Runtime issue tracking",
        body: [systemSignalDetailList(buildSystemMonitorRows().filter((row) => row.type === "Bugs"), "No bug reports captured.")],
      },
      systemStorage: {
        title: "Storage Used",
        meta: supabaseReady ? "Supabase active" : "Browser fallback",
        body: [
          detailGrid([
            ["Records", estimateStorageUsage().records],
            ["Approx. size", estimateStorageUsage().label],
            ["Mode", supabaseReady ? "Supabase" : "Browser storage"],
          ]),
          systemSignalDetailList(buildSystemMonitorRows(), "No system signals yet."),
        ],
      },
    };
    return detailConfig[type] || null;
  }

  function openPlatformDashboardDetail(type) {
    const detail = buildPlatformDashboardDetail(type);
    if (!detail) return false;
    openDashboardDetailModal(detail.title, detail.meta, detail.body.join(""));
    return true;
  }

  function renderPlatformDetailPage() {
    if (!ui.platformDetailTitle || !ui.platformDetailBody) return;
    const detail = buildPlatformDashboardDetail(activePlatformDetailType);
    ui.platformDetailTitle.textContent = detail?.title || "Details";
    ui.platformDetailMeta.textContent = detail?.meta || "";
    ui.platformDetailBody.innerHTML = detail ? detail.body.join("") : emptyBlock("Choose a summary card to see its records.");
  }

  function openPlatformDetailPage(type, button = null) {
    if (!isSaasOwner()) return;
    const detail = buildPlatformDashboardDetail(type);
    if (!detail) {
      showToast("No page details available.");
      return;
    }
    const sourceView = button?.closest(".view")?.id || document.querySelector(".view.active-view")?.id;
    if (sourceView && sourceView !== "platformDetail") activePlatformDetailReturnView = sourceView;
    activePlatformDetailType = type;
    renderPlatformDetailPage();
    setView("platformDetail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closePlatformDetailPage() {
    const returnView = activePlatformDetailReturnView || "platformLandlords";
    activePlatformDetailType = "";
    setView(returnView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openUnitDetail(id) {
    const unit = unitById(id);
    if (!unit) {
      showToast("Room not found.");
      return;
    }
    const property = propertyById(unit.property_id);
    const tenant = state.tenants.find((item) => item.unit_id === unit.id && isActiveTenant(item));
    const rentRow = tenant ? getRentRows([tenant])[0] : null;
    openDashboardDetailModal(
      unit.unit_number,
      property ? property.property_name : "Unknown property",
      [
        detailGrid([
          ["Property", property ? property.property_name : "Unknown"],
          ["Location", property ? property.location : "Unknown"],
          ["Type", unitTypeLabel(unit)],
          ["Monthly rent", formatMoney(unit.rent_amount)],
          ["Status", capitalize(unit.status || "vacant")],
          ["Listing", unit.listing_published ? "Published" : "Private"],
          ["Tenant", tenant ? tenant.name : "No tenant assigned"],
          ["Balance", rentRow ? formatMoney(rentRow.balance) : "-"],
        ]),
        tenant
          ? detailActions([["tenants", "Open Tenants"], ["rent", "Record Payment"]], [
              `<button class="text-button" data-tenant-detail="${escapeHtml(tenant.id)}" type="button">Tenant Details</button>`,
            ])
          : detailActions([["tenants", "Assign Tenant"], ["properties", "Manage Rooms"]]),
      ].join("")
    );
  }

  function openTenantDetail(id) {
    const tenant = tenantById(id);
    if (!tenant) {
      showToast("Tenant not found.");
      return;
    }
    const unit = unitById(tenant.unit_id);
    const property = unit ? propertyById(unit.property_id) : null;
    const rentRow = isActiveTenant(tenant) ? getRentRows([tenant])[0] : null;
    const payments = state.payments
      .filter((payment) => payment.tenant_id === tenant.id)
      .sort((a, b) => new Date(b.created_at || b.payment_date) - new Date(a.created_at || a.payment_date))
      .slice(0, 6);
    openDashboardDetailModal(
      tenant.name,
      `${property ? property.property_name : "Unknown property"}${unit ? ` - ${unit.unit_number}` : ""}`,
      [
        detailGrid([
          ["Phone", tenant.phone],
          ["National ID", tenant.national_id || "-"],
          ["Room", unit ? unit.unit_number : "Unassigned"],
          ["Monthly rent", formatMoney(tenant.rent_amount)],
          ["Deposit", formatMoney(tenant.deposit_paid)],
          ["Move-in date", formatDate(tenant.move_in_date)],
          ["Tenant status", tenantStatusLabel(tenant)],
          ["Rent status", rentRow ? rentRow.status : "-"],
          ["Balance", rentRow ? formatMoney(rentRow.balance) : "-"],
          ["Move-out date", tenant.move_out_date ? formatDate(tenant.move_out_date) : "-"],
          ["Move-out refund", tenant.move_out_refund ? formatMoney(tenant.move_out_refund) : "-"],
        ]),
        paymentDetailList(payments, "No payment history for this tenant yet."),
        isActiveTenant(tenant)
          ? detailActions([["rent", "Open Rent Collection"]], [
              tenantContactActions(tenant, tenantWhatsAppMessage(tenant), { compact: false, sendLabel: "Send WhatsApp" }),
            ])
          : detailActions([["tenants", "Open Tenants"]]),
      ].join("")
    );
  }

  function openPaymentDetail(id) {
    const payment = state.payments.find((item) => item.id === id);
    if (!payment) {
      showToast("Payment not found.");
      return;
    }
    const tenant = tenantById(payment.tenant_id);
    const unit = tenant ? unitById(tenant.unit_id) : null;
    const property = unit ? propertyById(unit.property_id) : null;
    const receiptMessage = paymentReceiptMessage(payment);
    openDashboardDetailModal(
      "Payment Details",
      tenant ? tenant.name : "Removed tenant",
      [
        detailGrid([
          ["Tenant", tenant ? tenant.name : "Removed tenant"],
          ["Property", property ? property.property_name : "Unknown"],
          ["Room", unit ? unit.unit_number : "Unassigned"],
          ["Amount", formatMoney(payment.amount)],
          ["Balance after payment", formatMoney(payment.balance)],
          ["Method", payment.payment_method],
          ["Receipt No.", receiptNumber(payment)],
          ["Reference", payment.reference || "-"],
          ["Proof", payment.payment_proof || "-"],
          ["Verification", payment.verification_status || "Unverified"],
          ["Date", formatDate(payment.payment_date)],
        ]),
        detailActions([["rent", "Open Rent Collection"]], [
          `<button class="primary-button" data-receipt-payment="${escapeHtml(payment.id)}" type="button">Open Receipt</button>`,
          tenant ? tenantContactActions(tenant, receiptMessage, { compact: false, sendLabel: "Send Receipt" }) : "",
        ]),
      ].join("")
    );
  }

  function openExpenseDetail(id) {
    const expense = state.expenses.find((item) => item.id === id);
    if (!expense) {
      showToast("Expense not found.");
      return;
    }
    const property = propertyById(expense.property_id);
    openDashboardDetailModal(
      expense.type,
      property ? property.property_name : "Unknown property",
      [
        detailGrid([
          ["Property", property ? property.property_name : "Unknown"],
          ["Location", property ? property.location : "Unknown"],
          ["Type", expense.type],
          ["Amount", formatMoney(expense.amount)],
          ["Date", formatDate(expense.date)],
        ]),
        detailActions([["expenses", "Open Expenses"]]),
      ].join("")
    );
  }

  function openDashboardView(viewName) {
    closeDashboardDetailModal();
    setView(viewName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDashboardDetailModal(title, meta, bodyHtml) {
    ui.dashboardDetailTitle.textContent = title;
    ui.dashboardDetailMeta.textContent = meta || "";
    ui.dashboardDetailBody.innerHTML = bodyHtml;
    ui.dashboardDetailModal.classList.remove("hidden");
  }

  function closeDashboardDetailModal() {
    ui.dashboardDetailModal.classList.add("hidden");
  }

  function detailGrid(items) {
    return `
      <dl class="detail-grid">
        ${items
          .map(
            ([label, value]) => `
              <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(String(value))}</dd>
              </div>
            `
          )
          .join("")}
      </dl>
    `;
  }

  function paymentDetailList(payments, emptyMessage) {
    if (!payments.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${payments
          .map((payment) => {
            const tenant = tenantById(payment.tenant_id);
            const unit = tenant ? unitById(tenant.unit_id) : null;
            return `
              <button class="detail-list-item" data-payment-detail="${escapeHtml(payment.id)}" type="button">
                <span>
                  <strong>${escapeHtml(tenant ? tenant.name : "Removed tenant")}</strong>
                  <small>${escapeHtml(unit ? unit.unit_number : "Unassigned")} - ${escapeHtml(payment.payment_method)}${payment.reference ? ` - ${escapeHtml(payment.reference)}` : ""}</small>
                </span>
                <b>${formatMoney(payment.amount)}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function tenantBalanceDetailList(rows, emptyMessage) {
    if (!rows.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${rows
          .map((row) => {
            const property = row.unit ? propertyById(row.unit.property_id) : null;
            const dueLabel =
              row.daysUntilDue < 0
                ? `${Math.abs(row.daysUntilDue)} day${Math.abs(row.daysUntilDue) === 1 ? "" : "s"} late`
                : row.daysUntilDue === 0
                  ? "Due today"
                  : `Due in ${row.daysUntilDue} day${row.daysUntilDue === 1 ? "" : "s"}`;
            return `
              <button class="detail-list-item" data-tenant-detail="${escapeHtml(row.tenant.id)}" type="button">
                <span>
                  <strong>${escapeHtml(row.tenant.name)}</strong>
                  <small>${escapeHtml(property ? property.property_name : "Unknown property")} - ${escapeHtml(row.unit ? row.unit.unit_number : "Unassigned")} - ${escapeHtml(dueLabel)}</small>
                </span>
                <b>${formatMoney(row.balance)}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function unitDetailList(units, emptyMessage) {
    if (!units.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${units
          .map((unit) => {
            const property = propertyById(unit.property_id);
            return `
              <button class="detail-list-item" data-unit-detail="${escapeHtml(unit.id)}" type="button">
                <span>
                  <strong>${escapeHtml(unit.unit_number)}</strong>
                  <small>${escapeHtml(property ? property.property_name : "Unknown property")} - ${escapeHtml(unitTypeLabel(unit))}</small>
                </span>
                <b>${formatMoney(unit.rent_amount)}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function propertyDetailList(properties, emptyMessage) {
    if (!properties.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${properties
          .map((property) => {
            const units = state.units.filter((unit) => unit.property_id === property.id);
            const occupied = units.filter((unit) => unit.status === "occupied").length;
            return `
              <button class="detail-list-item" data-dashboard-view="tenants" type="button">
                <span>
                  <strong>${escapeHtml(property.property_name)}</strong>
                  <small>${escapeHtml(property.location)} - ${escapeHtml(property.property_type || "Property")}</small>
                </span>
                <b>${occupied}/${units.length}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function expenseDetailList(expenses, emptyMessage) {
    if (!expenses.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${expenses
          .map((expense) => {
            const property = propertyById(expense.property_id);
            return `
              <button class="detail-list-item" data-expense-detail="${escapeHtml(expense.id)}" type="button">
                <span>
                  <strong>${escapeHtml(expense.type)}</strong>
                  <small>${escapeHtml(property ? property.property_name : "Unknown property")} - ${formatDate(expense.date)}</small>
                </span>
                <b>${formatMoney(expense.amount)}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function landlordDetailList(users, emptyMessage) {
    if (!users.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${users
          .map((user) => {
            const subscription = subscriptionByOwner(user.id);
            const portfolio = ownerPortfolio(user.id);
            return `
              <button class="detail-list-item" data-focus-landlord="${escapeHtml(user.id)}" type="button">
                <span>
                  <strong>${escapeHtml(user.name)}</strong>
                  <small>${escapeHtml(userContactLabel(user))} - ${escapeHtml(subscription ? subscription.plan : "No plan")} - ${escapeHtml(platformAccountDisplayStatus(user, subscription))}</small>
                </span>
                <b>${portfolio.properties.length}/${portfolio.units.length}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function subscriptionDetailList(subscriptions, emptyMessage) {
    if (!subscriptions.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${subscriptions
          .map((subscription) => {
            const user = userById(subscription.owner_id);
            const status = billingSubscriptionStatus(subscription);
            const provider = subscriptionProviderNote(subscription);
            return `
              <button class="detail-list-item" data-focus-landlord="${escapeHtml(subscription.owner_id)}" type="button">
                <span>
                  <strong>${escapeHtml(user ? user.name : "Unknown landlord")}</strong>
                  <small>${escapeHtml(subscription.plan)} - ${escapeHtml(status)} - Next: ${formatDate(subscription.next_billing_date)}${provider ? ` - ${escapeHtml(provider)}` : ""}</small>
                </span>
                <b>${formatMoney(subscription.monthly_fee)}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function supportTicketDetailList(tickets, emptyMessage) {
    if (!tickets.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${tickets
          .map((ticket) => {
            const user = userById(ticket.owner_id);
            return `
              <button
                class="detail-list-item"
                data-open-ticket="${escapeHtml(ticket.id)}"
                aria-label="Open support message: ${escapeHtml(ticket.subject)}"
                type="button"
              >
                <span>
                  <strong>${escapeHtml(ticket.subject)}</strong>
                  <small>${escapeHtml(user ? user.name : "Unknown landlord")} - ${escapeHtml(ticket.priority)} - ${formatDate(ticket.updated_at)}</small>
                </span>
                <b>${escapeHtml(ticket.status)}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function notificationDetailList(notifications, emptyMessage) {
    if (!notifications.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${notifications
          .map((notification) => {
            const user = notification.user_id ? userById(notification.user_id) : null;
            return `
              <button class="detail-list-item" data-open-notification="${escapeHtml(notification.id)}" type="button">
                <span>
                  <strong>${escapeHtml(notification.title)}</strong>
                  <small>${escapeHtml(notificationTypeLabel(notification.type))} - ${escapeHtml(user ? user.name : "Platform")} - ${timeAgo(notification.created_at)}</small>
                </span>
                <b>${escapeHtml(isNotificationRead(notification) ? "Read" : "Open")}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function systemSignalDetailList(rows, emptyMessage) {
    if (!rows.length) return emptyBlock(emptyMessage);
    return `
      <div class="detail-list">
        ${rows
          .map(
            (row) => `
              <div class="detail-list-item detail-static-item">
                <span>
                  <strong>${escapeHtml(row.title)}</strong>
                  <small>${escapeHtml(row.type)} - ${escapeHtml(row.dateLabel)} - ${escapeHtml(row.detail)}</small>
                </span>
                <b>${escapeHtml(row.status)}</b>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function detailActions(viewActions, extraActions = []) {
    return `
      <div class="detail-actions">
        ${viewActions
          .map(
            ([viewName, label]) =>
              `<button class="text-button" data-dashboard-view="${escapeHtml(viewName)}" type="button">${escapeHtml(label)}</button>`
          )
          .join("")}
        ${extraActions.join("")}
      </div>
    `;
  }

  function renderSuperAdminDashboard() {
    if (!isSaasOwner()) return;
    const landlords = landlordUsers();
    const subscriptions = state.subscriptions || [];
    const tickets = state.supportTickets || [];
    const activeAccounts = landlords.filter((user) => isPaidSubscription(subscriptionByOwner(user.id)));
    const newSignups = newLandlordSignups();
    const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved");
    const activeSubscriptions = subscriptions.filter((subscription) => isPaidSubscription(subscription) && !isSubscriptionExpired(subscription));
    const monthlyRecurringRevenue = activeSubscriptions.reduce(
      (sum, subscription) => sum + Number(subscription.monthly_fee),
      0
    );
    const pendingPayments = pendingSubscriptions().length;
    const expiredAccounts = expiredSubscriptions();
    const expiringPlans = expiringSubscriptions().length;
    renderAdminMonthStrip();

    ui.adminMetricGrid.innerHTML = [
      adminMetricCard("Total Landlords", landlords.length, `${activeAccounts.length} paid active accounts`, "teal", "adminTotalLandlords"),
      adminMetricCard("Active Subscriptions", activeSubscriptions.length, `${pendingPayments} pending payments`, "blue", "adminActiveSubscriptions"),
      adminMetricCard("Monthly Revenue", formatMoney(monthlyRecurringRevenue), "Subscription MRR", "green", "adminMonthlyRevenue"),
      adminMetricCard("New Signups", newSignups.length, "This month", "amber", "adminNewSignups"),
      adminMetricCard("Support Tickets", tickets.length, `${openTickets.length} open`, "rose", "adminSupportTickets"),
      adminMetricCard("Expired Accounts", expiredAccounts.length, `${expiringPlans} plans expiring soon`, "slate", "adminExpiredAccounts"),
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
          const baseStatus = billingSubscriptionStatus(subscription);
          const status = isSubscriptionExpired(subscription)
            ? "Expired"
            : isSubscriptionExpiring(subscription) && baseStatus === "Active"
              ? "Expiring"
              : baseStatus;
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

  function renderAdminMonthStrip() {
    const today = stripTime(new Date());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    if (ui.adminDashboardMonthLabel) ui.adminDashboardMonthLabel.textContent = monthName(today);
    if (ui.adminDashboardDateLabel) ui.adminDashboardDateLabel.textContent = `Today: ${formatDate(isoDate(today))}`;
    if (ui.adminDashboardMonthStart) ui.adminDashboardMonthStart.textContent = formatDate(isoDate(monthStart));
    if (ui.adminDashboardNextMonth) ui.adminDashboardNextMonth.textContent = formatDate(isoDate(nextMonthStart));
  }

  function renderPlatformViews() {
    if (!isSaasOwner()) return;
    renderPlatformLandlords();
    renderPlatformBilling();
    renderPlatformSupport();
    renderPlatformMessages();
    renderPlatformReports();
    renderPlatformDetailPage();
  }

  function renderLandlordSupport() {
    if (!ui.landlordSupportList || isSaasOwner()) return;
    const user = currentUser();
    if (!user) return;
    const tickets = (state.supportTickets || [])
      .filter((ticket) => ticket.owner_id === user.id)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved");
    const badgeRequest = verifiedBadgeRequestForOwner(user.id);
    const hasBadge = ownerHasVerifiedBadge(user);

    ui.landlordSupportCount.textContent = `${openTickets.length} open`;
    if (ui.verifiedBadgeRequestStatus) {
      ui.verifiedBadgeRequestStatus.textContent = hasBadge
        ? "Your public profile has a verified landlord badge."
        : badgeRequest
          ? "Your verified badge request is waiting for super admin review."
          : "Request super admin review for your public profile.";
    }
    if (ui.requestVerifiedBadgeButton) {
      ui.requestVerifiedBadgeButton.disabled = hasBadge || Boolean(badgeRequest);
      ui.requestVerifiedBadgeButton.textContent = hasBadge ? "Badge Active" : badgeRequest ? "Request Sent" : "Request Badge";
    }
    ui.landlordSupportList.innerHTML =
      tickets
        .map(
          (ticket) => `
            <article class="support-card">
              <div class="support-card-header">
                <div class="support-card-title">
                  <strong>${escapeHtml(ticket.subject)}</strong>
                  <small>Updated ${formatDate(ticket.updated_at)}</small>
                </div>
                <div class="button-row">
                  ${statusPill(ticket.priority)}
                  ${statusPill(ticket.status)}
                </div>
              </div>
              <p class="support-note">${escapeHtml(ticket.note || "No message added.")}</p>
              ${ticketMessageHistoryMarkup(ticket.id)}
            </article>
          `
        )
        .join("") || emptyBlock("No support requests yet.");
  }

  function verifiedBadgeRequestForOwner(ownerId) {
    return (state.supportTickets || [])
      .filter((ticket) => ticket.owner_id === ownerId && isVerifiedBadgeRequest(ticket) && ticket.status !== "Resolved")
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;
  }

  function resolvedVerifiedBadgeRequestForOwner(ownerId) {
    return (state.supportTickets || [])
      .filter((ticket) => ticket.owner_id === ownerId && isVerifiedBadgeRequest(ticket) && ticket.status === "Resolved")
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;
  }

  function isVerifiedBadgeRequest(ticket) {
    return String(ticket?.subject || "").trim().toLowerCase() === VERIFIED_BADGE_REQUEST_SUBJECT.toLowerCase();
  }

  function resolveVerifiedBadgeRequests(ownerId) {
    state.supportTickets = (state.supportTickets || []).map((ticket) =>
      ticket.owner_id === ownerId && isVerifiedBadgeRequest(ticket) && ticket.status !== "Resolved"
        ? { ...ticket, status: "Resolved", updated_at: isoDate(new Date()) }
        : ticket
    );
  }

  function reopenVerifiedBadgeRequests(ownerId) {
    state.supportTickets = (state.supportTickets || []).map((ticket) =>
      ticket.owner_id === ownerId && isVerifiedBadgeRequest(ticket) && ticket.status === "Resolved"
        ? { ...ticket, status: "Open", updated_at: isoDate(new Date()) }
        : ticket
    );
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
      title: "Tenant record",
      detail: `${tenant.name} - ${tenantStatusLabel(tenant)} - ${unitById(tenant.unit_id)?.unit_number || "Unassigned room"}.`,
      message: [
        `Tenant: ${tenant.name}`,
        `Status: ${tenantStatusLabel(tenant)}`,
        `Room: ${unitById(tenant.unit_id)?.unit_number || "Unassigned"}`,
        `Phone: ${tenant.phone || "Not recorded"}`,
        `Rent: ${formatMoney(tenant.rent_amount)}`,
        `Move-in date: ${formatActivityDate(tenant.move_in_date)}`,
        `Move-out date: ${tenant.move_out_date ? formatActivityDate(tenant.move_out_date) : "Not recorded"}`,
      ].join("\n"),
      date: tenant.move_in_date,
      name: tenant.name,
    }));
    return [...paymentItems, ...expenseItems, ...tenantItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function buildPlatformActivityItems() {
    const signupItems = landlordUsers().map((user) => {
      const subscription = subscriptionByOwner(user.id);
      const displayStatus = platformAccountDisplayStatus(user, subscription);
      return {
        id: `landlord:${user.id}`,
        category: "Account",
        title: "Landlord account",
        detail: `${user.name} - ${displayStatus} - ${subscription ? subscription.plan : "No plan"}.`,
        message: [
          `Landlord: ${user.name}`,
          `Phone: ${user.phone || "Not recorded"}`,
          `Email: ${user.email || "Not recorded"}`,
          `Stored account status: ${accountStatus(user)}`,
          `Displayed platform status: ${displayStatus}`,
          `Plan: ${subscription ? subscription.plan : "No plan"}`,
          `Subscription status: ${subscription ? billingSubscriptionStatus(subscription) : "No subscription"}`,
          `Payment status: ${subscription?.provider_payment_status || "Not recorded"}`,
          `Joined: ${formatActivityDate(user.created_at)}`,
        ].join("\n"),
        date: user.created_at || new Date().toISOString(),
        name: user.name,
      };
    });
    const ticketItems = (state.supportTickets || []).map((ticket) => {
      const user = userById(ticket.owner_id);
      return {
        id: `ticket:${ticket.id}`,
        category: "Support",
        title: `Support ticket: ${ticket.subject}`,
        detail: `${user ? user.name : "Unknown landlord"} - ${ticket.status} - ${ticket.priority} priority.`,
        message: [
          `Subject: ${ticket.subject}`,
          `Landlord: ${user ? user.name : "Unknown landlord"}`,
          `Priority: ${ticket.priority}`,
          `Status: ${ticket.status}`,
          `Updated: ${formatActivityDate(ticket.updated_at)}`,
          `Note: ${ticket.note || "No support note added."}`,
        ].join("\n"),
        date: ticket.updated_at,
        name: user ? user.name : ticket.subject,
      };
    });
    const billingItems = (state.subscriptions || []).map((subscription) => {
      const user = userById(subscription.owner_id);
      const status = billingSubscriptionStatus(subscription);
      const paymentStatus = subscription.provider_payment_status || "Not recorded";
      return {
        id: `subscription:${subscription.id}`,
        category: "Billing",
        title: `${subscription.plan} subscription`,
        detail: `${user ? user.name : "Unknown landlord"} - ${status} - ${formatMoney(subscription.monthly_fee)}/month.`,
        message: [
          `Landlord: ${user ? user.name : "Unknown landlord"}`,
          `Plan: ${subscription.plan}`,
          `Subscription status: ${status}`,
          `Stored status: ${subscription.status || "Not recorded"}`,
          `Payment status: ${paymentStatus}`,
          `Monthly fee: ${formatMoney(subscription.monthly_fee)}`,
          `Confirmed paid: ${isPaidSubscription(subscription) ? "Yes" : "No"}`,
          `Last payment date: ${subscription.last_payment_date ? formatActivityDate(subscription.last_payment_date) : "Not recorded"}`,
          `Next billing: ${formatActivityDate(subscription.next_billing_date)}`,
          `Provider reference: ${subscription.provider_payment_reference || "Not recorded"}`,
        ].join("\n"),
        date: subscription.last_payment_date || subscription.next_billing_date,
        name: user ? user.name : subscription.plan,
      };
    });
    return [...signupItems, ...ticketItems, ...billingItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function formatActivityDate(value) {
    if (!value) return "Not recorded";
    const date = typeof value === "string" && value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Not recorded";
    return date.toLocaleDateString("en-UG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
      status: isNotificationRead(notification) ? "Read" : "Open",
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
    return (state.subscriptions || []).filter((subscription) =>
      ["Overdue", "Pending"].includes(billingSubscriptionStatus(subscription))
    );
  }

  function newLandlordSignups() {
    return landlordUsers().filter((user) => isCurrentMonth(user.created_at));
  }

  function expiredSubscriptions() {
    return (state.subscriptions || []).filter(isSubscriptionExpired);
  }

  function isSubscriptionExpired(subscription) {
    const status = billingSubscriptionStatus(subscription);
    if (status === "Expired" || status === "Overdue" || status === "Cancelled") return true;
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
    const status = billingSubscriptionStatus(subscription);
    if (!["Active", "Cancelling"].includes(status)) return false;
    const today = new Date();
    const soon = new Date(today);
    soon.setDate(today.getDate() + 14);
    const nextBilling = new Date(`${subscription.next_billing_date}T00:00:00`);
    return nextBilling >= today && nextBilling <= soon;
  }

  function effectiveSubscriptionStatus(subscription) {
    if (!subscription) return "Inactive";
    const status = subscription.status || "Active";
    if (["Cancelled", "Expired", "Paused"].includes(status)) return status;
    if (subscription.cancel_at_period_end) return "Cancelling";
    if (subscription.next_billing_date) {
      const today = stripTime(new Date());
      const nextBilling = new Date(`${subscription.next_billing_date}T00:00:00`);
      if (nextBilling < today) return "Overdue";
    }
    return status;
  }

  function isPaidSubscription(subscription) {
    if (!subscription || subscriptionPlanFee(subscription) <= 0) return false;
    const status = effectiveSubscriptionStatus(subscription);
    if (!["Active", "Cancelling"].includes(status)) return false;
    const paymentStatus = String(subscription.provider_payment_status || "").trim().toLowerCase();
    return ["successful", "manual", "paid", "completed"].includes(paymentStatus);
  }

  function billingSubscriptionStatus(subscription) {
    const status = effectiveSubscriptionStatus(subscription);
    if (["Active", "Cancelling"].includes(status) && subscriptionPlanFee(subscription) > 0 && !isPaidSubscription(subscription)) {
      return "Pending";
    }
    return status;
  }

  function landlordAccessLocked(user = currentUser()) {
    if (!user || user.role !== "landlord") return false;
    const subscription = subscriptionByOwner(user.id);
    if (isPaidSubscription(subscription)) return false;

    if (hasTrialAccess(user, subscription)) {
      return trialHasEnded(user, subscription);
    }

    if (accountStatus(user) === "Pending") return true;
    if (!subscription) return false;

    const status = billingSubscriptionStatus(subscription);
    return (
      ["Pending", "Overdue", "Expired", "Cancelled", "Paused"].includes(status) ||
      (subscriptionPlanFee(subscription) > 0 && status !== "Trial")
    );
  }

  function hasTrialAccess(user, subscription = subscriptionByOwner(user?.id)) {
    return Boolean(
      user &&
        (accountStatus(user) === "Trial" ||
          subscription?.status === "Trial" ||
          subscription?.plan === "Trial" ||
          effectiveSubscriptionStatus(subscription) === "Trial")
    );
  }

  function trialHasEnded(user, subscription = subscriptionByOwner(user?.id)) {
    const endDate = trialEndDateForAccount(user, subscription);
    if (!endDate) return false;
    const trialEnd = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(trialEnd.getTime())) return false;
    return trialEnd <= stripTime(new Date());
  }

  function trialEndDateForAccount(user, subscription = subscriptionByOwner(user?.id)) {
    if (subscription?.next_billing_date) return subscription.next_billing_date;
    const createdDate = String(user?.created_at || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(createdDate) ? addDays(createdDate, TRIAL_DAYS) : "";
  }

  function subscriptionCheckoutOptionLabel(_subscription) {
    return "Landlord chooses on Pesapal";
  }

  function platformAccountDisplayStatus(user, subscription = subscriptionByOwner(user?.id)) {
    const accessStatus = accountStatus(user);
    if (["Suspended", "Inactive"].includes(accessStatus)) return accessStatus;
    if (isPaidSubscription(subscription)) return "Active";
    if (isTrialAccount(user)) return "Trial";
    const subscriptionStatus = billingSubscriptionStatus(subscription);
    if (["Pending", "Overdue", "Expired", "Cancelled", "Paused", "Cancelling"].includes(subscriptionStatus)) return subscriptionStatus;
    return accessStatus === "Active" ? "Pending" : accessStatus;
  }

  function isTrialAccount(user) {
    const subscription = subscriptionByOwner(user.id);
    return accountStatus(user) === "Trial" || subscription?.plan === "Trial" || effectiveSubscriptionStatus(subscription) === "Trial";
  }

  function canEndTrialAccount(user, subscription = subscriptionByOwner(user?.id)) {
    return canStartBillingAccount(user, subscription);
  }

  function canStartBillingAccount(user, subscription = subscriptionByOwner(user?.id)) {
    return Boolean(
      user?.role === "landlord" &&
        !isPaidSubscription(subscription) &&
        (!subscription || isTrialAccount(user) || subscriptionPlanFee(subscription) <= 0)
    );
  }

  function canCollectSubscription(subscription) {
    return Boolean(subscription?.id && subscriptionPlanFee(subscription) > 0 && !isPaidSubscription(subscription));
  }

  function canActivateEndedTrialAccount(user, subscription = subscriptionByOwner(user?.id)) {
    if (!user || user.role !== "landlord" || isPaidSubscription(subscription)) return false;
    const status = billingSubscriptionStatus(subscription);
    return Boolean(
      trialHasEnded(user, subscription) ||
        ["Pending", "Overdue", "Expired", "Cancelled", "Paused"].includes(status)
    );
  }

  function adminBillingActions(user, subscription = subscriptionByOwner(user?.id)) {
    if (!user || user.role !== "landlord") return "";
    const actions = [];
    if (canActivateEndedTrialAccount(user, subscription)) {
      actions.push(`<button class="text-button" data-activate-owner-account="${escapeHtml(user.id)}" type="button">Activate</button>`);
    } else if (canStartBillingAccount(user, subscription)) {
      const label = isTrialAccount(user) ? "End Trial" : "Start Billing";
      actions.push(`<button class="text-button" data-end-owner-trial="${escapeHtml(user.id)}" type="button">${label}</button>`);
    }
    if (canCollectSubscription(subscription)) {
      actions.push(`<button class="text-button" data-subscription-collect="${escapeHtml(subscription.id)}" type="button">Request</button>`);
    }
    return actions.join("");
  }

  function adminBillingRows() {
    const subscriptions = state.subscriptions || [];
    const subscriptionOwnerIds = new Set(subscriptions.map((subscription) => subscription.owner_id).filter(Boolean));
    const missingSubscriptionRows = landlordUsers()
      .filter((user) => !subscriptionOwnerIds.has(user.id))
      .map((user) => ({
        id: "",
        owner_id: user.id,
        plan: "No plan",
        monthly_fee: 0,
        status: accountStatus(user) === "Trial" ? "Trial" : "No subscription",
        last_payment_date: "",
        next_billing_date: "",
        billing_method: "",
        provider_payment_status: "",
        provider_payment_reference: "",
      }));
    return [...subscriptions, ...missingSubscriptionRows];
  }

  function billingDateSortValue(value) {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const time = new Date(`${value}T00:00:00`).getTime();
    return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
  }

  function paidPlanForEndedTrial(subscription) {
    return (
      PACKAGE_OPTIONS.find((option) => option.fee > 0 && option.plan === subscription?.plan) ||
      PACKAGE_OPTIONS.find((option) => option.plan === "Starter") ||
      PACKAGE_OPTIONS.find((option) => option.fee > 0)
    );
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

  function renderIncomeChart(payments, expectedRent = 0) {
    const monthPayments = getCurrentMonthPayments(payments);
    const collected = monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const remaining = Math.max(0, Number(expectedRent || 0) - collected);
    const buckets = currentMonthDayRanges().map((range) => {
      const total = monthPayments
        .filter((payment) => {
          const day = new Date(`${payment.payment_date}T00:00:00`).getDate();
          return day >= range.start && day <= range.end;
        })
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      return { label: `${range.start}-${range.end}`, total };
    });

    return `
      <div class="chart-summary-grid">
        <span><b>Collected</b><strong>${formatMoney(collected)}</strong></span>
        <span><b>Expected</b><strong>${formatMoney(expectedRent)}</strong></span>
        <span><b>Remaining</b><strong>${formatMoney(remaining)}</strong></span>
        <span><b>Payments</b><strong>${monthPayments.length}</strong></span>
      </div>
      ${monthPayments.length ? chartMarkup(buckets, "Rent collected by day range") : `
        <div class="chart-empty-note">
          No rent payments recorded in ${escapeHtml(monthName(new Date()))} yet. Record tenant payments to fill this graph.
        </div>
      `}
    `;
  }

  function renderDashboardMonthReport(scope) {
    if (!ui.dashboardCalendarGrid || !ui.dashboardCalendarSummary) return;

    const report = buildDashboardMonthReport(scope, activeDashboardMonthKey);
    const monthLabel = monthName(report.monthStart);
    const netAfterExpenses = report.collected - report.expensesTotal;
    const collectionRate = report.expectedRent ? Math.round((report.collected / report.expectedRent) * 100) : 0;
    const occupancyNote = report.totalUnits ? `${report.occupiedUnits}/${report.totalUnits} rooms occupied` : "No rooms set up";

    if (ui.dashboardMonthPicker) ui.dashboardMonthPicker.value = activeDashboardMonthKey;
    if (ui.dashboardCalendarMonth) {
      ui.dashboardCalendarMonth.textContent = `${monthLabel} report. ${countLabel(report.monthPayments.length, "payment")} recorded, ${formatMoney(netAfterExpenses)} net after expenses.`;
    }
    if (ui.dashboardCalendarStatus) {
      ui.dashboardCalendarStatus.textContent = calendarStatusForMonth(report.monthStart);
    }
    ui.dashboardCalendarSummary.innerHTML = [
      dashboardCalendarStat("Collected", formatMoney(report.collected), `${collectionRate}% of ${formatMoney(report.expectedRent)}`, "paid"),
      dashboardCalendarStat("Unpaid Rent", formatMoney(report.unpaidRent), countLabel(report.unpaidRows.length, "tenant"), "due"),
      dashboardCalendarStat("Expenses", formatMoney(report.expensesTotal), countLabel(report.monthExpenses.length, "record"), "expense"),
      dashboardCalendarStat("Occupancy", `${report.occupancyRate}%`, occupancyNote, "occupancy"),
    ].join("");

    if (ui.dashboardMonthInsight) {
      ui.dashboardMonthInsight.innerHTML = `
        <div>
          <span>Report Month</span>
          <strong>${escapeHtml(monthLabel)}</strong>
          <small>${formatDate(isoDate(report.monthStart))} - ${formatDate(isoDate(report.monthEnd))}</small>
        </div>
        <div>
          <span>Expected Rent</span>
          <strong>${formatMoney(report.expectedRent)}</strong>
          <small>${countLabel(report.monthRentRows.length, "active tenant")}</small>
        </div>
        <div>
          <span>Net Collection</span>
          <strong>${formatMoney(netAfterExpenses)}</strong>
          <small>Collected minus expenses</small>
        </div>
      `;
    }

    if (ui.dashboardReportPaymentCount) {
      ui.dashboardReportPaymentCount.textContent = countLabel(report.monthPayments.length, "payment");
    }

    if (ui.dashboardReportPayments) {
      ui.dashboardReportPayments.innerHTML =
        report.monthPayments
          .slice()
          .sort((a, b) => (parseDateValue(b.payment_date)?.getTime() || 0) - (parseDateValue(a.payment_date)?.getTime() || 0))
          .map((payment) => dashboardReportPaymentRow(payment, scope))
          .join("") || emptyTableRow(8, `No payments recorded for ${monthLabel}.`);
    }

    renderDashboardSecondaryCalendar(report);
  }

  function renderDashboardSecondaryCalendar(report) {
    const year = report.monthStart.getFullYear();
    const month = report.monthStart.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const today = stripTime(new Date());
    const paymentByDay = dayCountMap(report.monthPayments, "payment_date", report.monthKey);
    const expenseByDay = dayCountMap(report.monthExpenses, "date", report.monthKey);
    const dueByDay = report.monthRentRows.reduce((summary, row) => {
      if (!row.dueDate || row.balance <= 0) return summary;
      incrementMap(summary, row.dueDate.getDate());
      return summary;
    }, new Map());

    const weekdayHeader = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      .map((day) => `<span class="calendar-weekday">${escapeHtml(day)}</span>`)
      .join("");
    const emptyCells = Array.from({ length: firstWeekday }, () => `<span class="calendar-day is-empty" aria-hidden="true"></span>`).join("");
    const dayCells = Array.from({ length: lastDay }, (_, index) => {
      const day = index + 1;
      const date = stripTime(new Date(year, month, day));
      const payments = paymentByDay.get(day) || 0;
      const due = dueByDay.get(day) || 0;
      const dayExpenses = expenseByDay.get(day) || 0;
      const classes = ["calendar-day"];
      if (date < today) classes.push("is-past");
      if (date.getTime() === today.getTime()) classes.push("is-today");
      if (payments) classes.push("has-payment");
      if (due) classes.push("has-due");
      if (dayExpenses) classes.push("has-expense");
      const markers = [
        payments ? `<span class="calendar-dot paid" title="${payments} rent ${payments === 1 ? "payment" : "payments"}"></span>` : "",
        due ? `<span class="calendar-dot due" title="${due} unpaid ${due === 1 ? "tenant" : "tenants"} due"></span>` : "",
        dayExpenses ? `<span class="calendar-dot expense" title="${dayExpenses} ${dayExpenses === 1 ? "expense" : "expenses"}"></span>` : "",
      ].join("");
      const descriptions = [
        date.getTime() === today.getTime() ? "today" : "",
        payments ? countLabel(payments, "rent payment") : "",
        due ? `${countLabel(due, "unpaid tenant")} due` : "",
        dayExpenses ? countLabel(dayExpenses, "expense") : "",
      ].filter(Boolean);
      return `
        <span class="${classes.join(" ")}" aria-label="${escapeHtml(`${formatDate(isoDate(date))}${descriptions.length ? `, ${descriptions.join(", ")}` : ""}`)}">
          <strong>${day}</strong>
          ${markers ? `<span class="calendar-markers" aria-hidden="true">${markers}</span>` : ""}
        </span>
      `;
    }).join("");

    ui.dashboardCalendarGrid.innerHTML = `${weekdayHeader}${emptyCells}${dayCells}`;
  }

  function buildDashboardMonthReport(scope, targetMonthKey) {
    const monthStart = monthDateFromKey(targetMonthKey);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const monthPayments = getMonthPayments(scope.payments || [], targetMonthKey);
    const monthExpenses = getMonthExpenses(scope.expenses || [], targetMonthKey);
    const monthTenants = (scope.tenants || []).filter((tenant) => tenantActiveDuringMonth(tenant, monthStart, monthEnd));
    const monthRentRows = getRentRowsForMonth(monthTenants, targetMonthKey, monthPayments);
    const occupiedUnitIds = new Set(monthTenants.map((tenant) => tenant.unit_id).filter(Boolean));
    const totalUnits = (scope.units || []).length;
    const occupiedUnits = occupiedUnitIds.size;
    const expectedRent = monthRentRows.reduce((sum, row) => sum + Number(row.tenant.rent_amount), 0);
    const collected = monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const expensesTotal = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const unpaidRows = monthRentRows.filter((row) => row.balance > 0);
    const unpaidRent = unpaidRows.reduce((sum, row) => sum + Number(row.balance), 0);

    return {
      monthKey: targetMonthKey,
      monthStart,
      monthEnd,
      monthPayments,
      monthExpenses,
      monthTenants,
      monthRentRows,
      unpaidRows,
      expectedRent,
      collected,
      expensesTotal,
      unpaidRent,
      totalUnits,
      occupiedUnits,
      occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
    };
  }

  function dashboardReportPaymentRow(payment, scope) {
    const tenant = (scope.tenants || []).find((item) => item.id === payment.tenant_id) || tenantById(payment.tenant_id);
    const unit = tenant ? (scope.units || []).find((item) => item.id === tenant.unit_id) || unitById(tenant.unit_id) : null;
    return `
      <tr>
        <td>${formatDate(payment.payment_date)}</td>
        <td>${personCell(tenant ? tenant.name : "Removed tenant", tenant?.phone || payment.reference || payment.payment_method)}</td>
        <td>${escapeHtml(unit ? unit.unit_number : "Unassigned")}</td>
        <td><strong>${formatMoney(payment.amount)}</strong></td>
        <td>${escapeHtml(payment.payment_method || "-")}</td>
        <td>${escapeHtml(payment.reference || "-")}</td>
        <td>${statusPill(payment.verification_status || "Unverified")}</td>
        <td><button class="text-button compact-link-button" data-payment-detail="${escapeHtml(payment.id)}" type="button">Details</button></td>
      </tr>
    `;
  }

  function calendarStatusForMonth(monthStart) {
    const selectedKey = monthKey(monthStart);
    const currentKey = monthKey(new Date());
    if (selectedKey !== currentKey) return `${monthName(monthStart)} calendar`;
    const today = stripTime(new Date());
    const nextMonthStart = stripTime(new Date(today.getFullYear(), today.getMonth() + 1, 1));
    const daysUntilNextMonth = Math.max(0, Math.round((nextMonthStart - today) / 86400000));
    return daysUntilNextMonth === 1 ? "1 day left" : `${daysUntilNextMonth} days left`;
  }

  function getRentRowsForMonth(tenants, targetMonthKey, payments) {
    const today = stripTime(new Date());
    return tenants.map((tenant) => {
      const dueDate = getMonthlyDueDateForMonth(tenant.move_in_date, targetMonthKey);
      const monthlyRent = Number(tenant.rent_amount);
      const paid = monthPaid(tenant.id, payments);
      const balance = Math.max(0, monthlyRent - paid);
      const advance = Math.max(0, paid - monthlyRent);
      const daysUntilDue = Math.round((dueDate - today) / 86400000);
      let status = "Paid";
      if (advance > 0) status = "Advance";
      if (balance > 0 && dueDate < today) status = "Overdue";
      if (balance > 0 && dueDate >= today) status = paid > 0 ? "Partial" : "Due";
      return {
        tenant,
        unit: unitById(tenant.unit_id),
        paid,
        balance,
        advance,
        carryForward: dueDate < today ? balance : 0,
        dueDate,
        daysUntilDue,
        status,
      };
    });
  }

  function getMonthlyDueDateForMonth(moveInDate, targetMonthKey) {
    const monthStart = monthDateFromKey(targetMonthKey);
    const sourceDate = parseDateValue(moveInDate) || monthStart;
    const day = Math.min(sourceDate.getDate(), 28);
    return stripTime(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }

  function monthPaid(tenantId, payments) {
    return (payments || [])
      .filter((payment) => payment.tenant_id === tenantId)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
  }

  function getMonthPayments(payments, targetMonthKey) {
    return (payments || []).filter((payment) => isMonth(payment.payment_date, targetMonthKey));
  }

  function getMonthExpenses(expenses, targetMonthKey) {
    return (expenses || []).filter((expense) => isMonth(expense.date, targetMonthKey));
  }

  function tenantActiveDuringMonth(tenant, monthStart, monthEnd) {
    const moveIn = parseDateValue(tenant.move_in_date) || monthStart;
    const moveOut = parseDateValue(tenant.move_out_date);
    if (moveIn > monthEnd) return false;
    if (moveOut && moveOut < monthStart) return false;
    if (!moveOut && !isActiveTenant(tenant)) return false;
    return true;
  }

  function dashboardCalendarStat(label, value, note, tone) {
    return `
      <article class="dashboard-calendar-stat ${escapeHtml(tone)}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(note)}</small>
      </article>
    `;
  }

  function dayCountMap(records, dateKey, targetMonthKey = activeDashboardMonthKey) {
    return records.reduce((summary, record) => {
      const value = record[dateKey];
      if (!value || !isMonth(value, targetMonthKey)) return summary;
      const date = parseDateValue(value);
      if (!date) return summary;
      incrementMap(summary, date.getDate());
      return summary;
    }, new Map());
  }

  function incrementMap(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  function countLabel(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  function currentMonthDayRanges() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return [
      { start: 1, end: 5 },
      { start: 6, end: 10 },
      { start: 11, end: 15 },
      { start: 16, end: 20 },
      { start: 21, end: 25 },
      { start: 26, end: lastDay },
    ].filter((range) => range.start <= lastDay);
  }

  function renderCaretakerTaskList({ overdueRows, dueSoonRows, vacantUnits }) {
    const taskRows = [
      ...overdueRows.slice(0, 4).map((row) => ({
        id: row.tenant.id,
        type: "tenant",
        title: row.tenant.name,
        meta: `${row.unit ? row.unit.unit_number : "Unassigned"} - ${Math.abs(row.daysUntilDue)} day${Math.abs(row.daysUntilDue) === 1 ? "" : "s"} late`,
        value: formatMoney(row.balance),
      })),
      ...dueSoonRows.slice(0, 4).map((row) => ({
        id: row.tenant.id,
        type: "tenant",
        title: row.tenant.name,
        meta: `${row.unit ? row.unit.unit_number : "Unassigned"} - ${row.daysUntilDue === 0 ? "Due today" : `Due in ${row.daysUntilDue} day${row.daysUntilDue === 1 ? "" : "s"}`}`,
        value: formatMoney(row.balance),
      })),
      ...vacantUnits.slice(0, 3).map((unit) => {
        const property = propertyById(unit.property_id);
        return {
          id: unit.id,
          type: "unit",
          title: unit.unit_number,
          meta: property ? property.property_name : "Assigned property",
          value: "Vacant",
        };
      }),
    ].slice(0, 8);

    if (!taskRows.length) return emptyBlock("No urgent caretaker tasks for your assigned properties.");
    return `
      <div class="compact-list">
        ${taskRows
          .map((task) => `
            <button class="compact-list-item dashboard-action-card" data-${task.type}-detail="${escapeHtml(task.id)}" type="button">
              <span>
                <strong>${escapeHtml(task.title)}</strong>
                <small>${escapeHtml(task.meta)}</small>
              </span>
              <b>${escapeHtml(task.value)}</b>
            </button>
          `)
          .join("")}
      </div>
    `;
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
        .filter((subscription) => subscription.plan === option.plan && isPaidSubscription(subscription))
        .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0),
    }));
    const accountMix = [
      { label: "Paid", total: landlords.filter((user) => isPaidSubscription(subscriptionByOwner(user.id))).length },
      { label: "Trial", total: landlords.filter((user) => isTrialAccount(user)).length },
      { label: "Pend", total: landlords.filter((user) => platformAccountDisplayStatus(user) === "Pending").length },
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
            const height = bucket.total > 0 ? Math.max(5, Math.round((bucket.total / max) * 100)) : 0;
            return `
              <div class="bar-item ${bucket.total > 0 ? "" : "is-zero"}">
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
    const totalMrr = subscriptions.filter(isPaidSubscription).reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const totalOpenTickets = tickets.filter((ticket) => ticket.status !== "Resolved").length;
    const activeAccounts = landlords.filter((user) => isPaidSubscription(subscriptionByOwner(user.id))).length;
    const inactiveAccounts = landlords.filter((user) => accountStatus(user) === "Suspended" || accountStatus(user) === "Inactive").length;
    const trialAccounts = landlords.filter((user) => isTrialAccount(user)).length;

    ui.ownerLandlordCountLabel.textContent = `${landlords.length} landlords`;
    ui.ownerLandlordSummary.innerHTML = [
      ownerSummaryItem("Paid Active Accounts", activeAccounts, "platformPaidAccounts"),
      ownerSummaryItem("Inactive Accounts", inactiveAccounts, "platformInactiveAccounts"),
      ownerSummaryItem("Trial Accounts", trialAccounts, "platformTrialAccounts"),
      ownerSummaryItem("Monthly SaaS Revenue", formatMoney(totalMrr), "platformMonthlyRevenue"),
      ownerSummaryItem("Pending Payments", pendingSubscriptions().length, "platformPendingPayments"),
      ownerSummaryItem("Open Support", totalOpenTickets, "platformOpenSupport"),
    ].join("");

    ui.ownerLandlordTable.innerHTML =
      landlords
        .map((user) => {
          const portfolio = ownerPortfolio(user.id);
          const subscription = subscriptionByOwner(user.id);
          const openTicketCount = tickets.filter((ticket) => ticket.owner_id === user.id && ticket.status !== "Resolved").length;
          const accessStatus = accountStatus(user);
          const status = platformAccountDisplayStatus(user, subscription);
          const nextAction = accessStatus === "Suspended" || accessStatus === "Inactive" ? "Approve" : "Suspend";
          const hasVerifiedBadge = ownerHasVerifiedBadge(user);
          const badgeRequest = verifiedBadgeRequestForOwner(user.id);
          const badgeAction = hasVerifiedBadge ? "Remove Badge" : "Verify";
          const billingActions = adminBillingActions(user, subscription);
          return `
            <tr data-owner-row="${escapeHtml(user.id)}" class="${user.id === highlightedOwnerId ? "row-highlight" : ""}">
              <td>
                <strong>${escapeHtml(user.name)}</strong>
                <small class="table-subtext">${escapeHtml(userContactLabel(user))}</small>
                <small class="table-subtext">${escapeHtml(platformOwnerText(user))}</small>
                <small class="table-subtext">${statusPill(hasVerifiedBadge ? "Verified" : badgeRequest ? "Pending" : "Unverified")}</small>
              </td>
              <td>
                ${escapeHtml(subscription ? subscription.plan : "No plan")}
                <small class="table-subtext">${subscription ? statusPill(billingSubscriptionStatus(subscription)) : ""}</small>
              </td>
              <td>${statusPill(status)}</td>
              <td>${portfolio.properties.length} properties / ${portfolio.units.length} rooms</td>
              <td>
                ${escapeHtml(openTicketCount ? `${openTicketCount} support open` : "No open support")}
                <small class="table-subtext">${subscription ? `Next: ${formatOptionalDate(subscription.next_billing_date)}` : "No subscription"}</small>
              </td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-toggle-account-status="${user.id}" type="button">${nextAction}</button>
                  <button class="text-button" data-cycle-plan="${user.id}" type="button">Package</button>
                  <button class="text-button" data-toggle-verified-badge="${user.id}" type="button">${badgeAction}</button>
                  ${billingActions}
                  <button class="text-button" data-impersonate-landlord="${escapeHtml(user.id)}" type="button">Login As Landlord</button>
                  <button class="text-button" data-admin-reset-user="${user.id}" type="button">Send Reset OTP</button>
                  <button class="danger-button" data-delete-owner-account="${user.id}" type="button">Delete</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No landlord accounts yet.");

  }

  function renderPlatformBilling() {
    const subscriptions = state.subscriptions || [];
    const billingRows = adminBillingRows();
    const billingLandlords = landlordUsers();
    const selectedBillingOwnerId =
      state.billingLandlordFilter && billingLandlords.some((user) => user.id === state.billingLandlordFilter)
        ? state.billingLandlordFilter
        : "all";
    if (state.billingLandlordFilter !== selectedBillingOwnerId) state.billingLandlordFilter = selectedBillingOwnerId;
    const currentMrr = subscriptions.filter(isPaidSubscription).reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const paidThisMonth = subscriptions
      .filter((subscription) => isPaidSubscription(subscription) && isCurrentMonth(subscription.last_payment_date))
      .reduce((sum, subscription) => sum + Number(subscription.monthly_fee), 0);
    const expiring = expiringSubscriptions().length;
    const trials = subscriptions.filter((subscription) => subscription.plan === "Trial" || billingSubscriptionStatus(subscription) === "Trial").length;

    ui.ownerBillingTotalLabel.textContent = formatMoney(currentMrr);
    ui.ownerBillingSummary.innerHTML = [
      ownerSummaryItem("MRR", formatMoney(currentMrr), "billingMrr"),
      ownerSummaryItem("Paid This Month", formatMoney(paidThisMonth), "billingPaidThisMonth"),
      ownerSummaryItem("Pending Payments", pendingSubscriptions().length, "billingPendingPayments"),
      ownerSummaryItem("Expiring Plans", expiring, "billingExpiringPlans"),
      ownerSummaryItem("Trial Accounts", trials, "billingTrialAccounts"),
      ownerSummaryItem("Paid Active Plans", subscriptions.filter(isPaidSubscription).length, "billingPaidActivePlans"),
    ].join("");
    if (ui.ownerBillingLandlordFilter) {
      ui.ownerBillingLandlordFilter.value = selectedBillingOwnerId;
    }

    ui.ownerBillingTable.innerHTML =
      billingRows
        .slice()
        .filter((subscription) => {
          const user = userById(subscription.owner_id);
          const matchesOwner = selectedBillingOwnerId === "all" || subscription.owner_id === selectedBillingOwnerId;
          return (
            matchesOwner &&
            matchesSearch([
              user ? user.name : "",
              user ? userContactLabel(user) : "",
              subscription.plan,
              billingSubscriptionStatus(subscription),
              subscription.monthly_fee,
            ])
          );
        })
        .sort((a, b) => billingDateSortValue(a.next_billing_date) - billingDateSortValue(b.next_billing_date))
        .map((subscription) => {
          const user = userById(subscription.owner_id);
          const baseStatus = billingSubscriptionStatus(subscription);
          const status = isSubscriptionExpiring(subscription) && baseStatus === "Active" ? "Expiring" : baseStatus;
          const cancelLabel = subscription.cancel_at_period_end ? "Resume" : "Cancel";
          const providerNote = subscriptionProviderNote(subscription);
          const billingActions = user ? adminBillingActions(user, subscription) : "";
          return `
            <tr>
              <td>${escapeHtml(user ? user.name : "Unknown landlord")}</td>
              <td>${escapeHtml(subscription.plan)}</td>
              <td>${formatMoney(subscription.monthly_fee)}</td>
              <td>${formatOptionalDate(subscription.last_payment_date)}</td>
              <td>${formatOptionalDate(subscription.next_billing_date)}</td>
              <td>
                ${statusPill(status)}
                ${providerNote ? `<small class="table-subtext">${escapeHtml(providerNote)}</small>` : ""}
              </td>
              <td>
                <div class="button-row">
                  ${billingActions || `<span class="table-subtext">No payment action</span>`}
                  ${
                    subscription.id
                      ? `<button class="text-button" data-subscription-cancel="${escapeHtml(subscription.id)}" type="button">${cancelLabel}</button>`
                      : ""
                  }
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(7, selectedBillingOwnerId === "all" ? "No subscription records yet." : "No subscription records for this landlord.");
  }

  function updateOwnerBillingLandlordFilter() {
    state.billingLandlordFilter = ui.ownerBillingLandlordFilter?.value || "all";
    state.searchTerm = "";
    if (ui.globalSearch) ui.globalSearch.value = "";
    saveState();
    renderPlatformBilling();
  }

  function subscriptionProviderNote(subscription) {
    const parts = [];
    if (subscription.billing_method) parts.push(subscription.billing_method);
    if (subscription.provider_payment_status) parts.push(`${paymentProviderLabel(subscription.payment_provider)} ${subscription.provider_payment_status}`);
    if (subscription.provider_payment_reference) parts.push(subscription.provider_payment_reference);
    return parts.join(" - ");
  }

  function paymentProviderLabel(provider) {
    return String(provider || "").toLowerCase() === "flutterwave" ? "Flutterwave" : "Pesapal";
  }

  function supportTicketStatuses() {
    return ["Open", "In Progress", "Resolved", "Closed"];
  }

  function ticketOwnerId(ticket) {
    return ticket?.landlord_id || ticket?.owner_id || "";
  }

  function ticketDescription(ticket) {
    return ticket?.description || ticket?.note || "";
  }

  function isOpenSupportTicket(ticket) {
    return !["Resolved", "Closed"].includes(String(ticket?.status || "Open"));
  }

  function isNotificationRead(notification) {
    return Boolean(notification?.is_read ?? notification?.read);
  }

  function supportTicketFilters() {
    const saved = state.supportTicketFilters && typeof state.supportTicketFilters === "object" ? state.supportTicketFilters : {};
    return {
      search: String(saved.search || ""),
      owner: saved.owner || "all",
      status: saved.status || "all",
      priority: saved.priority || "all",
    };
  }

  function updateSupportTicketFilters() {
    state.supportTicketFilters = {
      search: ui.supportTicketSearch?.value || "",
      owner: ui.supportTicketOwnerFilter?.value || "all",
      status: ui.supportTicketStatusFilter?.value || "all",
      priority: ui.supportTicketPriorityFilter?.value || "all",
    };
    saveState();
    renderPlatformSupport();
  }

  function supportTicketMatchesFilters(ticket, filters = supportTicketFilters()) {
    const ownerId = ticketOwnerId(ticket);
    const owner = userById(ownerId);
    const localSearch = String(filters.search || "").trim().toLowerCase();
    const values = [ticket.subject, ticket.priority, ticket.status, ticket.description, ticket.note, ticket.admin_note, owner ? owner.name : ""];
    const matchesLocalSearch =
      !localSearch ||
      values
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(localSearch);
    return (
      matchesLocalSearch &&
      (filters.owner === "all" || ownerId === filters.owner) &&
      (filters.status === "all" || String(ticket.status || "Open") === filters.status) &&
      (filters.priority === "all" || String(ticket.priority || "Medium") === filters.priority) &&
      matchesSearch(values)
    );
  }

  function ticketMessages(ticketId) {
    return (state.supportMessages || [])
      .filter((message) => message.ticket_id === ticketId)
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  function ticketMessageHistoryMarkup(ticketId) {
    const messages = ticketMessages(ticketId);
    if (!messages.length) return "";
    return `
      <div class="ticket-response-history">
        ${messages
          .map(
            (message) => `
              <div>
                <strong>${escapeHtml(message.title || "Support response")}</strong>
                <span>${escapeHtml(message.message)}</span>
                <small>${escapeHtml(timeAgo(message.created_at))}</small>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function setSupportCenterTab(tab = "tickets") {
    activeSupportTab = ["tickets", "corrections", "notifications", "audit", "health"].includes(tab) ? tab : "tickets";
    document.querySelectorAll("[data-support-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.supportTab === activeSupportTab);
    });
    document.querySelectorAll("[data-support-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.supportPanel === activeSupportTab);
    });
  }

  function renderPlatformSupport() {
    const tickets = state.supportTickets || [];
    const openTickets = tickets.filter(isOpenSupportTicket);
    const notifications = state.notifications || [];
    const unreadNotifications = notifications.filter((notification) => !isNotificationRead(notification)).length;
    const subscriptions = state.subscriptions || [];
    const activeSubscriptions = subscriptions.filter(isPaidSubscription);
    const monthlyRevenue = activeSubscriptions.reduce((sum, subscription) => sum + subscriptionPlanFee(subscription), 0);
    const failedPayments = subscriptions.filter((subscription) =>
      ["failed", "cancelled", "expired"].includes(String(subscription.provider_payment_status || "").toLowerCase()) ||
      ["Overdue", "Pending"].includes(billingSubscriptionStatus(subscription))
    );
    const filters = supportTicketFilters();
    const filteredTickets = tickets.filter((ticket) => supportTicketMatchesFilters(ticket, filters));
    const filteredOpenTickets = filteredTickets.filter(isOpenSupportTicket);
    const storage = estimateStorageUsage();
    const systemRows = buildSystemMonitorRows();
    if (ui.supportTicketSearch) ui.supportTicketSearch.value = filters.search;
    if (ui.supportTicketOwnerFilter) ui.supportTicketOwnerFilter.value = filters.owner;
    if (ui.supportTicketStatusFilter) ui.supportTicketStatusFilter.value = filters.status;
    if (ui.supportTicketPriorityFilter) ui.supportTicketPriorityFilter.value = filters.priority;
    ui.systemStorageLabel.textContent = supabaseReady ? "Supabase active" : "Browser fallback";
    ui.systemStorageLabel.className = `pill ${supabaseReady ? "success" : "warning"}`;
    ui.systemMonitorSummary.innerHTML = [
      ownerSummaryItem("Total Landlords", landlordUsers().length, "adminTotalLandlords"),
      ownerSummaryItem("Active Subscriptions", activeSubscriptions.length, "adminActiveSubscriptions"),
      ownerSummaryItem("Monthly Revenue", formatMoney(monthlyRevenue), "adminMonthlyRevenue"),
      ownerSummaryItem("Open Tickets", openTickets.length, "systemOpenRequests"),
      ownerSummaryItem("Failed Payments", failedPayments.length, "billingPendingPayments"),
      ownerSummaryItem("Unread Notifications", unreadNotifications, "systemUnreadAlerts"),
    ].join("");
    if (ui.supportNotificationCount) ui.supportNotificationCount.textContent = `${notifications.length} notifications`;
    if (ui.supportNotificationList) {
      ui.supportNotificationList.innerHTML =
        notifications
          .slice()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map((notification) => {
            const user = notification.user_id ? userById(notification.user_id) : null;
            return `
              <article class="support-card">
                <div class="support-card-header">
                  <div class="support-card-title">
                    <strong>${escapeHtml(notification.title)}</strong>
                    <small>${escapeHtml(notificationTypeLabel(notification.type))} - ${escapeHtml(user ? user.name : "Platform")} - ${timeAgo(notification.created_at)}</small>
                  </div>
                  ${statusPill(isNotificationRead(notification) ? "Read" : "Open")}
                </div>
                <p class="support-note">${escapeHtml(notification.message)}</p>
              </article>
            `;
          })
          .join("") || emptyBlock("No notifications yet.");
    }
    if (ui.auditLogCount) ui.auditLogCount.textContent = `${(state.auditLogs || []).length} logs`;
    if (ui.auditLogList) {
      ui.auditLogList.innerHTML =
        (state.auditLogs || [])
          .slice()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map((log) => {
            const admin = userById(log.admin_id);
            const landlord = userById(log.landlord_id);
            return `
              <article class="support-card">
                <div class="support-card-header">
                  <div class="support-card-title">
                    <strong>${escapeHtml(log.action)}</strong>
                    <small>${escapeHtml(admin ? admin.name : "Super Admin")} - ${escapeHtml(landlord ? landlord.name : "Platform")} - ${timeAgo(log.created_at)}</small>
                  </div>
                  ${statusPill("Audit")}
                </div>
                <p class="support-note">${escapeHtml(log.old_value || "No previous value")}</p>
                <p class="support-note">${escapeHtml(log.new_value || "No new value")}</p>
              </article>
            `;
          })
          .join("") || emptyBlock("No audit logs yet.");
    }
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

    ui.supportTicketCount.textContent = `${filteredOpenTickets.length} open`;
    ui.supportTicketList.innerHTML =
      filteredTickets
        .slice()
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .map((ticket) => {
          const user = userById(ticketOwnerId(ticket));
          return `
            <article class="support-card" data-ticket-card="${escapeHtml(ticket.id)}">
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
              <p class="support-note">${escapeHtml(ticketDescription(ticket) || "No support description added.")}</p>
              ${ticket.admin_note ? `<p class="support-note"><strong>Internal:</strong> ${escapeHtml(ticket.admin_note)}</p>` : ""}
              ${ticketMessageHistoryMarkup(ticket.id)}
              <div class="split-fields">
                <label>
                  Status
                  <select class="ticket-status-select">
                    ${supportTicketStatuses()
                      .map((status) => `<option value="${escapeHtml(status)}" ${ticket.status === status ? "selected" : ""}>${escapeHtml(status)}</option>`)
                      .join("")}
                  </select>
                </label>
                <label>
                  Internal note
                  <input class="ticket-admin-note" value="${escapeHtml(ticket.admin_note || "")}" placeholder="Private support note" />
                </label>
              </div>
              <label>
                Response to landlord
                <textarea class="ticket-response-message" rows="2" placeholder="Optional response to send to landlord"></textarea>
              </label>
              <div class="button-row">
                <button class="text-button" data-impersonate-landlord="${escapeHtml(ticketOwnerId(ticket))}" type="button">Open Account</button>
                <button class="primary-button" data-update-ticket="${escapeHtml(ticket.id)}" type="button">Update Ticket</button>
              </div>
            </article>
          `;
        })
        .join("") || emptyBlock("No support tickets match these filters.");
    setSupportCenterTab(activeSupportTab);
    syncBackendSupportControls(false);
  }

  function renderPlatformMessages() {
    if (!isSaasOwner() || !ui.adminMessageList) return;
    const messages = state.supportMessages || [];
    ui.adminMessageCount.textContent = `${messages.length} sent`;
    ui.adminMessageList.innerHTML =
      messages
        .slice()
        .filter((message) => {
          const user = userById(message.landlord_id || message.user_id);
          return matchesSearch([message.title, message.message, message.template, user ? user.name : ""]);
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((message) => {
          const user = userById(message.landlord_id || message.user_id);
          return `
            <article class="support-card">
              <div class="support-card-header">
                <div class="support-card-title">
                  <strong>${escapeHtml(message.title)}</strong>
                  <small>${escapeHtml(user ? user.name : "Unknown landlord")} - ${timeAgo(message.created_at)}</small>
                </div>
                ${statusPill(message.template ? templateLabel(message.template) : "Custom")}
              </div>
              <p class="support-note">${escapeHtml(message.message)}</p>
            </article>
          `;
        })
        .join("") || emptyBlock("No landlord messages yet.");
  }

  function renderPlatformReports() {
    if (!ui.platformReportSummary || !isSaasOwner()) return;
    const tickets = state.supportTickets || [];
    const auditLogs = state.auditLogs || [];
    const messages = state.supportMessages || [];
    ui.platformReportSummary.innerHTML = [
      ownerSummaryItem("Landlords", landlordUsers().length, "adminTotalLandlords"),
      ownerSummaryItem("Open Tickets", tickets.filter(isOpenSupportTicket).length, "systemOpenRequests"),
      ownerSummaryItem("Corrections", auditLogs.filter((log) => /correction|corrected|update/i.test(log.action)).length, "systemBugReports"),
      ownerSummaryItem("Messages Sent", messages.length, "systemNotifications"),
      ownerSummaryItem("Unread Notifications", (state.notifications || []).filter((notification) => !isNotificationRead(notification)).length, "systemUnreadAlerts"),
      ownerSummaryItem("Storage Used", estimateStorageUsage().label, "systemStorage"),
    ].join("");
  }

  function syncBackendSupportControls(resetRecord) {
    if (!ui.backendSupportOwner || !isSaasOwner()) return;
    const ownerId = ui.backendSupportOwner.value || landlordUsers()[0]?.id || "";
    const type = ui.backendSupportType?.value || "account";
    const records = backendSupportRecords(ownerId, type);
    const previousRecordId = resetRecord ? "" : ui.backendSupportRecord.value;
    ui.backendSupportRecord.innerHTML =
      records.map((record) => `<option value="${escapeHtml(record.id)}">${escapeHtml(backendSupportRecordLabel(type, record))}</option>`).join("") ||
      '<option value="">No records available</option>';
    if (previousRecordId && records.some((record) => record.id === previousRecordId)) {
      ui.backendSupportRecord.value = previousRecordId;
    }
    syncBackendSupportActions(resetRecord);
  }

  function syncBackendSupportActions(resetAction) {
    if (!ui.backendSupportAction) return;
    const type = ui.backendSupportType?.value || "account";
    const actions = backendSupportActions(type);
    const previousActionId = resetAction ? "" : ui.backendSupportAction.value;
    ui.backendSupportAction.innerHTML = actions
      .map((action) => `<option value="${escapeHtml(action.id)}">${escapeHtml(action.label)}</option>`)
      .join("");
    if (previousActionId && actions.some((action) => action.id === previousActionId)) {
      ui.backendSupportAction.value = previousActionId;
    }
    syncBackendSupportValue();
  }

  function syncBackendSupportValue() {
    if (!ui.backendSupportValue || !ui.backendSupportPreview) return;
    const type = ui.backendSupportType?.value || "account";
    const record = backendSupportSelectedRecord();
    const action = backendSupportSelectedAction();
    const needsValue = action && !action.fixedValue && action.input !== "none";
    ui.backendSupportValue.disabled = !needsValue;
    ui.backendSupportValue.readOnly = !needsValue;
    ui.backendSupportValue.type = needsValue ? backendSupportInputType(action) : "text";
    ui.backendSupportValue.placeholder = needsValue ? action.placeholder || "Enter corrected value" : "No manual value needed";
    ui.backendSupportValue.value = needsValue ? backendSupportCurrentValue(type, record, action) : action?.valueLabel || action?.fixedValue || "";
    ui.backendSupportPreview.textContent = record && action
      ? `${backendSupportTypeLabel(type)}: ${backendSupportRecordLabel(type, record)}. ${action.label}.`
      : "Choose a landlord and record to start a correction.";
  }

  function backendSupportInputType(action) {
    return ["number", "date", "text"].includes(action?.input) ? action.input : "text";
  }

  function backendSupportRecords(ownerId, type) {
    const owner = userById(ownerId);
    const portfolio = ownerPortfolio(ownerId);
    if (type === "account") return [owner, ...staffUsersForOwner(ownerId)].filter(Boolean);
    if (type === "property") return portfolio.properties;
    if (type === "unit") return portfolio.units;
    if (type === "tenant") return portfolio.tenants;
    if (type === "payment") return portfolio.payments;
    if (type === "expense") return portfolio.expenses;
    if (type === "subscription") return (state.subscriptions || []).filter((subscription) => subscription.owner_id === ownerId);
    return [];
  }

  function backendSupportActions(type) {
    const number = "number";
    const date = "date";
    const text = "text";
    const actions = {
      account: [
        fixedAction("account_status", "Set account Active", "Active"),
        fixedAction("account_status", "Set account Pending", "Pending"),
        fixedAction("account_status", "Set account Suspended", "Suspended"),
        fixedAction("account_status", "Set account Trial", "Trial"),
      ],
      property: [
        fieldAction("property_name", "Correct property name", text),
        fieldAction("location", "Correct location", text),
        fieldAction("property_type", "Correct property type", text),
      ],
      unit: [
        fieldAction("unit_number", "Correct room/shop name", text),
        fieldAction("rent_amount", "Correct rent amount", number),
        fixedAction("status", "Mark room vacant", "vacant"),
        fixedAction("status", "Mark room occupied", "occupied"),
        fixedAction("status", "Mark room maintenance", "maintenance"),
        fixedAction("listing_published", "Publish vacancy", true, "Published"),
        fixedAction("listing_published", "Unpublish vacancy", false, "Unpublished"),
        { id: "sync_unit_status", label: "Sync room status from active tenants", input: "none" },
      ],
      tenant: [
        fieldAction("name", "Correct tenant name", text),
        fieldAction("phone", "Correct phone", text),
        fieldAction("national_id", "Correct national ID", text),
        { id: "correct_tenant_balance", label: "Correct current balance", input: number, placeholder: "Enter current balance" },
        fieldAction("rent_amount", "Correct tenant rent", number),
        fieldAction("deposit_paid", "Correct deposit paid", number),
        fieldAction("move_in_date", "Correct move-in date", date),
        fixedAction("status", "Mark tenant active", "active", "active"),
        fixedAction("status", "Mark tenant moved out", "moved_out", "moved out"),
        { id: "recover_tenant", label: "Recover moved-out tenant", input: "none" },
      ],
      payment: [
        fieldAction("amount", "Edit payment amount", number),
        fieldAction("payment_date", "Correct payment date", date),
        fieldAction("payment_method", "Correct payment method", text),
        fieldAction("reference", "Correct reference", text),
        fieldAction("payment_proof", "Correct proof note", text),
        { id: "reverse_payment", label: "Reverse payment", input: "none" },
        { id: "reassign_payment", label: "Reassign payment", input: "tenant", placeholder: "Tenant name, phone, or ID" },
        fixedAction("verification_status", "Mark payment Verified", "Verified"),
        fixedAction("verification_status", "Mark payment Unverified", "Unverified"),
        fixedAction("verification_status", "Mark payment Disputed", "Disputed"),
        { id: "recalculate_balance", label: "Recalculate tenant payment balances", input: "none" },
      ],
      expense: [
        fieldAction("type", "Correct expense type", text),
        fieldAction("amount", "Correct expense amount", number),
        fieldAction("date", "Correct expense date", date),
      ],
      subscription: [
        fixedAction("plan", "Set Starter plan", "Starter"),
        fixedAction("plan", "Set Professional plan", "Professional"),
        fixedAction("plan", "Set Enterprise plan", "Enterprise"),
        fixedAction("status", "Activate subscription", "Active"),
        fixedAction("status", "Suspend subscription", "Paused", "Suspended"),
        fixedAction("status", "Set subscription Pending", "Pending"),
        fixedAction("status", "Set subscription Overdue", "Overdue"),
        fixedAction("status", "Set subscription Cancelled", "Cancelled"),
        { id: "extend_subscription_7", label: "Extend subscription by 7 days", input: "none", days: 7 },
        { id: "extend_subscription_30", label: "Extend subscription by 30 days", input: "none", days: 30 },
        fieldAction("next_billing_date", "Correct next billing date", date),
        fieldAction("last_payment_date", "Correct last paid date", date),
      ],
    };
    return actions[type] || [];
  }

  function fieldAction(field, label, input) {
    return { id: field, field, label, input, placeholder: input === "number" ? "Enter amount" : "Enter corrected value" };
  }

  function fixedAction(field, label, fixedValue, valueLabel = fixedValue) {
    return { id: `${field}:${String(fixedValue)}`, field, label, fixedValue, valueLabel: String(valueLabel), input: "none" };
  }

  function backendSupportSelectedRecord() {
    const type = ui.backendSupportType?.value || "account";
    const id = ui.backendSupportRecord?.value || "";
    return backendSupportRecords(ui.backendSupportOwner?.value || "", type).find((record) => record.id === id) || null;
  }

  function backendSupportSelectedAction() {
    const type = ui.backendSupportType?.value || "account";
    const id = ui.backendSupportAction?.value || "";
    return backendSupportActions(type).find((action) => action.id === id) || null;
  }

  function backendSupportCurrentValue(type, record, action) {
    if (!record || !action) return "";
    if (action.id === "correct_tenant_balance") return getRentRows([record])[0]?.balance ?? 0;
    if (action.id === "reassign_payment") {
      const tenant = tenantById(record.tenant_id);
      return tenant ? `${tenant.name} - ${tenant.phone}` : "";
    }
    if (!action.field) return "";
    if (type === "subscription" && action.field === "plan") return record.plan || "";
    return record[action.field] ?? "";
  }

  function backendSupportRecordLabel(type, record) {
    if (!record) return "Unknown record";
    if (type === "account") return `${record.name} - ${roleLabel(record.role)} - ${accountStatus(record)}`;
    if (type === "property") return `${record.property_name} - ${record.location || "No location"}`;
    if (type === "unit") return `${record.unit_number} - ${record.status} - ${formatMoney(record.rent_amount)}`;
    if (type === "tenant") return `${record.name} - ${tenantStatusLabel(record)} - ${formatMoney(record.rent_amount)}`;
    if (type === "payment") {
      const tenant = tenantById(record.tenant_id);
      return `${tenant ? tenant.name : "Removed tenant"} - ${formatMoney(record.amount)} - ${formatOptionalDate(record.payment_date)}`;
    }
    if (type === "expense") return `${record.type} - ${formatMoney(record.amount)} - ${formatOptionalDate(record.date)}`;
    if (type === "subscription") return `${record.plan} - ${billingSubscriptionStatus(record)} - ${formatMoney(subscriptionPlanFee(record))}`;
    return record.id;
  }

  function backendSupportTypeLabel(type) {
    return {
      account: "Account",
      property: "Property",
      unit: "Room / Shop",
      tenant: "Tenant",
      payment: "Payment",
      expense: "Expense",
      subscription: "Subscription",
    }[type] || "Record";
  }

  function applyBackendSupportCorrection(event) {
    event.preventDefault();
    if (!isSaasOwner()) {
      showToast("Only the super admin can apply backend corrections.");
      return;
    }
    const ownerId = ui.backendSupportOwner.value;
    const type = ui.backendSupportType.value;
    const record = backendSupportSelectedRecord();
    const action = backendSupportSelectedAction();
    const owner = userById(ownerId);
    if (!owner || !record || !action) {
      showToast("Choose a landlord, record, and correction first.");
      return;
    }

    const beforeLabel = backendSupportRecordLabel(type, record);
    const beforeValue = backendSupportAuditValue(type, record, action);
    const value = backendSupportCorrectionValue(action);
    if (value.invalid) {
      showToast(value.message);
      return;
    }
    const applied = applyBackendSupportChange(type, record.id, action, value.value);
    if (!applied) {
      showToast("Could not apply that correction.");
      return;
    }

    const afterRecord = backendSupportRecords(ownerId, type).find((item) => item.id === record.id) || record;
    const afterLabel = backendSupportRecordLabel(type, afterRecord);
    const afterValue = backendSupportAuditValue(type, afterRecord, action);
    const note = ui.backendSupportNote.value.trim();
    const actionValue = backendSupportCorrectionDisplayValue(action, value);
    addAuditLog({
      landlord_id: ownerId,
      action: `Super Admin corrected ${backendSupportTypeLabel(type).toLowerCase()}: ${action.label}`,
      old_value: beforeValue || beforeLabel,
      new_value: afterValue || afterLabel,
    });
    state.supportTickets = state.supportTickets || [];
    state.supportTickets.push({
      id: makeId("support"),
      owner_id: ownerId,
      landlord_id: ownerId,
      subject: `Backend correction: ${backendSupportTypeLabel(type)}`,
      description: note || `${action.label}${actionValue !== undefined && actionValue !== "" ? ` -> ${actionValue}` : ""}.`,
      priority: "Medium",
      status: "Resolved",
      note: [
        `${action.label}${actionValue !== undefined && actionValue !== "" ? ` -> ${actionValue}` : ""}.`,
        `Before: ${beforeLabel}.`,
        `After: ${afterLabel}.`,
        note ? `Reason: ${note}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      admin_note: note,
      created_at: new Date().toISOString(),
      updated_at: isoDate(new Date()),
      resolved_at: new Date().toISOString(),
    });
    addNotification({
      user_id: SUPER_ADMIN_USER_ID,
      type: "support",
      title: "Backend correction applied",
      message: `${owner.name}: ${action.label}. ${note || "No note added."}`,
    });

    ui.backendSupportNote.value = "";
    saveState();
    flushPendingSupabaseSave();
    renderAll();
    showToast("Correction applied.");
  }

  function backendSupportCorrectionValue(action) {
    if (action.fixedValue !== undefined) return { value: action.fixedValue };
    if (action.input === "none") return { value: undefined };
    const raw = String(ui.backendSupportValue.value || "").trim();
    if (!raw) return { invalid: true, message: "Enter the corrected value." };
    if (action.input === "number") {
      const number = Number(raw);
      if (!Number.isFinite(number) || number < 0) return { invalid: true, message: "Enter a valid amount." };
      if (action.id === "correct_tenant_balance") {
        const tenant = backendSupportSelectedRecord();
        if (tenant && number > Number(tenant.rent_amount || 0)) {
          return { invalid: true, message: "Balance cannot be higher than the tenant's monthly rent." };
        }
      }
      return { value: number };
    }
    if (action.input === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return { invalid: true, message: "Use a valid date." };
    }
    if (action.input === "tenant") {
      const ownerId = ui.backendSupportOwner?.value || "";
      const query = raw.toLowerCase();
      const tenant = ownerPortfolio(ownerId).tenants.find((item) =>
        [item.id, item.name, item.phone, item.national_id]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value === query || value.includes(query))
      );
      if (!tenant) return { invalid: true, message: "No tenant matched that name, phone, or ID." };
      return { value: tenant.id, label: `${tenant.name} - ${tenant.phone}` };
    }
    return { value: raw };
  }

  function backendSupportCorrectionDisplayValue(action, value) {
    if (value?.label) return value.label;
    if (action.fixedValue !== undefined) return action.valueLabel;
    if (value?.value === undefined || value?.value === "") return "";
    return value.value;
  }

  function backendSupportAuditValue(type, record, action) {
    if (!record || !action) return "";
    if (action.id === "correct_tenant_balance") {
      const balance = getRentRows([record])[0]?.balance ?? 0;
      return `Current balance ${formatMoney(balance)}`;
    }
    if (action.id === "reverse_payment") {
      return `${formatMoney(record.amount)} / ${record.verification_status || "Unverified"} / ${record.reference || "No reference"}`;
    }
    if (action.id === "reassign_payment") {
      const tenant = tenantById(record.tenant_id);
      return tenant ? `${tenant.name} / ${tenant.phone}` : record.tenant_id || "Unassigned";
    }
    if (action.id?.startsWith("extend_subscription_")) {
      return `Next billing ${formatOptionalDate(record.next_billing_date)}`;
    }
    if (action.field) {
      const value = record[action.field];
      if (action.input === "number") return formatMoney(value);
      if (action.input === "date") return formatOptionalDate(value);
      return String(value ?? "");
    }
    return backendSupportRecordLabel(type, record);
  }

  function applyBackendSupportChange(type, recordId, action, value) {
    if (type === "account") {
      state.users = state.users.map((user) => (user.id === recordId ? { ...user, [action.field]: value } : user));
      return true;
    }
    if (type === "property") {
      state.properties = state.properties.map((property) => (property.id === recordId ? { ...property, [action.field]: value } : property));
      return true;
    }
    if (type === "unit") {
      if (action.id === "sync_unit_status") {
        syncUnitStatusFromTenants(recordId);
        return true;
      }
      state.units = state.units.map((unit) =>
        unit.id === recordId
          ? {
              ...unit,
              [action.field]: value,
              listing_published: action.field === "status" && value !== "vacant" ? false : action.field === "listing_published" ? Boolean(value) : unit.listing_published,
            }
          : unit
      );
      return true;
    }
    if (type === "tenant") {
      if (action.id === "correct_tenant_balance") {
        correctTenantCurrentBalance(recordId, value);
        return true;
      }
      if (action.id === "recover_tenant") {
        recoverTenantRecord(recordId);
        return true;
      }
      state.tenants = state.tenants.map((tenant) =>
        tenant.id === recordId
          ? {
              ...tenant,
              [action.field]: value,
              move_out_date:
                action.field === "status" && value === "active"
                  ? ""
                  : action.field === "status" && value === "moved_out"
                    ? tenant.move_out_date || isoDate(new Date())
                    : tenant.move_out_date,
              move_out_balance: action.field === "status" && value === "active" ? 0 : tenant.move_out_balance,
              move_out_damages: action.field === "status" && value === "active" ? 0 : tenant.move_out_damages,
              move_out_refund: action.field === "status" && value === "active" ? 0 : tenant.move_out_refund,
            }
          : tenant
      );
      const tenant = tenantById(recordId);
      if (tenant?.unit_id) syncUnitStatusFromTenants(tenant.unit_id);
      return true;
    }
    if (type === "payment") {
      if (action.id === "reverse_payment") {
        const payment = state.payments.find((item) => item.id === recordId);
        if (!payment) return false;
        state.payments = state.payments.map((item) =>
          item.id === recordId
            ? {
                ...item,
                amount: 0,
                balance: tenantById(item.tenant_id)?.rent_amount || item.balance || 0,
                verification_status: "Reversed",
                payment_proof: item.payment_proof || "Reversed by Super Admin",
              }
            : item
        );
        recalculateTenantPaymentBalances(payment.tenant_id);
        return true;
      }
      if (action.id === "reassign_payment") {
        const payment = state.payments.find((item) => item.id === recordId);
        if (!payment || !tenantById(value)) return false;
        const previousTenantId = payment.tenant_id;
        state.payments = state.payments.map((item) => (item.id === recordId ? { ...item, tenant_id: value } : item));
        recalculateTenantPaymentBalances(previousTenantId);
        recalculateTenantPaymentBalances(value);
        return true;
      }
      if (action.id !== "recalculate_balance") {
        state.payments = state.payments.map((payment) => (payment.id === recordId ? { ...payment, [action.field]: value } : payment));
      }
      const payment = state.payments.find((item) => item.id === recordId);
      if (payment?.tenant_id) recalculateTenantPaymentBalances(payment.tenant_id);
      return true;
    }
    if (type === "expense") {
      state.expenses = state.expenses.map((expense) => (expense.id === recordId ? { ...expense, [action.field]: value } : expense));
      return true;
    }
    if (type === "subscription") {
      if (action.id?.startsWith("extend_subscription_")) {
        state.subscriptions = state.subscriptions.map((subscription) => {
          if (subscription.id !== recordId) return subscription;
          const startDate = subscription.next_billing_date || isoDate(new Date());
          return {
            ...subscription,
            status: "Active",
            provider_payment_status: subscription.provider_payment_status || "Manual",
            next_billing_date: addDays(startDate, Number(action.days || 0)),
            grace_period_end: addDays(startDate, Number(action.days || 0)),
          };
        });
        const subscription = state.subscriptions.find((item) => item.id === recordId);
        if (subscription?.owner_id) {
          state.users = state.users.map((user) => (user.id === subscription.owner_id ? { ...user, account_status: "Active" } : user));
        }
        return true;
      }
      state.subscriptions = state.subscriptions.map((subscription) => {
        if (subscription.id !== recordId) return subscription;
        const next = { ...subscription, [action.field]: value };
        if (action.field === "plan") next.monthly_fee = packageFee(value) || subscription.monthly_fee;
        if (action.field === "status" && value === "Active") next.provider_payment_status = next.provider_payment_status || "Manual";
        return next;
      });
      const subscription = state.subscriptions.find((item) => item.id === recordId);
      if (subscription?.owner_id && action.field === "status") {
        state.users = state.users.map((user) =>
          user.id === subscription.owner_id
            ? { ...user, account_status: value === "Active" ? "Active" : ["Pending", "Overdue", "Paused", "Cancelled"].includes(value) ? "Pending" : user.account_status }
            : user
        );
      }
      return true;
    }
    return false;
  }

  function recoverTenantRecord(tenantId) {
    state.tenants = state.tenants.map((tenant) =>
      tenant.id === tenantId
        ? {
            ...tenant,
            status: "active",
            move_out_date: "",
            move_out_balance: 0,
            move_out_damages: 0,
            move_out_refund: 0,
            move_out_note: "",
          }
        : tenant
    );
    const tenant = tenantById(tenantId);
    if (tenant?.unit_id) syncUnitStatusFromTenants(tenant.unit_id);
  }

  function syncUnitStatusFromTenants(unitId) {
    const occupied = (state.tenants || []).some((tenant) => tenant.unit_id === unitId && isActiveTenant(tenant));
    state.units = state.units.map((unit) =>
      unit.id === unitId
        ? {
            ...unit,
            status: occupied ? "occupied" : "vacant",
            listing_published: occupied ? false : unit.listing_published,
          }
        : unit
    );
  }

  function recalculateTenantPaymentBalances(tenantId) {
    const tenant = tenantById(tenantId);
    if (!tenant) return;
    const balanceById = new Map();
    const paymentsByMonth = state.payments
      .filter((payment) => payment.tenant_id === tenantId)
      .reduce((groups, payment) => {
        const key = String(payment.payment_date || "").slice(0, 7) || "unknown";
        groups.set(key, [...(groups.get(key) || []), payment]);
        return groups;
      }, new Map());
    paymentsByMonth.forEach((payments) => {
      let paid = 0;
      payments
        .slice()
        .sort((a, b) => new Date(`${a.payment_date}T00:00:00`) - new Date(`${b.payment_date}T00:00:00`) || String(a.id).localeCompare(String(b.id)))
        .forEach((payment) => {
        paid += Number(payment.amount || 0);
        balanceById.set(payment.id, Math.max(0, Number(tenant.rent_amount || 0) - paid));
      });
    });
    state.payments = state.payments.map((payment) => (balanceById.has(payment.id) ? { ...payment, balance: balanceById.get(payment.id) } : payment));
  }

  function correctTenantCurrentBalance(tenantId, desiredBalance) {
    const tenant = tenantById(tenantId);
    if (!tenant) return;

    const targetPaid = Math.max(0, Number(tenant.rent_amount || 0) - Number(desiredBalance || 0));
    const monthlyPayments = state.payments
      .filter((payment) => payment.tenant_id === tenantId && isCurrentMonth(payment.payment_date))
      .sort((a, b) => new Date(`${a.payment_date}T00:00:00`) - new Date(`${b.payment_date}T00:00:00`) || String(a.id).localeCompare(String(b.id)));
    const currentPaid = monthlyPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const delta = targetPaid - currentPaid;

    if (delta > 0 || !monthlyPayments.length) {
      state.payments.push({
        id: makeId("payment"),
        tenant_id: tenantId,
        amount: Math.max(0, delta || targetPaid),
        payment_method: "Admin correction",
        payment_date: isoDate(new Date()),
        balance: Number(desiredBalance || 0),
        reference: autoReference("ADMIN"),
        receipt_number: generateReceiptNumber(isoDate(new Date()), `${tenantId}-${Date.now()}`),
        payment_proof: "Super Admin balance correction",
        verification_status: "Verified",
        created_at: new Date().toISOString(),
      });
    } else if (delta < 0) {
      let remainingReduction = Math.abs(delta);
      const paymentIdsToAmounts = new Map(monthlyPayments.map((payment) => [payment.id, Number(payment.amount || 0)]));
      monthlyPayments
        .slice()
        .reverse()
        .forEach((payment) => {
          if (remainingReduction <= 0) return;
          const currentAmount = paymentIdsToAmounts.get(payment.id) || 0;
          const reduction = Math.min(currentAmount, remainingReduction);
          paymentIdsToAmounts.set(payment.id, currentAmount - reduction);
          remainingReduction -= reduction;
        });
      state.payments = state.payments.map((payment) =>
        paymentIdsToAmounts.has(payment.id)
          ? {
              ...payment,
              amount: paymentIdsToAmounts.get(payment.id),
              payment_proof: payment.payment_proof || "Adjusted by Super Admin balance correction",
            }
          : payment
      );
    } else {
      const latest = monthlyPayments[monthlyPayments.length - 1];
      if (latest) {
        state.payments = state.payments.map((payment) => (payment.id === latest.id ? { ...payment, balance: Number(desiredBalance || 0) } : payment));
      }
    }

    recalculateTenantPaymentBalances(tenantId);
  }

  function openBackendSupportAccount() {
    const ownerId = ui.backendSupportOwner?.value;
    if (!ownerId) {
      showToast("Choose a landlord first.");
      return;
    }
    startLandlordImpersonation(ownerId);
  }

  function renderProperties() {
    const scope = getScopedData();
    const allOwnerProperties = ownerProperties();
    const removeDisabled = state.role === "caretaker" || currentUser()?.role === "staff" ? "disabled" : "";
    renderPlanLimitNotice();
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
          const hasTenant = Boolean(state.tenants.find((tenant) => tenant.unit_id === unit.id && isActiveTenant(tenant)));
          const isVacant = unit.status === "vacant";
          const owner = property ? userById(property.owner_id) : null;
          const canUsePublicListings = ownerCanPublishPublicListings(property?.owner_id, owner);
          const canPublish = isVacant && !removeDisabled && (unit.listing_published || canUsePublicListings);
          const listingAction = unit.listing_published ? "Unpublish" : canUsePublicListings ? "Publish Vacancy" : "Upgrade to Publish";
          const listingVisible = unit.listing_published && isVacant && canUsePublicListings;
          const listingNote = !isVacant
            ? "Occupied rooms are hidden"
            : canUsePublicListings
              ? "Landlord controls public search visibility"
              : "Professional required for public listings";
          return `
            <tr data-unit-row="${escapeHtml(unit.id)}" class="${unit.id === highlightedUnitId ? "row-highlight" : ""}">
              <td>${escapeHtml(unit.unit_number)}</td>
              <td>${escapeHtml(property ? property.property_name : "Unknown")}</td>
              <td>${formatMoney(unit.rent_amount)}</td>
              <td>${statusPill(capitalize(unit.status))}</td>
              <td>
                ${statusPill(listingVisible ? "Published" : "Private")}
                <small class="table-subtext">${listingNote}</small>
              </td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-toggle-listing="${unit.id}" ${canPublish ? "" : "disabled"} type="button">${listingAction}</button>
                  <button class="text-button" data-unit-photo="${unit.id}" ${removeDisabled ? "disabled" : ""} type="button">Photo</button>
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
      return matchesSearch([tenant.name, tenant.phone, tenant.national_id, tenantStatusLabel(tenant), unit ? unit.unit_number : "", property ? property.property_name : ""]) &&
        [tenant.name, tenant.phone, tenant.national_id, tenantStatusLabel(tenant), unit ? unit.unit_number : ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

    ui.tenantTable.innerHTML =
      tenants
        .map((tenant) => {
          const unit = unitById(tenant.unit_id);
          const removeDisabled = state.role === "caretaker" || currentUser()?.role === "staff" ? "disabled" : "";
          const movedOut = !isActiveTenant(tenant);
          return `
            <tr>
              <td>${escapeHtml(tenant.name)}</td>
              <td>${escapeHtml(tenant.phone)}</td>
              <td>${escapeHtml(unit ? unit.unit_number : "Unassigned")}</td>
              <td>${formatMoney(tenant.rent_amount)}</td>
              <td>${formatMoney(tenant.deposit_paid)}</td>
              <td>
                ${statusPill(tenantStatusLabel(tenant))}
                ${movedOut ? `<small class="table-subtext">Moved out ${formatDate(tenant.move_out_date)}</small>` : ""}
              </td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-edit-tenant="${tenant.id}" type="button">Edit</button>
                  ${movedOut ? "" : tenantContactActions(tenant, tenantWhatsAppMessage(tenant), { compact: true, sendLabel: "Send" })}
                  <button class="danger-button" data-move-out-tenant="${tenant.id}" ${removeDisabled || movedOut ? "disabled" : ""} type="button">${movedOut ? "Moved Out" : "Move Out"}</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(7, "No tenants match this view.");

  }

  function renderStaff() {
    if (!ui.staffTable) return;
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      if (ui.staffPlanNotice) {
        ui.staffPlanNotice.textContent = "Caretaker logins are managed by landlord admins.";
        ui.staffPlanNotice.className = "plan-limit-note";
      }
      if (ui.staffInviteButton) ui.staffInviteButton.disabled = true;
      ui.staffCountLabel.textContent = "0 caretakers";
      ui.staffTable.innerHTML = emptyTableRow(4, "Caretaker logins are managed by landlord admins.");
      return;
    }

    const staff = staffUsersForOwner(user.id).filter((member) =>
      matchesSearch([member.name, member.phone, member.email, roleLabel(member.role), assignedPropertyNames(member).join(" ")])
    );
    const allStaff = staffUsersForOwner(user.id);
    const limit = caretakerLimitForOwner(user.id);
    const atLimit = allStaff.length >= limit.max;
    ui.staffCountLabel.textContent = `${allStaff.length}/${limit.label} caretakers`;
    if (ui.staffPlanNotice) {
      ui.staffPlanNotice.textContent = caretakerLimitMessage(limit, allStaff.length);
      ui.staffPlanNotice.className = `plan-limit-note ${atLimit && Number.isFinite(limit.max) ? "warning" : ""}`;
    }
    if (ui.staffInviteButton) ui.staffInviteButton.disabled = atLimit && Number.isFinite(limit.max);
    ui.staffTable.innerHTML =
      staff
        .map((member) => `
          <tr>
            <td>
              <strong>${escapeHtml(member.name)}</strong>
              <small class="table-subtext">${escapeHtml(userContactLabel(member))}</small>
            </td>
            <td>${escapeHtml(assignedPropertyNames(member).join(", ") || "No properties assigned")}</td>
            <td>${statusPill(member.invitation_status || "Login Created")}</td>
            <td>
              <div class="button-row">
                <button class="text-button" data-copy-staff-login="${member.id}" type="button">Copy Login Details</button>
                <button class="danger-button" data-remove-staff="${member.id}" type="button">Remove</button>
              </div>
            </td>
          </tr>
        `)
        .join("") || emptyTableRow(4, "No caretakers added yet.");

  }

  function renderRent() {
    const scope = getScopedData();
    const rentRows = getRentRows(scope.tenants.filter(isActiveTenant)).filter((row) =>
      matchesSearch([row.tenant.name, row.unit ? row.unit.unit_number : "", row.status, row.balance])
    );
    ui.rentStatusLabel.textContent = monthName(new Date());
    ui.rentStatusTable.innerHTML =
      rentRows
        .map((row) => {
          const message = reminderMessage(row);
          return `
            <tr>
              <td>${escapeHtml(row.tenant.name)}</td>
              <td>${escapeHtml(row.unit ? row.unit.unit_number : "Unassigned")}</td>
              <td>${formatMoney(row.paid)}</td>
              <td>
                ${formatMoney(row.balance)}
                ${row.carryForward ? `<small class="table-subtext">Carry forward: ${formatMoney(row.carryForward)}</small>` : ""}
              </td>
              <td>${row.advance ? formatMoney(row.advance) : "-"}</td>
              <td>${statusPill(row.status)}</td>
              <td>
                <div class="button-row">
                  <button class="text-button compact-link-button" data-tenant-detail="${escapeHtml(row.tenant.id)}" type="button">Details</button>
                  ${
                    row.balance > 0
                      ? tenantContactActions(row.tenant, message, { compact: true, sendLabel: "Send" })
                      : `<span class="pill success">Clear</span>`
                  }
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(7, "No active rent records.");

    const payments = scope.payments
      .slice()
      .filter((payment) => {
        const tenant = tenantById(payment.tenant_id);
        const unit = tenant ? unitById(tenant.unit_id) : null;
        return matchesSearch([
          tenant ? tenant.name : "",
          unit ? unit.unit_number : "",
          payment.payment_method,
          payment.reference,
          receiptNumber(payment),
          payment.amount,
        ]);
      })
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
    ui.paymentCountLabel.textContent = `${payments.length} payments`;
    ui.paymentHistoryTable.innerHTML =
      payments
        .map((payment) => {
          const tenant = tenantById(payment.tenant_id);
          const receiptMessage = paymentReceiptMessage(payment);
          return `
            <tr>
              <td>${escapeHtml(tenant ? tenant.name : "Removed tenant")}</td>
              <td>${formatMoney(payment.amount)}</td>
              <td>${escapeHtml(payment.payment_method)}</td>
              <td>${escapeHtml(receiptNumber(payment))}</td>
              <td>${escapeHtml(payment.reference || "-")}</td>
              <td>
                ${statusPill(payment.verification_status || "Unverified")}
                <small class="table-subtext">${escapeHtml(payment.payment_proof || "No proof attached")}</small>
              </td>
              <td>${formatDate(payment.payment_date)}</td>
              <td>${formatMoney(payment.balance)}</td>
              <td>
                <div class="button-row">
                  <button class="text-button" data-receipt-payment="${escapeHtml(payment.id)}" type="button">Receipt</button>
                  ${
                    tenant
                      ? tenantContactActions(tenant, receiptMessage, { compact: false, sendLabel: "Send Receipt" })
                      : ""
                  }
                </div>
              </td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(9, "No payment history yet.");

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
    const rows = getRentRows(scope.tenants.filter(isActiveTenant));
    const reminders = rows
      .filter((row) => row.balance > 0 && (row.daysUntilDue <= 1 || row.status === "Overdue"))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    ui.reminderCountLabel.textContent = `${reminders.length} reminders`;
    ui.reminderList.innerHTML =
      reminders
        .map((row) => {
          const message = reminderMessage(row);
          return `
            <article class="reminder-item">
              <div class="reminder-main">
                <div class="reminder-title">${escapeHtml(row.tenant.name)} - ${escapeHtml(row.unit ? row.unit.unit_number : "Room")}</div>
                <div class="reminder-copy">${escapeHtml(message)}</div>
              </div>
              <div class="button-row">
                <button class="text-button" data-copy-message="${encodeURIComponent(message)}" type="button">Copy SMS</button>
                ${tenantContactActions(row.tenant, message, { compact: false, sendLabel: "Send WhatsApp" })}
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
      ? `Hello ${sampleTenant.name}, this is a kind reminder that your rent balance is overdue. Kindly arrange payment at your earliest convenience. Thank you.`
      : "No tenant available.";
  }

  function queueReminderNotifications() {
    const scope = getScopedData();
    const rows = getRentRows(scope.tenants.filter(isActiveTenant))
      .filter((row) => row.balance > 0 && (row.daysUntilDue <= 1 || row.status === "Overdue"));
    if (!rows.length) {
      showToast("No rent reminders need attention today.");
      return;
    }
    rows.forEach((row) => {
      addNotification({
        type: "rent",
        title: `${row.status} reminder queued`,
        message: reminderMessage(row),
      });
    });
    saveState();
    renderAll();
    showToast(`${rows.length} reminder alerts queued.`);
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
        .filter(isActiveTenant)
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
      showToast("Caretakers cannot create properties.");
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
      const limit = planLimitForOwner(user.id);
      const portfolio = ownerPortfolio(user.id);
      if (portfolio.properties.length >= limit.properties) {
        showToast(`Your ${limit.plan} plan allows ${limitPhrase(limit.properties, "property", "properties")}. Upgrade to add more.`);
        return;
      }
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
    const paymentIds = state.payments.filter((payment) => tenantIds.includes(payment.tenant_id)).map((payment) => payment.id);
    const expenseIds = state.expenses.filter((expense) => expense.property_id === id).map((expense) => expense.id);

    state.properties = state.properties.filter((item) => item.id !== id);
    state.units = state.units.filter((unit) => unit.property_id !== id);
    state.tenants = state.tenants.filter((tenant) => !unitIds.includes(tenant.unit_id));
    state.payments = state.payments.filter((payment) => !tenantIds.includes(payment.tenant_id));
    state.expenses = state.expenses.filter((expense) => expense.property_id !== id);
    markRowsDeleted("payments", paymentIds);
    markRowsDeleted("expenses", expenseIds);
    markRowsDeleted("tenants", tenantIds);
    markRowsDeleted("units", unitIds);
    markRowsDeleted("properties", id);
    state.selectedPropertyId = "all";
    saveState();
    resetPropertyForm();
    renderAll();
    showToast("Property removed.");
  }

  async function saveUnit(event) {
    event.preventDefault();
    if (currentUser()?.role === "staff") {
      showToast("Caretakers cannot create rooms.");
      return;
    }
    if (!(await requireSupabaseWriteSession("Sign in again to add rooms and photos across devices."))) return;
    if (!ui.unitProperty.value) {
      showToast("Add a property before adding rooms.");
      return;
    }

    const property = ownerProperties().find((item) => item.id === ui.unitProperty.value);
    if (!property) {
      showToast("Choose one of your properties.");
      return;
    }

    const limit = planLimitForOwner(property.owner_id);
    const portfolio = ownerPortfolio(property.owner_id);
    if (portfolio.units.length >= limit.units) {
      showToast(`Your ${limit.plan} plan allows ${limitPhrase(limit.units, "unit", "units")}. Upgrade before adding more rooms.`);
      return;
    }

    const unitId = makeId("unit");
    let listingPhoto = listingPhotoForProperty(property);
    try {
      listingPhoto = await selectedUnitPhotoDataUrl(property);
    } catch (error) {
      showToast(error.message || "Could not read property photo.");
      return;
    }

    state.units.push({
      id: unitId,
      property_id: property.id,
      unit_number: ui.unitNumber.value.trim(),
      rent_amount: Number(ui.unitRent.value),
      status: "vacant",
      created_at: new Date().toISOString(),
      listing_published: false,
      listing_bedrooms: 1,
      listing_bathrooms: 1,
      listing_furnished: false,
      listing_photo: listingPhoto,
      listing_note: "Vacant and ready for viewing. Contact the landlord on WhatsApp.",
    });
    state.selectedPropertyId = property.id;
    state.searchTerm = "";
    ui.globalSearch.value = "";
    highlightedUnitId = unitId;
    const canPublishPublicly = ownerCanPublishPublicListings(property.owner_id);

    saveState();
    ui.unitForm.reset();
    clearUnitPhotoPreview();
    renderAll();
    revealUnitRow(unitId);
    showToast(canPublishPublicly ? "Room / shop added. Publish it when you want it public." : "Room / shop added. Upgrade to Professional to publish it publicly.");
  }

  function previewNewUnitPhoto() {
    const file = ui.unitPhoto?.files?.[0];
    if (!file) {
      clearUnitPhotoPreview();
      return;
    }
    if (unitPhotoPreviewUrl) URL.revokeObjectURL(unitPhotoPreviewUrl);
    unitPhotoPreviewUrl = URL.createObjectURL(file);
    renderPhotoPreview(ui.unitPhotoPreview, unitPhotoPreviewUrl, file.name);
  }

  function clearUnitPhotoPreview() {
    if (unitPhotoPreviewUrl) URL.revokeObjectURL(unitPhotoPreviewUrl);
    unitPhotoPreviewUrl = null;
    if (!ui.unitPhotoPreview) return;
    ui.unitPhotoPreview.classList.add("hidden");
    ui.unitPhotoPreview.innerHTML = "";
  }

  async function selectedUnitPhotoDataUrl(property) {
    const file = ui.unitPhoto?.files?.[0];
    if (!file) return listingPhotoForProperty(property);
    return imageFileToDataUrl(file);
  }

  function startUnitPhotoUpdate(unitId) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Only admins can update public photos.");
      return;
    }
    const unit = ownerProperties()
      .flatMap((property) => state.units.filter((item) => item.property_id === property.id))
      .find((item) => item.id === unitId);
    if (!unit || !ui.unitPhotoPicker) return;
    ui.unitPhotoPicker.dataset.unitId = unit.id;
    ui.unitPhotoPicker.value = "";
    ui.unitPhotoPicker.click();
  }

  async function saveExistingUnitPhoto() {
    const unitId = ui.unitPhotoPicker?.dataset.unitId || "";
    const file = ui.unitPhotoPicker?.files?.[0];
    if (!unitId || !file) return;
    if (!(await requireSupabaseWriteSession("Sign in again to upload this photo across devices."))) {
      ui.unitPhotoPicker.value = "";
      ui.unitPhotoPicker.dataset.unitId = "";
      return;
    }
    try {
      const photo = await imageFileToDataUrl(file);
      state.units = state.units.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              listing_photo: photo,
              listing_bedrooms: unit.listing_bedrooms || 1,
              listing_bathrooms: unit.listing_bathrooms || 1,
              listing_furnished: Boolean(unit.listing_furnished),
            }
          : unit
      );
      saveState();
      renderAll();
      showToast("Public property photo updated.");
    } catch (error) {
      showToast(error.message || "Could not update property photo.");
    } finally {
      ui.unitPhotoPicker.value = "";
      ui.unitPhotoPicker.dataset.unitId = "";
    }
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
    markRowsDeleted("units", id);
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
    const property = propertyById(unit.property_id);
    if (!property) return;
    if (nextPublished && !ownerCanPublishPublicListings(property.owner_id, userById(property.owner_id))) {
      showToast("Public listings are available on Professional and Enterprise plans. Upgrade to publish vacancies.");
      return;
    }
    state.units = state.units.map((item) =>
      item.id === unitId
        ? {
            ...item,
            listing_published: nextPublished,
            listing_bedrooms: item.listing_bedrooms || 1,
            listing_bathrooms: item.listing_bathrooms || 1,
            listing_furnished: Boolean(item.listing_furnished),
            listing_photo: item.listing_photo || listingPhotoForProperty(property),
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
      status: previous?.status || "active",
      move_out_date: previous?.move_out_date || null,
      move_out_balance: previous?.move_out_balance || 0,
      move_out_damages: previous?.move_out_damages || 0,
      move_out_refund: previous?.move_out_refund || 0,
      move_out_note: previous?.move_out_note || "",
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

    const activeTenantInUnit = state.tenants.find(
      (item) => item.unit_id === tenant.unit_id && item.id !== id && isActiveTenant(item)
    );
    if (activeTenantInUnit) {
      showToast(`${ownedUnit.unit_number} already has an active tenant.`);
      return;
    }

    if (previous) {
      state.tenants = state.tenants.map((item) => (item.id === id ? tenant : item));
      if (isActiveTenant(tenant)) {
        setUnitStatus(previous.unit_id, "vacant");
        setUnitStatus(tenant.unit_id, "occupied");
      }
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

  async function inviteStaff(event) {
    event.preventDefault();
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      showToast("Only landlord admins can create caretaker logins.");
      return;
    }

    const existingCaretakers = staffUsersForOwner(user.id).length;
    const limit = caretakerLimitForOwner(user.id);
    if (existingCaretakers >= limit.max) {
      showToast(limit.upgradeMessage);
      return;
    }

    const phone = ui.staffPhone.value.trim();
    const email = ui.staffEmail.value.trim();
    const assignedPropertyIds = [...ui.staffProperties.selectedOptions]
      .map((option) => option.value)
      .filter(Boolean);
    if (!assignedPropertyIds.length) {
      showToast("Assign at least one property.");
      return;
    }

    if (supabaseReady) {
      try {
        const result = await apiRequest("/api/staff-user", {
          name: ui.staffName.value.trim(),
          phone,
          email,
          password: ui.staffPassword.value,
          assigned_property_ids: assignedPropertyIds,
        });
        const createdCaretaker = { ...result.user, password: ui.staffPassword.value, invitation_status: "Login Created" };
        state.users.push(createdCaretaker);
        addNotification({
          type: "staff",
          title: "Caretaker login created",
          message: `${createdCaretaker.name} can now access ${assignedPropertyNames(createdCaretaker).join(", ")}.`,
        });
        saveState();
        ui.staffInviteForm.reset();
        renderAll();
        showToast("Caretaker login created. Copy the login details for the caretaker.");
      } catch (error) {
        console.error("Caretaker login failed", error);
        showToast(error.message || "Could not create caretaker login.");
      }
      return;
    }

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
      invitation_status: "Login Created",
      created_at: new Date().toISOString(),
    };

    state.users.push(staffUser);
    addNotification({
      type: "staff",
      title: "Caretaker login created",
      message: `${staffUser.name} can now access ${assignedPropertyNames(staffUser).join(", ")}.`,
    });
    saveState();
    ui.staffInviteForm.reset();
    renderAll();
    showToast("Caretaker login created. Copy the login details for the caretaker.");
  }

  function caretakerLoginText(staffUser) {
    const loginLines = ["RentLedger UG caretaker login", `Phone: ${staffUser.phone}`];
    if (staffUser.email) loginLines.push(`Email: ${staffUser.email}`);
    if (staffUser.password) loginLines.push(`Password: ${staffUser.password}`);
    else loginLines.push("Use the temporary password shared when this login was created.");
    loginLines.push(`Assigned properties: ${assignedPropertyNames(staffUser).join(", ") || "None assigned"}`);
    return loginLines.join("\n");
  }

  function copyStaffLogin(id) {
    const staffUser = userById(id);
    if (!staffUser) return;
    copyText(caretakerLoginText(staffUser));
  }

  async function removeStaff(id) {
    const staffUser = userById(id);
    if (!staffUser || staffUser.company_owner_id !== currentUser()?.id) return;
    if (supabaseReady) {
      try {
        await apiRequest("/api/staff-user", { userId: id }, { method: "DELETE" });
      } catch (error) {
        console.error("Caretaker removal failed", error);
        showToast(error.message || "Could not remove caretaker login.");
        return;
      }
    }
    state.users = state.users.filter((user) => user.id !== id);
    saveState();
    renderAll();
    showToast("Caretaker login removed.");
  }

  function startTenantMoveOut(id) {
    if (state.role === "caretaker" || currentUser()?.role === "staff") {
      showToast("Your role cannot move out tenants.");
      return;
    }
    const tenant = getScopedData().tenants.find((item) => item.id === id);
    if (!tenant || !isActiveTenant(tenant)) return;
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
    if (!tenant || !isActiveTenant(tenant)) {
      closeMoveOutModal();
      return;
    }
    const unit = unitById(tenant.unit_id);
    const balance = Number(ui.moveOutBalance.dataset.amount || 0);
    const damages = Number(ui.moveOutDamages.value || 0);
    const refund = Number(ui.moveOutRefund.value || 0);
    const note = ui.moveOutNote.value.trim();

    setUnitStatus(tenant.unit_id, "vacant");
    state.tenants = state.tenants.map((item) =>
      item.id === tenant.id
        ? {
            ...item,
            status: "moved_out",
            move_out_date: isoDate(new Date()),
            move_out_balance: balance,
            move_out_damages: damages,
            move_out_refund: refund,
            move_out_note: note,
          }
        : item
    );
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
    const paymentIds = state.payments.filter((payment) => payment.tenant_id === id).map((payment) => payment.id);
    state.tenants = state.tenants.filter((item) => item.id !== id);
    state.payments = state.payments.filter((payment) => payment.tenant_id !== id);
    markRowsDeleted("payments", paymentIds);
    markRowsDeleted("tenants", id);
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
    const proof = ui.paymentProof.value.trim();
    const verificationStatus = ui.paymentVerification.value || "Unverified";
    const paymentId = makeId("payment");
    const receiptNumber = generateReceiptNumber(ui.paymentDate.value, paymentId);

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Payment amount must be greater than 0.");
      return;
    }

    const payment = {
      id: paymentId,
      tenant_id: tenant.id,
      amount,
      payment_method: method,
      payment_date: ui.paymentDate.value,
      balance,
      reference,
      receipt_number: receiptNumber,
      payment_proof: proof,
      verification_status: verificationStatus,
      created_at: new Date().toISOString(),
    };

    state.payments.push(payment);
    addNotification({
      type: "payment",
      title: "Payment recorded",
      message: `${tenant.name} paid ${formatMoney(amount)} by ${method}. Receipt ${receiptNumber}.`,
    });

    saveState();
    ui.paymentForm.reset();
    ui.paymentVerification.value = "Unverified";
    setTodayDefaults();
    renderAll();
    ui.paymentStatusPill.textContent = method.includes("Money") || method.includes("MoMo") ? "MoMo confirmed" : "Recorded";
    ui.paymentStatusPill.className = "pill success";
    openReceipt(payment.id);
    showToast(`Receipt ${receiptNumber} generated for ${tenant.name}.`);
  }

  function saveExpense(event) {
    event.preventDefault();
    if (currentUser()?.role === "staff") {
      showToast("Caretakers cannot record expenses.");
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
    markRowsDeleted("expenses", id);
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
    const planMonthlyFee = subscriptionPlanFee(subscription);
    const savedMonthlyFee = planMonthlyFee || Number(subscription.monthly_fee || 0);
    const note = ui.ownerPaymentNote.value.trim() || defaultOwnerPaymentNote(owner, subscription, paymentDate);
    const status = ui.ownerPaymentStatus?.value || "Active";
    state.subscriptions = state.subscriptions.map((item) =>
      item.id === subscription.id
        ? {
            ...item,
            monthly_fee: savedMonthlyFee,
            status,
            cancel_at_period_end: status === "Cancelled" ? true : item.cancel_at_period_end && status !== "Active",
            last_payment_date: paymentDate,
            last_payment_method: item.last_payment_method || "Manual confirmation",
            last_payment_note: note,
            next_billing_date: addMonths(paymentDate, 1),
            provider_payment_status: status === "Active" ? "Manual" : item.provider_payment_status || "Pending",
            provider_next_action: null,
          }
        : item
    );
    state.users = state.users.map((item) =>
      item.id === ownerId
        ? {
            ...item,
            account_status: status === "Active" ? "Active" : ["Pending", "Overdue", "Paused", "Cancelled"].includes(status) ? "Pending" : item.account_status,
          }
        : item
    );

    addAuditLog({
      landlord_id: ownerId,
      action: "Super Admin corrected subscription payment",
      old_value: `${subscription.status || "Unknown"} / ${formatMoney(subscription.monthly_fee || 0)} / ${subscription.last_payment_date || "No payment"}`,
      new_value: `${status} / ${formatMoney(savedMonthlyFee)} / ${paymentDate}`,
    });
    saveState();
    flushPendingSupabaseSave();
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

    const packageAmount = subscriptionPlanFee(subscription);
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
    if (ui.ownerPaymentMethod) {
      ui.ownerPaymentMethod.value = subscriptionCheckoutOptionLabel(subscription);
    }
    if (ui.ownerPaymentStatus) {
      ui.ownerPaymentStatus.value = billingSubscriptionStatus(subscription) === "Overdue" ? "Overdue" : subscription.status || "Active";
    }
  }

  function defaultOwnerPaymentNote(owner, subscription, paymentDate) {
    const date = new Date(`${paymentDate || isoDate(new Date())}T00:00:00`);
    return `${monthName(date)} ${subscription.plan} subscription for ${owner ? owner.name : "landlord"}`;
  }

  function packageFee(plan) {
    return PACKAGE_OPTIONS.find((option) => option.plan === plan)?.fee || 0;
  }

  function subscriptionPlanFee(subscription) {
    if (!subscription) return 0;
    return packageFee(subscription.plan) || Number(subscription.monthly_fee || 0);
  }

  function signupPlanOption(plan) {
    return PACKAGE_OPTIONS.find((option) => option.plan === plan && option.fee > 0 && option.plan !== "Enterprise") || null;
  }

  function updateSignupBillingSummary() {
    if (!ui.accountTrialSummary) return;
    const planOption = signupPlanOption(ui.accountPlan?.value);
    const paymentMethod = ui.accountPaymentMethod?.value || "";
    const nextBillingDate = addDays(isoDate(new Date()), TRIAL_DAYS);

    if (!planOption) {
      ui.accountTrialSummary.textContent =
        "Terms and Conditions: select Starter or Professional, choose a payment method, and confirm your details before starting the 14-day free trial.";
      return;
    }
    if (!paymentMethod) {
      ui.accountTrialSummary.textContent =
        `Terms and Conditions: ${planOption.plan} selected. Choose a payment method to confirm how subscription billing works after the 14-day trial.`;
      return;
    }

    const billingContact = ui.accountBillingContact?.value.trim();
    const contactLabel = billingContact ? ` from ${maskBillingContact(billingContact)}` : "";
    ui.accountTrialSummary.textContent =
      `Terms and Conditions: ${planOption.plan} starts with a 14-day free trial. After ${formatDate(nextBillingDate)}, the subscription is ${formatMoney(planOption.fee)}/month by ${paymentMethod}${contactLabel} unless you cancel before renewal.`;
  }

  function maskBillingContact(value) {
    const raw = String(value || "").trim();
    if (raw.includes("@")) return maskEmailAddress(raw);
    return maskPhoneNumber(raw);
  }

  function looksLikeFullCardNumber(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length >= 12;
  }

  function saveSupportTicket(event) {
    event.preventDefault();
    const ownerId = ui.supportOwner.value;
    if (!ownerId) {
      showToast("Choose a landlord first.");
      return;
    }

    state.supportTickets = state.supportTickets || [];
    const createdAt = new Date().toISOString();
    const ticket = {
      id: makeId("ticket"),
      owner_id: ownerId,
      landlord_id: ownerId,
      subject: ui.supportSubject.value.trim(),
      description: ui.supportNote.value.trim(),
      priority: ui.supportPriority.value,
      status: ui.supportStatus.value,
      note: ui.supportNote.value.trim(),
      admin_note: "",
      updated_at: isoDate(new Date()),
      created_at: createdAt,
      resolved_at: ["Resolved", "Closed"].includes(ui.supportStatus.value) ? createdAt : null,
    };
    state.supportTickets.push(ticket);
    addAuditLog({
      landlord_id: ownerId,
      action: `Super Admin created support ticket: ${ticket.subject}`,
      old_value: "",
      new_value: ticketDescription(ticket),
    });

    saveState();
    ui.supportTicketForm.reset();
    renderAll();
    showToast("Support ticket saved.");
  }

  function updateSupportTicket(id, button = null) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can update support tickets.");
      return;
    }
    const card = button?.closest("[data-ticket-card]");
    const ticket = (state.supportTickets || []).find((item) => item.id === id);
    if (!ticket || !card) return;
    const nextStatus = card.querySelector(".ticket-status-select")?.value || ticket.status || "Open";
    const nextAdminNote = card.querySelector(".ticket-admin-note")?.value.trim() || "";
    const response = card.querySelector(".ticket-response-message")?.value.trim() || "";
    const updatedAt = new Date().toISOString();
    const oldValue = `${ticket.status || "Open"} | ${ticket.admin_note || ""}`;
    state.supportTickets = (state.supportTickets || []).map((item) =>
      item.id === id
        ? {
            ...item,
            status: nextStatus,
            admin_note: nextAdminNote,
            updated_at: isoDate(new Date()),
            resolved_at: ["Resolved", "Closed"].includes(nextStatus) ? item.resolved_at || updatedAt : null,
          }
        : item
    );
    if (response) {
      createLandlordMessage({
        landlord_id: ticketOwnerId(ticket),
        title: `Support update: ${ticket.subject}`,
        message: response,
        template: "support",
        ticket_id: ticket.id,
      });
    }
    addAuditLog({
      landlord_id: ticketOwnerId(ticket),
      action: `Super Admin updated support ticket: ${ticket.subject}`,
      old_value: oldValue,
      new_value: `${nextStatus} | ${nextAdminNote}${response ? ` | Response: ${response}` : ""}`,
    });
    saveState();
    renderAll();
    showToast(response ? "Ticket updated and response sent." : "Ticket updated.");
  }

  function sendLandlordMessage(event) {
    event.preventDefault();
    if (!isSaasOwner()) {
      showToast("Only the super admin can message landlords.");
      return;
    }

    const owner = userById(ui.adminMessageOwner.value);
    const title = ui.adminMessageTitle.value.trim();
    const message = ui.adminMessageBody.value.trim();
    if (!owner || owner.role !== "landlord") {
      showToast("Choose a landlord first.");
      return;
    }
    if (!title || !message) {
      showToast("Add a subject and message.");
      return;
    }

    createLandlordMessage({
      landlord_id: owner.id,
      title,
      message,
      template: ui.adminMessageTemplate?.value || "",
    });
    addAuditLog({
      landlord_id: owner.id,
      action: `Super Admin sent message: ${title}`,
      old_value: "",
      new_value: message,
    });
    saveState();
    ui.adminMessageForm.reset();
    if (ui.adminMessageTemplate) ui.adminMessageTemplate.value = "";
    renderAll();
    showToast(`Message sent to ${owner.name}.`);
  }

  function createLandlordMessage({ landlord_id, title, message, template = "", ticket_id = "" }) {
    state.supportMessages = state.supportMessages || [];
    state.supportMessages.push({
      id: makeId("message"),
      landlord_id,
      user_id: landlord_id,
      title,
      message,
      template,
      ticket_id,
      created_at: new Date().toISOString(),
    });
    addNotification({
      user_id: landlord_id,
      type: template === "support" ? "support" : "announcement",
      title,
      message,
    });
  }

  function applyAdminMessageTemplate() {
    const template = adminMessageTemplates()[ui.adminMessageTemplate?.value || ""];
    if (!template) return;
    ui.adminMessageTitle.value = template.title;
    ui.adminMessageBody.value = template.message;
  }

  function adminMessageTemplates() {
    return {
      welcome: {
        title: "Welcome to RentLedger UG",
        message: "Welcome to RentLedger UG. Your account is ready, and our support team is here if you need help setting up properties, tenants, or payments.",
      },
      subscription: {
        title: "Subscription reminder",
        message: "Your RentLedger UG subscription needs attention. Please open Billing and complete payment to keep your account active.",
      },
      payment: {
        title: "Payment reminder",
        message: "This is a reminder to confirm your pending RentLedger UG platform payment. Contact support if you already paid.",
      },
      support: {
        title: "Support follow up",
        message: "We reviewed your support request and have updated your account. Reply if anything still looks incorrect.",
      },
      maintenance: {
        title: "Maintenance notice",
        message: "RentLedger UG may have brief maintenance. Your records remain saved, and normal access will resume shortly.",
      },
    };
  }

  function templateLabel(template) {
    return {
      welcome: "Welcome",
      subscription: "Subscription",
      payment: "Payment",
      support: "Support",
      maintenance: "Maintenance",
    }[template] || "Custom";
  }

  function saveLandlordSupportTicket(event) {
    event.preventDefault();
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      showToast("Only landlord accounts can send support requests.");
      return;
    }

    const ticket = {
      id: makeId("ticket"),
      owner_id: user.id,
      landlord_id: user.id,
      subject: ui.landlordSupportSubject.value.trim(),
      description: ui.landlordSupportNote.value.trim(),
      priority: ui.landlordSupportPriority.value,
      status: "Open",
      note: ui.landlordSupportNote.value.trim(),
      admin_note: "",
      created_at: new Date().toISOString(),
      updated_at: isoDate(new Date()),
      resolved_at: null,
    };

    state.supportTickets = state.supportTickets || [];
    state.supportTickets.push(ticket);
    addNotification({
      user_id: SUPER_ADMIN_USER_ID,
      type: "support",
      title: `Support request from ${user.name}`,
      message: `${ticket.priority} priority: ${ticket.subject}${ticket.note ? `\n${ticket.note}` : ""}`,
    });

    saveState();
    ui.landlordSupportForm.reset();
    ui.landlordSupportPriority.value = "Medium";
    renderAll();
    showToast("Support request sent to the super admin.");
  }

  function requestVerifiedBadge() {
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      showToast("Only landlord accounts can request a verified badge.");
      return;
    }
    if (ownerHasVerifiedBadge(user)) {
      showToast("Your account already has a verified landlord badge.");
      return;
    }
    if (verifiedBadgeRequestForOwner(user.id)) {
      showToast("Your verified badge request is already waiting for super admin review.");
      return;
    }

    const ticket = {
      id: makeId("ticket"),
      owner_id: user.id,
      landlord_id: user.id,
      subject: VERIFIED_BADGE_REQUEST_SUBJECT,
      description: VERIFIED_BADGE_REQUEST_NOTE,
      priority: "High",
      status: "Open",
      note: VERIFIED_BADGE_REQUEST_NOTE,
      admin_note: "",
      created_at: new Date().toISOString(),
      updated_at: isoDate(new Date()),
      resolved_at: null,
    };
    state.supportTickets = state.supportTickets || [];
    state.supportTickets.push(ticket);
    addNotification({
      user_id: SUPER_ADMIN_USER_ID,
      type: "support",
      title: `Verified badge request from ${user.name}`,
      message: `${user.name} requested super admin review for a verified landlord badge.`,
    });

    saveState();
    renderAll();
    showToast("Verified badge request sent to the super admin.");
  }

  async function createDemoLandlordAccount() {
    if (!isSaasOwner()) {
      showToast("Only the super admin can create demo accounts.");
      return;
    }

    if (supabaseReady) {
      try {
        setAppLoading("Creating demo account");
        const result = await apiRequest("/api/admin-user", { action: "create-demo-landlord" });
        await refreshSupabaseState();
        showToast(`Demo account created: ${result.email}.`);
      } catch (error) {
        console.error("Demo account creation failed", error);
        showToast(error.message || "Could not create demo account.");
      } finally {
        clearAppLoading();
      }
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
      status: "active",
    };
    const payment = {
      id: paymentId,
      tenant_id: tenantId,
      amount: 650000,
      payment_method: "MTN MoMo",
      payment_date: today,
      balance: 0,
      reference: autoReference("MTN MoMo"),
      receipt_number: generateReceiptNumber(today, paymentId),
      payment_proof: "Demo MoMo confirmation",
      verification_status: "Verified",
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
      next_billing_date: addDays(today, TRIAL_DAYS),
      billing_method: "Trial",
      billing_contact_masked: "",
      auto_collect_authorized: false,
      cancel_at_period_end: false,
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

  async function toggleLandlordAccountStatus(userId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can approve or suspend accounts.");
      return;
    }

    const user = userById(userId);
    if (!user || user.role !== "landlord") return;

    if (supabaseReady) {
      try {
        const result = await apiRequest("/api/admin-user", { action: "toggle-status", userId });
        await refreshSupabaseState();
        addAuditLog({
          landlord_id: userId,
          action: "Super Admin modified landlord account status",
          old_value: accountStatus(user),
          new_value: result.account_status,
        });
        saveState();
        showToast(`${user.name} ${result.account_status === "Active" ? "approved" : "suspended"}.`);
      } catch (error) {
        console.error("Status update failed", error);
        showToast(error.message || "Could not update account status.");
      }
      return;
    }

    const nextStatus = accountStatus(user) === "Suspended" || accountStatus(user) === "Inactive" ? "Active" : "Suspended";
    state.users = state.users.map((item) =>
      item.id === userId
        ? {
            ...item,
            account_status: nextStatus,
          }
        : item
    );
    addAuditLog({
      landlord_id: userId,
      action: "Super Admin modified landlord account status",
      old_value: accountStatus(user),
      new_value: nextStatus,
    });
    saveState();
    renderAll();
    showToast(`${user.name} ${nextStatus === "Active" ? "approved" : "suspended"}.`);
  }

  async function toggleVerifiedBadge(userId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can manage verified badges.");
      return;
    }

    const user = userById(userId);
    if (!user || user.role !== "landlord") {
      showToast("Landlord account was not found.");
      return;
    }
    const nextVerified = !ownerHasVerifiedBadge(user);

    if (supabaseReady) {
      try {
        const result = await apiRequest("/api/admin-user", { action: "toggle-verified-badge", userId });
        await refreshSupabaseState();
        addAuditLog({
          landlord_id: userId,
          action: "Super Admin modified verified badge",
          old_value: ownerHasVerifiedBadge(user) ? "Verified" : "Unverified",
          new_value: result.verified_badge ? "Verified" : "Unverified",
        });
        saveState();
        showToast(`${user.name} ${result.verified_badge ? "now has" : "no longer has"} a verified badge.`);
      } catch (error) {
        console.error("Verified badge update failed", error);
        showToast(error.message || "Could not update verified badge.");
      }
      return;
    }

    state.users = state.users.map((item) =>
      item.id === userId
        ? {
            ...item,
            verified_badge: nextVerified,
            verified: nextVerified,
            verification_label: nextVerified ? "Verified" : "",
          }
        : item
    );
    if (nextVerified) {
      resolveVerifiedBadgeRequests(userId);
      addNotification({
        user_id: userId,
        type: "support",
        title: "Verified badge approved",
        message: "The super admin approved your verified landlord badge.",
      });
    } else {
      reopenVerifiedBadgeRequests(userId);
    }
    addAuditLog({
      landlord_id: userId,
      action: "Super Admin modified verified badge",
      old_value: ownerHasVerifiedBadge(user) ? "Verified" : "Unverified",
      new_value: nextVerified ? "Verified" : "Unverified",
    });
    saveState();
    renderAll();
    showToast(`${user.name} ${nextVerified ? "now has" : "no longer has"} a verified badge.`);
  }

  async function cycleSubscriptionPackage(ownerId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can manage packages.");
      return;
    }
    const subscription = subscriptionByOwner(ownerId);

    if (supabaseReady) {
      try {
        const result = await apiRequest("/api/admin-user", { action: "cycle-package", ownerId });
        await refreshSupabaseState();
        addAuditLog({
          landlord_id: ownerId,
          action: "Super Admin updated subscription package",
          old_value: subscription?.plan || "No subscription",
          new_value: result.plan || "Package changed",
        });
        saveState();
        showToast(`Package changed to ${result.plan}.`);
      } catch (error) {
        console.error("Package update failed", error);
        showToast(error.message || "Could not change package.");
      }
      return;
    }

    state.subscriptions = state.subscriptions || [];
    const today = isoDate(new Date());
    const currentIndex = Math.max(0, PACKAGE_OPTIONS.findIndex((option) => option.plan === subscription?.plan));
    const nextPackage = PACKAGE_OPTIONS[(currentIndex + 1) % PACKAGE_OPTIONS.length];
    const nextStatus = nextPackage.status === "Trial" ? "Trial" : isPaidSubscription(subscription) ? "Active" : "Pending";
    const nextBillingDate = nextPackage.status === "Trial" ? addDays(today, TRIAL_DAYS) : addMonths(today, 1);

    if (subscription) {
      state.subscriptions = state.subscriptions.map((item) =>
        item.id === subscription.id
          ? {
              ...item,
              plan: nextPackage.plan,
              monthly_fee: nextPackage.fee,
              status: nextStatus,
              next_billing_date: nextPackage.status === "Trial" ? nextBillingDate : item.next_billing_date || nextBillingDate,
            }
          : item
      );
    } else {
      state.subscriptions.push({
        id: makeId("subscription"),
        owner_id: ownerId,
        plan: nextPackage.plan,
        monthly_fee: nextPackage.fee,
        status: nextStatus,
        last_payment_date: today,
        last_payment_method: "Manual",
        last_payment_note: "Package assigned by super admin",
        next_billing_date: nextBillingDate,
      });
    }

    state.users = state.users.map((item) =>
      item.id === ownerId
        ? { ...item, account_status: nextStatus === "Trial" ? "Trial" : nextStatus === "Active" ? "Active" : "Pending" }
        : item
    );
    addAuditLog({
      landlord_id: ownerId,
      action: "Super Admin updated subscription package",
      old_value: subscription?.plan || "No subscription",
      new_value: nextPackage.plan,
    });
    saveState();
    renderAll();
    showToast(`Package changed to ${nextPackage.plan}.`);
  }

  async function endOwnerTrial(ownerId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can end trials.");
      return;
    }

    const owner = userById(ownerId);
    if (!owner || owner.role !== "landlord") {
      showToast("Landlord account was not found.");
      return;
    }

    const subscription = subscriptionByOwner(ownerId);
    const paidPlan = paidPlanForEndedTrial(subscription);
    if (!paidPlan) {
      showToast("No paid package is available.");
      return;
    }

    if (supabaseReady) {
      try {
        setAppLoading("Ending trial");
        const result = await apiRequest("/api/admin-user", { action: "end-trial", ownerId });
        await refreshSupabaseState();
        addAuditLog({
          landlord_id: ownerId,
          action: "Super Admin ended landlord trial",
          old_value: subscription?.status || owner.account_status || "Trial",
          new_value: result.status || "Pending",
        });
        saveState();
        showToast(`${owner.name}'s trial ended. ${result.plan || paidPlan.plan} subscription request sent.`);
      } catch (error) {
        console.error("End trial failed", error);
        showToast(error.message || "Could not end trial.");
      } finally {
        clearAppLoading();
      }
      return;
    }

    const today = isoDate(new Date());
    const promptMessage = `Your free trial has ended. Subscribe to ${paidPlan.plan} at ${formatMoney(paidPlan.fee)}/month to keep using RentLedger UG.`;

    if (subscription) {
      state.subscriptions = state.subscriptions.map((item) =>
        item.id === subscription.id
          ? {
              ...item,
              plan: paidPlan.plan,
              monthly_fee: paidPlan.fee,
              status: "Pending",
              next_billing_date: today,
              grace_period_end: today,
              cancel_at_period_end: false,
              cancellation_requested_at: null,
              payment_provider: item.payment_provider || "pesapal",
              provider_payment_status: "Subscription required",
              provider_next_action: "Trial ended. Subscribe to continue using RentLedger UG.",
              last_payment_method: item.last_payment_method || item.billing_method || "Trial",
              last_payment_note: "Trial ended by super admin. Subscription required.",
            }
          : item
      );
    } else {
      state.subscriptions = state.subscriptions || [];
      state.subscriptions.push({
        id: makeId("subscription"),
        owner_id: ownerId,
        plan: paidPlan.plan,
        monthly_fee: paidPlan.fee,
        status: "Pending",
        last_payment_date: today,
        last_payment_method: "Trial",
        last_payment_note: "Trial ended by super admin. Subscription required.",
        next_billing_date: today,
        grace_period_end: today,
        payment_provider: "pesapal",
        provider_payment_status: "Subscription required",
        provider_next_action: "Trial ended. Subscribe to continue using RentLedger UG.",
      });
    }

    state.users = state.users.map((item) => (item.id === ownerId ? { ...item, account_status: "Pending" } : item));
    addNotification({
      user_id: ownerId,
      type: "billing",
      title: "Trial ended - subscription required",
      message: promptMessage,
    });
    addAuditLog({
      landlord_id: ownerId,
      action: "Super Admin ended landlord trial",
      old_value: subscription?.status || owner.account_status || "Trial",
      new_value: "Pending",
    });
    saveState();
    renderAll();
    showToast(`${owner.name}'s trial ended. Subscription request sent.`);
  }

  async function activateOwnerAccount(ownerId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can activate landlord accounts.");
      return;
    }

    const owner = userById(ownerId);
    if (!owner || owner.role !== "landlord") {
      showToast("Landlord account was not found.");
      return;
    }

    const subscription = subscriptionByOwner(ownerId);
    const paidPlan = paidPlanForEndedTrial(subscription);
    if (!paidPlan) {
      showToast("No paid package is available.");
      return;
    }

    if (supabaseReady) {
      try {
        setAppLoading("Activating account");
        const result = await apiRequest("/api/admin-user", { action: "activate-account", ownerId });
        await refreshSupabaseState();
        addAuditLog({
          landlord_id: ownerId,
          action: "Super Admin activated landlord account",
          old_value: subscription?.status || owner.account_status || "Unknown",
          new_value: result.status || "Active",
        });
        saveState();
        showToast(`${owner.name}'s account is active.`);
      } catch (error) {
        console.error("Account activation failed", error);
        showToast(error.message || "Could not activate account.");
      } finally {
        clearAppLoading();
      }
      return;
    }

    const today = isoDate(new Date());
    const activePlan = subscription?.plan && subscription.plan !== "Trial" ? subscription.plan : paidPlan.plan;
    const monthlyFee = packageFee(activePlan) || subscriptionPlanFee(subscription) || paidPlan.fee;
    const nextBillingDate = addMonths(today, 1);

    if (subscription) {
      state.subscriptions = state.subscriptions.map((item) =>
        item.id === subscription.id
          ? {
              ...item,
              plan: activePlan,
              monthly_fee: monthlyFee,
              status: "Active",
              last_payment_date: today,
              last_payment_method: "Manual",
              last_payment_note: "Account activated manually by super admin after trial ended.",
              next_billing_date: nextBillingDate,
              grace_period_end: null,
              cancel_at_period_end: false,
              cancellation_requested_at: null,
              provider_payment_status: "Manual",
              provider_next_action: "",
            }
          : item
      );
    } else {
      state.subscriptions = state.subscriptions || [];
      state.subscriptions.push({
        id: makeId("subscription"),
        owner_id: ownerId,
        plan: activePlan,
        monthly_fee: monthlyFee,
        status: "Active",
        last_payment_date: today,
        last_payment_method: "Manual",
        last_payment_note: "Account activated manually by super admin after trial ended.",
        next_billing_date: nextBillingDate,
        provider_payment_status: "Manual",
      });
    }

    state.users = state.users.map((item) => (item.id === ownerId ? { ...item, account_status: "Active" } : item));
    addNotification({
      user_id: ownerId,
      type: "billing",
      title: "Subscription activated",
      message: `The super admin activated your ${activePlan} plan until ${formatDate(nextBillingDate)}.`,
    });
    addAuditLog({
      landlord_id: ownerId,
      action: "Super Admin activated landlord account",
      old_value: subscription?.status || owner.account_status || "Unknown",
      new_value: "Active",
    });
    saveState();
    renderAll();
    showToast(`${owner.name}'s account is active.`);
  }

  async function deleteOwnerAccount(ownerId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can delete landlord accounts.");
      return;
    }

    const owner = userById(ownerId);
    if (!owner || owner.role !== "landlord") {
      showToast("Landlord account was not found.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${owner.name}'s account? This permanently removes their login, properties, rooms, tenants, payments, expenses, support tickets, and notifications.`
    );
    if (!confirmed) return;

    if (supabaseReady) {
      try {
        setAppLoading("Deleting account");
        await apiRequest("/api/admin-user", { action: "delete-account", ownerId });
        await refreshSupabaseState();
        addAuditLog({
          landlord_id: "",
          action: "Super Admin deleted landlord account",
          old_value: `${owner.name} / ${owner.email || owner.phone || ownerId}`,
          new_value: "Deleted",
        });
        saveState();
        showToast(`${owner.name}'s account deleted.`);
      } catch (error) {
        console.error("Account deletion failed", error);
        showToast(error.message || "Could not delete account.");
      } finally {
        clearAppLoading();
      }
      return;
    }

    addAuditLog({
      landlord_id: ownerId,
      action: "Super Admin deleted landlord account",
      old_value: `${owner.name} / ${owner.email || owner.phone || ownerId}`,
      new_value: "Deleted",
    });
    removeOwnerAccountFromLocalState(ownerId);
    saveState();
    renderAll();
    showToast(`${owner.name}'s account deleted.`);
  }

  function removeOwnerAccountFromLocalState(ownerId) {
    const cascade = ownerAccountCascadeIds(ownerId);
    state.payments = (state.payments || []).filter((payment) => !cascade.paymentIds.includes(payment.id));
    state.expenses = (state.expenses || []).filter((expense) => !cascade.expenseIds.includes(expense.id));
    state.tenants = (state.tenants || []).filter((tenant) => !cascade.tenantIds.includes(tenant.id));
    state.units = (state.units || []).filter((unit) => !cascade.unitIds.includes(unit.id));
    state.properties = (state.properties || []).filter((property) => !cascade.propertyIds.includes(property.id));
    state.subscriptions = (state.subscriptions || []).filter((subscription) => !cascade.subscriptionIds.includes(subscription.id));
    state.supportTickets = (state.supportTickets || []).filter((ticket) => !cascade.supportTicketIds.includes(ticket.id));
    state.supportMessages = (state.supportMessages || []).filter((message) => !cascade.supportMessageIds.includes(message.id));
    state.notifications = (state.notifications || []).filter((notification) => !cascade.notificationIds.includes(notification.id));
    state.users = (state.users || []).filter((user) => !cascade.userIds.includes(user.id));
    markRowsDeleted("payments", cascade.paymentIds);
    markRowsDeleted("expenses", cascade.expenseIds);
    markRowsDeleted("tenants", cascade.tenantIds);
    markRowsDeleted("units", cascade.unitIds);
    markRowsDeleted("properties", cascade.propertyIds);
    markRowsDeleted("subscriptions", cascade.subscriptionIds);
    markRowsDeleted("supportTickets", cascade.supportTicketIds);
    markRowsDeleted("supportMessages", cascade.supportMessageIds);
    markRowsDeleted("notifications", cascade.notificationIds);
    markRowsDeleted("users", cascade.userIds);
  }

  function ownerAccountCascadeIds(ownerId) {
    const staffUserIds = (state.users || [])
      .filter((user) => user.company_owner_id === ownerId || user.platform_owner_id === ownerId)
      .map((user) => user.id);
    const userIds = [ownerId, ...staffUserIds];
    const propertyIds = (state.properties || []).filter((property) => property.owner_id === ownerId).map((property) => property.id);
    const unitIds = (state.units || []).filter((unit) => propertyIds.includes(unit.property_id)).map((unit) => unit.id);
    const tenantIds = (state.tenants || []).filter((tenant) => unitIds.includes(tenant.unit_id)).map((tenant) => tenant.id);
    return {
      userIds,
      propertyIds,
      unitIds,
      tenantIds,
      paymentIds: (state.payments || []).filter((payment) => tenantIds.includes(payment.tenant_id)).map((payment) => payment.id),
      expenseIds: (state.expenses || []).filter((expense) => propertyIds.includes(expense.property_id)).map((expense) => expense.id),
      subscriptionIds: (state.subscriptions || []).filter((subscription) => subscription.owner_id === ownerId).map((subscription) => subscription.id),
      supportTicketIds: (state.supportTickets || []).filter((ticket) => ticketOwnerId(ticket) === ownerId).map((ticket) => ticket.id),
      supportMessageIds: (state.supportMessages || []).filter((message) => message.landlord_id === ownerId || message.user_id === ownerId).map((message) => message.id),
      notificationIds: (state.notifications || []).filter((notification) => userIds.includes(notification.user_id)).map((notification) => notification.id),
    };
  }

  async function startCurrentUserSubscriptionPayment(_value, button = null) {
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      showToast("Sign in as the landlord account to subscribe.");
      return;
    }

    const subscription = subscriptionByOwner(user.id);
    if (!landlordAccessLocked(user)) {
      showToast("Your subscription is already active.");
      renderSession();
      return;
    }
    if (!subscription) {
      showToast("Billing is not ready for this account. Contact support.");
      renderSubscriptionLocked();
      return;
    }
    const billableMonthlyFee = subscriptionPlanFee(subscription);
    if (billableMonthlyFee <= 0) {
      showToast("Billing is not ready for this account. Contact support.");
      renderSubscriptionLocked();
      return;
    }
    if (!supabaseReady) {
      showToast("Live Pesapal checkout needs Supabase and Vercel environment variables.");
      return;
    }

    const originalLabel = button?.textContent || "";
    try {
      if (button) {
        button.disabled = true;
        button.textContent = "Opening payment";
      }
      setAppLoading("Opening payment");
      const result = await apiRequest("/api/subscription-payment", {});
      const checkoutUrl = result.payment?.checkout_url || "";
      if (checkoutUrl) {
        showToast("Opening Pesapal checkout.");
        window.location.href = checkoutUrl;
      } else {
        showToast(result.payment?.instruction || "Payment prompt sent.");
      }
      await refreshSupabaseState();
    } catch (error) {
      console.error("Subscription payment failed", error);
      showToast(error.message || "Could not start subscription payment.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel || "Subscribe";
      }
      renderSubscriptionLocked();
      clearAppLoading();
    }
  }

  async function startSubscriptionCollection(subscriptionId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can collect subscription payments.");
      return;
    }
    const subscription = (state.subscriptions || []).find((item) => item.id === subscriptionId);
    if (!subscription) return;
    const owner = userById(subscription.owner_id);
    if (!owner) {
      showToast("Landlord account was not found.");
      return;
    }
    const collectionAmount = subscriptionPlanFee(subscription);
    if (collectionAmount <= 0) {
      showToast("Start billing before collecting this subscription.");
      return;
    }

    if (!supabaseReady) {
      const reference = autoReference("Pesapal");
      state.subscriptions = state.subscriptions.map((item) =>
        item.id === subscription.id
          ? {
              ...item,
              monthly_fee: collectionAmount,
              status: "Pending",
              payment_provider: "pesapal",
              provider_payment_reference: reference,
              provider_payment_status: "Pending",
              provider_next_action: "Demo payment request queued. Landlord pays from Subscribe when live checkout is connected.",
              last_payment_method: item.last_payment_method || "Pesapal checkout",
              last_payment_note: `Demo Pesapal payment requested: ${reference}`,
            }
          : item
      );
      addNotification({
        user_id: owner.id,
        type: "billing",
        title: "Subscription payment requested",
        message: `Demo Pesapal payment requested for ${formatMoney(collectionAmount)}. Reference ${reference}.`,
      });
      addAuditLog({
        landlord_id: owner.id,
        action: "Super Admin requested subscription payment",
        old_value: subscription.provider_payment_status || subscription.status || "Unknown",
        new_value: `Pending ${formatMoney(collectionAmount)} / ${reference}`,
      });
      saveState();
      renderAll();
      showToast("Payment request queued.");
      return;
    }

    try {
      setAppLoading("Starting payment collection");
      const result = await apiRequest("/api/subscription-payment", {
        owner_id: subscription.owner_id,
      });
      const checkoutUrl = result.payment?.checkout_url || "";
      if (checkoutUrl) {
        showToast("Payment request sent.");
      } else {
        showToast(result.payment?.instruction || "Payment request sent.");
      }
      await refreshSupabaseState();
      addAuditLog({
        landlord_id: owner.id,
        action: "Super Admin requested subscription payment",
        old_value: subscription.provider_payment_status || subscription.status || "Unknown",
        new_value: `Pending ${formatMoney(collectionAmount)}`,
      });
      saveState();
    } catch (error) {
      console.error("Payment collection failed", error);
      showToast(error.message || "Could not start payment collection.");
    } finally {
      clearAppLoading();
    }
  }

  function toggleSubscriptionCancellation(subscriptionId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can manage subscription cancellation.");
      return;
    }
    const subscription = (state.subscriptions || []).find((item) => item.id === subscriptionId);
    if (!subscription) return;
    const willCancel = !subscription.cancel_at_period_end;
    state.subscriptions = state.subscriptions.map((item) =>
      item.id === subscriptionId
        ? {
            ...item,
            cancel_at_period_end: willCancel,
            cancellation_requested_at: willCancel ? new Date().toISOString() : null,
            status: item.status === "Cancelled" && !willCancel ? "Active" : item.status,
          }
        : item
    );
    addNotification({
      user_id: subscription.owner_id,
      type: "billing",
      title: willCancel ? "Subscription cancellation queued" : "Subscription resumed",
      message: willCancel
        ? "Your subscription is marked to cancel at the end of the current billing period."
        : "Your subscription is active again for the next billing period.",
    });
    addAuditLog({
      landlord_id: subscription.owner_id,
      action: willCancel ? "Super Admin queued subscription cancellation" : "Super Admin resumed subscription",
      old_value: subscription.cancel_at_period_end ? "Cancelling" : subscription.status || "Active",
      new_value: willCancel ? "Cancelling" : "Active",
    });
    saveState();
    renderAll();
    showToast(willCancel ? "Cancellation queued." : "Subscription resumed.");
  }

  function sendAdminPasswordReset(event) {
    event.preventDefault();
    createAdminPasswordReset(ui.adminPasswordResetUser.value);
  }

  async function createAdminPasswordReset(userId) {
    if (!isSaasOwner()) {
      showToast("Only the super admin can send reset OTPs.");
      return;
    }

    const targetUser = userById(userId);
    if (!targetUser || targetUser.id === currentUser()?.id) {
      showToast("Choose another account to reset.");
      return;
    }

    if (supabaseReady) {
      try {
        await apiRequest("/api/admin-user", { action: "password-reset", userId });
        addNotification({
          type: "support",
          title: "Password reset email sent",
          message: `${targetUser.name} received a secure password reset email.`,
        });
        addAuditLog({
          landlord_id: targetUser.role === "landlord" ? targetUser.id : "",
          action: "Super Admin sent password reset",
          old_value: targetUser.email || targetUser.phone || targetUser.id,
          new_value: "Reset email sent",
        });
        saveState();
        renderNotifications();
        showToast(`Reset email sent to ${maskEmailAddress(targetUser.email)}.`);
      } catch (error) {
        console.error("Admin password reset failed", error);
        showToast(error.message || "Could not send reset email.");
      }
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
    addAuditLog({
      landlord_id: targetUser.role === "landlord" ? targetUser.id : "",
      action: "Super Admin sent password reset",
      old_value: resetEmail,
      new_value: "Reset OTP sent",
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

  function openSupportTicket(id) {
    const ticket = (state.supportTickets || []).find((item) => item.id === id);
    if (!ticket) return;
    const user = userById(ticket.owner_id);
    const resolved = ticket.status === "Resolved";
    openDashboardDetailModal(
      ticket.subject || "Support Ticket",
      `${user ? user.name : "Unknown landlord"} - ${ticket.priority || "Medium"} - ${formatDate(ticket.updated_at)}`,
      `
        <article class="support-card">
          <div class="support-card-header">
            <div class="support-card-title">
              <strong>${escapeHtml(ticket.subject || "Support Ticket")}</strong>
              <small>${escapeHtml(user ? user.name : "Unknown landlord")} - ${formatDate(ticket.updated_at)}</small>
            </div>
            <div class="button-row">
              ${statusPill(ticket.priority || "Medium")}
              ${statusPill(ticket.status || "Open")}
            </div>
          </div>
          <p class="support-note">${escapeHtml(ticket.note || "No message added.")}</p>
          <div class="button-row">
            ${
              ticket.owner_id
                ? `<button class="text-button" data-impersonate-landlord="${escapeHtml(ticket.owner_id)}" type="button">Open Account</button>`
                : ""
            }
            <button class="${resolved ? "text-button" : "primary-button"}" data-toggle-ticket="${escapeHtml(ticket.id)}" type="button">
              ${resolved ? "Reopen" : "Mark Resolved"}
            </button>
          </div>
        </article>
      `
    );
  }

  function focusLandlordAccount(ownerId) {
    const user = userById(ownerId);
    if (!user) return;
    state.searchTerm = "";
    highlightedOwnerId = ownerId;
    saveState();
    ui.globalSearch.value = state.searchTerm;
    renderAll();
    setView("platformLandlords");
    revealOwnerRow(ownerId);
    showToast(`Highlighted Account Management for ${user.name}.`);
  }

  function revealOwnerRow(ownerId) {
    const row = document.querySelector(`[data-owner-row="${ownerId}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    window.clearTimeout(revealOwnerRow.timer);
    revealOwnerRow.timer = window.setTimeout(() => {
      if (highlightedOwnerId === ownerId) highlightedOwnerId = null;
      row.classList.remove("row-highlight");
    }, 3000);
  }

  function startLandlordImpersonation(ownerId) {
    const admin = currentUser();
    const landlord = userById(ownerId);
    if (!admin || !isSaasOwner(admin) || !landlord || landlord.role !== "landlord") {
      showToast("Only the super admin can impersonate landlord accounts.");
      return;
    }
    impersonationContext = { adminId: admin.id, landlordId: landlord.id };
    addAuditLog({
      landlord_id: landlord.id,
      action: `Super Admin started impersonation for ${landlord.name}`,
      old_value: admin.name,
      new_value: landlord.name,
    });
    state.currentUserId = landlord.id;
    state.role = "landlord";
    state.selectedPropertyId = "all";
    saveState();
    renderSession();
    setView("dashboard");
    showToast(`Viewing ${landlord.name} as Super Admin.`);
  }

  function exitLandlordImpersonation() {
    if (!impersonationContext?.adminId) return;
    const landlord = userById(impersonationContext.landlordId);
    const adminId = impersonationContext.adminId;
    addAuditLog({
      landlord_id: impersonationContext.landlordId,
      action: `Super Admin exited impersonation${landlord ? ` for ${landlord.name}` : ""}`,
      old_value: landlord ? landlord.name : "",
      new_value: "Super Admin",
    });
    impersonationContext = null;
    state.currentUserId = adminId;
    state.role = "saas-owner";
    state.selectedPropertyId = "all";
    saveState();
    renderSession();
    showToast("Exited impersonation.");
  }

  function renderImpersonationBanner() {
    if (!ui.impersonationBanner) return;
    const active = Boolean(impersonationContext?.adminId);
    const landlord = active ? userById(impersonationContext.landlordId) : null;
    ui.impersonationBanner.classList.toggle("hidden", !active);
    if (active && ui.impersonationBannerText) {
      ui.impersonationBannerText.textContent = `You are currently viewing ${landlord ? landlord.name : "this account"} as Super Admin.`;
    }
  }

  function openLandlordPortfolio(ownerId) {
    const portfolio = ownerPortfolio(ownerId);
    state.selectedPropertyId = portfolio.properties[0]?.id || "all";
    saveState();
    renderAll();
    setView(isSaasOwner() ? "platformLandlords" : "properties");
    showToast(`Opened ${ownerName(ownerId)} portfolio.`);
  }

  function openReceipt(paymentId) {
    const payment = state.payments.find((item) => item.id === paymentId);
    if (!payment) return;
    closeDashboardDetailModal();
    const details = receiptDetails(payment);
    const phone = details.tenant ? normalizePhone(details.tenant.phone) : "";
    const receiptMessage = paymentReceiptMessage(payment);
    ui.receiptContent.innerHTML = `
      <div class="receipt-brand">
        <strong>RentLedger UG</strong>
        <span>Receipt ${escapeHtml(details.receiptNo)}</span>
      </div>
      <div class="receipt-grid">
        <span>Receipt No.</span><strong>${escapeHtml(details.receiptNo)}</strong>
        <span>Landlord</span><strong>${escapeHtml(details.ownerName)}</strong>
        <span>Tenant</span><strong>${escapeHtml(details.tenantName)}</strong>
        <span>Property</span><strong>${escapeHtml(details.propertyName)}</strong>
        <span>Room</span><strong>${escapeHtml(details.unitNumber)}</strong>
        <span>Amount Paid</span><strong>${formatMoney(payment.amount)}</strong>
        <span>Balance</span><strong>${formatMoney(payment.balance)}</strong>
        <span>Method</span><strong>${escapeHtml(payment.payment_method)}</strong>
        <span>Payment Ref.</span><strong>${escapeHtml(payment.reference || "-")}</strong>
        <span>Proof</span><strong>${escapeHtml(payment.payment_proof || "-")}</strong>
        <span>Verification</span><strong>${escapeHtml(payment.verification_status || "Unverified")}</strong>
        <span>Date</span><strong>${formatDate(payment.payment_date)}</strong>
      </div>
      <p class="receipt-note">This receipt confirms rent payment captured in RentLedger UG.</p>
    `;
    ui.receiptModal.dataset.paymentId = paymentId;
    ui.receiptModal.dataset.receiptNumber = details.receiptNo;
    if (details.tenant && phone) {
      ui.shareReceiptWhatsApp.href = `https://wa.me/${phone}?text=${encodeURIComponent(receiptMessage)}`;
      ui.shareReceiptWhatsApp.classList.remove("hidden");
    } else {
      ui.shareReceiptWhatsApp.href = "#";
      ui.shareReceiptWhatsApp.classList.add("hidden");
    }
    ui.receiptModal.classList.remove("hidden");
  }

  function closeReceipt() {
    ui.receiptModal.classList.add("hidden");
  }

  function printReceipt() {
    window.print();
  }

  function downloadReceipt() {
    const payment = state.payments.find((item) => item.id === ui.receiptModal.dataset.paymentId);
    if (!payment) return;
    const details = receiptDetails(payment);
    const pdf = buildReceiptPdf(details);
    downloadBlobFile(`rentledger-receipt-${details.receiptNo}.pdf`, pdf, "application/pdf");
  }

  function receiptDetails(payment) {
    const tenant = tenantById(payment.tenant_id);
    const unit = tenant ? unitById(tenant.unit_id) : null;
    const property = unit ? propertyById(unit.property_id) : null;
    const owner = property ? userById(property.owner_id) : currentUser();
    return {
      payment,
      tenant,
      unit,
      property,
      owner,
      receiptNo: receiptNumber(payment),
      ownerName: owner ? owner.name : "Landlord",
      tenantName: tenant ? tenant.name : "Removed tenant",
      propertyName: property ? property.property_name : "Unknown",
      unitNumber: unit ? unit.unit_number : "Unassigned",
    };
  }

  function buildReceiptPdf(details) {
    const { payment } = details;
    const lines = [
      "RentLedger UG",
      `Receipt ${details.receiptNo}`,
      "",
      `Landlord: ${details.ownerName}`,
      `Tenant: ${details.tenantName}`,
      `Property: ${details.propertyName}`,
      `Room: ${details.unitNumber}`,
      `Amount Paid: ${formatMoney(payment.amount)}`,
      `Balance: ${formatMoney(payment.balance)}`,
      `Method: ${payment.payment_method}`,
      `Payment Ref.: ${payment.reference || "-"}`,
      `Proof: ${payment.payment_proof || "-"}`,
      `Verification: ${payment.verification_status || "Unverified"}`,
      `Date: ${formatDate(payment.payment_date)}`,
      "",
      "This receipt confirms rent payment captured in RentLedger UG.",
    ];
    return simplePdfBlob(lines);
  }

  function simplePdfBlob(lines) {
    const pageWidth = 595;
    const pageHeight = 842;
    const content = [
      "BT",
      "/F1 18 Tf",
      "50 790 Td",
      ...pdfTextLines(lines, pageHeight),
      "ET",
    ].join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  }

  function pdfTextLines(lines) {
    return lines
      .map((line, index) => {
        const fontCommand = index === 0 ? "" : index === 1 ? "/F1 13 Tf\n" : index === 2 ? "/F1 11 Tf\n" : "";
        const move = index === 0 ? "" : "0 -24 Td\n";
        return `${fontCommand}${move}(${escapePdfText(line)}) Tj`;
      })
      .join("\n");
  }

  function escapePdfText(value) {
    return String(value || "")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
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
      "Tenant | Room | Amount | Method | Reference | Proof | Verification | Date | Balance",
      ...payments.map((payment) => {
        const tenant = tenantById(payment.tenant_id);
        const unit = tenant ? unitById(tenant.unit_id) : null;
        return [
          tenant ? tenant.name : "Removed tenant",
          unit ? unit.unit_number : "Unassigned",
          formatMoney(payment.amount),
          payment.payment_method,
          payment.reference || "-",
          payment.payment_proof || "-",
          payment.verification_status || "Unverified",
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

  async function importTenantsCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (supabaseReady && !(await requireSupabaseWriteSession("Sign in again to import tenants across devices."))) return;
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        showToast("CSV file is empty.");
        return;
      }
      const scope = getScopedData();
      const vacantUnits = scope.units.filter((unit) => unit.status === "vacant");
      const unitsByNumber = new Map(vacantUnits.map((unit) => [String(unit.unit_number).trim().toLowerCase(), unit]));
      const imported = [];
      rows.forEach((row) => {
        const unitNumber = String(row.unit_number || row.unit || row.room || "").trim().toLowerCase();
        const unit = unitsByNumber.get(unitNumber);
        if (!unit || !row.name || !row.phone) return;
        imported.push({
          id: makeId("tenant"),
          unit_id: unit.id,
          name: String(row.name).trim(),
          phone: String(row.phone).trim(),
          national_id: String(row.national_id || row.nationalid || "").trim(),
          rent_amount: Number(row.rent_amount || row.rent || unit.rent_amount || 0),
          deposit_paid: Number(row.deposit_paid || row.deposit || 0),
          move_in_date: normalizeCsvDate(row.move_in_date || row.movein || row.move_in) || isoDate(new Date()),
          status: "active",
          move_out_date: null,
          move_out_balance: 0,
          move_out_damages: 0,
          move_out_refund: 0,
          move_out_note: "",
        });
        unitsByNumber.delete(unitNumber);
      });
      if (!imported.length) {
        showToast("No tenants imported. Match CSV unit_number values to vacant rooms.");
        return;
      }
      state.tenants.push(...imported);
      imported.forEach((tenant) => setUnitStatus(tenant.unit_id, "occupied"));
      addNotification({
        type: "tenant",
        title: "Tenant CSV imported",
        message: `${imported.length} tenant records were imported from ${file.name}.`,
      });
      saveState();
      renderAll();
      showToast(`${imported.length} tenants imported.`);
    } catch (error) {
      console.error("Tenant CSV import failed", error);
      showToast(error.message || "Could not import tenant CSV.");
    } finally {
      event.target.value = "";
    }
  }

  function exportTenantsCsv() {
    const scope = getScopedData();
    const rows = scope.tenants.map((tenant) => {
      const unit = unitById(tenant.unit_id);
      const property = unit ? propertyById(unit.property_id) : null;
      return {
        name: tenant.name,
        phone: tenant.phone,
        national_id: tenant.national_id || "",
        property: property ? property.property_name : "",
        unit_number: unit ? unit.unit_number : "",
        rent_amount: tenant.rent_amount,
        deposit_paid: tenant.deposit_paid,
        move_in_date: tenant.move_in_date,
        status: tenantStatusLabel(tenant),
        move_out_date: tenant.move_out_date || "",
      };
    });
    const headers = ["name", "phone", "national_id", "property", "unit_number", "rent_amount", "deposit_paid", "move_in_date", "status", "move_out_date"];
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
    ].join("\n");
    downloadTextFile(`rentledger-tenants-${isoDate(new Date())}.csv`, csv);
    showToast("Tenant CSV exported.");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    const [headerRow, ...dataRows] = rows.filter((item) => item.some((value) => String(value).trim()));
    if (!headerRow) return [];
    const headers = headerRow.map((header) => String(header).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"));
    return dataRows.map((values) =>
      headers.reduce((result, header, index) => {
        result[header] = String(values[index] || "").trim();
        return result;
      }, {})
    );
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function normalizeCsvDate(value) {
    const raw = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? isoDate(date) : "";
  }

  function downloadBackup() {
    const user = currentUser();
    const scoped = getScopedData();
    const payload = {
      app: "RentLedger UG",
      exported_at: new Date().toISOString(),
      exported_by: user ? { id: user.id, name: user.name, role: user.role, phone: user.phone, email: user.email } : null,
      scope: isSaasOwner(user) ? "platform" : "current account",
      data: isSaasOwner(user)
        ? {
            users: state.users,
            subscriptions: state.subscriptions,
            properties: state.properties,
            units: state.units,
            tenants: state.tenants,
            payments: state.payments,
            expenses: state.expenses,
            supportTickets: state.supportTickets,
            notifications: state.notifications,
          }
        : {
            properties: scoped.properties,
            units: scoped.units,
            tenants: scoped.tenants,
            payments: scoped.payments,
            expenses: scoped.expenses,
            notifications: platformNotifications(),
          },
    };
    downloadTextFile(`rentledger-backup-${isoDate(new Date())}.json`, JSON.stringify(payload, null, 2));
    showToast("Backup exported.");
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain" });
    downloadBlobFile(filename, blob, "text/plain");
  }

  function downloadBlobFile(filename, blob, type = "application/octet-stream") {
    const fileBlob = blob instanceof Blob ? blob : new Blob([blob], { type });
    const url = URL.createObjectURL(fileBlob);
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
    return user.account_status || (user.role === "staff" ? user.invitation_status || "Login Created" : "Active");
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

  function planLimitForOwner(ownerId, owner = null) {
    const subscription = subscriptionByOwner(ownerId);
    const plan = subscription?.plan || owner?.subscription_plan || owner?.plan || "Trial";
    return {
      plan,
      ...(PLAN_LIMITS[plan] || PLAN_LIMITS.Trial),
    };
  }

  function planAllowsPublicListings(plan) {
    return Boolean((PLAN_LIMITS[plan] || PLAN_LIMITS.Trial).publicListings);
  }

  function ownerCanPublishPublicListings(ownerId, owner = null) {
    return planAllowsPublicListings(planLimitForOwner(ownerId, owner).plan);
  }

  function ownerHasVerifiedBadge(owner) {
    if (!owner) return false;
    return Boolean(owner.verified_badge) || Boolean(owner.verified) || Boolean(resolvedVerifiedBadgeRequestForOwner(owner.id));
  }

  function limitLabel(value) {
    return Number.isFinite(value) ? String(value) : "unlimited";
  }

  function limitPhrase(value, singular, plural) {
    return `${limitLabel(value)} ${value === 1 ? singular : plural}`;
  }

  function renderPlanLimitNotice() {
    if (!ui.planLimitNotice) return;
    const user = currentUser();
    if (!user || user.role !== "landlord") {
      ui.planLimitNotice.classList.add("hidden");
      return;
    }
    const limit = planLimitForOwner(user.id);
    const portfolio = ownerPortfolio(user.id);
    const caretakers = staffUsersForOwner(user.id).length;
    const usage = [
      `${portfolio.properties.length}/${limitLabel(limit.properties)} properties`,
      `${portfolio.units.length}/${limitLabel(limit.units)} units`,
      `${caretakers}/${limitLabel(limit.caretakers)} caretakers`,
    ];
    const atLimit =
      portfolio.properties.length >= limit.properties ||
      portfolio.units.length >= limit.units ||
      caretakers >= limit.caretakers;
    ui.planLimitNotice.className = `plan-limit-note setup-limit-note ${atLimit ? "warning" : ""}`;
    ui.planLimitNotice.textContent = `${limit.plan} plan usage: ${usage.join(" - ")}. ${
      limit.publicListings ? "Public listings included." : "Public listings unlock on Professional."
    }`;
    ui.planLimitNotice.classList.remove("hidden");
  }

  function caretakerLimitForOwner(ownerId) {
    const limit = planLimitForOwner(ownerId);
    if (limit.plan === "Starter") {
      return {
        plan: limit.plan,
        max: limit.caretakers,
        label: limitLabel(limit.caretakers),
        upgradeMessage: "Starter plan includes 1 caretaker account. Upgrade to Professional to add more caretakers.",
      };
    }
    if (limit.plan === "Trial") {
      return {
        plan: limit.plan,
        max: limit.caretakers,
        label: limitLabel(limit.caretakers),
        upgradeMessage: "Upgrade to Starter or Professional before inviting caretaker accounts.",
      };
    }
    return {
      plan: limit.plan,
      max: limit.caretakers,
      label: limitLabel(limit.caretakers),
      upgradeMessage: "",
    };
  }

  function caretakerLimitMessage(limit, count) {
    if (limit.plan === "Starter") {
      return count >= limit.max
        ? "Starter includes 1 caretaker. Upgrade to Professional to add more."
        : "Starter includes 1 caretaker account.";
    }
    if (limit.plan === "Trial") return "Trial accounts cannot add caretakers. Upgrade to Starter or Professional.";
    return `${limit.plan} allows ${limit.label} caretaker accounts.`;
  }

  function isSaasOwner(user = currentUser()) {
    return Boolean(user && user.role === "saas-owner");
  }

  function roleLabel(role) {
    if (role === "saas-owner") return "Super Admin";
    if (role === "staff") return "Caretaker";
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

  function addAuditLog({ landlord_id = "", action, old_value = "", new_value = "" }) {
    state.auditLogs = state.auditLogs || [];
    state.auditLogs.unshift({
      id: makeId("audit"),
      admin_id: impersonationContext?.adminId || (isSaasOwner() ? currentUser()?.id : SUPER_ADMIN_USER_ID),
      landlord_id,
      action,
      old_value: String(old_value || ""),
      new_value: String(new_value || ""),
      created_at: new Date().toISOString(),
    });
  }

  function addNotification(notification) {
    state.notifications = state.notifications || [];
    state.notifications.unshift({
      id: makeId("notification"),
      created_at: new Date().toISOString(),
      read: false,
      is_read: false,
      user_id: notification.user_id === undefined ? currentUser()?.id || null : notification.user_id,
      ...notification,
    });
  }

  function isSuperAdminSupportNotification(row) {
    return row?.user_id === SUPER_ADMIN_USER_ID && row?.type === "support";
  }

  function isAdminNotificationVisible(notification, adminId) {
    const type = String(notification?.type || "").toLowerCase();
    if (["rent", "property", "payment", "expense"].includes(type)) return false;
    return !notification.user_id || notification.user_id === adminId || isSuperAdminSupportNotification(notification);
  }

  function platformNotifications() {
    const user = currentUser();
    const isAdmin = isSaasOwner(user);
    const storedNotifications = (state.notifications || []).filter((notification) =>
      isAdmin ? isAdminNotificationVisible(notification, user?.id) : !notification.user_id || notification.user_id === user?.id
    );
    if (isAdmin) return storedNotifications;

    const rows = [];
    const scope = getScopedData();
    const rentRows = getRentRows(scope.tenants.filter(isActiveTenant));
    const dismissed = state.dismissedNotificationIds || [];
    const overdueRows = rentRows.filter((row) => row.status === "Overdue");
    const dueTomorrowRows = rentRows.filter((row) => row.daysUntilDue === 1 && row.balance > 0);
    const vacantUnits = scope.units.filter((unit) => unit.status === "vacant");

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
    const unread = notifications.filter((item) => !isNotificationRead(item));
    ui.notificationCount.textContent = unread.length;
    ui.notificationList.innerHTML =
      notifications
        .slice(0, 8)
        .map((item) => `
          <button class="notification-item ${isNotificationRead(item) ? "read" : ""}" data-open-notification="${escapeHtml(item.id)}" type="button">
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
    const item = findNotificationById(id);
    if (!item) {
      showToast("Notification no longer available.");
      return;
    }
    ui.notificationModalTitle.textContent = item.title;
    ui.notificationModalMeta.textContent = `${notificationTypeLabel(item.type)} - ${timeAgo(item.created_at || item.date)}`;
    ui.notificationModalMessage.textContent = item.message;
    ui.notificationModal.classList.remove("hidden");
    markNotificationRead(id);
    ui.notificationPanel.classList.add("hidden");
    ui.notificationToggle.setAttribute("aria-expanded", "false");
  }

  function findNotificationById(id) {
    return (
      platformNotifications().find((notification) => notification.id === id) ||
      (state.notifications || []).find((notification) => notification.id === id) ||
      null
    );
  }

  function closeNotificationModal() {
    ui.notificationModal.classList.add("hidden");
  }

  function markNotificationRead(id) {
    const storedNotification = (state.notifications || []).some((item) => item.id === id);
    if (storedNotification) {
      state.notifications = (state.notifications || []).map((item) =>
        item.id === id ? { ...item, read: true, is_read: true } : item
      );
    } else {
      state.dismissedNotificationIds = [...new Set([...(state.dismissedNotificationIds || []), id])];
    }
    saveState();
    renderNotifications();
    if (isSaasOwner()) {
      renderPlatformDetailPage();
      renderPlatformSupport();
      renderPlatformReports();
    }
  }

  function markNotificationsRead() {
    const user = currentUser();
    state.notifications = (state.notifications || []).map((item) =>
      !item.user_id || item.user_id === user?.id ? { ...item, read: true, is_read: true } : item
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
    if (type === "announcement") return "Admin message";
    if (type === "billing") return "Billing";
    if (type === "staff") return "Caretaker";
    return "Notification";
  }

  function getRentRows(tenants) {
    const today = stripTime(new Date());
    return tenants.map((tenant) => {
      const dueDate = getMonthlyDueDate(tenant.move_in_date);
      const monthlyRent = Number(tenant.rent_amount);
      const paid = currentMonthPaid(tenant.id);
      const balance = Math.max(0, monthlyRent - paid);
      const advance = Math.max(0, paid - monthlyRent);
      const daysUntilDue = Math.round((dueDate - today) / 86400000);
      let status = "Paid";
      if (advance > 0) status = "Advance";
      if (balance > 0 && daysUntilDue < 0) status = "Overdue";
      if (balance > 0 && daysUntilDue >= 0) status = paid > 0 ? "Partial" : "Due";
      return {
        tenant,
        unit: unitById(tenant.unit_id),
        paid,
        balance,
        advance,
        carryForward: daysUntilDue < 0 ? balance : 0,
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
    const totalAfterPayment = paid + amount;
    const afterBalance = Math.max(0, Number(tenant.rent_amount) - totalAfterPayment);
    const afterAdvance = Math.max(0, totalAfterPayment - Number(tenant.rent_amount));
    const dueDate = getMonthlyDueDate(tenant.move_in_date);
    const carriedText = afterBalance > 0 && dueDate < stripTime(new Date()) ? ` - Carried forward ${formatMoney(afterBalance)}` : "";
    const advanceText = afterAdvance > 0 ? ` - Advance ${formatMoney(afterAdvance)}` : "";
    ui.tenantBalancePreview.innerHTML = `
      <strong>${escapeHtml(tenant.name)}</strong><br>
      Rent ${formatMoney(tenant.rent_amount)} - Paid ${formatMoney(paid)} - Balance after payment ${formatMoney(afterBalance)}${carriedText}${advanceText}
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
            listing_published: false,
          }
        : unit
    );
  }

  function tenantById(id) {
    return state.tenants.find((tenant) => tenant.id === id);
  }

  function isActiveTenant(tenant) {
    return String(tenant?.status || "active").toLowerCase() !== "moved_out";
  }

  function tenantStatusLabel(tenant) {
    return isActiveTenant(tenant) ? "Active" : "Moved Out";
  }

  function unitById(id) {
    return state.units.find((unit) => unit.id === id);
  }

  function propertyById(id) {
    return state.properties.find((property) => property.id === id);
  }

  function isCurrentMonth(value) {
    const date = parseDateValue(value);
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  function isMonth(value, targetMonthKey) {
    const date = parseDateValue(value);
    return Boolean(date && monthKey(date) === targetMonthKey);
  }

  function parseDateValue(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const text = String(value);
    const date = text.includes("T") ? new Date(text) : new Date(`${text}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
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
    const dueDate = formatDate(isoDate(row.dueDate));
    if (row.status === "Overdue") {
      return `Hello ${row.tenant.name}, this is a kind reminder that your rent balance of ${formatMoney(row.balance)} for ${row.unit ? row.unit.unit_number : "your room"} was due on ${dueDate}. Kindly arrange payment at your earliest convenience, and let us know if you have already paid. Thank you.`;
    }
    if (row.daysUntilDue === 1) {
      return `Hello ${row.tenant.name}, this is a kind reminder that your rent of ${formatMoney(row.tenant.rent_amount)} for ${row.unit ? row.unit.unit_number : "your room"} is due tomorrow. Kindly prepare payment when convenient. Thank you.`;
    }
    return `Hello ${row.tenant.name}, this is a kind reminder that your rent balance of ${formatMoney(row.balance)} for ${row.unit ? row.unit.unit_number : "your room"} is due on ${dueDate}. Kindly arrange payment by the due date. Thank you.`;
  }

  function paymentReceiptMessage(payment) {
    const tenant = tenantById(payment.tenant_id);
    const unit = tenant ? unitById(tenant.unit_id) : null;
    return [
      `Hello ${tenant ? tenant.name : "tenant"}, rent payment received.`,
      `Receipt: ${receiptNumber(payment)}.`,
      `Amount: ${formatMoney(payment.amount)}.`,
      `Room: ${unit ? unit.unit_number : "Unassigned"}.`,
      `Date: ${formatDate(payment.payment_date)}.`,
      `Balance: ${formatMoney(payment.balance)}.`,
      `Reference: ${payment.reference || "-"}.`,
      "Thank you.",
    ].join(" ");
  }

  function tenantWhatsAppMessage(tenant) {
    const row = getRentRows([tenant])[0];
    if (row) return reminderMessage(row);
    return `Hello ${tenant.name}, this is a message from your landlord. Thank you.`;
  }

  function tenantContactActions(tenant, message, options = {}) {
    if (!tenant) return "";
    const compactClass = options.compact ? " compact-link-button" : "";
    const sendLabel = options.sendLabel || "Send WhatsApp";
    const phone = normalizePhone(tenant.phone);
    const encodedMessage = encodeURIComponent(message);
    return `
      <button class="primary-button${compactClass}" data-send-whatsapp="${escapeHtml(tenant.id)}" data-whatsapp-message="${encodedMessage}" type="button">${escapeHtml(sendLabel)}</button>
      <a class="text-button link-button${compactClass}" href="${escapeHtml(whatsappUrl(phone, message))}" target="_blank" rel="noreferrer">Open WhatsApp</a>
      <a class="ghost-button link-button${compactClass}" href="tel:${escapeHtml(phone)}">Call</a>
    `;
  }

  function whatsappUrl(phone, message) {
    return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
  }

  async function sendWhatsAppMessage(tenantId, button) {
    const tenant = getScopedData().tenants.find((item) => item.id === tenantId);
    if (!tenant) {
      showToast("Tenant is not available in your assigned properties.");
      return;
    }
    const message = decodeURIComponent(button?.dataset.whatsappMessage || "");
    if (!message) {
      showToast("No WhatsApp message found.");
      return;
    }

    if (!supabaseReady) {
      window.open(whatsappUrl(tenant.phone, message), "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setAppLoading("Sending WhatsApp");
      await apiRequest("/api/whatsapp", {
        tenant_id: tenant.id,
        message,
      });
      addNotification({
        type: "reminder",
        title: "WhatsApp sent",
        message: `Message sent to ${tenant.name}.`,
      });
      saveState();
      renderAll();
      showToast("WhatsApp message sent.");
    } catch (error) {
      console.error("WhatsApp send failed", error);
      showToast(error.message || "Could not send WhatsApp. Use Open WhatsApp instead.");
    } finally {
      clearAppLoading();
    }
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
    if (ui.resetOtpLabel) ui.resetOtpLabel.classList.remove("hidden");
    ui.resetOtp.required = true;
  }

  function setTodayDefaults() {
    const today = isoDate(new Date());
    ui.tenantMoveIn.value = ui.tenantMoveIn.value || today;
    ui.paymentDate.value = today;
    ui.expenseDate.value = today;
    if (ui.ownerPaymentDate) ui.ownerPaymentDate.value = today;
  }

  function resetDemoData() {
    if (supabaseReady) {
      showToast("Demo reset is disabled while the live database is connected.");
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    deleteStateFromIndexedDB().catch((error) => console.warn("Could not clear IndexedDB demo data", error));
    const fresh = migrateState(seedState());
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, fresh);
    saveState();
    renderSession();
    showToast("Demo data reset.");
  }

  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return migrateState(seedState());
    try {
      return migrateState(JSON.parse(saved));
    } catch (error) {
      return migrateState(seedState());
    }
  }

  async function hydrateStateFromSupabase() {
    const client = await createSupabaseClient();
    if (!client) return;

    supabaseReady = true;
    supabaseHydrating = true;
    try {
      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData.session;
      supabaseSessionActive = Boolean(session?.access_token);
      toggleProductionDemoControls();

      if (!session?.user) {
        const remote = await safeFetchPublicSupabaseState(client);
        replaceState(anonymousStateWithPublicListings(remote));
        saveLocalStateOnly();
        return;
      }

      const remote = applyDeletedRowIdsToStateRows(await fetchSupabaseState(client), state.deletedRowIds);
      const sessionState = {
        currentUserId: session.user.id,
        selectedPropertyId: state.selectedPropertyId,
        role: state.role,
        searchTerm: state.searchTerm,
      };
      replaceState(migrateState({ ...emptyState(), ...remote, ...sessionState }));
      saveLocalStateOnly();
      await syncPendingDeletedRows();
    } catch (error) {
      console.error("Supabase sync failed", error);
      saveLocalStateOnly();
      showToast("Could not refresh Supabase. Your browser copy is still saved.");
    } finally {
      supabaseHydrating = false;
    }
  }

  function toggleProductionDemoControls() {
    document.querySelectorAll(".demo-account-panel, [data-start-demo]").forEach((element) => {
      element.classList.toggle("hidden", supabaseReady);
    });
  }

  async function createSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const config = await resolveSupabaseConfig();
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

  async function resolveSupabaseConfig() {
    if (isSupabaseConfigReady(window.RENTLEDGER_SUPABASE)) return window.RENTLEDGER_SUPABASE;
    if (resolveSupabaseConfig.promise) return resolveSupabaseConfig.promise;

    resolveSupabaseConfig.promise = fetch("/api/supabase-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (isSupabaseConfigReady(config)) {
          window.RENTLEDGER_SUPABASE = config;
          return config;
        }
        return window.RENTLEDGER_SUPABASE || null;
      })
      .catch(() => window.RENTLEDGER_SUPABASE || null);
    return resolveSupabaseConfig.promise;
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
    for (const { stateKey, table, optional } of SUPABASE_TABLES) {
      const { data, error } = await client.from(table).select("*");
      if (error) {
        if (optional && isMissingSupabaseTableError(error, table)) {
          console.warn(`Supabase table ${table} is missing. Run supabase-support-center-migration.sql to enable this module.`);
          remote[stateKey] = [];
          continue;
        }
        throw error;
      }
      remote[stateKey] = (data || []).map((row) => fromSupabaseRow(stateKey, row));
    }

    remote.dismissedNotificationIds = state.dismissedNotificationIds || [];
    remote.passwordReset = state.passwordReset || null;
    remote.deletedRowIds = state.deletedRowIds || {};
    return remote;
  }

  function isMissingSupabaseTableError(error, table = "") {
    const missingTable = missingSupabaseTableName(error);
    return Boolean(missingTable && (!table || missingTable === normalizeSupabaseTableName(table)));
  }

  function missingSupabaseSchemaItem(error) {
    return missingSupabaseTableName(error) || missingSupabaseColumnName(error);
  }

  function missingSupabaseTableName(error) {
    const text = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" ");
    const schemaCacheMatch = text.match(/Could not find the table '([^']+)' in the schema cache/i);
    if (schemaCacheMatch) return normalizeSupabaseTableName(schemaCacheMatch[1]);
    const relationMatch = text.match(/relation "([^"]+)" does not exist/i);
    if (relationMatch) return normalizeSupabaseTableName(relationMatch[1]);
    return "";
  }

  function missingSupabaseColumnName(error) {
    const text = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" ");
    const schemaCacheMatch = text.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
    return schemaCacheMatch ? schemaCacheMatch[1] : "";
  }

  function normalizeSupabaseTableName(value) {
    return String(value || "")
      .replace(/"/g, "")
      .split(".")
      .pop();
  }

  async function fetchPublicSupabaseState(client) {
    const apiState = await fetchPublicListingsFromApi();
    if (apiState) return apiState;

    const [
      { data: units, error: unitsError },
      { data: properties, error: propertiesError },
      { data: users, error: usersError },
      { data: subscriptions, error: subscriptionsError },
    ] =
      await Promise.all([
        client.from("units").select("*").eq("status", "vacant").eq("listing_published", true),
        client.from("properties").select("id,owner_id,property_name,location,property_type"),
        client.from("app_users").select("id,name,phone,email,account_status,verified_badge,verification_label,created_at"),
        client.from("subscriptions").select("id,owner_id,plan,status,monthly_fee"),
      ]);

    if (unitsError) throw unitsError;
    if (propertiesError) throw propertiesError;
    if (usersError) throw usersError;
    if (subscriptionsError) throw subscriptionsError;

    return {
      users: (users || []).map((row) => fromSupabaseRow("users", row)),
      properties: (properties || []).map((row) => fromSupabaseRow("properties", row)),
      units: (units || []).map((row) => fromSupabaseRow("units", row)),
      subscriptions: (subscriptions || []).map((row) => fromSupabaseRow("subscriptions", row)),
      dismissedNotificationIds: state.dismissedNotificationIds || [],
      passwordReset: state.passwordReset || null,
      deletedRowIds: state.deletedRowIds || {},
    };
  }

  async function fetchPublicListingsFromApi() {
    try {
      const response = await fetch("/api/vacancies", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load vacancies.");
      const listings = payload.listings || [];
      return {
        users: uniqueBy(listings.map((item) => item.owner).filter(Boolean), "id").map((row) => fromSupabaseRow("users", row)),
        properties: uniqueBy(listings.map((item) => item.property).filter(Boolean), "id").map((row) =>
          fromSupabaseRow("properties", row)
        ),
        units: listings.map((item) => fromSupabaseRow("units", item.unit)),
        subscriptions: [],
        dismissedNotificationIds: state.dismissedNotificationIds || [],
        passwordReset: state.passwordReset || null,
        deletedRowIds: state.deletedRowIds || {},
      };
    } catch (error) {
      console.error("Public vacancies API failed", error);
      return null;
    }
  }

  function uniqueBy(rows, key) {
    const seen = new Set();
    return rows.filter((row) => {
      const value = row && row[key];
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  async function safeFetchPublicSupabaseState(client) {
    try {
      return await fetchPublicSupabaseState(client);
    } catch (error) {
      console.error("Public Supabase listings failed", error);
      return {
        dismissedNotificationIds: state.dismissedNotificationIds || [],
        passwordReset: state.passwordReset || null,
        deletedRowIds: state.deletedRowIds || {},
      };
    }
  }

  function anonymousStateWithPublicListings(remote = {}) {
    return migrateState({
      ...state,
      users: mergeRowsPreservingLocal(state.users, remote.users),
      properties: mergeRowsPreservingLocal(state.properties, remote.properties),
      units: mergeRowsPreservingLocal(state.units, remote.units),
      subscriptions: mergeRowsPreservingLocal(state.subscriptions, remote.subscriptions),
      dismissedNotificationIds: state.dismissedNotificationIds || remote.dismissedNotificationIds || [],
      passwordReset: state.passwordReset || remote.passwordReset || null,
      deletedRowIds: state.deletedRowIds || remote.deletedRowIds || {},
      currentUserId: null,
      selectedPropertyId: "all",
      role: "landlord",
      searchTerm: state.searchTerm,
    });
  }

  function mergeRowsPreservingLocal(localRows = [], remoteRows = []) {
    const rowsById = new Map();
    (remoteRows || []).filter((row) => row?.id).forEach((row) => rowsById.set(row.id, row));
    (localRows || []).filter((row) => row?.id).forEach((row) => rowsById.set(row.id, { ...rowsById.get(row.id), ...row }));
    return [...rowsById.values()];
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
        role: row.role || "landlord",
        account_status: row.account_status || "Active",
        created_at: row.created_at || new Date().toISOString(),
        company_owner_id: row.company_owner_id || undefined,
        assigned_property_ids: row.assigned_property_ids || [],
        invitation_status: row.invitation_status || undefined,
        profile_photo: row.profile_photo || "",
        verified: Boolean(row.verified),
        verified_badge: Boolean(row.verified_badge),
        subscription_plan: row.subscription_plan || row.plan || "",
        verification_label: row.verification_label || "",
        property_count: row.property_count === undefined ? undefined : Number(row.property_count || 0),
        occupied_units_count: row.occupied_units_count === undefined ? undefined : Number(row.occupied_units_count || 0),
        published_vacancies_count: row.published_vacancies_count === undefined ? undefined : Number(row.published_vacancies_count || 0),
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
    if (stateKey === "subscriptions") {
      return {
        ...row,
        monthly_fee: subscriptionPlanFee(row),
        auto_collect_authorized: Boolean(row.auto_collect_authorized),
        cancel_at_period_end: Boolean(row.cancel_at_period_end),
        billing_contact_masked: row.billing_contact_masked || "",
        payment_provider: row.payment_provider || "",
        provider_payment_reference: row.provider_payment_reference || "",
        provider_payment_status: row.provider_payment_status || "",
        provider_checkout_url: row.provider_checkout_url || "",
        provider_charge_id: row.provider_charge_id || "",
        provider_customer_id: row.provider_customer_id || "",
        provider_payment_method_id: row.provider_payment_method_id || "",
        provider_next_action: row.provider_next_action || "",
      };
    }
    if (stateKey === "supportTickets") {
      const landlordId = row.landlord_id || row.owner_id || "";
      return {
        ...row,
        owner_id: landlordId,
        landlord_id: landlordId,
        description: row.description || row.note || "",
        note: row.note || row.description || "",
        admin_note: row.admin_note || "",
        status: row.status || "Open",
        priority: row.priority || "Medium",
      };
    }
    if (stateKey === "supportMessages") {
      return {
        ...row,
        landlord_id: row.landlord_id || row.user_id || "",
        user_id: row.user_id || row.landlord_id || "",
        template: row.template || "",
        ticket_id: row.ticket_id || "",
      };
    }
    if (stateKey === "auditLogs") {
      return {
        ...row,
        old_value: row.old_value || "",
        new_value: row.new_value || "",
      };
    }
    if (stateKey === "notifications") {
      return {
        ...row,
        read: Boolean(row.read ?? row.is_read),
        is_read: Boolean(row.is_read ?? row.read),
      };
    }
    return { ...row };
  }

  function replaceState(nextState) {
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, nextState);
  }

  function saveLocalStateOnly() {
    const snapshot = localCacheState();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("LocalStorage save failed; IndexedDB fallback will keep the browser copy.", error);
    }
    saveStateToIndexedDB(snapshot).catch((error) => {
      console.error("IndexedDB save failed", error);
    });
  }

  function localCacheState() {
    return {
      ...state,
      production: supabaseReady || Boolean(state.production),
      cached_at: new Date().toISOString(),
      users: (state.users || []).map(({ password, ...user }) => user),
    };
  }

  async function hydrateStateFromBrowserStore() {
    try {
      const stored = await readStateFromIndexedDB();
      if (!stored || !browserStoreIsNewer(stored, state)) return;
      replaceState(migrateState(stored));
    } catch (error) {
      console.warn("IndexedDB restore failed", error);
    }
  }

  function browserStoreIsNewer(stored, current) {
    const storedTime = rowTimestamp({ updated_at: stored.cached_at });
    const currentTime = rowTimestamp({ updated_at: current.cached_at });
    return storedTime >= currentTime;
  }

  async function saveStateToIndexedDB(snapshot) {
    if (!window.indexedDB) return;
    const db = await openBrowserStateDb();
    try {
      await indexedDbRequest(db.transaction(BROWSER_DB_STORE, "readwrite").objectStore(BROWSER_DB_STORE).put(snapshot, BROWSER_DB_STATE_KEY));
    } finally {
      db.close();
    }
  }

  async function readStateFromIndexedDB() {
    if (!window.indexedDB) return null;
    const db = await openBrowserStateDb();
    try {
      return await indexedDbRequest(db.transaction(BROWSER_DB_STORE, "readonly").objectStore(BROWSER_DB_STORE).get(BROWSER_DB_STATE_KEY));
    } finally {
      db.close();
    }
  }

  async function deleteStateFromIndexedDB() {
    if (!window.indexedDB) return;
    const db = await openBrowserStateDb();
    try {
      await indexedDbRequest(db.transaction(BROWSER_DB_STORE, "readwrite").objectStore(BROWSER_DB_STORE).delete(BROWSER_DB_STATE_KEY));
    } finally {
      db.close();
    }
  }

  function openBrowserStateDb() {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(BROWSER_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(BROWSER_DB_STORE)) db.createObjectStore(BROWSER_DB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open browser storage."));
    });
  }

  function indexedDbRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Browser storage request failed."));
    });
  }

  function rowTimestamp(row) {
    const value = row.updated_at || row.created_at || row.payment_date || row.date || row.move_in_date || "";
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }

  function scheduleSupabaseSave() {
    if (!supabaseReady || supabaseHydrating || !supabaseClient) return;
    if (!currentUser()) return;
    const snapshot = JSON.parse(JSON.stringify(state));
    window.clearTimeout(supabaseSaveTimer);
    supabaseSaveTimer = window.setTimeout(() => {
      persistSupabaseState(snapshot).catch((error) => {
        console.error("Supabase save failed", error);
        handleSupabaseSaveError(error);
      });
    }, 450);
  }

  function flushPendingSupabaseSave() {
    if (!supabaseSaveTimer || !supabaseReady || supabaseHydrating || !supabaseClient || !currentUser()) return;
    const snapshot = JSON.parse(JSON.stringify(state));
    window.clearTimeout(supabaseSaveTimer);
    supabaseSaveTimer = null;
    persistSupabaseState(snapshot).catch((error) => {
      console.error("Supabase save failed", error);
    });
  }

  async function persistSupabaseState(snapshot) {
    if (!supabaseClient) return;
    if (!(await hasActiveSupabaseSession())) {
      const error = new Error("Sign in required.");
      error.code = "AUTH_REQUIRED";
      throw error;
    }
    await apiRequest("/api/sync-state", { state: syncStatePayload(snapshot) });
    clearSyncedDeletedRows(snapshot.deletedRowIds || {});
  }

  function handleSupabaseSaveError(error) {
    if (isSignInRequiredError(error)) {
      promptSupabaseSignIn("Sign in again to sync changes across devices.");
      return;
    }
    if (missingSupabaseSchemaItem(error)) {
      showToast("Database migration is pending. Run supabase-support-center-migration.sql in Supabase.");
      return;
    }
    showToast(`Could not save to Supabase: ${error.message || "Browser copy kept."}`);
  }

  function isSignInRequiredError(error) {
    return error?.code === "AUTH_REQUIRED" || /sign in required|jwt|auth session/i.test(String(error?.message || ""));
  }

  function syncStatePayload(snapshot) {
    return {
      users: snapshot.users || [],
      properties: snapshot.properties || [],
      subscriptions: snapshot.subscriptions || [],
      units: snapshot.units || [],
      tenants: snapshot.tenants || [],
      payments: snapshot.payments || [],
      expenses: snapshot.expenses || [],
      supportTickets: snapshot.supportTickets || [],
      supportMessages: snapshot.supportMessages || [],
      auditLogs: snapshot.auditLogs || [],
      notifications: snapshot.notifications || [],
      deletedRowIds: snapshot.deletedRowIds || {},
    };
  }

  function applyDeletedRowIdsToStateRows(nextState, deletedRowIds = {}) {
    const normalizedDeletedRows = normalizeDeletedRowIds(deletedRowIds);
    const sanitizedState = { ...nextState, deletedRowIds: normalizedDeletedRows };
    Object.entries(normalizedDeletedRows).forEach(([stateKey, ids]) => {
      if (!Array.isArray(sanitizedState[stateKey])) return;
      const deletedIds = new Set(ids);
      sanitizedState[stateKey] = sanitizedState[stateKey].filter((row) => !row?.id || !deletedIds.has(row.id));
    });
    return sanitizedState;
  }

  async function syncPendingDeletedRows() {
    if (!hasDeletedRowIds(state.deletedRowIds)) return;
    try {
      await persistSupabaseState(JSON.parse(JSON.stringify(state)));
    } catch (error) {
      console.error("Pending Supabase deletes failed", error);
      showToast("Could not finish syncing deleted rows. Browser copy kept.");
    }
  }

  function hasDeletedRowIds(deletedRowIds = {}) {
    return Object.values(deletedRowIds).some((ids) => Array.isArray(ids) && ids.length);
  }

  function markRowsDeleted(stateKey, ids) {
    const deletedIds = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (!deletedIds.length) return;
    state.deletedRowIds = state.deletedRowIds || {};
    state.deletedRowIds[stateKey] = [...new Set([...(state.deletedRowIds[stateKey] || []), ...deletedIds])];
  }

  function clearSyncedDeletedRows(deletedRowIds = {}) {
    if (!state.deletedRowIds) return;
    Object.entries(deletedRowIds).forEach(([stateKey, ids]) => {
      const synced = new Set(Array.isArray(ids) ? ids : []);
      if (!synced.size) return;
      const remaining = (state.deletedRowIds[stateKey] || []).filter((id) => !synced.has(id));
      if (remaining.length) state.deletedRowIds[stateKey] = remaining;
      else delete state.deletedRowIds[stateKey];
    });
    if (!Object.keys(state.deletedRowIds).length) state.deletedRowIds = {};
    saveLocalStateOnly();
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
        role: row.role,
        account_status: row.account_status || "Active",
        created_at: row.created_at || new Date().toISOString(),
        company_owner_id: row.company_owner_id || null,
        assigned_property_ids: row.assigned_property_ids || [],
        invitation_status: row.invitation_status || null,
        verified_badge: Boolean(row.verified_badge),
        verification_label: row.verification_label || null,
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
        "billing_method",
        "billing_contact_masked",
        "auto_collect_authorized",
        "cancel_at_period_end",
        "cancellation_requested_at",
        "grace_period_end",
        "payment_provider",
        "provider_payment_reference",
        "provider_payment_status",
        "provider_checkout_url",
        "provider_charge_id",
        "provider_customer_id",
        "provider_payment_method_id",
        "provider_next_action",
      ]);
    }
    if (stateKey === "properties") return pick(row, ["id", "owner_id", "property_name", "location", "property_type"]);
    if (stateKey === "units") {
      const unit = pick(row, [
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
      return unit;
    }
    if (stateKey === "tenants") {
      return pick(row, [
        "id",
        "unit_id",
        "name",
        "phone",
        "national_id",
        "rent_amount",
        "deposit_paid",
        "move_in_date",
        "status",
        "move_out_date",
        "move_out_balance",
        "move_out_damages",
        "move_out_refund",
        "move_out_note",
      ]);
    }
    if (stateKey === "payments") {
      return pick(row, [
        "id",
        "tenant_id",
        "amount",
        "payment_method",
        "payment_date",
        "balance",
        "reference",
        "receipt_number",
        "payment_proof",
        "verification_status",
      ]);
    }
    if (stateKey === "expenses") return pick(row, ["id", "property_id", "type", "amount", "date"]);
    if (stateKey === "supportTickets") {
      return pick(
        {
          ...row,
          owner_id: ticketOwnerId(row),
          landlord_id: ticketOwnerId(row),
          description: row.description || row.note || "",
          note: row.note || row.description || "",
          admin_note: row.admin_note || "",
        },
        ["id", "owner_id", "landlord_id", "subject", "description", "priority", "status", "note", "admin_note", "created_at", "updated_at", "resolved_at"]
      );
    }
    if (stateKey === "supportMessages") {
      return pick({ ...row, landlord_id: row.landlord_id || row.user_id || null }, [
        "id",
        "landlord_id",
        "user_id",
        "ticket_id",
        "template",
        "title",
        "message",
        "created_at",
      ]);
    }
    if (stateKey === "auditLogs") {
      return pick(row, ["id", "admin_id", "landlord_id", "action", "old_value", "new_value", "created_at"]);
    }
    if (stateKey === "notifications") {
      return {
        id: row.id,
        user_id: row.user_id || null,
        type: row.type,
        title: row.title,
        message: row.message,
        read: Boolean(row.read),
        is_read: Boolean(row.is_read ?? row.read),
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
    const includeSeedRows = !saved.production;
    migrated.users = Array.isArray(saved.users) ? saved.users : seeded.users;
    migrated.properties = Array.isArray(saved.properties) ? saved.properties : seeded.properties;
    migrated.units = Array.isArray(saved.units) ? saved.units : seeded.units;
    migrated.tenants = Array.isArray(saved.tenants) ? saved.tenants : seeded.tenants;
    migrated.payments = Array.isArray(saved.payments) ? saved.payments : seeded.payments;
    migrated.expenses = Array.isArray(saved.expenses) ? saved.expenses : seeded.expenses;
    migrated.subscriptions = Array.isArray(saved.subscriptions) ? saved.subscriptions : seeded.subscriptions;
    migrated.supportTickets = Array.isArray(saved.supportTickets) ? saved.supportTickets : seeded.supportTickets;
    migrated.supportMessages = Array.isArray(saved.supportMessages) ? saved.supportMessages : seeded.supportMessages;
    migrated.auditLogs = Array.isArray(saved.auditLogs) ? saved.auditLogs : seeded.auditLogs;
    migrated.notifications = Array.isArray(saved.notifications) ? saved.notifications : seeded.notifications;
    migrated.dismissedNotificationIds = Array.isArray(saved.dismissedNotificationIds) ? saved.dismissedNotificationIds : [];
    migrated.deletedRowIds = normalizeDeletedRowIds(saved.deletedRowIds);
    migrated.passwordReset = saved.passwordReset || null;
    migrated.billingLandlordFilter = saved.billingLandlordFilter || "all";
    migrated.supportTicketFilters =
      saved.supportTicketFilters && typeof saved.supportTicketFilters === "object"
        ? {
            search: saved.supportTicketFilters.search || "",
            owner: saved.supportTicketFilters.owner || "all",
            status: saved.supportTicketFilters.status || "all",
            priority: saved.supportTicketFilters.priority || "all",
          }
        : { search: "", owner: "all", status: "all", priority: "all" };

    const seedUsersById = new Map(seeded.users.map((user) => [user.id, user]));
    migrated.users = migrated.users.map((user) => {
      const seedUser = seedUsersById.get(user.id);
      return {
        ...(includeSeedRows ? { password: "demo123" } : {}),
        role: "landlord",
        ...user,
        email: user.email || (seedUser ? seedUser.email : ""),
        creator_email: user.creator_email || (seedUser ? seedUser.creator_email : "") || user.email || "",
        account_status: user.account_status || (seedUser ? seedUser.account_status : "") || "Active",
        created_at: user.created_at || (seedUser ? seedUser.created_at : "") || new Date().toISOString(),
      };
    });
    if (includeSeedRows) {
      seeded.users.forEach((seedUser) => {
        const exists = migrated.users.some(
          (user) =>
            user.id === seedUser.id ||
            normalizeLoginPhone(user.phone) === normalizeLoginPhone(seedUser.phone) ||
            normalizeLoginEmail(user.email) === normalizeLoginEmail(seedUser.email)
        );
        if (!exists) migrated.users.push(seedUser);
      });
    }
    migrated.users = migrated.users.map((user) => ({
      invitation_status: user.role === "staff" ? "Login Created" : undefined,
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
          password: "admin-demo-only",
          role: "saas-owner",
          account_status: "Active",
        };
      }
      if (user.id === "staff-1") {
        return {
          ...user,
          name: user.name === "Joseph Manager" || user.name === "Staff Demo" ? "Caretaker Demo" : user.name,
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          company_owner_id: "user-1",
          assigned_property_ids: ["property-1", "property-4"],
          invitation_status: user.invitation_status || "Login Created",
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
    if (includeSeedRows) appendMissingSeedRows(migrated.properties, seeded.properties);
    if (includeSeedRows) appendMissingSeedRows(migrated.units, seeded.units);
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
        created_at: unit.created_at || seedUnit.created_at || "",
      };
    });
    if (includeSeedRows) appendMissingSeedRows(migrated.tenants, seeded.tenants);
    migrated.tenants = migrated.tenants.map((tenant) => ({
      status: "active",
      move_out_date: null,
      move_out_balance: 0,
      move_out_damages: 0,
      move_out_refund: 0,
      move_out_note: "",
      ...tenant,
    }));
    if (includeSeedRows) appendMissingSeedRows(migrated.payments, seeded.payments);
    migrated.payments = migrated.payments.map((payment) => ({
      ...payment,
      receipt_number: payment.receipt_number || generateReceiptNumber(payment.payment_date, payment.id || payment.reference),
      payment_proof: payment.payment_proof || "",
      verification_status: payment.verification_status || "Unverified",
    }));
    if (includeSeedRows) appendMissingSeedRows(migrated.expenses, seeded.expenses);
    const occupiedUnitIds = new Set(migrated.tenants.filter(isActiveTenant).map((tenant) => tenant.unit_id));
    migrated.units = migrated.units.map((unit) =>
      occupiedUnitIds.has(unit.id) ? { ...unit, status: "occupied", listing_published: false } : unit
    );
    if (includeSeedRows) {
      seeded.subscriptions.forEach((seedSubscription) => {
        const exists = migrated.subscriptions.some((subscription) => subscription.id === seedSubscription.id);
        if (!exists) migrated.subscriptions.push(seedSubscription);
      });
      seeded.supportTickets.forEach((seedTicket) => {
        const exists = migrated.supportTickets.some((ticket) => ticket.id === seedTicket.id);
        if (!exists) migrated.supportTickets.push(seedTicket);
      });
      appendMissingSeedRows(migrated.supportMessages, seeded.supportMessages);
      appendMissingSeedRows(migrated.auditLogs, seeded.auditLogs);
    }
    migrated.supportTickets = migrated.supportTickets.map((ticket) => {
      const landlordId = ticket.landlord_id || ticket.owner_id || "";
      return {
        ...ticket,
        owner_id: landlordId,
        landlord_id: landlordId,
        description: ticket.description || ticket.note || "",
        note: ticket.note || ticket.description || "",
        admin_note: ticket.admin_note || "",
        status: ticket.status || "Open",
        priority: ticket.priority || "Medium",
        created_at: ticket.created_at || ticket.updated_at || new Date().toISOString(),
        resolved_at: ticket.resolved_at || null,
      };
    });
    migrated.supportMessages = migrated.supportMessages.map((message) => ({
      ...message,
      landlord_id: message.landlord_id || message.user_id || "",
      user_id: message.user_id || message.landlord_id || "",
      template: message.template || "",
      ticket_id: message.ticket_id || "",
      created_at: message.created_at || new Date().toISOString(),
    }));
    migrated.auditLogs = migrated.auditLogs.map((log) => ({
      ...log,
      old_value: log.old_value || "",
      new_value: log.new_value || "",
      created_at: log.created_at || new Date().toISOString(),
    }));
    migrated.notifications = migrated.notifications.map((notification) => ({
      ...notification,
      read: Boolean(notification.read ?? notification.is_read),
      is_read: Boolean(notification.is_read ?? notification.read),
    }));
    migrated.subscriptions = migrated.subscriptions.map((subscription) => {
      const normalized = {
        billing_method: subscription.last_payment_method || "",
        billing_contact_masked: "",
        auto_collect_authorized: false,
        cancel_at_period_end: false,
        cancellation_requested_at: null,
        grace_period_end: subscription.next_billing_date || null,
        payment_provider: "",
        provider_payment_reference: "",
        provider_payment_status: "",
        provider_checkout_url: "",
        provider_charge_id: "",
        provider_customer_id: "",
        provider_payment_method_id: "",
        provider_next_action: "",
        ...subscription,
      };
      return {
        ...normalized,
        monthly_fee: subscriptionPlanFee(normalized),
      };
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

  function normalizeDeletedRowIds(value = {}) {
    const stateKeys = ["users", "subscriptions", "properties", "units", "tenants", "payments", "expenses", "supportTickets", "supportMessages", "auditLogs", "notifications"];
    return stateKeys.reduce((result, key) => {
      const ids = Array.isArray(value[key]) ? value[key].filter(Boolean) : [];
      if (ids.length) result[key] = [...new Set(ids)];
      return result;
    }, {});
  }

  function saveState() {
    saveLocalStateOnly();
    scheduleSupabaseSave();
  }

  function emptyState() {
    return {
      production: true,
      currentUserId: null,
      selectedPropertyId: "all",
      role: "landlord",
      searchTerm: "",
      billingLandlordFilter: "all",
      supportTicketFilters: { search: "", owner: "all", status: "all", priority: "all" },
      passwordReset: null,
      users: [],
      properties: [],
      units: [],
      tenants: [],
      payments: [],
      expenses: [],
      subscriptions: [],
      supportTickets: [],
      supportMessages: [],
      auditLogs: [],
      notifications: [],
      dismissedNotificationIds: [],
      deletedRowIds: {},
    };
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
      billingLandlordFilter: "all",
      supportTicketFilters: { search: "", owner: "all", status: "all", priority: "all" },
      passwordReset: null,
      deletedRowIds: {},
      users: [
        {
          id: "user-saas-owner",
          name: "Super Admin",
          phone: "0700000000",
          email: SUPER_ADMIN_EMAIL,
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          password: "admin-demo-only",
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
          name: "Caretaker Demo",
          phone: "0700111222",
          email: "staff@rentledger.ug",
          creator_email: SUPER_ADMIN_EMAIL,
          platform_owner_id: SUPER_ADMIN_USER_ID,
          password: "staff123",
          role: "staff",
          account_status: "Active",
          company_owner_id: "user-1",
          assigned_property_ids: ["property-1", "property-4"],
          invitation_status: "Login Created",
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
          created_at: new Date().toISOString(),
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
          listing_published: false,
          listing_bedrooms: 2,
          listing_bathrooms: 1,
          listing_furnished: false,
          listing_photo: "assets/property-keys.jpg",
          listing_note: "Standalone house with compound space in Mukono. Public listing unlocks on Professional.",
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
          created_at: new Date().toISOString(),
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
          created_at: new Date().toISOString(),
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
          landlord_id: "user-1",
          subject: "Import tenant rent balances",
          description: "Sarah needs assistance moving tenant arrears from her notebook into RentLedger.",
          priority: "High",
          status: "In Progress",
          note: "Sarah needs assistance moving tenant arrears from her notebook into RentLedger.",
          admin_note: "Imported sample arrears workflow is pending review.",
          created_at: date(21),
          updated_at: date(21),
          resolved_at: null,
        },
        {
          id: "ticket-2",
          owner_id: "user-2",
          landlord_id: "user-2",
          subject: "Subscription payment confirmation",
          description: "Daniel says he paid by Airtel Money and needs the account marked active.",
          priority: "Medium",
          status: "Open",
          note: "Daniel says he paid by Airtel Money and needs the account marked active.",
          admin_note: "",
          created_at: date(20),
          updated_at: date(20),
          resolved_at: null,
        },
        {
          id: "ticket-3",
          owner_id: "user-1",
          landlord_id: "user-1",
          subject: "Caretaker access question",
          description: "Explained caretaker mode and removal restrictions.",
          priority: "Low",
          status: "Resolved",
          note: "Explained caretaker mode and removal restrictions.",
          admin_note: "Resolved during onboarding.",
          created_at: date(16),
          updated_at: date(16),
          resolved_at: date(16),
        },
      ],
      supportMessages: [
        {
          id: "message-1",
          landlord_id: "user-1",
          user_id: "user-1",
          template: "welcome",
          title: "Welcome to RentLedger UG",
          message: "Welcome to RentLedger UG. Your account is ready for rent tracking.",
          created_at: date(2),
        },
      ],
      auditLogs: [
        {
          id: "audit-1",
          admin_id: SUPER_ADMIN_USER_ID,
          landlord_id: "user-1",
          action: "Super Admin created demo landlord account",
          old_value: "",
          new_value: "Landlord Demo",
          created_at: date(2),
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

  function metricCard(label, value, note, detailType) {
    return `
      <button class="metric-card dashboard-action-card" data-dashboard-detail="${escapeHtml(detailType)}" type="button" aria-label="Open ${escapeHtml(label)} details">
        <div class="metric-label">${escapeHtml(label)}</div>
        <div class="metric-value">${escapeHtml(String(value))}</div>
        <div class="metric-note">${escapeHtml(note)}</div>
      </button>
    `;
  }

  function dailyOpsCard(label, value, note, tone, detailType) {
    return `
      <button class="daily-ops-card dashboard-action-card ${escapeHtml(tone || "info")}" data-dashboard-detail="${escapeHtml(detailType)}" type="button" aria-label="Open ${escapeHtml(label)} details">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(note)}</small>
      </button>
    `;
  }

  function lateTenantRow(row) {
    const daysLate = Math.abs(Math.min(0, row.daysUntilDue));
    const message = reminderMessage(row);
    return `
      <tr>
        <td class="tenant-col">${personCell(row.tenant.name, row.tenant.phone)}</td>
        <td class="room-col">${escapeHtml(row.unit ? row.unit.unit_number : "Unassigned")}</td>
        <td class="days-col">${statusPill(`${daysLate} day${daysLate === 1 ? "" : "s"} late`)}</td>
        <td class="balance-col"><strong>${formatMoney(row.balance)}</strong></td>
        <td class="actions-col">
          <div class="button-row late-actions">
            <button class="text-button compact-link-button" data-tenant-detail="${escapeHtml(row.tenant.id)}" type="button">Details</button>
            ${tenantContactActions(row.tenant, message, { compact: true, sendLabel: "Send" })}
          </div>
        </td>
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

  function adminMetricCard(label, value, note, tone, detailType = "") {
    const tag = detailType ? "button" : "article";
    const detailAttribute = detailType ? ` data-dashboard-detail="${escapeHtml(detailType)}" type="button" aria-label="Open ${escapeHtml(label)} details"` : "";
    return `
      <${tag} class="admin-metric-card dashboard-action-card ${escapeHtml(tone)}"${detailAttribute}>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(note)}</small>
      </${tag}>
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

  function ownerSummaryItem(label, value, detailType = "") {
    const tag = detailType ? "button" : "article";
    const detailAttribute = detailType
      ? ` data-platform-detail-page="${escapeHtml(detailType)}" type="button" aria-label="Open ${escapeHtml(label)} page"`
      : "";
    return `
      <${tag} class="owner-summary-item dashboard-action-card"${detailAttribute}>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </${tag}>
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
      normalizedStatus === "Paid" || normalizedStatus === "Advance" || normalizedStatus === "Occupied" || normalizedStatus === "Active" || normalizedStatus === "Resolved" || normalizedStatus === "Low" || normalizedStatus === "Read" || normalizedStatus === "Verified"
        ? "success"
        : normalizedStatus === "Overdue" || normalizedStatus.includes("late") || normalizedStatus === "Open" || normalizedStatus === "High" || normalizedStatus === "Suspended" || normalizedStatus === "Inactive" || normalizedStatus === "Expired" || normalizedStatus === "Cancelled" || normalizedStatus === "Disputed"
          ? "danger"
          : normalizedStatus === "Partial" || normalizedStatus === "Vacant" || normalizedStatus === "Due" || normalizedStatus === "Medium" || normalizedStatus === "In Progress" || normalizedStatus === "Invited" || normalizedStatus === "Pending" || normalizedStatus === "Expiring" || normalizedStatus === "Cancelling" || normalizedStatus === "Unverified" || normalizedStatus === "Attention" || normalizedStatus === "Local"
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

  function formatOptionalDate(value) {
    return value ? formatDate(value) : "-";
  }

  function monthName(value) {
    return value.toLocaleDateString("en-UG", { month: "long", year: "numeric" });
  }

  function monthDateFromKey(value) {
    const [year, month] = String(value || monthKey(new Date()))
      .split("-")
      .map((part) => Number(part));
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    }
    return new Date(year, month - 1, 1);
  }

  function monthKey(value) {
    const date = value instanceof Date ? value : parseDateValue(value);
    if (!date) return monthKey(new Date());
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

  function addDays(value, count) {
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + count);
    return isoDate(date);
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function autoReference(method) {
    const prefix = method.includes("Airtel") ? "AIRTEL" : method.includes("MTN") || method.includes("MoMo") ? "MOMO" : "PAY";
    return `${prefix}-${Math.floor(10000 + Math.random() * 89999)}`;
  }

  function receiptNumber(payment) {
    return payment.receipt_number || generateReceiptNumber(payment.payment_date, payment.id || payment.reference || "");
  }

  function generateReceiptNumber(paymentDate, seed = "") {
    const date = String(paymentDate || isoDate(new Date())).replace(/\D/g, "").slice(0, 8) || isoDate(new Date()).replace(/\D/g, "");
    const suffixSource = String(seed || `${Date.now()}${Math.random()}`).replace(/\D/g, "");
    const suffix = (suffixSource.slice(-6) || String(Math.floor(100000 + Math.random() * 900000))).padStart(6, "0");
    return `RL-${date}-${suffix}`;
  }

  async function imageFileToDataUrl(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Choose an image file.");
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("Choose a photo under 8 MB.");
    }

    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    const maxWidth = 1000;
    const maxHeight = 750;
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare photo.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.78);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read photo."));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load photo."));
      image.src = src;
    });
  }

  function renderPhotoPreview(container, src, name) {
    if (!container) return;
    container.classList.remove("hidden");
    container.innerHTML = `
      <img src="${escapeHtml(src)}" alt="">
      <span>${escapeHtml(name || "Selected photo")}</span>
    `;
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
