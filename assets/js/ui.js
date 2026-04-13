(function attachUiModule(global) {
  const cycle = global.ExpenseTrackerCycle;
  const logic = global.ExpenseTrackerLogic;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderCategoryOptions(categories, selectedId) {
    return categories
      .map(function mapCategory(category) {
        return (
          '<option value="' +
          escapeHtml(category.id) +
          '" ' +
          (category.id === (selectedId || "") ? "selected" : "") +
          ">" +
          escapeHtml(category.icon + " " + category.name) +
          "</option>"
        );
      })
      .join("");
  }

  function renderMetricCard(label, value, detail, tone) {
    return (
      '<article class="metric-card ' +
      (tone || "") +
      '">' +
      '<span class="metric-label">' +
      escapeHtml(label) +
      "</span>" +
      '<strong class="metric-value">' +
      escapeHtml(value) +
      "</strong>" +
      '<span class="metric-detail">' +
      escapeHtml(detail) +
      "</span>" +
      "</article>"
    );
  }

  function renderCategoryAllocationRows(summary, currency) {
    return summary.categorySummaries
      .map(function mapCategory(category) {
        const percent = category.allocated > 0 ? Math.min(category.usageRatio * 100, 100) : 0;
        return (
          '<div class="allocation-row">' +
          '<div class="allocation-main">' +
          '<div class="allocation-label">' +
          '<span class="category-badge" style="--badge-color:' + escapeHtml(category.color) + '">' + escapeHtml(category.icon) + "</span>" +
          "<div>" +
          "<strong>" + escapeHtml(category.name) + "</strong>" +
          "<span>" + escapeHtml(logic.formatMoney(category.spent, currency)) + " spent of " + escapeHtml(logic.formatMoney(category.allocated, currency)) + "</span>" +
          "</div>" +
          "</div>" +
          '<label class="allocation-input">' +
          '<span class="sr-only">Allocation for ' + escapeHtml(category.name) + "</span>" +
          '<input type="number" min="0" step="0.01" name="allocation:' + escapeHtml(category.id) + '" value="' + escapeHtml(category.allocated) + '" inputmode="decimal" />' +
          "</label>" +
          "</div>" +
          '<div class="progress-track ' + category.status + '">' +
          '<span class="progress-fill" style="width:' + percent + '%"></span>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderCategoryUsageCards(summary, currency) {
    return summary.categorySummaries
      .map(function mapCategory(category) {
        const percent = category.allocated > 0 ? Math.min(category.usageRatio * 100, 100) : 0;
        const statusLabel = category.status === "over" ? "Over budget" : category.status === "near" ? "Almost full" : "On track";

        return (
          '<article class="category-card ' + category.status + '">' +
          '<div class="category-card-header">' +
          '<div class="category-title-wrap">' +
          '<span class="category-badge" style="--badge-color:' + escapeHtml(category.color) + '">' + escapeHtml(category.icon) + "</span>" +
          "<div>" +
          "<strong>" + escapeHtml(category.name) + "</strong>" +
          "<span>" + escapeHtml(statusLabel) + "</span>" +
          "</div>" +
          "</div>" +
          '<div class="category-actions">' +
          '<button type="button" class="ghost-button" data-action="edit-category" data-category-id="' + escapeHtml(category.id) + '">Edit</button>' +
          '<button type="button" class="ghost-button danger" data-action="delete-category" data-category-id="' + escapeHtml(category.id) + '">Delete</button>' +
          "</div>" +
          "</div>" +
          '<div class="category-money-row">' +
          "<span>" + escapeHtml(logic.formatMoney(category.spent, currency)) + "</span>" +
          "<span>" + escapeHtml(logic.formatMoney(category.allocated, currency)) + "</span>" +
          "</div>" +
          '<div class="progress-track ' + category.status + '">' +
          '<span class="progress-fill" style="width:' + percent + '%"></span>' +
          "</div>" +
          '<div class="category-footer">' +
          "<span>Remaining " + escapeHtml(logic.formatMoney(category.remaining, currency)) + "</span>" +
          "<span>" + escapeHtml(logic.formatPercent(percent)) + "</span>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderExpenseRows(model) {
    if (!model.expenses.length) {
      return (
        '<div class="empty-state compact">' +
        "<strong>No expenses match these filters</strong>" +
        "<span>Try a different cycle, search term, or category filter.</span>" +
        "</div>"
      );
    }

    return (
      '<div class="table-wrap"><table class="expenses-table"><thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Cycle</th><th>Amount</th><th></th></tr></thead><tbody>' +
      model.expenses
        .map(function mapExpense(expense) {
          const category = logic.getCategoryById(model.state, expense.categoryId);
          const cycleInfo = logic.getCycleDateContext(model.state, expense.date);
          return (
            "<tr>" +
            "<td>" + escapeHtml(cycle.formatLongDate(expense.date)) + "</td>" +
            "<td><span class=\"table-category\">" +
            '<span class="category-badge" style="--badge-color:' + escapeHtml((category && category.color) || "#8892a6") + '">' + escapeHtml((category && category.icon) || "•") + "</span>" +
            escapeHtml((category && category.name) || "Deleted") +
            "</span></td>" +
            "<td>" + escapeHtml(expense.note || "No note") + "</td>" +
            '<td><span class="pill subtle">' + escapeHtml(cycleInfo.cycleLabel) + "</span></td>" +
            '<td class="amount-cell">' + escapeHtml(logic.formatMoney(expense.amount, model.state.settings.currency)) + "</td>" +
            "<td><div class=\"table-actions\">" +
            '<button type="button" class="ghost-button" data-action="edit-expense" data-expense-id="' + escapeHtml(expense.id) + '">Edit</button>' +
            '<button type="button" class="ghost-button" data-action="duplicate-expense" data-expense-id="' + escapeHtml(expense.id) + '">Duplicate</button>' +
            '<button type="button" class="ghost-button danger" data-action="delete-expense" data-expense-id="' + escapeHtml(expense.id) + '">Delete</button>' +
            "</div></td>" +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function renderGoalCards(model) {
    if (!model.goals.length) {
      return (
        '<div class="empty-state">' +
        "<strong>No savings goals yet</strong>" +
        "<span>Create your first goal to track long-term progress alongside this cycle.</span>" +
        "</div>"
      );
    }

    return model.goals
      .map(function mapGoal(goal) {
        const contributionHint = goal.contributionPerCycle
          ? logic.formatMoney(goal.contributionPerCycle, model.state.settings.currency) + " planned each cycle"
          : "No recurring contribution set";
        return (
          '<article class="goal-card">' +
          '<div class="goal-header"><div><strong>' + escapeHtml(goal.name) + "</strong>" +
          "<span>" + escapeHtml(goal.targetDate ? "Target " + cycle.formatLongDate(goal.targetDate) : "No target date") + "</span>" +
          '</div><div class="category-actions">' +
          '<button type="button" class="ghost-button" data-action="contribute-goal" data-goal-id="' + escapeHtml(goal.id) + '">Contribute</button>' +
          '<button type="button" class="ghost-button" data-action="edit-goal" data-goal-id="' + escapeHtml(goal.id) + '">Edit</button>' +
          '<button type="button" class="ghost-button danger" data-action="delete-goal" data-goal-id="' + escapeHtml(goal.id) + '">Delete</button>' +
          "</div></div>" +
          '<div class="goal-amounts"><strong>' + escapeHtml(logic.formatMoney(goal.contributed, model.state.settings.currency)) + "</strong>" +
          "<span>of " + escapeHtml(logic.formatMoney(goal.targetAmount, model.state.settings.currency)) + "</span></div>" +
          '<div class="progress-track savings"><span class="progress-fill" style="width:' + Math.min(goal.percent, 100) + '%"></span></div>' +
          '<div class="goal-footer"><span>' + escapeHtml(logic.formatPercent(goal.percent)) + " funded</span>" +
          "<span>" + escapeHtml(contributionHint) + "</span></div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderHistoryRows(model) {
    return model.history
      .map(function mapRow(row) {
        return (
          '<div class="history-row ' + (row.key === model.selectedCycleKey ? "active" : "") + '">' +
          '<button type="button" class="history-main" data-action="select-cycle" data-cycle-key="' + escapeHtml(row.key) + '">' +
          "<strong>" + escapeHtml(row.label) + "</strong>" +
          "<span>" + escapeHtml(row.expenseCount) + " expenses</span>" +
          "</button>" +
          '<div class="history-money">' +
          "<span>" + escapeHtml(logic.formatMoney(row.totalSpent, model.state.settings.currency)) + "</span>" +
          "<small>" + escapeHtml(logic.formatMoney(row.remainingBudget, model.state.settings.currency)) + " left</small>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderCycleOptions(model, selectedKey) {
    return (
      '<option value="current" ' + (selectedKey === "current" ? "selected" : "") + ">Current cycle</option>" +
      '<option value="all" ' + (selectedKey === "all" ? "selected" : "") + ">All cycles</option>" +
      model.cycles
        .map(function mapCycle(cycleItem) {
          return '<option value="' + escapeHtml(cycleItem.key) + '" ' + (cycleItem.key === selectedKey ? "selected" : "") + ">" + escapeHtml(cycleItem.label) + "</option>";
        })
        .join("")
    );
  }

  function renderTopbar(currentPage, theme) {
    const links = [
      { id: "dashboard", label: "Dashboard", href: "./index.html" },
      { id: "budgeting", label: "Budgeting", href: "./budgeting.html" },
      { id: "expenses", label: "Expenses", href: "./expenses.html" },
      { id: "savings", label: "Savings", href: "./savings.html" },
      { id: "history", label: "History", href: "./history.html" },
      { id: "settings", label: "Settings", href: "./settings.html" },
    ];

    return (
      '<header class="topbar">' +
      '<div class="brand-block"><div class="brand-mark">ET</div><div><span class="eyebrow">Salary-cycle budget planner</span><h1>Expense Tracker Pro</h1></div></div>' +
      '<nav class="jump-nav">' +
      links
        .map(function mapLink(link) {
          return '<a href="' + link.href + '" class="' + (link.id === currentPage ? "active" : "") + '">' + link.label + "</a>";
        })
        .join("") +
      "</nav>" +
      '<div class="topbar-actions">' +
      '<button type="button" class="secondary-button" data-action="toggle-theme">' + (theme === "dark" ? "Light mode" : "Dark mode") + "</button>" +
      '<button type="button" class="primary-button" data-action="open-expense-modal">Quick add expense</button>' +
      "</div></header>"
    );
  }

  function renderDashboardPage(model) {
    return (
      '<section class="hero-card">' +
      '<div class="hero-copy">' +
      '<span class="pill">Active cycle ' + escapeHtml(model.summary.cycle.label) + "</span>" +
      "<h2>Stay on top of spending before the next payday reset.</h2>" +
      "<p>Budget periods follow your salary cadence automatically, so every expense lands in the correct cycle without any manual sorting.</p>" +
      "</div>" +
      '<div class="hero-stats">' +
      "<div><span>Salary</span><strong>" + escapeHtml(logic.formatMoney(model.summary.salaryAmount, model.state.settings.currency)) + "</strong></div>" +
      "<div><span>Current budget</span><strong>" + escapeHtml(logic.formatMoney(model.summary.totalBudget, model.state.settings.currency)) + "</strong></div>" +
      "<div><span>Remaining to spend</span><strong>" + escapeHtml(logic.formatMoney(model.summary.remainingBudget, model.state.settings.currency)) + "</strong></div>" +
      "</div>" +
      "</section>" +
      '<section id="dashboard" class="stats-grid">' +
      renderMetricCard("Current salary", logic.formatMoney(model.summary.salaryAmount, model.state.settings.currency), "Configured in settings") +
      renderMetricCard("Total budget", logic.formatMoney(model.summary.totalBudget, model.state.settings.currency), "For the selected cycle") +
      renderMetricCard("Spent", logic.formatMoney(model.summary.totalSpent, model.state.settings.currency), model.summary.expenses.length + " expense entries") +
      renderMetricCard("Remaining", logic.formatMoney(model.summary.remainingBudget, model.state.settings.currency), "Budget minus expenses and reserved savings", model.summary.remainingBudget < 0 ? "danger" : "success") +
      renderMetricCard("Allocated", logic.formatMoney(model.summary.totalAllocated, model.state.settings.currency), "Across all categories") +
      renderMetricCard("Unallocated", logic.formatMoney(model.summary.unallocated, model.state.settings.currency), "Available for planning", model.summary.unallocated < 0 ? "danger" : "") +
      renderMetricCard("Reserved for savings", logic.formatMoney(model.summary.reservedSavings, model.state.settings.currency), logic.formatMoney(model.summary.totalGoalContributions, model.state.settings.currency) + " manually contributed this cycle") +
      renderMetricCard("Savings progress", logic.formatPercent(model.summary.savingsProgressPercent), logic.formatMoney(model.summary.totalSaved, model.state.settings.currency) + " of " + logic.formatMoney(model.summary.targetSaved, model.state.settings.currency), "success") +
      "</section>" +
      '<section class="panel-grid charts-grid">' +
      '<article class="panel-card"><div class="panel-heading"><div><span class="eyebrow">Category split</span><h3>Spending by category</h3></div></div><canvas id="spending-category-chart" aria-label="Spending by category chart"></canvas></article>' +
      '<article class="panel-card"><div class="panel-heading"><div><span class="eyebrow">Plan vs actual</span><h3>Budget vs actual</h3></div></div><canvas id="budget-vs-actual-chart" aria-label="Budget vs actual chart"></canvas></article>' +
      '<article class="panel-card"><div class="panel-heading"><div><span class="eyebrow">Cycle pace</span><h3>Spending trend</h3></div></div><canvas id="trend-chart" aria-label="Spending trend chart"></canvas></article>' +
      '<article class="panel-card"><div class="panel-heading"><div><span class="eyebrow">History</span><h3>Cycle comparison</h3></div></div><canvas id="cycle-comparison-chart" aria-label="Cycle comparison chart"></canvas></article>' +
      "</section>"
    );
  }

  function renderBudgetingPage(model) {
    return (
      '<section id="budgeting" class="panel-grid two-column">' +
      '<article class="panel-card budget-card"><div class="panel-heading"><div><span class="eyebrow">Budget planner</span><h3>Allocate this cycle</h3></div><span class="pill subtle">' + escapeHtml(model.summary.cycle.label) + "</span></div>" +
      '<form id="budget-form" class="stack-form"><div class="form-grid">' +
      '<label><span>Total budget</span><input type="number" min="0" step="0.01" name="totalBudget" value="' + escapeHtml(model.summary.totalBudget) + '" /></label>' +
      '<label><span>Reserved for savings</span><input type="number" min="0" step="0.01" name="reservedSavings" value="' + escapeHtml(model.summary.reservedSavings) + '" /></label>' +
      '</div><div class="budget-preview"><div><span>Allocated</span><strong data-budget-preview="allocated">' + escapeHtml(logic.formatMoney(model.summary.totalAllocated, model.state.settings.currency)) + '</strong></div><div><span>Still unallocated</span><strong data-budget-preview="remaining">' + escapeHtml(logic.formatMoney(model.summary.unallocated, model.state.settings.currency)) + "</strong></div></div>" +
      '<div class="allocation-list">' + renderCategoryAllocationRows(model.summary, model.state.settings.currency) + '</div><p class="form-feedback" data-feedback-for="budget"></p><button type="submit" class="primary-button full-width">Save budget plan</button></form></article>' +
      '<article class="panel-card"><div class="panel-heading"><div><span class="eyebrow">Categories</span><h3>Manage spending buckets</h3></div></div>' +
      '<form id="category-form" class="stack-form compact-form"><input type="hidden" name="categoryId" value="" /><div class="form-grid triple">' +
      '<label><span>Name</span><input type="text" name="name" maxlength="30" placeholder="Category name" /></label>' +
      '<label><span>Icon</span><input type="text" name="icon" maxlength="4" placeholder="✨" /></label>' +
      '<label><span>Color</span><input type="color" name="color" value="#6d5efc" /></label>' +
      '</div><p class="form-feedback" data-feedback-for="category"></p><div class="inline-actions"><button type="submit" class="secondary-button">Save category</button><button type="button" class="ghost-button" data-action="reset-category-form">Cancel edit</button></div></form>' +
      '<div class="category-grid">' + renderCategoryUsageCards(model.summary, model.state.settings.currency) + "</div></article></section>"
    );
  }

  function renderExpensesPage(model) {
    return (
      '<section id="expenses" class="panel-card">' +
      '<div class="panel-heading"><div><span class="eyebrow">Expense log</span><h3>Search, filter, and keep things tidy</h3></div><button type="button" class="primary-button" data-action="open-expense-modal">Add expense</button></div>' +
      '<form id="expense-filters-form" class="filter-toolbar">' +
      '<label><span>Cycle</span><select name="cycleKey">' + renderCycleOptions(model, model.state.ui.expenseFilters.cycleKey) + "</select></label>" +
      '<label><span>Category</span><select name="categoryId"><option value="all" ' + (model.state.ui.expenseFilters.categoryId === "all" ? "selected" : "") + '>All categories</option>' + renderCategoryOptions(model.state.categories, model.state.ui.expenseFilters.categoryId) + "</select></label>" +
      '<label><span>From</span><input type="date" name="dateFrom" value="' + escapeHtml(model.state.ui.expenseFilters.dateFrom || "") + '" /></label>' +
      '<label><span>To</span><input type="date" name="dateTo" value="' + escapeHtml(model.state.ui.expenseFilters.dateTo || "") + '" /></label>' +
      '<label><span>Sort</span><select name="sort">' +
      '<option value="newest" ' + (model.state.ui.expenseFilters.sort === "newest" ? "selected" : "") + ">Newest</option>" +
      '<option value="oldest" ' + (model.state.ui.expenseFilters.sort === "oldest" ? "selected" : "") + ">Oldest</option>" +
      '<option value="highest" ' + (model.state.ui.expenseFilters.sort === "highest" ? "selected" : "") + ">Highest amount</option>" +
      '</select></label><label class="search-field"><span>Search note</span><input type="search" name="search" value="' + escapeHtml(model.state.ui.expenseFilters.search || "") + '" placeholder="Groceries, taxi, bill..." /></label></form>' +
      renderExpenseRows(model) +
      "</section>"
    );
  }

  function renderSavingsPage(model) {
    return (
      '<section id="goals" class="panel-grid two-column">' +
      '<article class="panel-card"><div class="panel-heading"><div><span class="eyebrow">Savings goals</span><h3>Keep long-term plans visible</h3></div></div>' +
      '<form id="goal-form" class="stack-form compact-form"><input type="hidden" name="goalId" value="" /><div class="form-grid dual">' +
      '<label><span>Goal name</span><input type="text" name="name" maxlength="40" placeholder="Emergency fund" /></label>' +
      '<label><span>Target amount</span><input type="number" min="0" step="0.01" name="targetAmount" placeholder="1500" /></label>' +
      '<label><span>Target date</span><input type="date" name="targetDate" /></label>' +
      '<label><span>Contribution per cycle</span><input type="number" min="0" step="0.01" name="contributionPerCycle" placeholder="150" /></label>' +
      '</div><p class="form-feedback" data-feedback-for="goal"></p><div class="inline-actions"><button type="submit" class="secondary-button">Save goal</button><button type="button" class="ghost-button" data-action="reset-goal-form">Cancel edit</button></div></form></article>' +
      '<article class="panel-card"><div class="panel-heading"><div><span class="eyebrow">Progress</span><h3>Funded goals</h3></div></div><div class="goal-grid">' + renderGoalCards(model) + "</div></article></section>"
    );
  }

  function renderHistoryPage(model) {
    return (
      '<section class="panel-grid">' +
      '<article id="history" class="panel-card"><div class="panel-heading"><div><span class="eyebrow">Cycle history</span><h3>Compare prior pay periods</h3></div></div><div class="history-list">' + renderHistoryRows(model) + "</div></article>" +
      "</section>"
    );
  }

  function renderSettingsPage(model) {
    return (
      '<section class="panel-grid">' +
      '<article id="settings" class="panel-card"><div class="panel-heading"><div><span class="eyebrow">Settings and data</span><h3>Salary, payday reset, and backup tools</h3></div></div>' +
      '<form id="settings-form" class="stack-form"><div class="form-grid dual">' +
      '<label><span>Monthly salary amount</span><input type="number" min="0" step="0.01" name="salaryAmount" value="' + escapeHtml(model.state.settings.salaryAmount) + '" /></label>' +
      '<label><span>Budget cycle start day</span><input type="number" min="1" max="31" step="1" name="cycleStartDay" value="' + escapeHtml(model.state.settings.cycleStartDay) + '" /></label>' +
      '<label><span>Currency symbol or code</span><input type="text" maxlength="8" name="currency" value="' + escapeHtml(model.state.settings.currency) + '" placeholder="USD or $" /></label>' +
      '<label><span>First day of week</span><select name="firstDayOfWeek">' +
      '<option value="1" ' + (Number(model.state.settings.firstDayOfWeek) === 1 ? "selected" : "") + ">Monday</option>" +
      '<option value="0" ' + (Number(model.state.settings.firstDayOfWeek) === 0 ? "selected" : "") + ">Sunday</option>" +
      '<option value="6" ' + (Number(model.state.settings.firstDayOfWeek) === 6 ? "selected" : "") + ">Saturday</option>" +
      '</select></label></div><div class="settings-helper"><span class="pill subtle" data-settings-preview>Current preview: ' + escapeHtml(model.currentPreviewCycle) + '</span></div><p class="form-feedback" data-feedback-for="settings"></p><button type="submit" class="primary-button full-width">Save settings</button></form>' +
      '<div class="data-tools"><button type="button" class="secondary-button" data-action="export-data">Export JSON</button><label class="secondary-button file-button"><input type="file" id="import-file" accept="application/json" />Import JSON</label><button type="button" class="ghost-button" data-action="seed-demo">Load demo data</button><button type="button" class="ghost-button danger" data-action="reset-data">Reset all data</button></div>' +
      "</article></section>"
    );
  }

  function renderPageContent(currentPage, model) {
    if (currentPage === "budgeting") {
      return renderBudgetingPage(model);
    }
    if (currentPage === "expenses") {
      return renderExpensesPage(model);
    }
    if (currentPage === "savings") {
      return renderSavingsPage(model);
    }
    if (currentPage === "history") {
      return renderHistoryPage(model);
    }
    if (currentPage === "settings") {
      return renderSettingsPage(model);
    }
    return renderDashboardPage(model);
  }

  function renderApp(root, model, currentPage) {
    root.innerHTML =
      '<div class="shell">' +
      renderTopbar(currentPage, model.state.settings.theme) +
      '<main class="page-content">' +
      renderPageContent(currentPage, model) +
      "</main></div>";
  }

  function renderExpenseModal(modalState, state) {
    const expense = modalState.expense || {};
    const title = expense.id ? "Edit expense" : modalState.duplicateSource ? "Duplicate expense" : "Add expense";
    return (
      '<div class="modal-card"><div class="modal-header"><div><span class="eyebrow">Expense</span><h3>' + escapeHtml(title) + '</h3></div><button type="button" class="icon-button" data-action="close-modal">Close</button></div>' +
      '<form id="expense-form" class="stack-form"><input type="hidden" name="expenseId" value="' + escapeHtml(expense.id || "") + '" /><div class="form-grid dual">' +
      '<label><span>Amount</span><input type="number" min="0" step="0.01" name="amount" value="' + escapeHtml(expense.amount || "") + '" required /></label>' +
      '<label><span>Date</span><input type="date" name="date" value="' + escapeHtml(expense.date || "") + '" required /></label>' +
      '<label><span>Category</span><select name="categoryId" required><option value="">Select a category</option>' + renderCategoryOptions(state.categories, expense.categoryId || "") + "</select></label>" +
      '<label><span>Note</span><input type="text" name="note" maxlength="80" value="' + escapeHtml(expense.note || "") + '" placeholder="Groceries, taxi, rent..." /></label>' +
      '</div><p class="form-feedback" data-feedback-for="expense"></p><div class="inline-actions"><button type="submit" class="primary-button">Save expense</button><button type="button" class="ghost-button" data-action="close-modal">Cancel</button></div></form></div>'
    );
  }

  function renderContributionModal(modalState) {
    const dateValue = modalState.date || new Date().toISOString().slice(0, 10);
    return (
      '<div class="modal-card"><div class="modal-header"><div><span class="eyebrow">Savings</span><h3>Contribute to ' + escapeHtml((modalState.goal && modalState.goal.name) || "goal") + '</h3></div><button type="button" class="icon-button" data-action="close-modal">Close</button></div>' +
      '<form id="goal-contribution-form" class="stack-form"><input type="hidden" name="goalId" value="' + escapeHtml((modalState.goal && modalState.goal.id) || "") + '" /><div class="form-grid dual">' +
      '<label><span>Amount</span><input type="number" min="0" step="0.01" name="amount" value="" required /></label>' +
      '<label><span>Date</span><input type="date" name="date" value="' + escapeHtml(dateValue) + '" required /></label>' +
      '<label class="full-span"><span>Note</span><input type="text" name="note" maxlength="80" placeholder="Transfer, extra save, bonus..." /></label>' +
      '</div><p class="form-feedback" data-feedback-for="goal-contribution"></p><div class="inline-actions"><button type="submit" class="primary-button">Save contribution</button><button type="button" class="ghost-button" data-action="close-modal">Cancel</button></div></form></div>'
    );
  }

  function renderModal(modalRoot, modalState, state) {
    if (!modalState) {
      modalRoot.innerHTML = "";
      return;
    }

    const body = modalState.type === "goal-contribution"
      ? renderContributionModal(modalState)
      : renderExpenseModal(modalState, state);

    modalRoot.innerHTML =
      '<div class="modal-backdrop" data-action="close-modal">' +
      '<div class="modal-shell" role="dialog" aria-modal="true" aria-label="Form dialog" data-stop-close="true">' +
      body +
      "</div></div>";
  }

  function renderToast(root, toast) {
    if (!toast) {
      root.innerHTML = "";
      return;
    }

    root.innerHTML =
      '<div class="toast ' +
      (toast.tone || "") +
      '"><strong>' +
      escapeHtml(toast.title || "Update") +
      "</strong><span>" +
      escapeHtml(toast.message || "") +
      "</span></div>";
  }

  global.ExpenseTrackerUI = {
    escapeHtml,
    renderApp,
    renderModal,
    renderToast,
  };
})(window);
