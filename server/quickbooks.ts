/**
 * QuickBooks Online OAuth2 + API service
 * Handles: OAuth2 flow, token management, P&L report fetching, COGS extraction
 */

import { ENV } from "./_core/env";

// ─── QBO OAuth2 Configuration ───

const QBO_AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
// Development keys work with both sandbox and production companies
const QBO_API_BASE = "https://quickbooks.api.intuit.com";
const QBO_SCOPES = "com.intuit.quickbooks.accounting";

export interface QboTokenData {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface QboCogsByLocation {
  locationName: string;
  locationId?: string;
  cogsAmount: number;
  revenue: number;
  grossProfit: number;
  cogsPercent: number;
  cogsBreakdown: Record<string, number>;
}

// ─── OAuth2 Helpers ───

/**
 * Build the QuickBooks authorization URL that the user clicks to connect
 */
export function getQboAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.qboClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: QBO_SCOPES,
    state,
  });
  return `${QBO_AUTH_BASE}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<QboTokenData & { companyName?: string }> {
  const basicAuth = Buffer.from(
    `${ENV.qboClientId}:${ENV.qboClientSecret}`
  ).toString("base64");

  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`QBO token exchange failed (${res.status}): ${errText}`);
  }

  const data = await res.json();

  const now = new Date();
  const accessTokenExpiresAt = new Date(
    now.getTime() + (data.expires_in ?? 3600) * 1000
  );
  const refreshTokenExpiresAt = new Date(
    now.getTime() + (data.x_refresh_token_expires_in ?? 8726400) * 1000
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    realmId: "", // Will be set from the callback query param
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}> {
  const basicAuth = Buffer.from(
    `${ENV.qboClientId}:${ENV.qboClientSecret}`
  ).toString("base64");

  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`QBO token refresh failed (${res.status}): ${errText}`);
  }

  const data = await res.json();

  const now = new Date();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: new Date(
      now.getTime() + (data.expires_in ?? 3600) * 1000
    ),
    refreshTokenExpiresAt: new Date(
      now.getTime() + (data.x_refresh_token_expires_in ?? 8726400) * 1000
    ),
  };
}

// ─── QBO API Calls ───

/**
 * Make an authenticated API call to QuickBooks Online
 */
async function qboApiCall(
  realmId: string,
  accessToken: string,
  endpoint: string
): Promise<any> {
  const url = `${QBO_API_BASE}/v3/company/${realmId}/${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`QBO API call failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Get company info (name, etc.)
 */
export async function getCompanyInfo(
  realmId: string,
  accessToken: string
): Promise<{ companyName: string }> {
  const data = await qboApiCall(
    realmId,
    accessToken,
    `companyinfo/${realmId}`
  );
  return {
    companyName: data?.CompanyInfo?.CompanyName ?? "Unknown",
  };
}

/**
 * Fetch Profit & Loss report grouped by Location
 */
export async function fetchPnlByLocation(
  realmId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    summarize_column_by: "Location",
    minorversion: "75",
  });
  return qboApiCall(
    realmId,
    accessToken,
    `reports/ProfitAndLoss?${params.toString()}`
  );
}

/**
 * Parse the P&L report JSON to extract COGS by location
 */
export function parsePnlForCogs(reportData: any): QboCogsByLocation[] {
  const results: QboCogsByLocation[] = [];

  if (!reportData?.Columns?.Column || !reportData?.Rows?.Row) {
    return results;
  }

  // Extract location names from columns
  // First column is typically "Account", rest are locations, last is "Total"
  const columns: { name: string; id?: string }[] = [];
  for (const col of reportData.Columns.Column) {
    if (col.ColType === "Money") {
      const metaData = col.MetaData;
      let name = col.ColTitle || "Unknown";
      let id: string | undefined;
      if (metaData) {
        for (const m of metaData) {
          if (m.Name === "LocationName") name = m.Value;
          if (m.Name === "LocationId") id = m.Value;
        }
      }
      columns.push({ name, id });
    }
  }

  if (columns.length === 0) return results;

  // Initialize results per location (skip "Total" column if present)
  const locationMap = new Map<number, QboCogsByLocation>();
  columns.forEach((col, idx) => {
    if (col.name !== "Total" && col.name !== "TOTAL") {
      locationMap.set(idx, {
        locationName: col.name,
        locationId: col.id,
        cogsAmount: 0,
        revenue: 0,
        grossProfit: 0,
        cogsPercent: 0,
        cogsBreakdown: {},
      });
    }
  });

  // Walk the rows to find Income and COGS sections
  function processRows(rows: any[], section: string) {
    if (!rows) return;
    for (const row of rows) {
      if (row.type === "Section") {
        const groupTitle = row.Header?.ColData?.[0]?.value ?? "";
        let currentSection = section;

        if (
          groupTitle.toLowerCase().includes("income") &&
          !groupTitle.toLowerCase().includes("other") &&
          !groupTitle.toLowerCase().includes("net")
        ) {
          currentSection = "income";
        } else if (
          groupTitle.toLowerCase().includes("cost of goods sold") ||
          groupTitle.toLowerCase().includes("cogs")
        ) {
          currentSection = "cogs";
        }

        // Process sub-rows
        if (row.Rows?.Row) {
          processRows(row.Rows.Row, currentSection);
        }

        // Process Summary row for section totals
        if (row.Summary?.ColData && currentSection) {
          const summaryValues = row.Summary.ColData;
          for (const [idx, loc] of Array.from(locationMap)) {
            // +1 because first ColData is the label
            const val = parseFloat(summaryValues[idx + 1]?.value ?? "0") || 0;
            if (currentSection === "income") {
              loc.revenue = val;
            } else if (currentSection === "cogs") {
              loc.cogsAmount = val;
            }
          }
        }
      } else if (row.type === "Data" && section) {
        // Individual line item
        const colData = row.ColData;
        if (!colData) continue;
        const accountName = colData[0]?.value ?? "";

        for (const [idx, loc] of Array.from(locationMap)) {
          const val = parseFloat(colData[idx + 1]?.value ?? "0") || 0;
          if (section === "cogs" && val !== 0) {
            loc.cogsBreakdown[accountName] =
              (loc.cogsBreakdown[accountName] ?? 0) + val;
          }
        }
      }
    }
  }

  processRows(reportData.Rows.Row, "");

  // Calculate derived fields
  for (const loc of Array.from(locationMap.values())) {
    loc.grossProfit = loc.revenue - loc.cogsAmount;
    loc.cogsPercent =
      loc.revenue > 0
        ? Math.round((loc.cogsAmount / loc.revenue) * 10000) / 100
        : 0;
    results.push(loc);
  }

  return results;
}

/**
 * Full sync: fetch P&L report and extract COGS by location
 */
export async function syncQboCogs(
  realmId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<QboCogsByLocation[]> {
  const reportData = await fetchPnlByLocation(
    realmId,
    accessToken,
    startDate,
    endDate
  );
  return parsePnlForCogs(reportData);
}
