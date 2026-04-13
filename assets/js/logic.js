(function attachLogicModule(global) {
  const cycle = global.ExpenseTrackerCycle;
  const defaults = global.ExpenseTrackerDefaults;

  function currencyFormatter(currency) {
    const normalized = String(currency || "USD").trim().toUpperCase();
    if (normalized.length === 3) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: normalized,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function formatMoney(value, currency) {
    const amount = Number(value || 0);
    const formatter = currencyFormatter(currency);
    if (formatter) {
      return formatter.format(amount);
    }
    return (currency || "$") + amount.toFixed(2);
  }

  function formatPercent(value) {
    return Math.round(Number(value || 0)) + "%";
  }

  function getCurrentCycle(state) {
    return cycle.getCycleForDate(new Date(), state.settings.cycleStartDay);
  }

  function getAvailableCycles(state) {
    const cycleKeys = new Set();
    cycleKeys.add(getCurrentCycle(state).key);

    state.expenses.forEach(function addExpenseCycle(expense) {
      cycleKeys.add(cycle.getCycleForDate(expense.date, state.settings.cycleStartDay).key);
    });

    state.goalContributions.forEach(function addContributionCycle(contribution) {
      cycleKeys.add(cycle.getCycleForDate(contribution.date, state.settings.cycleStartDay).key);
    });

    Object.keys(state.budgets).forEach(function addBudgetCycle(cycleKey) {
      cycleKeys.add(cycleKey);
    });

    const sorted = Array.from(cycleKeys).sort(function sortCycles(left, right) {
      return new Date(right) - new Date(left);
    });

    return sorted.map(function mapCycle(cycleKey) {
      return {
        key: cycleKey,
        label: cycle.getCycleLabelFromKey(cycleKey, state.settings.cycleStartDay),
      };
    });
  }

  function getSelectedCycleKey(state) {
    const available = getAvailableCycles(state);
    const currentCycleKey = getCurrentCycle(state).key;
    const requested = (state.ui && state.ui.selectedCycleKey) || currentCycleKey;
    return available.some(function hasCycle(item) { return item.key === requested; }) ? requested : currentCycleKey;
  }

  function getBudgetRecord(state, cycleKey) {
    return state.budgets[cycleKey] || defaults.createEmptyBudgetRecord(cycleKey);
  }

  function getGoalProgress(state) {
    return state.goals.map(function mapGoal(goal) {
      const contributed = state.goalContributions
        .filter(function matchGoal(entry) {
          return entry.goalId === goal.id;
        })
        .reduce(function sumGoal(sum, entry) {
          return sum + Number(entry.amount || 0);
        }, 0);

      const percent = goal.targetAmount ? Math.min((contributed / goal.targetAmount) * 100, 100) : 0;

      return {
        ...goal,
        contributed,
        remaining: Math.max(goal.targetAmount - contributed, 0),
        percent,
      };
    });
  }

  function getCycleSummary(state, cycleKey) {
    const cycleDate = cycle.toDateAtNoon(cycleKey);
    const currentCycle = cycle.getCycleForDate(cycleDate, state.settings.cycleStartDay);
    const budget = getBudgetRecord(state, currentCycle.key);
    const expenses = state.expenses.filter(function filterExpense(expense) {
      return cycle.getCycleForDate(expense.date, state.settings.cycleStartDay).key === currentCycle.key;
    });
    const contributions = state.goalContributions.filter(function filterContribution(entry) {
      return cycle.getCycleForDate(entry.date, state.settings.cycleStartDay).key === currentCycle.key;
    });
    const spentByCategory = new Map();

    expenses.forEach(function addSpent(expense) {
      spentByCategory.set(expense.categoryId, (spentByCategory.get(expense.categoryId) || 0) + Number(expense.amount || 0));
    });

    const categorySummaries = state.categories.map(function mapCategory(category) {
      const allocated = Number(budget.categoryAllocations[category.id] || 0);
      const spent = Number(spentByCategory.get(category.id) || 0);
      const remaining = allocated - spent;
      const usageRatio = allocated > 0 ? spent / allocated : 0;
      const status = usageRatio >= 1 ? "over" : usageRatio >= 0.85 ? "near" : spent > 0 ? "healthy" : "idle";

      return {
        ...category,
        allocated,
        spent,
        remaining,
        usageRatio,
        status,
      };
    });

    const totalAllocated = categorySummaries.reduce(function sumAllocated(sum, category) {
      return sum + category.allocated;
    }, 0);
    const totalSpent = expenses.reduce(function sumSpent(sum, expense) {
      return sum + Number(expense.amount || 0);
    }, 0);
    const totalBudget = Number(budget.totalBudget || state.settings.salaryAmount || 0);
    const reservedSavings = Number(budget.reservedSavings || 0);
    const totalGoalContributions = contributions.reduce(function sumContributions(sum, entry) {
      return sum + Number(entry.amount || 0);
    }, 0);
    const remainingBudget = totalBudget - reservedSavings - totalSpent;
    const unallocated = totalBudget - reservedSavings - totalAllocated;

    return {
      cycle: currentCycle,
      budget,
      expenses,
      contributions,
      categorySummaries,
      totalBudget,
      totalSpent,
      totalAllocated,
      reservedSavings,
      totalGoalContributions,
      remainingBudget,
      unallocated,
      salaryAmount: Number(state.settings.salaryAmount || 0),
      savingsGoalProgress: getGoalProgress(state),
    };
  }

  function getExpensesView(state, filters) {
    const cycleStartDay = state.settings.cycleStartDay;
    const searchTerm = String(filters.search || "").trim().toLowerCase();
    const selectedCycleKey = filters.cycleKey === "current" ? getCurrentCycle(state).key : filters.cycleKey;

    let expenses = state.expenses.filter(function filterExpense(expense) {
      if (selectedCycleKey !== "all" && cycle.getCycleForDate(expense.date, cycleStartDay).key !== selectedCycleKey) {
        return false;
      }
      if (filters.categoryId !== "all" && expense.categoryId !== filters.categoryId) {
        return false;
      }
      if (filters.dateFrom && new Date(expense.date) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(expense.date) > new Date(filters.dateTo)) {
        return false;
      }
      if (searchTerm && !String(expense.note || "").toLowerCase().includes(searchTerm)) {
        return false;
      }
      return true;
    });

    expenses = expenses.slice().sort(function sortExpense(left, right) {
      if (filters.sort === "oldest") {
        return new Date(left.date) - new Date(right.date);
      }
      if (filters.sort === "highest") {
        return Number(right.amount) - Number(left.amount);
      }
      return new Date(right.date) - new Date(left.date);
    });

    return expenses;
  }

  function getTrendSeries(summary) {
    const buckets = new Map();
    let cursor = cycle.toDateAtNoon(summary.cycle.start);
    const end = cycle.toDateAtNoon(summary.cycle.end);
    while (cursor.getTime() <= end.getTime()) {
      buckets.set(cycle.formatDateISO(cursor), 0);
      cursor = cycle.toDateAtNoon(new Date(cursor.getTime() + 86400000));
    }

    summary.expenses.forEach(function addExpense(expense) {
      const date = cycle.formatDateISO(expense.date);
      buckets.set(date, (buckets.get(date) || 0) + Number(expense.amount || 0));
    });

    let runningTotal = 0;
    return Array.from(buckets.entries()).map(function mapEntry(entry) {
      const date = entry[0];
      const amount = entry[1];
      runningTotal += amount;
      return {
        date,
        amount,
        runningTotal,
      };
    });
  }

  function getCategoryChartData(summary) {
    return summary.categorySummaries
      .filter(function keepCategory(category) {
        return category.spent > 0 || category.allocated > 0;
      })
      .map(function mapCategory(category) {
        return {
          label: category.name,
          color: category.color,
          spent: category.spent,
          allocated: category.allocated,
        };
      });
  }

  function getCycleComparisonSeries(state) {
    return getAvailableCycles(state)
      .slice(0, 6)
      .reverse()
      .map(function mapCycle(entry) {
        const summary = getCycleSummary(state, entry.key);
        return {
          label: cycle.formatCycleLabel(summary.cycle.start, summary.cycle.end),
          totalSpent: summary.totalSpent,
          totalBudget: summary.totalBudget,
        };
      });
  }

  function getHistoryRows(state) {
    return getAvailableCycles(state).map(function mapHistory(cycleItem) {
      const summary = getCycleSummary(state, cycleItem.key);
      return {
        key: cycleItem.key,
        label: cycleItem.label,
        totalSpent: summary.totalSpent,
        totalBudget: summary.totalBudget,
        remainingBudget: summary.remainingBudget,
        expenseCount: summary.expenses.length,
      };
    });
  }

  function isSafeCategoryDelete(state, categoryId) {
    const inExpenses = state.expenses.some(function hasExpense(expense) {
      return expense.categoryId === categoryId;
    });
    const inBudgets = Object.values(state.budgets).some(function hasBudget(budget) {
      return Number((budget.categoryAllocations && budget.categoryAllocations[categoryId]) || 0) > 0;
    });
    return !(inExpenses || inBudgets);
  }

  function getCycleDateContext(state, dateString) {
    const currentCycle = cycle.getCycleForDate(dateString, state.settings.cycleStartDay);
    return {
      cycleKey: currentCycle.key,
      cycleLabel: currentCycle.label,
    };
  }

  function getGoalById(state, goalId) {
    return state.goals.find(function findGoal(goal) {
      return goal.id === goalId;
    }) || null;
  }

  function getExpenseById(state, expenseId) {
    return state.expenses.find(function findExpense(expense) {
      return expense.id === expenseId;
    }) || null;
  }

  function getCategoryById(state, categoryId) {
    return state.categories.find(function findCategory(category) {
      return category.id === categoryId;
    }) || null;
  }

  global.ExpenseTrackerLogic = {
    formatMoney,
    formatPercent,
    getAvailableCycles,
    getBudgetRecord,
    getCategoryById,
    getCategoryChartData,
    getCycleComparisonSeries,
    getCycleDateContext,
    getCycleSummary,
    getCurrentCycle,
    getExpenseById,
    getExpensesView,
    getGoalById,
    getGoalProgress,
    getHistoryRows,
    getSelectedCycleKey,
    getTrendSeries,
    isSafeCategoryDelete,
  };
})(window);
