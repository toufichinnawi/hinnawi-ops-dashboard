# Clover REST API Research for Hinnawi Bros Dashboard

## Key Finding: Clover has a comprehensive REST API

Clover provides a full REST API that gives us access to exactly the data needed for the operations dashboard.

## Available API Endpoints (relevant to Hinnawi)

### Orders & Sales
- GET /v3/merchants/{mId}/orders — Get all orders (newest first)
- GET /v3/merchants/{mId}/orders/{orderId} — Get single order with line items
- GET /v3/merchants/{mId}/orders/{orderId}/payments — Get payments for an order

### Payments & Revenue
- GET /v3/merchants/{mId}/payments — Get all payments (total, tip, tax, result)
- Includes: total amount, tip amount, tax amount, result status

### Employees & Labour
- GET /v3/merchants/{mId}/employees — Get all employees
- GET /v3/merchants/{mId}/shifts — Get all shifts
- GET /v3/merchants/{mId}/shifts.csv — Get shifts as CSV
- GET /v3/merchants/{mId}/employees/{empId}/shifts — Get shifts for specific employee
- GET /v3/merchants/{mId}/employees/{empId}/orders — Get orders for an employee

### Merchant Info
- GET /v3/merchants/{mId} — Get merchant details
- GET /v3/merchants/{mId}/opening_hours — Get opening hours
- GET /v3/merchants/{mId}/devices — Get all devices

### Cash Events
- GET /v3/merchants/{mId}/cash_events — All cash events
- GET /v3/merchants/{mId}/employees/{empId}/cash_events — Cash events by employee

### Inventory
- GET /v3/merchants/{mId}/items — Get all inventory items

## Authentication
- OAuth 2.0 flow
- Production base URL: https://api.clover.com (North America)
- Requires: App ID, App Secret, Merchant ID
- Bearer token authentication for API calls
- Tokens expire — need refresh flow

## Setup for "Connect Clover" Button
1. Create a Clover Developer account at clover.com/global-developer-home
2. Create an app → get App ID and App Secret
3. Set redirect URI to our dashboard callback URL
4. User clicks "Connect Clover" → redirected to Clover OAuth
5. User approves → we get access token
6. Dashboard pulls orders, payments, shifts automatically

## What This Means for the Dashboard
With Clover API we can automatically pull:
- Daily/weekly/monthly sales totals (from payments endpoint)
- Labour hours and shifts (from shifts endpoint)
- Employee data (from employees endpoint)
- Order details and item sales (from orders endpoint)
- Calculate labour % = (shift hours × wage) / total sales
- All 4 stores can be connected as separate merchants
