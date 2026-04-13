(function attachApp(global) {
  const cycle = global.ExpenseTrackerCycle;
  const defaults = global.ExpenseTrackerDefaults;
  const storage = global.ExpenseTrackerStorage;
  const validation = global.ExpenseTrackerValidation;
  const logic = global.ExpenseTrackerLogic;
  const ui = global.ExpenseTrackerUI;
  const charts = global.ExpenseTrackerCharts;

  const appRoot = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toastRoot = document.getElementById("toast-root");

  let state = defaults.createDefaultState();
  let modalState = null;
  let toastState = null;
  let toastTimer = null;
  let filterTimer = null;
  let formDrafts = {
    category: null,
    goal: null,
  };

  function getCurrentPage() {
    const page = document.body.dataset.page || "dashboard";
    return page;
  }

  function showToast(title, message, tone) {
    toastState = { title, message, tone: tone || "" };
    ui.renderToast(toastRoot, toastState);
    global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function clearToast() {
      toastState = null;
      ui.renderToast(toastRoot, toastState);
    }, 2800);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
  }

  function updateMeta() {
    state.meta.lastUpdated = defaults.nowIso();
  }

  function commit(mutator, toast) {
    mutator();
    updateMeta();
    storage.saveState(state);
    render();
    if (toast) {
      showToast(toast.title, toast.message, toast.tone);
    }
  }

  function buildModel() {
    const selectedCycleKey = logic.getSelectedCycleKey(state);
    const summary = logic.getCycleSummary(state, selectedCycleKey);
    const goals = logic.getGoalProgress(state);
    const totalTarget = goals.reduce(function sumTarget(sum, goal) {
      return sum + goal.targetAmount;
    }, 0);
    const totalSaved = goals.reduce(function sumSaved(sum, goal) {
      return sum + goal.contributed;
    }, 0);

    return {
      state,
      cycles: logic.getAvailableCycles(state),
      selectedCycleKey,
      summary: {
        ...summary,
        savingsProgressPercent: totalTarget ? Math.min((totalSaved / totalTarget) * 100, 100) : 0,
        totalSaved,
        targetSaved: totalTarget,
      },
      expenses: logic.getExpensesView(state, state.ui.expenseFilters),
      goals,
      history: logic.getHistoryRows(state),
      currentPreviewCycle: logic.getCurrentCycle(state).label,
      chartData: {
        category: logic.getCategoryChartData(summary),
        trend: logic.getTrendSeries(summary),
        comparison: logic.getCycleComparisonSeries(state),
      },
    };
  }

  function populateEditableForms() {
    const categoryForm = document.getElementById("category-form");
    if (categoryForm) {
      categoryForm.reset();
      categoryForm.elements.categoryId.value = (formDrafts.category && formDrafts.category.id) || "";
      categoryForm.elements.name.value = (formDrafts.category && formDrafts.category.name) || "";
      categoryForm.elements.icon.value = (formDrafts.category && formDrafts.category.icon) || "";
      categoryForm.elements.color.value = (formDrafts.category && formDrafts.category.color) || "#6d5efc";
    }

    const goalForm = document.getElementById("goal-form");
    if (goalForm) {
      goalForm.reset();
      goalForm.elements.goalId.value = (formDrafts.goal && formDrafts.goal.id) || "";
      goalForm.elements.name.value = (formDrafts.goal && formDrafts.goal.name) || "";
      goalForm.elements.targetAmount.value = (formDrafts.goal && formDrafts.goal.targetAmount) || "";
      goalForm.elements.targetDate.value = (formDrafts.goal && formDrafts.goal.targetDate) || "";
      goalForm.elements.contributionPerCycle.value = (formDrafts.goal && formDrafts.goal.contributionPerCycle) || "";
    }
  }

  function render() {
    const currentPage = getCurrentPage();
    setTheme(state.settings.theme);
    if (!state.ui.selectedCycleKey) {
      state.ui.selectedCycleKey = logic.getCurrentCycle(state).key;
    }
    const model = buildModel();
    ui.renderApp(appRoot, model, currentPage);
    ui.renderModal(modalRoot, modalState, state);
    ui.renderToast(toastRoot, toastState);
    populateEditableForms();
    updateBudgetPreview();
    updateSettingsPreview();
    if (currentPage === "dashboard") {
      charts.renderCharts(model);
    }
  }

  function closeModal() {
    modalState = null;
    ui.renderModal(modalRoot, modalState, state);
  }

  function openExpenseModal(expense) {
    modalState = {
      type: "expense",
      expense: expense || {
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        categoryId: state.categories[0] ? state.categories[0].id : "",
        note: "",
      },
    };
    ui.renderModal(modalRoot, modalState, state);
  }

  function openDuplicateExpenseModal(expense) {
    modalState = {
      type: "expense",
      duplicateSource: expense.id,
      expense: {
        amount: expense.amount,
        date: expense.date,
        categoryId: expense.categoryId,
        note: expense.note,
      },
    };
    ui.renderModal(modalRoot, modalState, state);
  }

  function openContributionModal(goal) {
    modalState = {
      type: "goal-contribution",
      goal,
      date: new Date().toISOString().slice(0, 10),
    };
    ui.renderModal(modalRoot, modalState, state);
  }

  function setFeedback(form, key, message, tone) {
    const feedback = form && form.querySelector('[data-feedback-for="' + key + '"]');
    if (!feedback) {
      return;
    }
    feedback.textContent = message || "";
    feedback.classList.toggle("error", tone === "error");
    feedback.classList.toggle("success", tone === "success");
  }

  function clearAllFeedback(form) {
    if (!form) {
      return;
    }
    form.querySelectorAll(".form-feedback").forEach(function clearNode(node) {
      node.textContent = "";
      node.classList.remove("error", "success");
    });
  }

  function formDataToObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function updateBudgetPreview() {
    const form = document.getElementById("budget-form");
    if (!form) {
      return;
    }
    const values = formDataToObject(form);
    const allocations = {};

    Array.from(form.elements).forEach(function eachElement(element) {
      if (element.name && element.name.indexOf("allocation:") === 0) {
        allocations[element.name.replace("allocation:", "")] = Number(element.value || 0);
      }
    });

    const result = validation.validateBudget(values.totalBudget || 0, values.reservedSavings || 0, allocations);
    const allocatedNode = form.querySelector('[data-budget-preview="allocated"]');
    const remainingNode = form.querySelector('[data-budget-preview="remaining"]');

    if (allocatedNode) {
      allocatedNode.textContent = logic.formatMoney(result.totalAllocated, state.settings.currency);
    }
    if (remainingNode) {
      remainingNode.textContent = logic.formatMoney(result.remaining, state.settings.currency);
      remainingNode.classList.toggle("negative", result.remaining < 0);
    }
    if (result.errors.allocations) {
      setFeedback(form, "budget", result.errors.allocations, "error");
    } else {
      setFeedback(form, "budget", "");
    }
  }

  function updateSettingsPreview() {
    const form = document.getElementById("settings-form");
    const preview = document.querySelector("[data-settings-preview]");
    if (!form || !preview) {
      return;
    }
    const cycleStartDay = Number(form.elements.cycleStartDay.value || state.settings.cycleStartDay);
    preview.textContent = "Current preview: " + cycle.getCycleForDate(new Date(), cycleStartDay).label;
  }

  function resetCategoryForm() {
    formDrafts.category = null;
    const form = document.getElementById("category-form");
    if (!form) {
      return;
    }
    form.reset();
    form.elements.categoryId.value = "";
    form.elements.color.value = "#6d5efc";
    clearAllFeedback(form);
  }

  function resetGoalForm() {
    formDrafts.goal = null;
    const form = document.getElementById("goal-form");
    if (!form) {
      return;
    }
    form.reset();
    form.elements.goalId.value = "";
    clearAllFeedback(form);
  }

  function applyFilterChanges(options) {
    const form = document.getElementById("expense-filters-form");
    const settings = options || {};
    if (!form) {
      return;
    }
    const values = formDataToObject(form);
    commit(function saveFilters() {
      state.ui.expenseFilters = {
        cycleKey: values.cycleKey || "current",
        categoryId: values.categoryId || "all",
        dateFrom: values.dateFrom || "",
        dateTo: values.dateTo || "",
        sort: values.sort || "newest",
        search: values.search || "",
      };
    });

    if (settings.preserveSearchFocus) {
      global.requestAnimationFrame(function restoreFocus() {
        const searchInput = document.querySelector('#expense-filters-form input[name="search"]');
        if (!searchInput) {
          return;
        }
        searchInput.focus();
        const length = searchInput.value.length;
        searchInput.setSelectionRange(length, length);
      });
    }
  }

  function downloadExport() {
    const payload = storage.createExportPayload(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expense-tracker-export-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Export ready", "Your budget data was downloaded as JSON.", "success");
  }

  function handleImportedFile(file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function onLoad() {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const result = storage.validateImportPayload(parsed);
        if (!result.ok) {
          showToast("Import blocked", result.message, "error");
          return;
        }

        if (!global.confirm("Importing will replace your current saved data. Continue?")) {
          return;
        }

        state = result.state;
        modalState = null;
        formDrafts = { category: null, goal: null };
        storage.saveState(state);
        render();
        showToast("Import complete", "Your saved data was replaced successfully.", "success");
      } catch (error) {
        showToast("Import failed", "That file could not be parsed as valid JSON.", "error");
      }
    };
    reader.readAsText(file);
  }

  function handleClick(event) {
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.dataset.action;

    if (action === "toggle-theme") {
      commit(function toggleTheme() {
        state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
      }, {
        title: "Theme updated",
        message: "Switched to " + state.settings.theme + " mode.",
        tone: "success",
      });
      return;
    }

    if (action === "open-expense-modal") {
      openExpenseModal();
      return;
    }

    if (action === "close-modal") {
      if (actionTarget.classList.contains("modal-backdrop") && event.target.closest("[data-stop-close='true']")) {
        return;
      }
      if (actionTarget.hasAttribute("data-stop-close")) {
        return;
      }
      closeModal();
      return;
    }

    if (action === "edit-category") {
      const category = logic.getCategoryById(state, actionTarget.dataset.categoryId);
      if (!category) {
        return;
      }
      formDrafts.category = { ...category };
      render();
      document.getElementById("budgeting")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "delete-category") {
      const categoryId = actionTarget.dataset.categoryId;
      const category = logic.getCategoryById(state, categoryId);
      if (!category) {
        return;
      }
      if (state.categories.length <= 1) {
        showToast("Delete blocked", "Keep at least one category available for new expenses.", "error");
        return;
      }
      if (!logic.isSafeCategoryDelete(state, categoryId)) {
        showToast("Delete blocked", "Remove linked expenses and allocations before deleting this category.", "error");
        return;
      }
      if (!global.confirm('Delete category "' + category.name + '"?')) {
        return;
      }
      commit(function deleteCategory() {
        state.categories = state.categories.filter(function keepCategory(item) {
          return item.id !== categoryId;
        });
        Object.values(state.budgets).forEach(function cleanBudget(budget) {
          delete budget.categoryAllocations[categoryId];
        });
        if (formDrafts.category && formDrafts.category.id === categoryId) {
          formDrafts.category = null;
        }
      }, { title: "Category deleted", message: category.name + " was removed." });
      return;
    }

    if (action === "reset-category-form") {
      resetCategoryForm();
      return;
    }

    if (action === "edit-expense") {
      const expense = logic.getExpenseById(state, actionTarget.dataset.expenseId);
      if (expense) {
        openExpenseModal(expense);
      }
      return;
    }

    if (action === "duplicate-expense") {
      const expense = logic.getExpenseById(state, actionTarget.dataset.expenseId);
      if (expense) {
        openDuplicateExpenseModal(expense);
      }
      return;
    }

    if (action === "delete-expense") {
      const expense = logic.getExpenseById(state, actionTarget.dataset.expenseId);
      if (!expense || !global.confirm("Delete this expense?")) {
        return;
      }
      commit(function deleteExpense() {
        state.expenses = state.expenses.filter(function keepExpense(item) {
          return item.id !== expense.id;
        });
      }, { title: "Expense deleted", message: "The expense was removed." });
      return;
    }

    if (action === "contribute-goal") {
      const goal = logic.getGoalById(state, actionTarget.dataset.goalId);
      if (goal) {
        openContributionModal(goal);
      }
      return;
    }

    if (action === "edit-goal") {
      const goal = logic.getGoalById(state, actionTarget.dataset.goalId);
      if (!goal) {
        return;
      }
      formDrafts.goal = { ...goal };
      render();
      document.getElementById("goals")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "delete-goal") {
      const goal = logic.getGoalById(state, actionTarget.dataset.goalId);
      if (!goal || !global.confirm('Delete savings goal "' + goal.name + '"?')) {
        return;
      }
      commit(function deleteGoal() {
        state.goals = state.goals.filter(function keepGoal(item) {
          return item.id !== goal.id;
        });
        state.goalContributions = state.goalContributions.filter(function keepContribution(entry) {
          return entry.goalId !== goal.id;
        });
        if (formDrafts.goal && formDrafts.goal.id === goal.id) {
          formDrafts.goal = null;
        }
      }, { title: "Goal deleted", message: goal.name + " was removed." });
      return;
    }

    if (action === "reset-goal-form") {
      resetGoalForm();
      return;
    }

    if (action === "select-cycle") {
      commit(function selectCycle() {
        state.ui.selectedCycleKey = actionTarget.dataset.cycleKey;
      });
      document.getElementById("history")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "export-data") {
      downloadExport();
      return;
    }

    if (action === "seed-demo") {
      if (!global.confirm("Load polished demo data and replace your current local data?")) {
        return;
      }
      state = defaults.createDemoState();
      storage.saveState(state);
      resetCategoryForm();
      resetGoalForm();
      closeModal();
      render();
      showToast("Demo loaded", "Sample salary cycles, expenses, and goals are ready to explore.", "success");
      return;
    }

    if (action === "reset-data") {
      if (!global.confirm("This will permanently clear all saved data in localStorage. Continue?")) {
        return;
      }
      storage.clearState();
      state = defaults.createDefaultState();
      formDrafts = { category: null, goal: null };
      closeModal();
      render();
      showToast("Data cleared", "The app was reset to its default state.", "success");
    }
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (form.id === "settings-form") {
      event.preventDefault();
      clearAllFeedback(form);
      const values = formDataToObject(form);
      const errors = validation.validateSettings(values);
      if (Object.keys(errors).length) {
        setFeedback(form, "settings", Object.values(errors)[0], "error");
        return;
      }
      commit(function saveSettings() {
        state.settings.salaryAmount = Number(values.salaryAmount || 0);
        state.settings.cycleStartDay = Number(values.cycleStartDay || 1);
        state.settings.currency = String(values.currency || "USD").trim();
        state.settings.firstDayOfWeek = Number(values.firstDayOfWeek || 1);
        state.ui.selectedCycleKey = logic.getCurrentCycle(state).key;
      }, { title: "Settings saved", message: "Salary and budget cycle settings were updated.", tone: "success" });
      return;
    }

    if (form.id === "budget-form") {
      event.preventDefault();
      clearAllFeedback(form);
      const values = formDataToObject(form);
      const allocations = {};

      Array.from(form.elements).forEach(function eachElement(element) {
        if (element.name && element.name.indexOf("allocation:") === 0) {
          allocations[element.name.replace("allocation:", "")] = Number(element.value || 0);
        }
      });

      const result = validation.validateBudget(values.totalBudget || 0, values.reservedSavings || 0, allocations);
      if (Object.keys(result.errors).length) {
        setFeedback(form, "budget", Object.values(result.errors)[0], "error");
        return;
      }

      commit(function saveBudget() {
        const cycleKey = logic.getSelectedCycleKey(state);
        const record = logic.getBudgetRecord(state, cycleKey);
        record.totalBudget = Number(values.totalBudget || 0);
        record.reservedSavings = Number(values.reservedSavings || 0);
        record.updatedAt = defaults.nowIso();
        state.categories.forEach(function updateCategory(category) {
          record.categoryAllocations[category.id] = Number(allocations[category.id] || 0);
        });
        state.budgets[cycleKey] = record;
      }, { title: "Budget saved", message: "This cycle now has an updated allocation plan.", tone: "success" });
      return;
    }

    if (form.id === "category-form") {
      event.preventDefault();
      clearAllFeedback(form);
      const values = formDataToObject(form);
      const editingId = String(values.categoryId || "");
      const errors = validation.validateCategory(values, state.categories, editingId);
      if (Object.keys(errors).length) {
        setFeedback(form, "category", Object.values(errors)[0], "error");
        return;
      }

      commit(function saveCategory() {
        if (editingId) {
          state.categories = state.categories.map(function mapCategory(category) {
            return category.id === editingId
              ? {
                  ...category,
                  name: String(values.name).trim(),
                  icon: String(values.icon || "•").trim() || "•",
                  color: String(values.color || "#6d5efc"),
                  updatedAt: defaults.nowIso(),
                }
              : category;
          });
        } else {
          const category = {
            id: defaults.createId("cat"),
            name: String(values.name).trim(),
            icon: String(values.icon || "•").trim() || "•",
            color: String(values.color || "#6d5efc"),
            createdAt: defaults.nowIso(),
            updatedAt: defaults.nowIso(),
          };
          state.categories.push(category);
          Object.values(state.budgets).forEach(function updateBudget(budget) {
            budget.categoryAllocations[category.id] = 0;
          });
        }
        formDrafts.category = null;
      }, { title: "Category saved", message: "Your category list is up to date.", tone: "success" });
      return;
    }

    if (form.id === "goal-form") {
      event.preventDefault();
      clearAllFeedback(form);
      const values = formDataToObject(form);
      const goalId = String(values.goalId || "");
      const errors = validation.validateGoal(values);
      if (Object.keys(errors).length) {
        setFeedback(form, "goal", Object.values(errors)[0], "error");
        return;
      }

      commit(function saveGoal() {
        if (goalId) {
          state.goals = state.goals.map(function mapGoal(goal) {
            return goal.id === goalId
              ? {
                  ...goal,
                  name: String(values.name).trim(),
                  targetAmount: Number(values.targetAmount || 0),
                  targetDate: values.targetDate || "",
                  contributionPerCycle: Number(values.contributionPerCycle || 0),
                  updatedAt: defaults.nowIso(),
                }
              : goal;
          });
        } else {
          state.goals.push({
            id: defaults.createId("goal"),
            name: String(values.name).trim(),
            targetAmount: Number(values.targetAmount || 0),
            targetDate: values.targetDate || "",
            contributionPerCycle: Number(values.contributionPerCycle || 0),
            createdAt: defaults.nowIso(),
            updatedAt: defaults.nowIso(),
          });
        }
        formDrafts.goal = null;
      }, { title: "Goal saved", message: "Savings target updated successfully.", tone: "success" });
      return;
    }

    if (form.id === "expense-form") {
      event.preventDefault();
      clearAllFeedback(form);
      const values = formDataToObject(form);
      const errors = validation.validateExpense(values, state.categories);
      if (Object.keys(errors).length) {
        setFeedback(form, "expense", Object.values(errors)[0], "error");
        return;
      }

      commit(function saveExpense() {
        const payload = {
          id: String(values.expenseId || "") || defaults.createId("exp"),
          amount: Number(values.amount || 0),
          date: String(values.date),
          categoryId: String(values.categoryId),
          note: String(values.note || "").trim(),
          createdAt: defaults.nowIso(),
          updatedAt: defaults.nowIso(),
        };

        if (values.expenseId) {
          state.expenses = state.expenses.map(function mapExpense(expense) {
            return expense.id === values.expenseId
              ? { ...expense, ...payload, createdAt: expense.createdAt, updatedAt: defaults.nowIso() }
              : expense;
          });
        } else {
          state.expenses.push(payload);
        }
      }, { title: "Expense saved", message: "The expense was assigned to the correct cycle automatically.", tone: "success" });
      closeModal();
      return;
    }

    if (form.id === "goal-contribution-form") {
      event.preventDefault();
      clearAllFeedback(form);
      const values = formDataToObject(form);
      const errors = validation.validateContribution(values, state.goals);
      if (Object.keys(errors).length) {
        setFeedback(form, "goal-contribution", Object.values(errors)[0], "error");
        return;
      }

      commit(function saveContribution() {
        state.goalContributions.push({
          id: defaults.createId("contrib"),
          goalId: String(values.goalId),
          amount: Number(values.amount || 0),
          date: String(values.date),
          note: String(values.note || "").trim(),
          createdAt: defaults.nowIso(),
          updatedAt: defaults.nowIso(),
        });
      }, { title: "Contribution saved", message: "Savings progress was updated.", tone: "success" });
      closeModal();
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("#budget-form")) {
      updateBudgetPreview();
      return;
    }

    if (target.closest("#settings-form")) {
      updateSettingsPreview();
      return;
    }

    if (target.closest("#expense-filters-form") && target.getAttribute("name") === "search") {
      global.clearTimeout(filterTimer);
      filterTimer = global.setTimeout(function delayedFilter() {
        applyFilterChanges({ preserveSearchFocus: true });
      }, 220);
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === "import-file") {
      handleImportedFile(target.files && target.files[0]);
      target.value = "";
      return;
    }

    if (target.closest("#expense-filters-form")) {
      applyFilterChanges();
    }
  }

  function attachEvents() {
    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleChange);
    modalRoot.addEventListener("click", function onModalClick(event) {
      const backdrop = modalRoot.querySelector(".modal-backdrop");
      if (event.target === backdrop) {
        closeModal();
      }
    });
    global.addEventListener("resize", function onResize() {
      if (appRoot.innerHTML) {
        render();
      }
    });
  }

  function initApp() {
    const loaded = storage.loadState();
    state = loaded.state;
    if (!state.ui.selectedCycleKey) {
      state.ui.selectedCycleKey = logic.getCurrentCycle(state).key;
    }
    attachEvents();
    render();
    if (loaded.recovered) {
      showToast("Storage recovered", "Saved data was corrupted, so the app fell back to defaults.", "error");
    }
  }

  initApp();
})(window);
