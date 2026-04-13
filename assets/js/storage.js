(function attachStorageModule(global) {
  const defaults = global.ExpenseTrackerDefaults;

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toCurrency(value) {
    const input = typeof value === "string" ? value.trim() : String(value || "");
    return input.slice(0, 8) || defaults.DEFAULT_SETTINGS.currency;
  }

  function normalizeText(value, fallback) {
    return typeof value === "string" ? value.trim() : fallback || "";
  }

  function normalizeSettings(rawSettings) {
    const settings = isPlainObject(rawSettings) ? rawSettings : {};
    return {
      salaryAmount: Math.max(toFiniteNumber(settings.salaryAmount, defaults.DEFAULT_SETTINGS.salaryAmount), 0),
      cycleStartDay: Math.min(Math.max(Math.round(toFiniteNumber(settings.cycleStartDay, defaults.DEFAULT_SETTINGS.cycleStartDay)), 1), 31),
      currency: toCurrency(settings.currency),
      firstDayOfWeek: [0, 1, 6].includes(Number(settings.firstDayOfWeek)) ? Number(settings.firstDayOfWeek) : defaults.DEFAULT_SETTINGS.firstDayOfWeek,
      theme: settings.theme === "light" ? "light" : "dark",
    };
  }

  function normalizeCategories(rawCategories) {
    const timestamp = defaults.nowIso();
    const source = Array.isArray(rawCategories) && rawCategories.length ? rawCategories : defaults.createDefaultCategories();
    const seen = new Set();

    return source
      .filter(isPlainObject)
      .map(function normalizeCategory(category) {
        const id = normalizeText(category.id) || "cat_" + Math.random().toString(36).slice(2, 10);
        if (seen.has(id)) {
          return null;
        }
        seen.add(id);
        return {
          id,
          name: normalizeText(category.name, "Untitled"),
          icon: normalizeText(category.icon, "•").slice(0, 4),
          color: normalizeText(category.color, "#6d5efc").slice(0, 20),
          createdAt: normalizeText(category.createdAt, timestamp),
          updatedAt: normalizeText(category.updatedAt, timestamp),
        };
      })
      .filter(Boolean);
  }

  function normalizeBudgetRecord(cycleKey, rawRecord, validCategoryIds) {
    const record = isPlainObject(rawRecord) ? rawRecord : {};
    const normalized = defaults.createEmptyBudgetRecord(cycleKey);
    normalized.totalBudget = Math.max(toFiniteNumber(record.totalBudget, 0), 0);
    normalized.reservedSavings = Math.max(toFiniteNumber(record.reservedSavings, 0), 0);
    normalized.createdAt = normalizeText(record.createdAt, normalized.createdAt);
    normalized.updatedAt = normalizeText(record.updatedAt, normalized.updatedAt);

    if (isPlainObject(record.categoryAllocations)) {
      validCategoryIds.forEach(function assignAllocation(categoryId) {
        normalized.categoryAllocations[categoryId] = Math.max(toFiniteNumber(record.categoryAllocations[categoryId], 0), 0);
      });
    }

    return normalized;
  }

  function normalizeExpenses(rawExpenses, validCategoryIds) {
    const source = Array.isArray(rawExpenses) ? rawExpenses : [];
    return source
      .filter(isPlainObject)
      .map(function normalizeExpense(expense) {
        return {
          id: normalizeText(expense.id) || "exp_" + Math.random().toString(36).slice(2, 10),
          amount: Math.max(toFiniteNumber(expense.amount, 0), 0),
          date: normalizeText(expense.date),
          categoryId: normalizeText(expense.categoryId),
          note: normalizeText(expense.note),
          createdAt: normalizeText(expense.createdAt, defaults.nowIso()),
          updatedAt: normalizeText(expense.updatedAt, defaults.nowIso()),
        };
      })
      .filter(function keepExpense(expense) {
        return expense.amount > 0 && expense.date && validCategoryIds.has(expense.categoryId);
      });
  }

  function normalizeGoals(rawGoals) {
    const source = Array.isArray(rawGoals) ? rawGoals : [];
    return source
      .filter(isPlainObject)
      .map(function normalizeGoal(goal) {
        return {
          id: normalizeText(goal.id) || "goal_" + Math.random().toString(36).slice(2, 10),
          name: normalizeText(goal.name, "Savings Goal"),
          targetAmount: Math.max(toFiniteNumber(goal.targetAmount, 0), 0),
          targetDate: normalizeText(goal.targetDate),
          contributionPerCycle: Math.max(toFiniteNumber(goal.contributionPerCycle, 0), 0),
          createdAt: normalizeText(goal.createdAt, defaults.nowIso()),
          updatedAt: normalizeText(goal.updatedAt, defaults.nowIso()),
        };
      })
      .filter(function keepGoal(goal) {
        return goal.targetAmount > 0;
      });
  }

  function normalizeGoalContributions(rawContributions, validGoalIds) {
    const source = Array.isArray(rawContributions) ? rawContributions : [];
    return source
      .filter(isPlainObject)
      .map(function normalizeContribution(contribution) {
        return {
          id: normalizeText(contribution.id) || "contrib_" + Math.random().toString(36).slice(2, 10),
          goalId: normalizeText(contribution.goalId),
          amount: Math.max(toFiniteNumber(contribution.amount, 0), 0),
          date: normalizeText(contribution.date),
          note: normalizeText(contribution.note),
          createdAt: normalizeText(contribution.createdAt, defaults.nowIso()),
          updatedAt: normalizeText(contribution.updatedAt, defaults.nowIso()),
        };
      })
      .filter(function keepContribution(contribution) {
        return contribution.amount > 0 && contribution.date && validGoalIds.has(contribution.goalId);
      });
  }

  function normalizeUi(rawUi, currentCycleKey) {
    const ui = isPlainObject(rawUi) ? rawUi : {};
    const filters = isPlainObject(ui.expenseFilters) ? ui.expenseFilters : {};
    return {
      selectedCycleKey: normalizeText(ui.selectedCycleKey, currentCycleKey),
      expenseFilters: {
        cycleKey: normalizeText(filters.cycleKey, "current"),
        categoryId: normalizeText(filters.categoryId, "all"),
        dateFrom: normalizeText(filters.dateFrom),
        dateTo: normalizeText(filters.dateTo),
        sort: normalizeText(filters.sort, "newest"),
        search: normalizeText(filters.search),
      },
    };
  }

  function normalizeState(rawState) {
    const fallback = defaults.createDefaultState();
    const state = isPlainObject(rawState) ? rawState : fallback;
    const settings = normalizeSettings(state.settings);
    const categories = normalizeCategories(state.categories);
    const categoryIds = new Set(categories.map(function getId(category) { return category.id; }));
    const budgets = {};

    if (isPlainObject(state.budgets)) {
      Object.entries(state.budgets).forEach(function eachBudget(entry) {
        const cycleKey = entry[0];
        const record = entry[1];
        if (normalizeText(cycleKey)) {
          budgets[cycleKey] = normalizeBudgetRecord(cycleKey, record, categoryIds);
        }
      });
    }

    const expenses = normalizeExpenses(state.expenses, categoryIds);
    const goals = normalizeGoals(state.goals);
    const goalIds = new Set(goals.map(function getGoalId(goal) { return goal.id; }));
    const goalContributions = normalizeGoalContributions(state.goalContributions, goalIds);
    const ui = normalizeUi(state.ui, fallback.ui.selectedCycleKey);

    return {
      settings,
      categories,
      budgets,
      expenses,
      goals,
      goalContributions,
      ui,
      meta: {
        version: defaults.APP_VERSION,
        createdAt: normalizeText(state.meta && state.meta.createdAt, fallback.meta.createdAt),
        lastUpdated: defaults.nowIso(),
        seededDemo: Boolean(state.meta && state.meta.seededDemo),
      },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(defaults.STORAGE_KEY);
      if (!raw) {
        return { state: defaults.createDefaultState(), recovered: false };
      }
      const parsed = JSON.parse(raw);
      return { state: normalizeState(parsed), recovered: false };
    } catch (error) {
      return { state: defaults.createDefaultState(), recovered: true };
    }
  }

  function saveState(state) {
    const normalized = normalizeState(state);
    normalized.meta.lastUpdated = defaults.nowIso();
    localStorage.setItem(defaults.STORAGE_KEY, JSON.stringify(normalized));
  }

  function clearState() {
    localStorage.removeItem(defaults.STORAGE_KEY);
  }

  function createExportPayload(state) {
    const normalized = normalizeState(state);
    return {
      app: "Expense Tracker Pro",
      version: defaults.APP_VERSION,
      exportedAt: defaults.nowIso(),
      data: normalized,
    };
  }

  function validateImportPayload(payload) {
    if (!isPlainObject(payload)) {
      return { ok: false, message: "Import file is not valid JSON data." };
    }

    const rawData = isPlainObject(payload.data) ? payload.data : payload;
    if (!isPlainObject(rawData)) {
      return { ok: false, message: "Import file is missing the app data block." };
    }

    const hasAnyKnownKey = ["settings", "categories", "budgets", "expenses", "goals", "goalContributions"].some(function hasKey(key) {
      return key in rawData;
    });

    if (!hasAnyKnownKey) {
      return { ok: false, message: "Import file does not match the expected expense tracker schema." };
    }

    return {
      ok: true,
      state: normalizeState(rawData),
    };
  }

  global.ExpenseTrackerStorage = {
    clearState,
    createExportPayload,
    loadState,
    normalizeState,
    saveState,
    validateImportPayload,
  };
})(window);
