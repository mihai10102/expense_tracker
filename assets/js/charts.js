(function attachChartsModule(global) {
  const logic = global.ExpenseTrackerLogic;

  function getCanvasContext(canvas) {
    if (!canvas) {
      return null;
    }
    const width = canvas.clientWidth || canvas.parentElement.clientWidth || 400;
    const height = 280;
    canvas.width = width * (global.devicePixelRatio || 1);
    canvas.height = height * (global.devicePixelRatio || 1);
    canvas.style.height = height + "px";
    const context = canvas.getContext("2d");
    context.setTransform(global.devicePixelRatio || 1, 0, 0, global.devicePixelRatio || 1, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
  }

  function emptyChartMessage(canvas, message) {
    if (!canvas) {
      return;
    }
    const card = canvas.closest(".panel-card");
    let note = card && card.querySelector(".chart-empty-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "chart-empty-note";
      if (card) {
        card.append(note);
      }
    }
    note.textContent = message;
  }

  function clearEmptyMessage(canvas) {
    const card = canvas && canvas.closest(".panel-card");
    const note = card && card.querySelector(".chart-empty-note");
    if (note) {
      note.remove();
    }
  }

  function drawLegend(context, items, x, y, rowHeight) {
    context.font = "12px sans-serif";
    context.textBaseline = "middle";
    items.forEach(function drawItem(item, index) {
      const rowY = y + index * rowHeight;
      context.fillStyle = item.color;
      context.fillRect(x, rowY - 5, 10, 10);
      context.fillStyle = "#93a3c6";
      context.fillText(item.label, x + 18, rowY);
    });
  }

  function drawAxes(context, width, height, padding) {
    context.strokeStyle = "rgba(147, 163, 198, 0.18)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding.left, padding.top);
    context.lineTo(padding.left, height - padding.bottom);
    context.lineTo(width - padding.right, height - padding.bottom);
    context.stroke();
  }

  function drawBarChart(canvas, labels, datasets, currency) {
    const setup = getCanvasContext(canvas);
    if (!setup) {
      return;
    }
    const context = setup.context;
    const width = setup.width;
    const height = setup.height;
    const padding = { top: 22, right: 18, bottom: 42, left: 58 };
    const maxValue = Math.max(
      1,
      ...datasets.flatMap(function getValues(dataset) {
        return dataset.values;
      }),
    );
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const groupWidth = plotWidth / Math.max(labels.length, 1);
    const barWidth = Math.min(22, groupWidth / (datasets.length + 1));

    drawAxes(context, width, height, padding);
    context.font = "11px sans-serif";
    context.fillStyle = "#93a3c6";

    for (let step = 0; step <= 4; step += 1) {
      const y = padding.top + plotHeight - (plotHeight * step) / 4;
      const value = (maxValue * step) / 4;
      context.fillText(logic.formatMoney(value, currency), 6, y + 3);
      context.strokeStyle = "rgba(147, 163, 198, 0.08)";
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
    }

    labels.forEach(function drawGroup(label, index) {
      datasets.forEach(function drawDataset(dataset, datasetIndex) {
        const value = dataset.values[index] || 0;
        const barHeight = (value / maxValue) * plotHeight;
        const x = padding.left + index * groupWidth + datasetIndex * (barWidth + 6) + 10;
        const y = padding.top + plotHeight - barHeight;
        context.fillStyle = dataset.color;
        context.fillRect(x, y, barWidth, barHeight);
      });
      context.fillStyle = "#93a3c6";
      context.fillText(label, padding.left + index * groupWidth + 6, height - 18);
    });

    drawLegend(
      context,
      datasets.map(function toLegend(dataset) {
        return { label: dataset.label, color: dataset.color };
      }),
      width - 140,
      20,
      18,
    );
  }

  function drawLineChart(canvas, labels, datasets, currency) {
    const setup = getCanvasContext(canvas);
    if (!setup) {
      return;
    }
    const context = setup.context;
    const width = setup.width;
    const height = setup.height;
    const padding = { top: 22, right: 18, bottom: 42, left: 58 };
    const maxValue = Math.max(
      1,
      ...datasets.flatMap(function getValues(dataset) {
        return dataset.values;
      }),
    );
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    drawAxes(context, width, height, padding);
    context.font = "11px sans-serif";
    context.fillStyle = "#93a3c6";

    for (let step = 0; step <= 4; step += 1) {
      const y = padding.top + plotHeight - (plotHeight * step) / 4;
      const value = (maxValue * step) / 4;
      context.fillText(logic.formatMoney(value, currency), 6, y + 3);
      context.strokeStyle = "rgba(147, 163, 198, 0.08)";
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
    }

    labels.forEach(function drawLabel(label, index) {
      const x = padding.left + (plotWidth * index) / Math.max(labels.length - 1, 1);
      context.fillStyle = "#93a3c6";
      context.fillText(label, x - 10, height - 18);
    });

    datasets.forEach(function drawDataset(dataset) {
      context.strokeStyle = dataset.color;
      context.lineWidth = 2.5;
      context.beginPath();
      dataset.values.forEach(function drawPoint(value, index) {
        const x = padding.left + (plotWidth * index) / Math.max(dataset.values.length - 1, 1);
        const y = padding.top + plotHeight - (value / maxValue) * plotHeight;
        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.stroke();

      dataset.values.forEach(function fillPoint(value, index) {
        const x = padding.left + (plotWidth * index) / Math.max(dataset.values.length - 1, 1);
        const y = padding.top + plotHeight - (value / maxValue) * plotHeight;
        context.fillStyle = dataset.color;
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fill();
      });
    });

    drawLegend(
      context,
      datasets.map(function toLegend(dataset) {
        return { label: dataset.label, color: dataset.color };
      }),
      width - 140,
      20,
      18,
    );
  }

  function drawDonutChart(canvas, items, currency) {
    const setup = getCanvasContext(canvas);
    if (!setup) {
      return;
    }
    const context = setup.context;
    const width = setup.width;
    const height = setup.height;
    const total = Math.max(
      1,
      items.reduce(function sumItems(sum, item) {
        return sum + item.spent;
      }, 0),
    );
    const centerX = Math.min(width * 0.34, 160);
    const centerY = height / 2;
    const radius = 74;
    const innerRadius = 42;
    let startAngle = -Math.PI / 2;

    items.forEach(function drawSlice(item) {
      const angle = (item.spent / total) * Math.PI * 2;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.fillStyle = item.color;
      context.arc(centerX, centerY, radius, startAngle, startAngle + angle);
      context.closePath();
      context.fill();
      startAngle += angle;
    });

    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = "source-over";

    context.fillStyle = "#dce4ff";
    context.font = "700 15px sans-serif";
    context.textAlign = "center";
    context.fillText(logic.formatMoney(total, currency), centerX, centerY + 4);
    context.textAlign = "left";

    drawLegend(
      context,
      items.map(function toLegend(item) {
        return { label: item.label + " " + logic.formatMoney(item.spent, currency), color: item.color };
      }),
      Math.max(width * 0.56, 210),
      48,
      22,
    );
  }

  function renderCharts(model) {
    const categoryCanvas = document.getElementById("spending-category-chart");
    const budgetCanvas = document.getElementById("budget-vs-actual-chart");
    const trendCanvas = document.getElementById("trend-chart");
    const comparisonCanvas = document.getElementById("cycle-comparison-chart");

    const categoryData = model.chartData.category;
    if (!categoryData.length) {
      emptyChartMessage(categoryCanvas, "Add expenses to see category spending.");
    } else {
      clearEmptyMessage(categoryCanvas);
      drawDonutChart(categoryCanvas, categoryData, model.state.settings.currency);
    }

    if (!categoryData.length) {
      emptyChartMessage(budgetCanvas, "Create allocations to compare budget and actual spend.");
    } else {
      clearEmptyMessage(budgetCanvas);
      drawBarChart(
        budgetCanvas,
        categoryData.map(function getLabel(item) { return item.label.slice(0, 8); }),
        [
          { label: "Allocated", values: categoryData.map(function getValue(item) { return item.allocated; }), color: "rgba(109, 94, 252, 0.7)" },
          { label: "Spent", values: categoryData.map(function getValue(item) { return item.spent; }), color: "#4de2c5" },
        ],
        model.state.settings.currency,
      );
    }

    if (!model.chartData.trend.length) {
      emptyChartMessage(trendCanvas, "Add expenses in this cycle to see the spending trend.");
    } else {
      clearEmptyMessage(trendCanvas);
      drawLineChart(
        trendCanvas,
        model.chartData.trend.map(function getLabel(item) { return item.date.slice(5); }),
        [
          { label: "Daily spend", values: model.chartData.trend.map(function getValue(item) { return item.amount; }), color: "#4de2c5" },
          { label: "Running total", values: model.chartData.trend.map(function getValue(item) { return item.runningTotal; }), color: "#ffb454" },
        ],
        model.state.settings.currency,
      );
    }

    if (model.chartData.comparison.length < 2) {
      emptyChartMessage(comparisonCanvas, "Complete a few cycles to unlock comparison history.");
    } else {
      clearEmptyMessage(comparisonCanvas);
      drawBarChart(
        comparisonCanvas,
        model.chartData.comparison.map(function getLabel(item) { return item.label.split(" - ")[0]; }),
        [
          { label: "Spent", values: model.chartData.comparison.map(function getValue(item) { return item.totalSpent; }), color: "#36a2eb" },
          { label: "Budget", values: model.chartData.comparison.map(function getValue(item) { return item.totalBudget; }), color: "rgba(255, 180, 84, 0.65)" },
        ],
        model.state.settings.currency,
      );
    }
  }

  function destroyAllCharts() {}

  global.ExpenseTrackerCharts = {
    destroyAllCharts,
    renderCharts,
  };
})(window);
