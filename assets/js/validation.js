(function attachValidationModule(global) {
  function validateSettings(values) {
    const errors = {};
    if (Number(values.salaryAmount) < 0) {
      errors.salaryAmount = "Salary cannot be negative.";
    }
    if (!Number.isInteger(Number(values.cycleStartDay)) || Number(values.cycleStartDay) < 1 || Number(values.cycleStartDay) > 31) {
      errors.cycleStartDay = "Choose a day between 1 and 31.";
    }
    if (!String(values.currency || "").trim()) {
      errors.currency = "Enter a currency code or symbol.";
    }
    return errors;
  }

  function validateCategory(values, categories, editingId) {
    const errors = {};
    const name = String(values.name || "").trim();
    if (!name) {
      errors.name = "Category name is required.";
    }
    const duplicate = categories.some(function isDuplicate(category) {
      return category.id !== (editingId || "") && category.name.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) {
      errors.name = "That category already exists.";
    }
    return errors;
  }

  function validateBudget(totalBudget, reservedSavings, allocations) {
    const errors = {};
    const safeTotalBudget = Number.isFinite(Number(totalBudget)) ? Number(totalBudget) : 0;
    const safeReserved = Number.isFinite(Number(reservedSavings)) ? Number(reservedSavings) : 0;
    const totalAllocated = Object.values(allocations).reduce(function sumAllocations(sum, value) {
      return sum + Number(value || 0);
    }, 0);

    if (!Number.isFinite(safeTotalBudget) || safeTotalBudget < 0) {
      errors.totalBudget = "Enter a valid total budget.";
    }
    if (!Number.isFinite(safeReserved) || safeReserved < 0) {
      errors.reservedSavings = "Reserved savings must be zero or higher.";
    }
    if (totalAllocated + safeReserved > safeTotalBudget) {
      errors.allocations = "Category allocations plus reserved savings cannot exceed the total budget.";
    }
    return {
      errors,
      totalAllocated,
      remaining: safeTotalBudget - safeReserved - totalAllocated,
    };
  }

  function validateExpense(values, categories) {
    const errors = {};
    const transactionType = values.transactionType === "gain" ? "gain" : "expense";
    if (!(Number(values.amount) > 0)) {
      errors.amount = "Amount must be greater than zero.";
    }
    if (!values.date || Number.isNaN(new Date(values.date).getTime())) {
      errors.date = "Choose a valid date.";
    }
    if (
      transactionType !== "gain" &&
      !categories.some(function hasCategory(category) { return category.id === values.categoryId; })
    ) {
      errors.categoryId = "Select a valid category.";
    }
    return errors;
  }

  function validateGoal(values) {
    const errors = {};
    if (!String(values.name || "").trim()) {
      errors.name = "Goal name is required.";
    }
    if (!(Number(values.targetAmount) > 0)) {
      errors.targetAmount = "Target amount must be greater than zero.";
    }
    if (values.targetDate && Number.isNaN(new Date(values.targetDate).getTime())) {
      errors.targetDate = "Pick a valid target date.";
    }
    if (Number(values.contributionPerCycle || 0) < 0) {
      errors.contributionPerCycle = "Contribution per cycle cannot be negative.";
    }
    return errors;
  }

  function validateContribution(values, goals, options) {
    const settings = options || {};
    const errors = {};
    if (!goals.some(function hasGoal(goal) { return goal.id === values.goalId; })) {
      errors.goalId = "Choose a valid savings goal.";
    }
    if (!(Number(values.amount) > 0)) {
      errors.amount = settings.mode === "withdrawal"
        ? "Withdrawal must be greater than zero."
        : "Contribution must be greater than zero.";
    }
    if (!values.date || Number.isNaN(new Date(values.date).getTime())) {
      errors.date = "Pick a valid date.";
    }
    if (
      settings.mode === "withdrawal" &&
      Number(values.amount || 0) > Number(settings.availableAmount || 0)
    ) {
      errors.amount = "You cannot withdraw more than this goal currently holds.";
    }
    return errors;
  }

  global.ExpenseTrackerValidation = {
    validateBudget,
    validateCategory,
    validateContribution,
    validateExpense,
    validateGoal,
    validateSettings,
  };
})(window);
