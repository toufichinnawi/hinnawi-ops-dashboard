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
- [ ] Save checkpoint and deliver to user
