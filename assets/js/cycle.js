(function attachCycleModule(global) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function toDateAtNoon(value) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    date.setHours(12, 0, 0, 0);
    return date;
  }

  function formatDateISO(value) {
    const date = toDateAtNoon(value);
    if (!date) {
      return "";
    }
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function addMonths(value, amount) {
    const date = toDateAtNoon(value);
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + amount);
    const maxDay = daysInMonth(date.getFullYear(), date.getMonth());
    date.setDate(Math.min(originalDay, maxDay));
    return date;
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function getEffectiveDay(year, monthIndex, configuredDay) {
    return Math.min(Math.max(Number(configuredDay) || 1, 1), daysInMonth(year, monthIndex));
  }

  function getCycleStartForMonth(year, monthIndex, configuredDay) {
    const day = getEffectiveDay(year, monthIndex, configuredDay);
    return toDateAtNoon(new Date(year, monthIndex, day));
  }

  function getCycleForDate(dateInput, configuredDay) {
    const date = toDateAtNoon(dateInput);
    const normalizedDay = Math.min(Math.max(Number(configuredDay) || 1, 1), 31);

    let start = getCycleStartForMonth(date.getFullYear(), date.getMonth(), normalizedDay);
    if (date.getTime() < start.getTime()) {
      const previousMonth = addMonths(start, -1);
      start = getCycleStartForMonth(previousMonth.getFullYear(), previousMonth.getMonth(), normalizedDay);
    }

    const nextMonth = addMonths(start, 1);
    const nextStart = getCycleStartForMonth(nextMonth.getFullYear(), nextMonth.getMonth(), normalizedDay);
    const end = toDateAtNoon(new Date(nextStart.getTime() - DAY_MS));

    return {
      key: formatDateISO(start),
      start,
      end,
      label: formatCycleLabel(start, end),
    };
  }

  function getCycleKeyFromDate(dateInput, configuredDay) {
    return getCycleForDate(dateInput, configuredDay).key;
  }

  function getCycleLabelFromKey(cycleKey, configuredDay) {
    const date = toDateAtNoon(cycleKey);
    if (!date) {
      return "Unknown cycle";
    }
    return getCycleForDate(date, configuredDay).label;
  }

  function formatCycleLabel(start, end) {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });
    return formatter.format(start) + " - " + formatter.format(end);
  }

  function formatLongDate(value) {
    const date = toDateAtNoon(value);
    if (!date) {
      return "Invalid date";
    }
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function getDaysBetween(startInput, endInput) {
    const start = toDateAtNoon(startInput);
    const end = toDateAtNoon(endInput);
    if (!start || !end) {
      return 0;
    }
    return Math.max(Math.round((end.getTime() - start.getTime()) / DAY_MS), 0);
  }

  function isDateWithinRange(dateInput, startInput, endInput) {
    const date = toDateAtNoon(dateInput);
    const start = toDateAtNoon(startInput);
    const end = toDateAtNoon(endInput);
    if (!date || !start || !end) {
      return false;
    }
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  }

  global.ExpenseTrackerCycle = {
    addMonths,
    daysInMonth,
    formatCycleLabel,
    formatDateISO,
    formatLongDate,
    getCycleForDate,
    getCycleKeyFromDate,
    getCycleLabelFromKey,
    getCycleStartForMonth,
    getDaysBetween,
    getEffectiveDay,
    isDateWithinRange,
    toDateAtNoon,
  };
})(window);
