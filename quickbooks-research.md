# QuickBooks Online API Research

## Available Reports via API
- ProfitAndLoss (Income Statement)
- ProfitAndLossDetail
- BalanceSheet
- CashFlow
- Trial Balance
- VendorExpenses
- CustomerSales, ItemSales, DepartmentSales, ClassSales
- AgedReceivables, AgedPayables
- GeneralLedgerDetail
- TaxSummary

## Key Entities for Restaurant Operations
- Employees (payroll data)
- Purchases/Expenses (COGS, supplies)
- Invoices/Sales receipts
- Accounts (chart of accounts for labour, food costs, etc.)
- Vendors (supplier tracking)

## Authentication
- OAuth 2.0 required (Client ID + Client Secret)
- Access tokens expire, need refresh token flow
- Scopes: accounting (for reports/financial data), payments (optional)

## Setup Requirements
1. Create Intuit Developer account
2. Create an app on Intuit Developer Portal
3. Get Client ID and Client Secret
4. Set up OAuth 2.0 callback URL
5. User authorizes the app to access their QBO company

## Integration Approach for Hinnawi Dashboard
- Register app on Intuit Developer Portal
- Implement OAuth 2.0 flow in backend
- Pull ProfitAndLoss report for revenue/expense breakdown
- Pull employee/payroll data for labour costs
- Pull VendorExpenses for COGS tracking
- Store credentials securely, auto-refresh tokens

## Node.js SDK
- Official: node-quickbooks npm package
- Or use direct REST API calls with axios
