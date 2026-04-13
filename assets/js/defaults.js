(function attachDefaultsModule(global) {
  const cycle = global.ExpenseTrackerCycle;
  const APP_VERSION = "1.0.0";
  const STORAGE_KEY = "expense-tracker-pro:v1";

  const DEFAULT_SETTINGS = {
    salaryAmount: 4200,
    cycleStartDay: 25,
    currency: "USD",
    firstDayOfWeek: 1,
    theme: "dark",
  };

  const DEFAULT_CATEGORIES = [
    { name: "Food", icon: "🍽️", color: "#ff7a59" },
    { name: "Transport", icon: "🚌", color: "#36a2eb" },
    { name: "Rent", icon: "🏠", color: "#6d5efc" },
    { name: "Utilities", icon: "💡", color: "#f4b740" },
    { name: "Shopping", icon: "🛍️", color: "#ff5c8a" },
    { name: "Health", icon: "🧘", color: "#19b394" },
    { name: "Entertainment", icon: "🎬", color: "#7e57c2" },
    { name: "Savings", icon: "💰", color: "#00b894" },
    { name: "Other", icon: "✨", color: "#8892a6" },
  ];

  function createId(prefix) {
    const random = Math.random().toString(36).slice(2, 10);
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" + random;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createDefaultCategories() {
    const timestamp = nowIso();
    return DEFAULT_CATEGORIES.map(function mapCategory(category) {
      return {
        id: createId("cat"),
        name: category.name,
        icon: category.icon,
        color: category.color,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });
  }

  function createDefaultState() {
    return {
      settings: { ...DEFAULT_SETTINGS },
      categories: createDefaultCategories(),
      budgets: {},
      expenses: [],
      goals: [],
      goalContributions: [],
      ui: {
        selectedCycleKey: null,
        expenseFilters: {
          cycleKey: "current",
          categoryId: "all",
          dateFrom: "",
          dateTo: "",
          sort: "newest",
          search: "",
        },
      },
      meta: {
        version: APP_VERSION,
        createdAt: nowIso(),
        lastUpdated: nowIso(),
        seededDemo: false,
      },
    };
  }

  function createEmptyBudgetRecord(cycleKey) {
    return {
      cycleKey,
      totalBudget: 0,
      reservedSavings: 0,
      categoryAllocations: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function createBudgetWithAllocations(cycleKey, categories, totalBudget, allocationMap, reservedSavings) {
    const record = createEmptyBudgetRecord(cycleKey);
    record.totalBudget = totalBudget;
    record.reservedSavings = reservedSavings;
    categories.forEach(function assignAllocation(category) {
      record.categoryAllocations[category.id] = allocationMap[category.name] || 0;
    });
    return record;
  }

  function expenseFor(categoryId, amount, date, note) {
    return {
      id: createId("exp"),
      amount,
      date: cycle.formatDateISO(date),
      categoryId,
      note,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function goalContribution(goalId, amount, date, note) {
    return {
      id: createId("contrib"),
      goalId,
      amount,
      date: cycle.formatDateISO(date),
      note,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function createDemoState() {
    const state = createDefaultState();
    state.settings = {
      salaryAmount: 4850,
      cycleStartDay: 25,
      currency: "USD",
      firstDayOfWeek: 1,
      theme: "dark",
    };

    const categories = createDefaultCategories();
    state.categories = categories;

    const today = cycle.toDateAtNoon(new Date());
    const currentCycle = cycle.getCycleForDate(today, state.settings.cycleStartDay);
    const previousCycleStart = cycle.addMonths(currentCycle.start, -1);
    const previousCycle = cycle.getCycleForDate(previousCycleStart, state.settings.cycleStartDay);

    function getCategoryId(name) {
      const match = categories.find(function findCategory(category) {
        return category.name === name;
      });
      return match ? match.id : "";
    }

    state.budgets[currentCycle.key] = createBudgetWithAllocations(
      currentCycle.key,
      categories,
      4300,
      {
        Food: 620,
        Transport: 260,
        Rent: 1500,
        Utilities: 280,
        Shopping: 340,
        Health: 180,
        Entertainment: 220,
        Savings: 480,
        Other: 140,
      },
      280,
    );

    state.budgets[previousCycle.key] = createBudgetWithAllocations(
      previousCycle.key,
      categories,
      4200,
      {
        Food: 580,
        Transport: 250,
        Rent: 1500,
        Utilities: 240,
        Shopping: 310,
        Health: 140,
        Entertainment: 200,
        Savings: 450,
        Other: 130,
      },
      250,
    );

    state.expenses = [
      expenseFor(getCategoryId("Food"), 18.5, currentCycle.start, "Coffee and breakfast"),
      expenseFor(getCategoryId("Rent"), 1500, cycle.addMonths(currentCycle.start, 0), "Apartment rent"),
      expenseFor(getCategoryId("Transport"), 42, new Date(currentCycle.start.getTime() + 3 * 86400000), "Metro card reload"),
      expenseFor(getCategoryId("Utilities"), 92.4, new Date(currentCycle.start.getTime() + 4 * 86400000), "Electricity bill"),
      expenseFor(getCategoryId("Food"), 58.7, new Date(currentCycle.start.getTime() + 6 * 86400000), "Weekly groceries"),
      expenseFor(getCategoryId("Entertainment"), 34, new Date(currentCycle.start.getTime() + 9 * 86400000), "Movie tickets"),
      expenseFor(getCategoryId("Health"), 26, new Date(currentCycle.start.getTime() + 11 * 86400000), "Pharmacy essentials"),
      expenseFor(getCategoryId("Shopping"), 88, new Date(previousCycle.start.getTime() + 5 * 86400000), "Home organizer"),
      expenseFor(getCategoryId("Food"), 64.2, new Date(previousCycle.start.getTime() + 8 * 86400000), "Weekend groceries"),
      expenseFor(getCategoryId("Transport"), 31.5, new Date(previousCycle.start.getTime() + 10 * 86400000), "Taxi to airport"),
      expenseFor(getCategoryId("Entertainment"), 52, new Date(previousCycle.start.getTime() + 14 * 86400000), "Concert drinks"),
      expenseFor(getCategoryId("Utilities"), 86, new Date(previousCycle.start.getTime() + 16 * 86400000), "Water bill"),
    ];

    const rainyDayGoal = {
      id: createId("goal"),
      name: "Rainy Day Fund",
      targetAmount: 5000,
      targetDate: "",
      contributionPerCycle: 300,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const travelGoal = {
      id: createId("goal"),
      name: "Lisbon Trip",
      targetAmount: 1800,
      targetDate: cycle.formatDateISO(cycle.addMonths(today, 5)),
      contributionPerCycle: 180,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    state.goals = [rainyDayGoal, travelGoal];
    state.goalContributions = [
      goalContribution(rainyDayGoal.id, 260, new Date(previousCycle.start.getTime() + 4 * 86400000), "Auto transfer"),
      goalContribution(rainyDayGoal.id, 280, new Date(currentCycle.start.getTime() + 2 * 86400000), "Cycle reserve top-up"),
      goalContribution(travelGoal.id, 120, new Date(previousCycle.start.getTime() + 11 * 86400000), "Travel jar"),
      goalContribution(travelGoal.id, 140, new Date(currentCycle.start.getTime() + 7 * 86400000), "Bonus cash"),
    ];

    state.ui.selectedCycleKey = cycle.getCycleKeyFromDate(today, state.settings.cycleStartDay);
    state.meta.seededDemo = true;
    state.meta.lastUpdated = nowIso();
    return state;
  }

  global.ExpenseTrackerDefaults = {
    APP_VERSION,
    DEFAULT_CATEGORIES,
    DEFAULT_SETTINGS,
    STORAGE_KEY,
    createDefaultCategories,
    createDefaultState,
    createDemoState,
    createEmptyBudgetRecord,
    createId,
    nowIso,
  };
})(window);
