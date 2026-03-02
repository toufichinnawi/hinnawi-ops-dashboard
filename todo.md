# Koomi/MYR Live Data Integration

## Research
- [x] Investigate Koomi/MYR POS API availability — No public REST API for data pull
- [x] Check CSV/Excel export — MYR supports CSV export for all report types
- [x] Research alternatives — Email reports available but requires backend

## Design
- [x] Determined CSV Upload approach — approved by user

## Implementation
- [ ] Install papaparse for CSV parsing
- [ ] Create CSV parser module for MYR report formats (Net, Breakdown, Labour)
- [ ] Create DataContext for global state management with localStorage persistence
- [ ] Create Data Management page with drag-and-drop CSV upload
- [ ] Update all dashboard pages to consume uploaded data (fallback to demo data)
- [ ] Add upload status indicators and data freshness badges
- [ ] Add route to App.tsx
- [ ] Add nav item to sidebar

## Delivery
- [ ] Test full upload flow
- [ ] Save checkpoint and deliver to user
