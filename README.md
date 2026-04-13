# Expense Tracker Pro

A polished single-page expense tracking app built with plain HTML, CSS, and JavaScript. It uses `localStorage` for persistence, supports salary-based budget cycles, category allocations, savings goals, JSON import/export, and responsive dashboard charts.

## Run it

1. Open [index.html](/Users/buildbox/development/expense_tracker/index.html) in a modern browser.
2. Everything runs locally with no backend, build step, CDN, or internet access required.

## Features

- Salary-based budget cycles with configurable payday reset day
- Budget planning with category allocations and reserved savings
- Expense tracking with cycle-aware grouping, filters, and duplication
- Savings goals with manual contributions and progress tracking
- Dashboard charts rendered locally with canvas
- Dark mode, demo data, JSON import/export, and full local persistence

## Data notes

- App state is stored in `localStorage` under `expense-tracker-pro:v1`
- Exported JSON includes app version metadata for basic migration support
- If saved data is missing or corrupted, the app falls back safely to defaults
