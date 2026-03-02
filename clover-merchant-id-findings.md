# Clover Merchant ID Findings

Key discovery: Clover docs say merchantId is a "13-alphanumeric identifier" (UUID format like 3D19QN31ANYR5).

BUT the user's Merchant ID from their Clover app and statement is `22082280017` (numeric, 11 chars).

This is likely the **MID (Merchant Identification Number)** used for payment processing/statements,
which is DIFFERENT from the Clover **merchantId** (UUID) used for the REST API.

The user needs to find the Clover merchantId (UUID) which is visible:
1. In the Clover Dashboard URL: https://clover.com/merchants/XXXXXXXXXXXXX
2. In Settings > About Your Business > Merchants

The `22082280017` is their payment processing MID, not the API merchantId.

Also important: The Clover Dashboard URL might not show the merchant ID directly at /dashboard.
The user said the URL is just "https://www.clover.com/dashboard" - they need to go to 
Settings > View all settings > About Your Business > Merchants to find the 13-char UUID.
