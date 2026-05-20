(function () {
  const STORAGE_KEY = "rentledger_ug_mvp_v1";
  const state = loadState();
  let authVisible = false;

  const ui = {
    landingScreen: document.getElementById("landingScreen"),
    authScreen: document.getElementById("authScreen"),
    appShell: document.getElementById("appShell"),
    signInForm: document.getElementById("signInForm"),
    signInPhone: document.getElementById("signInPhone"),
    signInPassword: document.getElementById("signInPassword"),
    createAccountForm: document.getElementById("createAccountForm"),
    accountName: document.getElementById("accountName"),
    accountPhone: document.getElementById("accountPhone"),
    accountPassword: document.getElementById("accountPassword"),
    demoLogin: document.getElementById("demoLogin"),
    logoutButton: document.getElementById("logoutButton"),
    currentAccountName: document.getElementById("currentAccountName"),
    currentAccountPhone: document.getElementById("currentAccountPhone"),
    viewTitle: document.getElementById("viewTitle"),
    viewSubtitle: document.getElementById("viewSubtitle"),
    propertyFilter: document.getElementById("propertyFilter"),
    roleSelect: document.getElementById("roleSelect"),
    metricGrid: document.getElementById("metricGrid"),
    unitStatusGrid: document.getElementById("unitStatusGrid"),
    upcomingDuesTable: document.getElementById("upcomingDuesTable"),
    recentPaymentsTable: document.getElementById("recentPaymentsTable"),
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
    toast: document.getElementById("toast"),
  };

  const viewCopy = {
    dashboard: ["Dashboard", "Rent, occupancy, expenses, and balances at a glance."],
    properties: ["Properties", "Set up houses, apartments, units, and monthly rent."],
    tenants: ["Tenants", "Tenant records, units, deposits, and contacts."],
    rent: ["Rent", "Record payments, partial balances, and Mobile Money references."],
    expenses: ["Expenses", "Repairs, utilities, salaries, and operating costs."],
    reminders: ["Reminders", "SMS and WhatsApp messages for rent collection."],
  };

  initialize();

  function initialize() {
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
    ui.createAccountForm.addEventListener("submit", createAccount);
    ui.demoLogin.addEventListener("click", signInDemoAccount);
    ui.logoutButton.addEventListener("click", signOut);

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
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
    ui.paymentForm.addEventListener("submit", savePayment);
    ui.paymentTenant.addEventListener("change", updatePaymentPreview);
    ui.paymentAmount.addEventListener("input", updatePaymentPreview);
    ui.expenseForm.addEventListener("submit", saveExpense);
    ui.resetDemo.addEventListener("click", resetDemoData);
  }

  function setAuthTab(tabName) {
    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.authTab === tabName);
    });
    ui.signInForm.classList.toggle("hidden", tabName !== "signin");
    ui.createAccountForm.classList.toggle("hidden", tabName !== "signup");
  }

  function showAuth(tabName) {
    authVisible = true;
    setAuthTab(tabName);
    renderSession();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function signIn(event) {
    event.preventDefault();
    const phone = normalizeLoginPhone(ui.signInPhone.value);
    const password = ui.signInPassword.value;
    const user = state.users.find(
      (item) => normalizeLoginPhone(item.phone) === phone && item.password === password
    );

    if (!user || user.role !== "landlord") {
      showToast("Use a landlord account phone and password.");
      return;
    }

    openUserSession(user.id);
    ui.signInForm.reset();
    showToast(`Welcome, ${user.name}.`);
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
    const normalizedPhone = normalizeLoginPhone(phone);
    const duplicate = state.users.some((user) => normalizeLoginPhone(user.phone) === normalizedPhone);

    if (duplicate) {
      showToast("That phone number already has an account.");
      return;
    }

    const user = {
      id: makeId("user"),
      name: ui.accountName.value.trim(),
      phone,
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
    state.currentUserId = userId;
    state.selectedPropertyId = "all";
    state.role = "landlord";
    saveState();
    renderSession();
    setView("dashboard");
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
    ui.currentAccountPhone.textContent = user.phone;
    ensureSelectedProperty();
    renderAll();
  }

  function populateStaticControls() {
    const properties = ownerProperties();
    const propertyOptions = [
      '<option value="all">All properties</option>',
      ...properties.map(
        (property) => `<option value="${property.id}">${escapeHtml(property.property_name)}</option>`
      ),
    ].join("");

    ui.propertyFilter.innerHTML = propertyOptions;
    ui.propertyFilter.value = state.selectedPropertyId || "all";

    const assignableProperties =
      properties
        .map((property) => `<option value="${property.id}">${escapeHtml(property.property_name)}</option>`)
        .join("") || '<option value="">Add a property first</option>';

    ui.expenseProperty.innerHTML = assignableProperties;
    ui.unitProperty.innerHTML = assignableProperties;
    ui.roleSelect.value = state.role || "landlord";
  }

  function renderAll() {
    ensureSelectedProperty();
    populateStaticControls();
    populateDynamicSelects();
    renderDashboard();
    renderProperties();
    renderTenants();
    renderRent();
    renderExpenses();
    renderReminders();
  }

  function setView(viewName) {
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active-view", view.id === viewName);
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewName);
    });
    const [title, subtitle] = viewCopy[viewName] || viewCopy.dashboard;
    ui.viewTitle.textContent = title;
    ui.viewSubtitle.textContent = subtitle;
  }

  function renderDashboard() {
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
              <td>${escapeHtml(tenant ? tenant.name : "Removed tenant")}</td>
              <td>${formatMoney(payment.amount)}</td>
              <td>${escapeHtml(payment.payment_method)}</td>
              <td>${formatDate(payment.payment_date)}</td>
              <td>${formatMoney(payment.balance)}</td>
            </tr>
          `;
        })
        .join("") || emptyTableRow(5, "No payments recorded.");
  }

  function renderProperties() {
    const scope = getScopedData();
    const allOwnerProperties = ownerProperties();
    const removeDisabled = state.role === "caretaker" ? "disabled" : "";

    ui.propertyCountLabel.textContent = `${allOwnerProperties.length} properties`;
    ui.unitCountLabel.textContent = `${scope.units.length} units`;

    ui.propertyTable.innerHTML =
      scope.properties
        .map((property) => {
          const units = state.units.filter((unit) => unit.property_id === property.id);
          const occupied = units.filter((unit) => unit.status === "occupied").length;
          const expectedRent = units.reduce((sum, unit) => sum + Number(unit.rent_amount), 0);
          return `
            <tr>
              <td>${escapeHtml(property.property_name)}</td>
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
      scope.units
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
      return [tenant.name, tenant.phone, tenant.national_id, unit ? unit.unit_number : ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

    ui.tenantTable.innerHTML =
      tenants
        .map((tenant) => {
          const unit = unitById(tenant.unit_id);
          const removeDisabled = state.role === "caretaker" ? "disabled" : "";
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

  function renderRent() {
    const scope = getScopedData();
    const rentRows = getRentRows(scope.tenants);
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
            </tr>
          `;
        })
        .join("") || emptyTableRow(6, "No payment history yet.");

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

    const removeDisabled = state.role === "caretaker" ? "disabled" : "";
    ui.expenseTable.innerHTML =
      scope.expenses
        .slice()
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

    const id = ui.propertyId.value || makeId("property");
    const property = {
      id,
      property_name: ui.propertyName.value.trim(),
      location: ui.propertyLocation.value.trim(),
      property_type: ui.propertyType.value,
      owner_id: user.id,
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
    if (state.role === "caretaker") {
      showToast("Caretaker mode cannot remove properties.");
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
    if (state.role === "caretaker") {
      showToast("Caretaker mode cannot remove units.");
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

  function removeTenant(id) {
    if (state.role === "caretaker") {
      showToast("Caretaker mode cannot remove tenants.");
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
    saveState();
    ui.expenseForm.reset();
    setTodayDefaults();
    renderAll();
    showToast("Expense saved.");
  }

  function removeExpense(id) {
    if (state.role === "caretaker") {
      showToast("Caretaker mode cannot remove expenses.");
      return;
    }
    const expense = getScopedData().expenses.find((item) => item.id === id);
    if (!expense) return;
    state.expenses = state.expenses.filter((item) => item.id !== id);
    saveState();
    renderAll();
    showToast("Expense removed.");
  }

  function currentUser() {
    return state.users.find((user) => user.id === state.currentUserId) || null;
  }

  function ownerProperties() {
    const user = currentUser();
    if (!user) return [];
    return state.properties.filter((property) => property.owner_id === user.id);
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

  function setTodayDefaults() {
    const today = isoDate(new Date());
    ui.tenantMoveIn.value = ui.tenantMoveIn.value || today;
    ui.paymentDate.value = today;
    ui.expenseDate.value = today;
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

  function migrateState(saved) {
    const seeded = seedState();
    const migrated = { ...seeded, ...saved };
    migrated.users = Array.isArray(saved.users) ? saved.users : seeded.users;
    migrated.properties = Array.isArray(saved.properties) ? saved.properties : seeded.properties;
    migrated.units = Array.isArray(saved.units) ? saved.units : seeded.units;
    migrated.tenants = Array.isArray(saved.tenants) ? saved.tenants : seeded.tenants;
    migrated.payments = Array.isArray(saved.payments) ? saved.payments : seeded.payments;
    migrated.expenses = Array.isArray(saved.expenses) ? saved.expenses : seeded.expenses;

    migrated.users = migrated.users.map((user) => ({
      password: "demo123",
      role: "landlord",
      ...user,
    }));
    migrated.properties = migrated.properties.map((property) => ({
      property_type: "Apartment",
      owner_id: "user-1",
      ...property,
    }));
    migrated.selectedPropertyId = migrated.selectedPropertyId || "all";
    migrated.role = migrated.role || "landlord";
    if (!migrated.users.some((user) => user.id === migrated.currentUserId)) {
      migrated.currentUserId = null;
    }
    return migrated;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function seedState() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const date = (day) => isoDate(new Date(currentYear, currentMonth, day));

    return {
      currentUserId: null,
      selectedPropertyId: "all",
      role: "landlord",
      users: [
        {
          id: "user-1",
          name: "Sarah Nakato",
          phone: "0772123456",
          password: "demo123",
          role: "landlord",
        },
        {
          id: "user-2",
          name: "Daniel Kigozi",
          phone: "0788001100",
          password: "demo123",
          role: "landlord",
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
      ],
      units: [
        { id: "unit-1", property_id: "property-1", unit_number: "A1", rent_amount: 450000, status: "occupied" },
        { id: "unit-2", property_id: "property-1", unit_number: "A2", rent_amount: 450000, status: "occupied" },
        { id: "unit-3", property_id: "property-1", unit_number: "B1", rent_amount: 520000, status: "vacant" },
        { id: "unit-4", property_id: "property-1", unit_number: "B2", rent_amount: 520000, status: "occupied" },
        { id: "unit-5", property_id: "property-2", unit_number: "N1", rent_amount: 380000, status: "occupied" },
        { id: "unit-6", property_id: "property-2", unit_number: "N2", rent_amount: 380000, status: "vacant" },
        { id: "unit-7", property_id: "property-2", unit_number: "N3", rent_amount: 420000, status: "occupied" },
        { id: "unit-8", property_id: "property-2", unit_number: "N4", rent_amount: 420000, status: "vacant" },
        { id: "unit-9", property_id: "property-3", unit_number: "House 1", rent_amount: 600000, status: "occupied" },
        { id: "unit-10", property_id: "property-3", unit_number: "House 2", rent_amount: 600000, status: "vacant" },
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
      ],
      expenses: [
        { id: "expense-1", property_id: "property-1", type: "Repairs", amount: 120000, date: date(7) },
        { id: "expense-2", property_id: "property-1", type: "Water Bill", amount: 85000, date: date(10) },
        { id: "expense-3", property_id: "property-2", type: "Caretaker Salary", amount: 250000, date: date(15) },
        { id: "expense-4", property_id: "property-3", type: "Security", amount: 90000, date: date(11) },
      ],
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

  function statusPill(status) {
    const className =
      status === "Paid" || status === "Occupied"
        ? "success"
        : status === "Overdue"
          ? "danger"
          : status === "Partial" || status === "Vacant"
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

  function isoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    showToast.timer = window.setTimeout(() => {
      ui.toast.classList.remove("show");
    }, 2200);
  }
})();
