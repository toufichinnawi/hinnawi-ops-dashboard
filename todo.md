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

---

# Bug Fix: Checklist page not opening

- [x] Investigated — user wanted to open checklists from within the dashboard (not just public link)
- [x] Built dashboard ChecklistViewer with store selector and all 11 checklist forms
- [x] Verified: Open button → store selector → checklist form all work inside dashboard

---

# Dashboard Checklist Preview (Admin)

- [x] Add "Open" button on each position card in Checklists dashboard page
- [x] Create ChecklistViewer.tsx page with store selector (no PIN gate)
- [x] All 11 checklist forms render inside DashboardLayout
- [x] Add /checklists/:position route to App.tsx
- [x] All 38 tests passing

---

# Fix: Simplify Checklist Flow (No Store Selector)

- [x] Remove store selector step from ChecklistViewer
- [x] Flow: Checklists page → Click position → See checklist list → Click checklist → Opens form directly
- [x] Store dropdown added inside each form component (all 8 form types updated)
- [x] No separate checklist results dashboard yet (will do later)
- [x] All 38 tests passing

---

# Merge hinnawiops features into hinnawidash

## Database Schema
- [x] Add expenses table
- [x] Add vendors table
- [x] Add expenseCategories table
- [x] Add cogsTargets table
- [x] Add inventoryItems table
- [x] Add inventoryCounts table
- [x] Run pnpm db:push — all 17 tables migrated successfully

## Backend (db helpers + tRPC routes)
- [x] Expense CRUD db helpers
- [x] Vendor CRUD db helpers
- [x] Expense Category CRUD db helpers
- [x] COGS Target CRUD db helpers
- [x] Inventory Item CRUD db helpers
- [x] Inventory Count CRUD db helpers
- [x] Admin user management db helpers
- [x] tRPC routes for all features (expenseCategories, vendors, expenses, cogsTargets, inventoryItems, inventoryCounts, pnl, admin)
- [x] Report History query route (uses existing reports.list)
- [x] P&L computation route (aggregates expenses by category/section)

## Frontend Pages
- [x] Profit & Loss page (/accounting/pnl)
- [x] Expense Entry page (/accounting/expenses)
- [x] Vendors & Suppliers page (/accounting/vendors)
- [x] Expense Categories page (/accounting/categories)
- [x] COGS Targets page (/accounting/cogs)
- [x] Inventory Items page (/inventory/items)
- [x] Inventory Count page (/inventory/count)
- [x] Report History page (/reports/history)
- [x] Admin Panel page (/admin)
- [x] External Tools page (/tools)

## Sidebar & Navigation
- [x] Reorganize sidebar into 6 sections: Analytics, Accounting, Inventory, Reports & Checklists, Integrations, Settings
- [x] Add External Tools page with SharePoint links (Job Descriptions, Contracts, Manuals, Recipes, Evaluations)
- [x] Add all new routes to App.tsx (11 new routes)

## Data Seeding
- [x] Seed 9 vendors from hinnawiops
- [x] Seed 21 expense categories from hinnawiops

## Tests
- [x] 11 new tests for merge features (categories, vendors, expenses, COGS, inventory, P&L, admin)
- [x] All 49 tests passing across 7 test files

## DO NOT TOUCH
- Overview page
- Labour Monitor page
- Store Performance page

---

# Restructure Reports & Checklists Sidebar (COMPLETED)

- [x] Replace single "Checklists" nav item with 8 individual checklist items + Report History
- [x] Sidebar items: Operations Checklist, Weekly Store Audit, Weekly Scorecard, Performance Evaluation, Leftovers & Waste, Equipment & Maintenance, Training Evaluation, Bagel Orders, Report History
- [x] Each sidebar item opens the checklist form directly (with store dropdown inside form)
- [x] Created DirectChecklist.tsx page with slug-to-checklist-type mapping
- [x] Updated App.tsx with /checklists/:type route
- [x] All 49 tests passing

---

# Bug Fix: /checklists route 404

- [x] Add /checklists route back (Checklists landing page with position cards, copy links, open buttons)
- [x] Verified: /checklists now loads the Checklists management page

---

# Rename Checklists

- [x] Rename "Operations Checklist" → "Store Manager Checklist"
- [x] Rename "Weekly Store Audit" → "Ops. Mgr Weekly Audit"

---

# Bug Fix: Yesterday's Labour Only Shows 7shifts Data

- [x] Investigate why yesterday's labour data only shows 7shifts (Ontario) and not Excel data for MK, PK, TN
- [x] Check Excel labour data in database for yesterday's date — data only goes to Mar 1
- [x] Check the scheduled SharePoint sync — was failing due to 2-digit year date format
- [x] Check how useFilteredCloverData merges Excel labour with Clover sales — logic is correct
- [x] Fix the root cause: added M/D/YY (2-digit year) parsing to excelParser.ts
- [x] Added vitest test for 2-digit year parsing (50 tests passing)

---

# QuickBooks Integration — COGS Per Store

- [ ] Research QuickBooks Online API (authentication, COGS/P&L endpoints, multi-location support)
- [ ] Determine best integration approach (OAuth2, API keys, sandbox testing)
- [ ] Present options to user for approval
- [ ] Build QuickBooks OAuth2 connection flow
- [ ] Create QuickBooks service module (fetch COGS, P&L by location/class)
- [ ] Database tables for QuickBooks connections + cached COGS data
- [ ] tRPC routes for connect, disconnect, sync, COGS data queries
- [ ] Wire COGS data into the Accounting section (COGS Targets page or new COGS page)
- [ ] Write vitest tests

---

# Copy Link Button for Checklists

- [x] Add "Copy Link" button to each checklist card on the Checklists page
- [x] Button copies the direct public URL for that checklist to clipboard
- [x] Show toast/feedback when link is copied

---

# Leftovers & Waste Page Rebuild

- [x] Rebuild Leftovers & Waste page to match new design
- [x] Date picker and Location selector at top
- [x] Items grouped by category: Bagels, Pastries, CK Items
- [x] Each item row: toggle, Leftover qty, Qty Type dropdown, Waste qty, Qty Type dropdown, Comment
- [x] Pre-populated item list per category (Sesame Bagel, Poppy Bagel, Croissant, Cream Cheese, etc.)
- [x] Submit Report button to save to database
- [x] Send by Email button (opens mailto: with formatted report)
- [x] Updated both DirectChecklist (dashboard) and ChecklistViewer (public) versions
- [x] All 50 tests passing

---

# Operations Scorecard Dashboard

## Backend
- [x] Create tRPC endpoint (scorecard.getData) to query checklist submissions by date range and store
- [x] Compute Day Score per store (average of all checklist scores submitted that day)
- [x] Compute Week Score per store (average of all checklist scores for Mon-Sun week)
- [x] Return alert data: missing weekly audits (Ops. Mgr Weekly Audit not submitted)
- [x] getReportsByDateRange db helper in server/db.ts

## Frontend
- [x] Create Scorecard dashboard page (OperationsScorecard.tsx) under Reports & Checklists
- [x] Date range filter with 3 modes: Single Day, Date Range, Week Range (Mon-Sun)
- [x] Week Range always starts Monday, ends Sunday
- [x] Per-store score cards with ring chart showing Day/Weekly Score
- [x] Red highlighting when score is too low (below 60% threshold)
- [x] Amber highlighting for scores between 60-80%
- [x] Green for scores above 80%
- [x] Alerts tab with red text, shield icon, and alert badges
- [x] Alert: Ops. Manager hasn't done the weekly audit → CRITICAL red alert
- [x] Alert: Low scores → WARNING amber alert
- [x] Alert: No submissions → WARNING amber alert
- [x] Daily Score Breakdown table for range/week views
- [x] Add sidebar nav item under Reports & Checklists section
- [x] Add route to App.tsx

## Tests
- [x] Write vitest tests for scorecard logic (14 new tests in scorecard.test.ts)
- [x] All 64 tests passing across 8 test files

---

# Scorecard Drill-Down View

- [x] Clickable store score cards open a drill-down dialog
- [x] Show completed checklists divided into two sections: Store Manager and Ops Manager
- [x] Each completed checklist shows: checklist name, score badge, date/time, submitter name
- [x] At the bottom: unfinished/missing checklists in red/pink background with "Missing" badges
- [x] Clear visual separation between completed and unfinished sections
- [x] Store submitterName in data JSON for future submissions
- [x] All 64 tests passing

---

# Bug Fix: Ops Mgr Weekly Audit Not Reflecting on Scorecard + Add Dates to Checklists

- [x] Investigate why Ops Mgr Weekly Audit for PK doesn't show on Operations Scorecard
- [x] Check report type naming mismatch between submission and scorecard query
- [x] Fix the data mapping so all checklist types are recognized by the scorecard
- [x] Fix all 8 form payloads: type→reportType, submittedBy→submitterName, added reportDate
- [x] Add date picker to Store MGR Checklist form
- [x] Add date picker to Ops Mgr Weekly Audit form
- [x] Add date picker to Equipment Maintenance form
- [x] Add date picker to Training Evaluation form
- [x] Add date picker to Performance Evaluation form
- [x] Fix WasteReportForm reportType to use slug format (waste-report)
- [x] Fix BagelOrdersForm payload field names
- [x] Fix WeeklyScorecardForm payload field names
- [x] Add lowercase store IDs (ontario, tunnel) to backend LOCATION_MAP
- [x] Add totalScore computation to all forms for scorecard integration
- [x] Verify all checklist submissions appear on Operations Scorecard
- [x] All 64 tests passing

---

# Scorecard: Green "Audited" Badge

- [x] Change red "No Audit" badge to green "Audited" badge when Ops Mgr Weekly Audit exists for that store/period
- [x] Keep red "No Audit" only when audit is truly missing

---

# Rename: Store Manager Checklist → Store Manager Daily Checklist

- [x] Update sidebar label
- [x] Update DirectChecklist slug-to-label mapping
- [x] Update form title and success messages
- [x] Update Checklists page, positionChecklists.ts, and all references

---

# Checklists by Position Page (Shareable)

- [x] Create new page: Checklists by Position (/checklists/positions)
- [x] Add "Copy Link" button at the top to share the page URL
- [x] 4 position buttons: Operations Manager, Store Manager, Assistant Manager, Staff
- [x] Clicking a position shows its designated checklists with links to each form
- [x] Operations Manager: Ops. Mgr Weekly Audit
- [x] Store Manager: Store Manager Daily Checklist, Weekly Scorecard, Performance Evaluation, Bagel Orders
- [x] Assistant Manager: Equipment & Maintenance, Training Evaluation
- [x] Staff: Leftovers & Waste
- [x] Each checklist has a "Copy Link" button for direct sharing
- [x] Add sidebar nav item under Reports & Checklists

---

# Reports Page (Upgrade from Report History)

- [x] Rename "Report History" → "Reports" in sidebar
- [x] Build full Reports page with filtering capabilities
- [x] Filter by Store (PK, MK, ON, TN)
- [x] Filter by Date / Date Range (with presets: Today, Yesterday, Last 7 Days, Last 30 Days, custom range)
- [x] Filter by Position (Operations Manager, Store Manager, Assistant Manager, Staff)
- [x] Filter by Checklist Type (auto-scoped to selected position)
- [x] Each report row shows: Store, Date, Position, Checklist Name, Submitter, Score, Submitted timestamp
- [x] Professional table layout with click-to-view detail dialog
- [x] Sidebar nav item updated: "Reports" under Reports & Checklists


---

# Hinnawi Checklist Portal — Rename, Secure Links, Position PINs

- [x] Rename "Checklists by Position" → "Hinnawi Checklist Portal" in sidebar, page header, routes
- [x] Generate unique 4-digit PINs per position: Ops Manager (4821), Store Manager (3597), Asst. Manager (6143)
- [x] Store position PINs in database (position_pins table) with auto-seed on startup
- [x] Public links secured — require position PIN before showing checklists
- [x] Public links do NOT show any dashboard content (no sidebar, no nav, no analytics)
- [x] Public links only show the checklists for that specific position
- [x] Copy Link buttons in Portal page generate correct public URLs (/public/:position)
- [x] Tested end-to-end: open public link → PIN entry → store select → see only checklists

---

# Portal: Add Copy Link buttons for secured public URLs

- [x] Add "Copy Portal Link" button on each position card in the grid view (copies /public/:position URL)
- [x] Make the copy link prominent and easy to find on the main portal page

---

# Bug Fix: Store Manager and Assistant Manager PINs not working

- [x] Check database for existing position_pins rows — found seed had wrong PINs (3567, 2934 instead of 3597, 6143)
- [x] Fixed database: updated Store Manager to 3597 and Assistant Manager to 6143
- [x] Fixed seed function defaults to match correct PINs
- [x] Verified Store Manager PIN 3597 works end-to-end

---

# Portal Redesign: Single Link + Role-Scoped Sidebar + Waste Metrics

## Operations Scorecard: Waste Metrics
- [x] Add Leftovers & Waste section at bottom of Operations Scorecard
- [x] Show waste metrics per store (quantities, categories, W/L breakdown)
- [x] Add alerts if waste exceeds thresholds (>15 critical, >8 warning, missing report)

## Rename & Redesign Admin Portal Page
- [x] Rename "Hinnawi Checklist Portal" → "Hinnawi Portal" everywhere (sidebar, PinGate, PositionChecklists, admin page)
- [x] Replace 4 separate copy-link buttons with ONE single "Copy Link" button
- [x] Single link goes to /portal

## New Public Portal Flow
- [x] Landing shows 4 position cards (Ops Manager, Store Manager, Asst Manager, Staff)
- [x] User selects position → selects store → enters PIN (staff no PIN)
- [x] Store is LOCKED after selection — cannot switch stores
- [x] After auth, show role-scoped sidebar with designated pages

## Role-Scoped Sidebar Tabs
- [x] Operations Manager: Operations Scorecard, Store Performance, Ops. Mgr Weekly Audit, Bagel Orders
- [x] Store Manager: Store Performance (own store only), Store Manager Daily Checklist, Weekly Scorecard, Performance & Evaluation, Leftovers & Waste, Equipment & Maintenance, Training Evaluation, Bagel Orders
- [x] Assistant Manager: Equipment & Maintenance, Training Evaluation, Bagel Orders
- [x] Staff: Leftovers & Waste

## Store Lock-In
- [x] Once store is selected, all forms auto-fill that store and lock the dropdown
- [x] Store Performance for Store Manager shows only their store data
- [x] Cannot change store without going back to portal entry

## Verified
- [x] All 64 tests passing
- [x] Tested Store Manager flow end-to-end: position → store → PIN → sidebar with checklists
