# MYR/Koomi Integration Research

## Key Findings

### MYR POS (formerly Koomi) Data Access Methods

1. **Back Office Reports (CSV Export)**
   - All reports can be exported as CSV files
   - Report types: Master Report, Net Report, Breakdown Report, Trends Report, Timing Report, Combinations Report
   - Custom date ranges available (1 day to 1 year)
   - Labour costs available if punch clock feature is enabled
   - Hourly sales available in Dashboard tab

2. **Scheduled Email Reports**
   - Daily, weekly, monthly, yearly overview sales reports can be emailed automatically
   - Emails can be configured in the back office Reports tab

3. **Integrations (No Direct Public API for data pull)**
   - Integrates with: 7shifts (labour/scheduling), QuickBooks/Wave/Sage (accounting), DYNE (analytics), Piecemeal/WISK/RESTOCK (inventory)
   - No public REST API documented for pulling sales/labour data directly
   - Koomi Singapore has an Open API but it's for SENDING orders TO the POS, not pulling data FROM it

4. **Dashboard Tab**
   - Hourly sales with comparison capability
   - Labour costs (if punch clock enabled)
   - Food costs (if recipe feature enabled)

### Integration Architecture Options

**Option A: CSV Upload Flow (Most Practical)**
- User exports CSV from MYR back office
- Uploads to dashboard via file upload interface
- Dashboard parses and displays data
- Can be done daily or weekly

**Option B: Email Report Parsing (Automated)**
- MYR sends scheduled email reports
- Power Automate or similar parses the email
- Data pushed to dashboard
- Requires backend (full-stack upgrade)

**Option C: Manual Data Entry with Smart Forms**
- Dashboard provides forms matching MYR report structure
- Managers input key figures daily
- Simplest but most manual

### Recommendation
Option A (CSV Upload) is the most practical for a static frontend. It gives real data without requiring a backend API. The dashboard can parse MYR CSV exports client-side using Papa Parse or similar.
