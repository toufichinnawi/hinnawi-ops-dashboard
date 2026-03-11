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

---

# Portal Refinements: Position-Specific Views + Mobile-First

## Operations Manager Fixes
- [x] Skip store selection — Ops Manager sees all 4 stores
- [x] Show all-stores Store Performance (not filtered to one store)
- [x] Show the same Operations Scorecard as the admin dashboard
- [x] When filling checklists, Ops Manager must still pick a store for that submission

## Store Manager Fixes
- [x] Add labour %, labour cost, and labour amount to Store Performance (filtered to their store)
- [x] Weekly Scorecard in portal should match the admin dashboard Weekly Scorecard (filtered to their store)

## Assistant Manager Fixes
- [x] Add Store Performance page (filtered to their store)
- [x] Add completed checklists view (see past submissions for their store)

## Mobile-First / App-Like Design
- [x] Make portal fully responsive for mobile/iPad (bottom nav, touch-friendly, app-like)
- [x] Sidebar collapses to bottom tab bar on mobile
- [x] Touch-friendly buttons and spacing
- [x] Full-screen feel (no browser chrome distractions)

## Uniformity
- [x] Checklists look the same across all positions
- [x] Limitations based on position only (what they can see/access)

## Verified
- [x] All 64 tests passing
- [x] Ops Manager: skips store, sees all 4 stores, picks store per checklist
- [x] Store Manager: tested PIN + store lock + sidebar
- [x] Portal fully isolated from admin dashboard

---

# Fix Portal: Match Admin Dashboard Templates

- [x] Portal Operations Scorecard uses ScorecardContent from admin (exact same component)
- [x] Portal Store Performance uses StorePerformanceContent from admin (exact same component)
- [x] Ops Manager portal views look identical to admin dashboard equivalents
- [x] Store Manager Store Performance filtered to their store via storeFilter prop
- [x] All 64 tests passing

---

# Fix Portal Weekly Scorecard Template + Data Sync

## Weekly Scorecard Template
- [x] Portal Weekly Scorecard matches admin dashboard form (Store Location, Manager Name, Week Of, Weekly Numbers, Notes)
- [x] Replaced old Daily Sales/Labour grid with admin template
- [x] Store pre-filled and locked for Store Managers in the portal

## Data Synchronization
- [x] All checklist submissions from portal appear in admin dashboard Reports page (same submit endpoint)
- [x] All checklist submissions from portal appear in Operations Scorecard (same tRPC queries)
- [x] Sales/labour data from Clover/7shifts/Excel visible in portal Store Performance (shared StorePerformanceContent)
- [x] Audit data syncs between portal and dashboard (shared ScorecardContent with green Audited badges)
- [x] Data flows both ways: portal submissions → dashboard views, dashboard data → portal views
- [x] All 64 tests passing

---

# Bug Fix: Portal Link Requires Manus Login

- [x] Investigated: server-side has no auth middleware blocking /portal
- [x] Root cause: global tRPC error handler in main.tsx redirects ALL unauthorized errors to Manus login
- [x] Root cause: scorecard.getData, clover.salesData, sevenShifts.salesData, excelLabour.data were all protectedProcedure
- [x] Fix 1: Added path check in main.tsx — skip login redirect on /portal and /public paths
- [x] Fix 2: Changed 4 data-read endpoints to publicProcedure (scorecard, clover sales, 7shifts sales, excel labour)
- [x] Write operations (sync, upload, connect, admin) remain protected
- [x] Portal loads without login — tested in preview
- [x] All 64 tests passing


---

# Public API Endpoints for Portal

- [x] Created GET /api/public/reports endpoint for portal to fetch all reports without auth
- [x] Updated Portal.tsx to use /api/public/reports instead of tRPC reports.all
- [x] Verified POST /api/public/submit-report already works for checklist submissions
- [x] Verified scorecard.getData, clover.salesData, sevenShifts.salesData, excelLabour.data are publicProcedure
- [x] Verified positionPins.positions and positionPins.verify are publicProcedure
- [x] Added 8 vitest tests for public API endpoints (publicApi.test.ts)
- [x] Fixed 7shifts test to handle token expiration gracefully
- [x] All 72 tests passing (9 test files)

# Store Performance & Date Filter Fixes

- [x] Fix Store Performance showing fake/demo data for today instead of real Clover/7Shifts data
- [x] Add "Today" option to all date filters in admin dashboard (already present in all DateFilter components)
- [x] Add "Today" option to all date filters in portal (inherited from shared components)
- [x] Fixed Home.tsx, Stores.tsx, Labour.tsx to NOT fall back to demo data when no data for selected period
- [x] Added "No data for Today" banner on Store Performance when Clover has no data
- [x] Hidden radar/hourly charts when no data for selected period
- [x] All 72 tests passing

# Bug: Reports tab not showing portal submissions

- [x] Fix Reports tab in admin dashboard not showing submitted checklist reports from portal (changed allReports from adminProcedure to protectedProcedure)

# Improvement Batch — March 5, 2026

- [x] Make "Today" the default filter in every Date/calendar filter across dashboard and portal
- [x] Add Operations Scorecard to Store Manager and Assistant Manager portals (scoped to their designated store only)
- [x] Add Reports tab to Operations Manager and Store Manager portals
- [x] Make reports editable and deletable by Admin, Ops Manager, and Store Manager
- [x] Duplicate checklist detection: prompt when same store + same checklist + same date already exists, with option to overwrite (max one entry per checklist per store per day)
- [x] Add Save Draft button to all checklist forms so users can save progress and resume later (localStorage-based, auto-loads on return)
- [x] Automated Clover data sync at midnight daily (syncs last 3 days of Clover + 7shifts at 00:00)

# Bug/Feature — March 5 (batch 2)

- [x] Investigate Noujad's missing weekly report for PK (report exists in DB dated Mar 4, was hidden by Today default filter)
- [x] Make Manager portal report editing match admin dashboard template (same edit UI — detail dialog with star ratings, items, metadata, delete)

# Auto-Sync Schedule — March 5 (locked in)

- [x] Auto-sync every 5 minutes between 7AM and 8PM daily
- [x] One-time sync at 9PM daily
- [x] One-time sync at 12AM daily
- [x] Replace old midnight-only sync with new schedule

# Koomi/MYR Back Office Scraper — March 5

- [x] Store Koomi credentials securely as env secrets
- [x] Explore MYR Back Office (admin.koomi.com) to map scraping targets
- [x] Build Koomi scraper service (login, store switching, data extraction)
- [x] Extract: Total Gross Sales, Total Net Sales, Total Net Salaries per store per day
- [x] Integrate scraped data into dashboard database (koomi_daily_sales table)
- [x] Add Koomi sync to the existing auto-sync schedule (every 5 min 7AM-8PM, 9PM, 12AM)
- [x] Write tests for Koomi scraper (12 tests passing including live integration)
- [x] Save checkpoint

# Koomi Dashboard Integration — March 5 (batch 2)

- [x] Backfill Koomi sales data from Feb 1 for all 3 stores (PK, Mackay, Tunnel) — 90 records imported
- [x] Wire Koomi sales into Overview KPIs (Total Revenue should include Koomi stores)
- [x] Wire Koomi sales into Sales by Store chart (show PK, Mackay, Tunnel from Koomi)
- [x] Wire Koomi labour data into dashboard — from TODAY only (historical labour stays from Excel/existing sources)
- [x] Build Koomi Integration page (connection status, test login, sync controls, data table)
- [x] Add Koomi Integration to sidebar navigation
- [x] Write/update tests — 96 tests passing across 11 test files
- [x] Save checkpoint

# Number Formatting — Show Exact Amounts (not rounded)
- [x] Update Store Performance page: Revenue, Labour $, Period Sales to show exact amounts ($1,687.00 not $1.7K)
- [x] Update Portal pages: Revenue, Labour Cost to show exact amounts
- [x] Update Overview KPI cards (Total Revenue, Labour Cost, Tips) to show exact amounts
- [x] Update Labour Monitor summary cards and table to show exact amounts
- [x] Update Home chart tooltip and Y-axis to show exact amounts
- [x] Remove Math.round from DataContext currency computations to preserve cents
- [x] Verify changes visually — all pages confirmed
- [x] All 96 tests passing
- [x] Save checkpoint

# Use Koomi's Native Labour % (not recalculated)
- [x] Pass through Koomi's labourPercent from scraper instead of recalculating labourCost/revenue
- [x] Update useFilteredCloverData hook to use Koomi's native labour % (weighted average across days)
- [x] Update Store Performance and Overview to display Koomi's labour %
- [x] Remove Math.round from useFilteredCloverData KPIs to show exact amounts
- [x] All 96 tests passing
- [x] Verify and save checkpoint

# QuickBooks Online Integration (COGS)
- [x] Store QBO Client ID and Client Secret as env secrets
- [x] Build OAuth2 connect flow (authorize URL, callback handler, token storage)
- [x] Build token refresh logic (auto-refresh before expiry)
- [x] Create QBO API service to fetch P&L report by Location
- [x] Extract COGS data per store from P&L report
- [x] Add tRPC routes for QBO (status, disconnect, syncCogs, cogsByDateRange)
- [ ] Add COGS to Store Performance cards (COGS $, COGS %, Gross Profit)
- [x] Build QuickBooks Integration page (connect button, status, data preview)
- [x] Add QuickBooks to sidebar navigation
- [x] Write tests — 9 QBO tests passing (105 total across 12 test files)
- [x] Save checkpoint

- [x] Update Leftovers & Waste checklist items to match reference site (Bagels: 11 items, Pastry: 16 items, CK Items: 20 items)
- [x] Update Weekly Scorecard to improved template (4 sections: Sales, Labour, Digital, Food Cost with Goal/Actual/Variance/How Do I Contribute)
- [x] Update Weekly Scorecard header: auto 'Date' (today), auto 'Week Of' (prev Mon-Sun range), 'Name' input
- [x] Make scorecard Date editable (defaults to today), Week Of editable via date picker (auto-snaps to Mon-Sun range)
- [x] Change Week Of range from Mon-Sun to Mon-Fri (work week) across all 3 scorecard forms
- [x] Replace Week Of date picker with dropdown of pre-computed Mon-Fri week ranges
- [x] Change Week Of dropdown from Mon-Fri to Mon-Sun ranges
- [x] Rename 'Date' label to 'Date Completed' on Weekly Scorecard
- [x] Replace Week Of dropdown with Start Date / End Date pickers (no year-end limitation)
- [x] Fix: Portal waste form template doesn't match admin dashboard waste form
- [x] Fix: Portal waste submissions not showing in Operations Scorecard (data format aligned)
- [x] Audit ALL checklists: ensure every portal form matches admin dashboard counterpart (Manager Checklist, Equipment Maintenance, Training Eval, Bagel Orders, Performance Eval all aligned across all 3 locations)
- [x] Fix report detail views: render submitted data in proper template format instead of raw JSON
- [x] Move notes/comments to top of report detail view for management visibility
- [x] Update Store Manager Checklist: add Start Date / End Date pickers, rename Date to Date of Submission
- [x] Update Ops Mgr Weekly Audit: add Start Date / End Date pickers, rename Date to Date of Submission
- [x] Ensure weekly checklists appear properly in date filters + report detail view shows weekly date fields
- [x] Fix: Audit badge always visible on Operations Scorecard (even on single-day view), checks current week's audit status, resets every Monday
- [x] Add waste/leftover detail popup when clicking a store in the Leftovers & Waste section on Operations Scorecard
- [x] Exclude Performance Evaluation, Training Evaluation, Bagel Orders from uncompleted checklist list and scoring on Operations Scorecard
- [x] Remove non-existent 'Store Evaluation Checklist' from Operations Scorecard expected checklists

- [x] Remove 'Store Evaluation Checklist' (store-manager-checklist) from entire system
- [x] Remove 'Weekly Deep Cleaning' (weekly-deep-cleaning) from entire system

# Photo Upload for Ops Manager Weekly Audit

- [x] Build server-side photo upload endpoint (S3 storage)
- [x] Add photo upload UI to Ops Manager checklist (camera + photo library) in all 3 form locations
- [x] Display uploaded photos in ReportDetailRenderer for audit report detail views
- [x] Write tests for photo upload functionality

# Daily Sales & Labour Report to Teams

- [x] Build daily report message builder (per-store Net Sales + Labour %, formatted like user example)
- [x] Create Teams Adaptive Card template for daily report
- [x] Add tRPC endpoint to trigger daily report send
- [x] Schedule automatic send at 8 PM daily (8 PM EST)
- [x] Write tests for daily report builder (15 tests)

# Automatic High Labour Alert to Teams

- [x] Build labour threshold checker (compare each store's labour % to target)
- [x] Create Teams alert message for high labour warning
- [x] Trigger alert automatically hourly 10AM-9PM when labour exceeds target
- [x] Write tests for labour threshold alert

# Teams Group Chat Integration (Graph API)

- [x] Log into Microsoft 365 (systems@bagelandcafe.com) and test Graph API access
- [x] Identify 5 group chat IDs (TRD, Ontario, Tunnel, Mackay, PK)
- [x] Build teamsChat.ts module with Graph API token management and chat messaging
- [x] Wire daily report to send to TRD Management group chat
- [x] Wire labour alerts to send to TRD + store-specific group chats
- [x] Fix store ID mapping (mk → mackay)
- [x] Make alertHistory.webhookId nullable for chat-based alerts
- [x] Write tests for Teams chat module (5 tests)

- [x] Fix high labour alerts to only send at 8 PM (not hourly)
- [x] Send test daily report for yesterday to TRD Management
- [x] Update labour alert template to user's exact format
- [x] Send test labour alerts to stores above target from yesterday
- [x] Update labour alert to approved merged template format
- [x] Change routing: store-specific chats get only their own alert, TRD gets full report + all alerts
- [x] Ensure everything runs at 8 PM EST daily

# Bagel Orders Update
- [x] Update bagel items to official 12 items
- [x] Change from weekly to per-date ordering (Order for Date field)
- [x] Add Store, Name, Order for Date header fields
- [x] Change units from individual to dozen with note on top
- [x] Update all 3 form locations (DirectChecklist, ChecklistViewer, PositionChecklists)
- [x] Update ReportDetailRenderer for bagel orders display

# Production Section
- [x] Add Production section to admin sidebar with 3 tabs
- [x] Create Bagel Production page (report of bagel orders by store/item, filterable by date)
- [x] Add placeholder pages for Pastry Production and CK Preps
- [x] Add routes in App.tsx
- [x] Add tRPC endpoint for querying bagel orders by date range
- [x] Replace from/to date filter on Bagel Production with single date filter (same as Overview)
- [x] Allow future dates in DateFilter on Bagel Production page

# Bagel Orders & Portal Updates
- [x] Add unit toggle (Dozen/Unit) to Bagel Orders form with Dozen as default (all 3 form locations)
- [x] Add "Sales" as a new location option in Bagel Orders form (all 3 form locations)
- [x] Add "Bagel Factory" position to Portal with Bagel Production as default/only page, filtered to Today
- [ ] Lock Bagel Factory PIN (same as other positions)
- [x] Remove general Dozen/Unit toggle from Bagel Orders, add per-item doz./unit selector next to each bagel item (all 3 forms)
- [x] Update ReportDetailRenderer and BagelProduction for per-item units

# Duplicate Bagel Order Detection
- [x] Add backend endpoint to check for existing bagel orders by date + store
- [x] Add duplicate detection prompt to Bagel Orders form (all 3 locations: DirectChecklist, ChecklistViewer, PositionChecklists)
- [x] Show previous submission details and option to overwrite or cancel

# Bagel Production DZ/Units Display
- [x] Add DZ/Units labels alongside numbers in Bagel Production table
- [x] Smart conversion: whole numbers and .5 stay as DZ, everything else converts to Units (×12)
- [x] Apply same logic to per-store columns and Total column

- [x] Total column on Bagel Production should always display in dozens (DZ)

- [x] Add White Dough (Kg) summary card to Bagel Production (Sesame + Everything + Plain + Poppy, 1 DZ = 1 Kg)

# Bagel Production Portal Tabs
- [x] Add Bagel Production tab to Operations Manager portal (all stores view)
- [x] Add Bagel Production tab to Store Manager portal (filtered by their store)

- [x] Rename "Ops. Mgr Weekly Audit" to "Store Manager Weekly Audit" across entire app

# Priority Matrix Integration
- [ ] Store PM credentials (client_id, client_secret, username, password) as env secrets
- [ ] Build backend PM API connector with OAuth token management
- [ ] Add tRPC procedures for fetching PM projects, items, and team output
- [ ] Build Team Output frontend page with daily task view per team member
- [ ] Add Team Output to sidebar navigation

# Store Manager Weekly Audit - Per-Item Photo Attachment
- [x] Add per-item photo/image attachment button to each audit item in the form
- [x] Upload photos to S3 storage and store URLs in the submission data
- [x] Display attached photos in the report detail renderer
- [x] Apply to all form locations (DirectChecklist, ChecklistViewer, PositionChecklists)

- [x] Rename "Store Mgr Daily Checklist" to "Store Weekly Checklist" across dashboard and portal

# Store Weekly Audit Rename & Update
- [x] Rename "Store Manager Weekly Audit" to "Store Weekly Audit" across entire app
- [x] Update audit to 6-section format matching legacy app (Exterior, Display, Bathroom, Equipment, Product Quality, Service Quality)
- [x] Each section: 5-star rating + comments textarea + photo upload (no sub-items)
- [x] Updated all 3 form locations (DirectChecklist, ChecklistViewer, PositionChecklists)
- [x] Updated ReportDetailRenderer to display new simple section format (backward compat for old sub-item format)
- [x] Ensure per-item photo/image attachment feature works on updated audit
- [x] All 132 tests passing

# Save Draft Feature for Weekly Checklists
- [x] Add draft status to report submissions (status: 'draft' | 'submitted') — already in schema
- [x] Backend: Add getDraft/saveDraft helpers to server/db.ts
- [x] Backend: Add POST /api/public/save-draft endpoint
- [x] Backend: Add GET /api/public/draft endpoint
- [x] Backend: Auto-delete draft when final submission happens
- [x] Backend: Exclude drafts from duplicate detection in checkExistingReport
- [x] Store Weekly Checklist: Server-side draft save/load via useDraft hook
- [x] Store Weekly Audit: Server-side draft save/load via useDraft hook
- [x] Auto-load existing server draft when opening a weekly checklist (with localStorage fallback)
- [ ] Draft data counts toward store score/status before final submission
- [ ] Visual indicator showing draft vs submitted status in reports list
- [ ] Apply draft feature to DirectChecklist admin forms

# Equipment & Maintenance Excluded from Scoring
- [x] Added equipment-maintenance to NON_DAILY_CHECKLISTS in OperationsScorecard
- [x] Equipment & Maintenance no longer shows as "missing" or affects score

# Leftovers & Waste Daily List
- [x] Already exists in PositionChecklists with 3 sections (Bagels, Pastry, CK Items)
- [x] Already exists in DirectChecklist admin form
- [x] Already exists in ReportDetailRenderer for viewing
- [x] Daily frequency (not weekly) — confirmed working

# Role Assignment Updates
- [x] Store Weekly Audit: Confirmed assigned to Operations Manager portal only
- [x] Leftovers & Waste: Added to Store Manager portal (already in Staff portal)

# Bug Fix: Ontario Labour % Showing 0.3% Instead of ~29.4%
- [x] Root cause: 7shifts API returns labor_percent as decimal (0.29 = 29%), stored without conversion
- [x] Fixed all 4 DB insertion points in routers.ts (3) and _core/index.ts (1): multiply by 100
- [x] Fixed existing DB data: UPDATE seven_shifts_daily_sales SET labourPercent = labourPercent * 100
- [x] Verified: Mar 9 now shows 29.98% ($181.47 / $605.26) — correct

# Bug Fix: "Back to Menu" Not Working After Checklist Submission
- [x] Investigated: Works correctly on preview — issue was on older published version
- [x] User needs to re-publish latest checkpoint to fix on production

# Invoice Capture Feature (OCR Auto-Fill)
- [x] Database: invoices table with all fields (vendor, lineItems, total, photoUrl, verifiedBy, etc.)
- [x] Database: CRUD helpers (createInvoice, getAllInvoices, getInvoiceById, updateInvoice, deleteInvoice)
- [x] Backend: POST /api/public/invoices/upload — photo upload to S3 + OCR extraction via Gemini vision
- [x] Backend: POST /api/public/invoices — create verified invoice record
- [x] Backend: GET /api/public/invoices — list invoices with store/vendor/date filters
- [x] Backend: GET /api/public/invoices/:id — get single invoice detail
- [x] OCR Service: extractInvoiceData using Forge API (Gemini 2.5 Flash) for vision-based extraction
- [x] Portal: InvoiceCapturePortal component — photo capture, OCR auto-fill, vendor dropdown, verification checkbox
- [x] Portal: Added to Store Manager, Assistant Manager, and Staff sidebar items
- [x] Portal: Vendor dropdown with 5 known vendors (Gordon/GFS, Dube Loiselle, Costco, Fernando, JG Rive Sud) + Other
- [x] Admin: InvoiceManagement page with filters, vendor breakdown, photo viewer, detail dialogs
- [x] Admin: Added to DashboardLayout sidebar under Reports & Checklists
- [x] Admin: Route /invoices registered in App.tsx
- [x] Tests: 17 invoice tests passing (schema, DB helpers, API endpoints, portal integration, admin integration)

# Bug Fix: Portal Reports Template Mismatch & Report Detail View
- [x] Portal Reports: Fixed getSubmitter() to extract name from data JSON (matching admin pattern)
- [x] Portal Completed Checklists: Made cards clickable with full detail dialog + ReportDetailRenderer
- [x] ReportDetailRenderer: Now handles 3 data formats (old ratings object, new tasks array, items array)
- [x] Old format (ratings) delegates to SectionChecklistDetail for proper section-based rendering
- [x] Items format maps to unified task structure with proper field names (item/label/en)
- [x] Task names now display correctly: "Outside and entrance" instead of "Task 1"
- [x] All 140 tests passing

# Bug Fix: Duplicate Submissions & Missing Submitter Name
- [x] Backend: Auto-overwrite existing report (same store + date + type) — deletes old entry before creating new one
- [x] Frontend: All forms now send overwrite:true (DirectChecklist, ChecklistViewer, PositionChecklists)
- [x] Frontend: Removed duplicate check dialogs from all forms (no more 409 handling)
- [x] Frontend: Simplified useDuplicateCheck hook to just submit directly
- [x] Frontend: Enforce required submitter name validation in all checklist forms
- [x] Frontend: Added name field to DirectChecklist WasteReportForm (was hardcoded "Store Staff")
- [x] Backend: Strengthened validation to reject empty/whitespace-only submitter names
- [x] Database: Cleaned up 58 duplicate entries (kept only latest per store/date/type)
- [x] Tests: Updated improvements.test.ts to expect auto-overwrite (200) instead of 409
- [x] All 129 tests passing (15 test files, excluding Koomi integration timeouts)

# Operations Manager Portal: Admin-Style Reports Tab
- [x] Give Operations Manager portal access to admin Reports tab with full filtering (Store, Position, Checklist type)
- [x] Filter bar matches admin dashboard: All Stores, All Positions, All Checklists dropdowns + date picker + Clear all + report count
- [x] Date picker with Quick Select presets (All Time, Today, Yesterday, Last 7/30 Days) + custom calendar range
- [x] Position filter cascades to checklist filter (selecting a position narrows checklist options)
- [x] Ops Manager sees all stores; Store Manager has store filter hidden (scoped to their store)
- [x] Reports table with Store, Date, Position, Checklist, Submitted By, Score, Submitted columns
- [x] Clickable rows open detail dialog with full report data
- [x] All 139 tests passing (15 test files, excluding Koomi integration timeouts)

# Report Export (CSV/PDF) for Operations Manager Portal
- [x] Add CSV export button to portal Reports page (exports filtered reports)
- [x] Add PDF export button to portal Reports page (print-to-PDF via new window)
- [x] CSV includes: Store, Date, Position, Checklist, Submitted By, Score, Submitted timestamp, Flag
- [x] PDF includes: formatted table with Hinnawi branding, filters applied, date generated, report count

# Report Notes & Flagging for Operations Manager Portal
- [x] Add report_notes table to database schema (reportId, note, flagType, createdBy, timestamps)
- [x] Create backend endpoints: GET/POST notes, PUT/DELETE individual notes, POST flag, POST batch flags
- [x] Add notes section to portal report detail dialog (add, edit, delete notes with author + timestamp)
- [x] Add flag selector in detail dialog header (No Flag, Needs Review, Follow Up, Resolved)
- [x] Show flag indicators as colored badges on the reports list table
- [x] Flag changes in detail dialog instantly update the table row
- [x] Write 18 vitest tests for notes/flags endpoints (all passing)
- [x] All 147 tests passing across 16 test files

# Active Alerts Revamp (Overview Page)
- [x] Alert: Ops Manager hasn't done weekly audit (ops-manager-checklist) for a store this week → warning
- [x] Alert: Store hasn't submitted daily checklist (manager-checklist) today → critical
- [x] Alert: Store hasn't submitted weekly checklist (assistant-manager-checklist) this week → info
- [x] Alert: Store has high labour % (real-time from Koomi + 7shifts + Excel data) → warning/critical
- [x] Alert: Store labour below target → success (positive confirmation)
- [x] Week range: Monday to Friday, auto-computed from current date, resets every Monday
- [x] Backend endpoint /api/public/active-alerts computes alerts from DB + labour sources
- [x] Frontend fetches live alerts on mount + refreshes every 5 minutes
- [x] UI shows week range, severity badges (critical/warning count), refresh button
- [x] Category labels on each alert (Weekly Audit, Daily Checklist, Weekly Checklist, Labour Alert)
- [x] Scrollable alert list with max-height for many alerts
- [x] Empty state: "All clear — no active alerts this week"
- [x] 6 vitest tests for alert endpoint (shape, sorting, uniqueness, week range)
- [x] All 153 tests passing across 17 test files

# Fix: Active Alerts - Correct Daily Checklist Type
- [x] Backend: Changed daily alert from manager-checklist to waste-report (Leftovers & Waste Report)
- [x] Backend: Changed weekly alert from assistant-manager-checklist to manager-checklist (Store Weekly Checklist)
- [x] Frontend: Updated category label from "Daily Checklist" to "Waste Report"
- [x] All 153 tests passing (no test changes needed — tests check shape/structure, not specific report types)

# Drafts in Reports & Operations Scorecard
- [x] Show draft/saved checklists in Reports tab with "NOT SUBMITTED" badge (orange) vs "SUBMITTED" (green)
- [x] Drafts visually distinct: orange badge, orange-tinted row in scorecard drill-down
- [x] Draft data affects Operations Scorecard — backend already includes all reports regardless of status
- [x] Both Store Weekly Checklist and Store Weekly Audit drafts included (no status filter in queries)
- [x] Admin Reports page: Status column with NOT SUBMITTED / SUBMITTED badges
- [x] Portal Reports page: Status column with badges + detail dialog status field
- [x] CSV export includes Status column
- [x] PDF export includes Status column with colored labels
- [x] Operations Scorecard: store cards show "X DRAFTS not yet submitted" indicator
- [x] Operations Scorecard: drill-down ReportRow shows NOT SUBMITTED badge with orange highlight
- [x] All 164 tests passing across 17 test files (excluding Koomi network timeout)

# Invoice Capture Upgrade & COGS on Store Performance
- [x] Invoice number field added to capture form (required, validated)
- [x] Multi-photo capture: add/remove multiple photos per invoice with individual upload progress
- [x] All invoices recorded as "Cost of Goods Sold" (COGS category)
- [x] Schema updated: photoUrls JSON column for multiple photos, category field for COGS
- [x] Backend: /api/public/cogs-summary endpoint aggregates invoice totals by store with date filtering
- [x] Backend: Invoice create endpoint accepts photoUrls array and category field
- [x] Store Performance dashboard: COGS row with total amount, invoice count, and COGS Rate (COGS/Revenue)
- [x] COGS Rate color-coded: green (<30%), amber (30-40%), red (>40%)
- [x] Admin InvoiceManagement: detail dialog shows multiple photos in grid + COGS badge
- [x] 6 new COGS tests (summary shape, date filtering, multi-photo, invoice creation)
- [x] All 159 tests passing across 18 test files

# COGS Charts on Store Performance Page
- [x] COGS Analysis section with header showing Total COGS and Overall Rate
- [x] COGS by Store bar chart — color-coded bars per store (PK gold, MK blue, ON green, TN amber)
- [x] COGS Rate by Store bar chart — green/amber/red based on 30% target reference line
- [x] COGS by Vendor breakdown table — vendor name, invoice count, total, % of COGS, visual share bar
- [x] Charts use the same date filter as the rest of the page
- [x] Empty state when no invoices for the selected period
- [x] Cleaned up 8 test invoices from database
- [x] All 171 tests passing across 19 test files

# Bug Fix: /checklists/waste tRPC error (HTML instead of JSON)
- [x] Added sendWasteEmail tRPC procedure to reports router using MS Graph Outlook API
- [x] Email sends from systems@bagelandcafe.com to toufic@bagelandcafe.com via ROPC auth flow
- [x] Waste page loads without errors, "Send by Email" button works end-to-end
- [x] 4 new vitest tests for waste email endpoint (valid send, missing subject, missing body, empty input)
- [x] All 175 tests passing across 20 test files

# Bagel Orders — Sales Location Only + Client Name
- [x] Make Bagel Orders tab exclusively for the "Sales" location (no store selector, hardcoded to Sales)
- [x] Add mandatory "Client Name" field to Bagel Orders form (both DirectChecklist and ChecklistViewer)
- [x] Store client name in bagel order submissions
- [x] Validate client name is non-empty before submission
- [x] Display client name in ReportDetailRenderer for bagel order reports
- [x] Sales orders unique by clientName+date (multiple clients per day supported)
- [x] Added checkExistingSalesOrder() to db.ts for client-aware dedup

# Bagel Production — Sales Section + Clients White Dough
- [x] Add "Sales Orders by Client" section above Store Orders on Bagel Production page
- [x] Sales section divided by client name (group orders by client)
- [x] Add separate "Clients White Dough" table showing per-client white dough Kg
- [x] "Sales — All Bagel Types by Client" table with client columns
- [x] Store White Dough box remains for store orders only
- [x] 5 new vitest tests for Sales bagel order uniqueness and production aggregation
- [x] All 180 tests passing across 21 test files

# Fix: Bagel Orders Admin Dashboard — Location Selector
- [x] Restored location selector on the Bagel Orders tab in the admin dashboard (DirectChecklist)
- [x] Admin can select any location: Sales, PK, MK, ON, TN (button grid)
- [x] Client Name field appears only when Sales is selected
- [x] Store orders submit without clientName; Sales orders require clientName

# Bagel Production — Three Separate White Dough Boxes
- [x] Added "Clients White Dough Total" box (purple) for Sales location orders
- [x] Added "Stores White Dough Total" box (gold) for store location orders
- [x] Added "TOTAL WHITE DOUGH" box (green) that sums Clients + Stores white dough
- [x] Removed old single White Dough summary card and Store White Dough box
- [x] All 168 non-integration tests passing (Koomi integration test is external dependency)

# Operations Manager Portal — Sales Location on Bagel Orders
- [x] Add "Sales" location option to the Bagel Orders form in the Operations Manager portal (PositionChecklists)
- [x] Show Client Name field when Sales is selected
- [x] Operations managers can submit client orders from the portal
- [x] Location selector with Sales (purple) + all stores (amber) buttons
- [x] All 168 non-integration tests passing

# Bug Fix: Sales location not visible on Operations Manager Portal
- [x] Investigated: OpsStorePickerForChecklist was blocking Bagel Orders with store-only options
- [x] Fixed: Bagel Orders now skips the store picker and goes directly to the form with built-in location selector
- [x] Sales location visible and selectable on Operations Manager portal Bagel Orders form

# Fix: Reports tab date filter should allow future dates
- [x] Removed `disabled={{ after: new Date() }}` from ReportHistory.tsx calendar
- [x] Added "Tomorrow" and "Next 7 Days" quick select presets
- [x] Calendar now allows selecting any future date
- [x] All 168 tests passing

# Labour % KPI card — Red when above 23.5% target
- [x] Added alertAbove prop to KPICard component
- [x] Labour % card turns red with "Above Target" badge when value > 23.5%
- [x] Red border, accent line, and text; other cards unaffected
- [x] All 168 tests passing

# Box Quantity Option for Sales + Dube Loiselle Orders Section
- [x] Add "Box" quantity option to Bagel Orders form (Sales location ONLY) — all 3 forms updated
- [x] Box option appears alongside dz and units when Sales is selected; hidden for stores
- [x] On Bagel Production, box orders are excluded from ALL White Dough calculations
- [x] Add separate "Dube Loiselle Orders" summary card (blue) with total box count
- [x] Add "Dube Loiselle Orders" section showing box orders grouped by client name
- [x] Display format: "X boxes [Type]" per client
- [x] All 168 tests passing

# Waste & Leftovers — Item Prices and Cost Calculations
- [x] Created shared/wastePricing.ts with all price constants from Excel
- [x] Bagels: $0.50/unit, $6.00/dozen for all types
- [x] Pastries: Croissant $2.19, Chocolatine $2.39, Almond Croissant $2.79, default $2.00
- [x] CK Preps: unit cost + container cost per item (20 items with alternate spellings)
- [x] Updated all 3 waste forms (DirectChecklist, ChecklistViewer, PositionChecklists) with L.Cost and W.Cost columns
- [x] Real-time per-item cost calculation as quantities are entered
- [x] Section totals shown in top-right badge per category
- [x] Grand total cost summary card (Leftover / Waste / Total) above submit buttons
- [x] Cost data included in submitted report payload
- [x] ReportDetailRenderer shows cost summary when viewing waste reports
- [x] 17 vitest tests for waste pricing module (bagels, pastries, CK preps, edge cases)
- [x] All 195 tests passing (17 new + 178 existing)

# Replace COGS Analysis with Waste Report Analysis on Store Performance
- [x] Removed COGS Analysis section from Store Performance tab
- [x] Added wasteAnalysis.byStore tRPC procedure to backend (parses waste reports, computes costs per store)
- [x] Waste Report Analysis section with header showing Total Waste Cost, Total Leftover, Waste/Revenue ratio
- [x] Waste Cost by Store stacked bar chart (leftover + waste per location)
- [x] Waste by Category bar chart (Bagels, Pastries, CK Items breakdown)
- [x] Top Wasted Items table with item name, category, qty, cost, and % share
- [x] Per-store cards updated: COGS/COGS Rate replaced with Waste Cost/Waste Rate
- [x] Empty state shown when no waste reports exist for the selected period
- [x] All 197 tests passing across 22 test files

# Bug Fix: Waste Report Analysis not showing data on Store Performance
- [x] Investigated: waste reports exist in DB with location codes (PK, MK, ON, TN) but frontend uses store IDs (pk, mk, ontario, tunnel)
- [x] Root cause: store ID mismatch — backend returned location codes, frontend expected lowercase store IDs
- [x] Fix: Added locationToStoreId mapping in wasteAnalysis.byStore procedure to normalize location codes to frontend store IDs
- [x] Verified: Store cards show waste cost/rate, charts display correctly, top items table populated
- [x] All 195 tests passing (2 pre-existing Koomi integration failures unrelated)
