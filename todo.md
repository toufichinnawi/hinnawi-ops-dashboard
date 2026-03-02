# Koomi/MYR Live Data Integration (DONE)

## Research
- [x] Investigate Koomi/MYR POS API availability — No public REST API for data pull
- [x] Check CSV/Excel export — MYR supports CSV export for all report types
- [x] Determined CSV Upload approach — approved by user
- [x] Implemented CSV parser, DataContext, Data Management page
- [x] All dashboard pages updated to consume uploaded data

---

# Teams Alert Integration

## Phase 1: Research & Upgrade
- [x] Research Teams Incoming Webhooks API format
- [x] Upgrade project to full-stack (web-db-user)
- [x] Webhook URLs stored securely in database

## Phase 2: Backend Alert Engine
- [x] Create backend route POST /api/alerts/send-teams for sending Teams messages
- [x] Create backend route POST /api/alerts/test for testing webhook connection
- [x] Create backend route GET/POST /api/alerts/settings for managing alert rules
- [x] Build Adaptive Card templates for different alert types (labour, reports, critical)
- [x] Implement alert evaluation logic (check KPIs against thresholds)

## Phase 3: Frontend Settings UI
- [x] Create Teams Integration settings page
- [x] Add webhook URL configuration input
- [x] Add alert rule configuration (thresholds, channels, frequency)
- [x] Add test connection button
- [x] Add alert history view
- [x] Add sidebar nav item for Teams settings

## Phase 4: Test & Polish
- [x] Vitest tests: 12/12 passing
- [x] Frontend renders correctly
- [x] Auth gate working for protected routes

## Phase 5: Deliver
- [x] Save checkpoint and deliver to user

---

# Scheduled Daily Summary Alerts

- [x] Store schedule config in database (scheduledSummary table)
- [x] Backend daily summary builder (buildDailySummaryAlert)
- [x] tRPC route for sending daily summary (alerts.sendDailySummary)
- [ ] Add daily summary settings UI (enable/disable, time, webhook selection)
- [ ] Backend cron/interval logic to auto-trigger the summary

# Role-Based Access Control

- [x] Restrict Teams Integration nav item to admin users only (sidebar filtering)
- [x] Backend tRPC routes use protectedProcedure for all sensitive operations
- [ ] Show "Admin Access Required" message for non-admin users on Teams page URL
- [ ] Add admin badge/indicator in sidebar for admin users

---

# QuickBooks Integration

- [ ] Research QuickBooks Online API capabilities (payroll, P&L, expenses)
- [ ] Determine best integration approach (OAuth2, API keys, CSV)
- [ ] Present options to user for approval
- [ ] Implement chosen approach

---

# Clover POS Integration

- [x] Research Clover REST API (orders, payments, employees, reporting)
- [x] Build Clover service module (OAuth, data fetching, aggregation)
- [x] Database tables for connections, daily sales, shifts
- [x] tRPC routes for connect, disconnect, sync, sales/shift data
- [x] Manual connect flow (Merchant ID + API Token)
- [x] Clover POS Integration page with 3 tabs (Connections, Sales, Labour)
- [x] Sync individual store or all stores
- [x] 22 vitest tests passing (clover + teams + auth)

---
# Bug Fix: Clover 401 Unauthorized

- [x] Fix Clover API base URL for Canadian merchants
- [x] Add region selection to connect form (US/Canada/EU)
- [x] Test connection with correct regional endpoint

---

# Bug Fix: Clover Sync All Still Failing After Publish

- [x] Debug exact error from Clover API during sync (filter field `inTime` → `in_time`)
- [x] Fix the root cause (Clover shifts API uses snake_case filter fields)
- [x] Verify sync works with real data (3 stores syncing successfully)
- [x] Wire Clover sales data into DataContext (priority: Clover > CSV > Demo)
- [x] Update Overview page KPIs with real Clover data
- [x] Update Sales by Store chart with real Clover data
- [x] Update Weekly Order Pattern with real Clover data
- [x] Add "Clover POS Live" badge and connected banner

---

# Date Filtering on Overview & Store Performance

- [x] Build reusable DateFilter component (single day + date range modes)
- [x] Add date picker UI (calendar popup with presets: Today, Yesterday, Last 7 Days, Last 30 Days, Custom Range)
- [x] Update backend salesData query to accept optional date filters (fromDate/toDate params)
- [x] Wire date filter into Overview page (KPIs, Sales chart, Order Pattern)
- [x] Wire date filter into Store Performance page (store cards, period sales)
- [x] Ensure filtered data updates KPIs, charts, and tables dynamically
- [x] Test date filtering end-to-end (22 tests passing)

---

# Bug Fix: Date Range Filter Apply Button

- [x] Add "Apply" button to Date Range mode so filter only applies after both dates are selected
- [x] Keep single day and quick presets working as instant-apply
- [x] Test date range selection end-to-end
