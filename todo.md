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

---

# Bug Fix: Date Filter Not Refreshing Data

- [x] Trace full data flow from DateFilter → hook → backend → KPI computation
- [x] Fix filtering: when Clover connected, always use filtered data (don't fall back to unfiltered DataContext)
- [x] Return zeroed KPIs for empty periods instead of null (prevents fallback to all-time data)
- [x] Verified: Feb 24–27 shows $24,339 (correct subset of $30,985 total)
- [x] Verified: Today shows $1,594, Yesterday shows $2,722 (correct single-day sums)
- [x] Increased default sync range from 7 to 30 days for more historical data

---

# Extend Clover Sync Range to January 2026

- [x] Increase default sync range from 30 to 60 days
- [x] Increase max allowed daysBack to 180 days
- [x] Add rate limiting (300ms between pages, 500ms between chunks, retry on 429)
- [x] Re-sync all stores: Tunnel 4,013 payments/41 days, Mackay 7,263/59 days, PK 13,569/59 days
- [x] Verified: Jan 10–20 shows $49,491 revenue, 4,342 orders — January data is live!

---

# Lightspeed POS Integration (Ontario Store)

- [ ] Research Lightspeed POS API (Restaurant vs Retail, auth method, sales endpoints)
- [ ] Determine best integration approach (OAuth2, API key, CSV upload)
- [ ] Present options to user for approval
- [ ] Implement chosen approach
- [ ] Wire Ontario Lightspeed data into dashboard alongside Clover stores

---

# 7shifts Integration (Ontario Store - via Lightspeed)

- [x] Research 7shifts API (authentication, sales/labour/shifts endpoints)
- [x] Determine best auth approach — Access Token (simple, no OAuth needed)
- [x] Build 7shifts service module (fetchCompanies, fetchLocations, fetchDailySalesAndLabor)
- [x] Database tables for 7shifts connections + daily sales/labour
- [x] tRPC routes for connect, disconnect, sync, salesData
- [x] 7shifts Integration page UI (connect, sync, view data tabs)
- [x] Wire Ontario 7shifts data into Overview (KPIs: $34,567 total, 4 stores)
- [x] Wire Ontario data into Store Performance (Ontario card: $3.2K, 43% labour)
- [x] Wire Ontario labour data into DataContext (real labour % from 7shifts)
- [x] Ontario visible in Sales by Store chart and Weekly Order Pattern
- [x] Test end-to-end with real data — 61 days synced, 23 tests passing

---

# Combined Sync All Sources Button

- [x] Add a "Sync All Sources" button that syncs Clover (3 stores) + 7shifts (Ontario) simultaneously
- [x] Show progress/status toast for each source during sync
- [x] Placed button on Overview page next to date filter (gold "Sync All" button)

---

# Per-Store Labour Targets with Red Highlighting

- [x] Set custom labour targets per store: Ontario 28%, Mackay 23%, Tunnel 24%, PK 18%
- [x] Highlight labour % in red when above target on Store Performance page
- [x] Updated labourTarget in Store interface and stores config in lib/data.ts

---

# Koomi/MYR Integration Research

- [x] Deep dive into Koomi/MYR API, webhooks, or automated export options
- [x] Check if there's any programmatic way to pull data
- [x] Present findings to user

---

# SharePoint Excel Labour Data Integration (All 4 Stores)

- [x] Download Excel daily report from SharePoint via browser
- [x] Parse Excel file structure (Id, Business Date, Store, Net Sales, Labour, Notes, Labour %)
- [x] Create database schema: excel_labour_data + excel_sync_meta tables
- [x] Build Excel parser service (excelParser.ts) with column detection, date parsing, store mapping
- [x] Create database helpers (bulkUpsert, query by date/store, sync meta)
- [x] Create tRPC endpoints: excelLabour.upload, excelLabour.data, excelLabour.syncMeta, excelLabour.clearAll
- [x] Seed database with 25 rows of real labour data (Feb 23 – Mar 1, 2026)
- [x] Update useFilteredCloverData hook to merge Excel labour data with Clover sales data
- [x] Update DataContext to incorporate Excel labour data (hasExcelData flag, overlay on Clover data)
- [x] Update Labour Monitor page with date filter, Excel upload button, trend chart from Excel data
- [x] Write 6 vitest tests for Excel parser + tRPC endpoints (all passing)
- [x] All 29 tests passing (Excel + Clover + 7shifts + Teams + Auth)

---

# Add Excel Labour Data to Overview & Store Performance

- [x] Show real labour cost/% from Excel on Overview page KPIs
- [x] Show real labour cost/% from Excel on Store Performance page cards
- [x] Ensure Excel data overlays correctly when Clover data is also present

# Automate Daily Excel Sync at 11:59 PM

- [x] Build scheduled task to fetch daily report from SharePoint at 11:59 PM
- [x] Parse and upsert new rows into excel_labour_data table
- [x] Handle authentication and error cases

# Tunnel Store Closed on Weekends

- [x] Add weekend closure flag to Tunnel store config
- [x] Show "Closed Weekends" badge on Tunnel store card
- [x] Don't flag missing Tunnel weekend data as an issue

---

# Checklists Feature (from handover document)

- [ ] Step 1: Add checklistSubmissions table to database schema
- [ ] Step 2: Create server/checklist-db.ts with CRUD helpers
- [ ] Step 3: Create server/routers/checklists.ts tRPC router
- [ ] Step 4: Register checklist router in server/routers.ts
- [ ] Step 5: Create shared/checklists.ts with all checklist data definitions
- [ ] Step 6: Create client/src/components/ChecklistShared.tsx reusable components
- [ ] Step 7: Create 5 checklist page files (Operations, Deep Cleaning, Assistant Manager, Performance Eval, Equipment Maintenance)
- [ ] Step 8: Add routes to App.tsx
- [ ] Step 9: Add CHECKLISTS section to sidebar navigation
- [ ] Step 10: Run db:push and tests

---

# Reports & Checklists Migration (from hinnawi-reports-migration.md)

- [x] Step 1: Add reportSubmissions + storePins tables to schema, run db:push
- [x] Step 2: Add report + PIN db helpers to server/db.ts
- [x] Step 3: Create server/teamsNotify.ts for Teams webhook notifications
- [x] Step 4: Add reports + storePins tRPC routes to server/routers.ts
- [x] Step 5: Add public submit endpoint to server/_core/index.ts
- [x] Step 6: Create client/src/lib/positionChecklists.ts config
- [x] Step 7: Create client/src/components/StarRating.tsx
- [x] Step 8: Create client/src/components/PinGate.tsx
- [x] Step 9: Copy PositionChecklists.tsx to client/src/pages/public/
- [x] Step 10: Add route to App.tsx
- [x] Step 11: TEAMS_WEBHOOK_URL skipped for now (notifications will be silent)
- [x] Step 12: Seed default store PINs (1234 for all 4 stores)
- [x] Step 13: Add "Copy Link" buttons for each position checklist URL on a Checklists dashboard page
- [x] Step 14: Write vitest tests for reports + storePins (9 tests, all passing)
- [x] Step 15: Add Checklists nav item to sidebar and route in App.tsx
- [x] All 38 tests passing (Reports + StorePins + Excel + Clover + 7shifts + Teams + Auth)
