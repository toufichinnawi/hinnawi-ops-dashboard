# Key Finding: MYR POS Already Integrates with QuickBooks

MYR POS has a FREE built-in QuickBooks integration that:
- Publishes **automatic daily journal entries** to QuickBooks
- Maps MYR sales values to QuickBooks accounts (e.g., VENTES NOURRITURE, POURBOIRES DÛS)
- Can automatically calculate and invoice royalties/fees for franchises
- Supports branch selection (e.g., "Holy Burgers Pyramide" shown in screenshot)
- Journal Entry Values can be configured: consolidated or per-branch

This means: MYR → QuickBooks → Our Dashboard
- MYR automatically sends daily sales data to QuickBooks
- We can pull from QuickBooks API to get live sales data
- This is the automated pipeline the user wants!

Also: MYR integrates with WISK for inventory (via API key from WISK entered in MYR)
- This confirms MYR has some API capabilities for third-party integrations
- Contact MYR support to enable integrations

Best approach:
1. If MYR→QuickBooks is already set up, pull data from QuickBooks API
2. If not, help user enable MYR→QuickBooks integration first (it's free)
3. Then connect QuickBooks to our dashboard via OAuth2
