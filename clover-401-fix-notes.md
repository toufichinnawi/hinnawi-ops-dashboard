# Clover 401 Fix Notes

Key findings from Clover docs:

1. **Merchant ID is a 13-alphanumeric identifier** (e.g., TC4DGCJW1K4EW) - NOT a numeric ID
   - The user entered `22082280017` which is 11 digits - this is likely NOT the correct Merchant ID
   - The Merchant ID should be found in the URL: clover.com/dashboard/m/XXXXXXXXXXXXX

2. **API tokens created from Account & Setup → API Tokens are "merchant tokens"**
   - These are valid for REST API calls
   - BUT they do NOT support CORS (can't call from browser directly)
   - Must proxy through server (which we do via tRPC)

3. **Authorization must use Bearer header** - we already do this correctly

4. **For North America (US + Canada)**: Use api.clover.com - this is correct

CONCLUSION: The most likely issue is the Merchant ID format. User entered a numeric ID 
instead of the 13-character alphanumeric ID from the Clover Dashboard URL.
