/**
 * Koomi/MYR POS Scraper Service
 * Logs into admin.koomi.com via HTTP, scrapes daily sales data per store.
 * No browser automation — pure server-side HTTP requests + HTML parsing.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface KoomiStore {
  id: string;        // internal id: "mk", "tunnel", "pk"
  name: string;      // display name
  koomiId: string;   // Koomi location value: "2207", "1036", "1037"
}

export interface KoomiDayData {
  storeId: string;
  storeName: string;
  koomiLocationId: string;
  date: string;         // YYYY-MM-DD
  grossSales: number;
  netSales: number;
  netSalaries: number;
  labourPercent: number;
}

// ─── Store Mapping ──────────────────────────────────────────────────

export const KOOMI_STORES: KoomiStore[] = [
  { id: "mk",     name: "Hinnawi Bros (Mackay)",              koomiId: "2207" },
  { id: "tunnel", name: "Hinnawi Bros (Cathcart/Tunnel)",     koomiId: "1036" },
  { id: "pk",     name: "Hinnawi Bros (President Kennedy)",   koomiId: "1037" },
];

// ─── Session Management ─────────────────────────────────────────────

let sessionCookie = ""; // Single PHPSESSID cookie
let lastLoginTime = 0;
const SESSION_TTL_MS = 25 * 60 * 1000; // Re-login every 25 minutes (session likely 30min)

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function extractSessionCookie(response: Response): string {
  const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
  for (const header of setCookieHeaders) {
    const nameValue = header.split(";")[0].trim();
    if (nameValue.startsWith("PHPSESSID=")) {
      return nameValue;
    }
  }
  return "";
}

// ─── Login ──────────────────────────────────────────────────────────

export async function koomiLogin(): Promise<boolean> {
  const adminUrl = process.env.KOOMI_ADMIN_URL || "https://admin.koomi.com";
  const email = process.env.KOOMI_EMAIL;
  const password = process.env.KOOMI_PASSWORD;

  if (!email || !password) {
    throw new Error("KOOMI_EMAIL and KOOMI_PASSWORD environment variables are required");
  }

  console.log("[Koomi] Logging in...");

  try {
    // Step 1: GET login page to get initial session + CSRF token
    const loginPageRes = await fetch(adminUrl, {
      redirect: "manual",
      headers: { "User-Agent": UA },
    });

    const initialCookie = extractSessionCookie(loginPageRes);
    const loginPageHtml = await loginPageRes.text();

    // Extract CSRF token (login_user_code hidden field)
    const csrfMatch = loginPageHtml.match(/name="login_user_code"[^>]*value="([^"]*)"/)
      || loginPageHtml.match(/value="([^"]*)"[^>]*name="login_user_code"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";
    console.log(`[Koomi] CSRF token: ${csrfToken ? "extracted" : "not found"}`);

    // Step 2: POST login with all required form fields
    const formBody = new URLSearchParams({
      email: email,
      password: password,
      cms_login_submit: "1",
      login_user_code: csrfToken,
    });

    const loginRes = await fetch(adminUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": initialCookie,
        "User-Agent": UA,
      },
      body: formBody.toString(),
      redirect: "manual",
    });

    // On successful login, Koomi returns 200 with empty body and a NEW PHPSESSID
    const newCookie = extractSessionCookie(loginRes);
    if (!newCookie) {
      console.error("[Koomi] Login failed — no new session cookie received");
      return false;
    }

    // Step 3: Verify the new session works by fetching the dashboard
    const dashUrl = `${adminUrl}/franchise_app/dashboard/`;
    const verifyRes = await fetch(dashUrl, {
      headers: {
        "Cookie": newCookie,
        "User-Agent": UA,
      },
      redirect: "manual",
    });

    const verifyBody = await verifyRes.text();
    if (verifyRes.status === 200 && (verifyBody.includes("Hinnawi") || verifyBody.includes("franchise_app"))) {
      sessionCookie = newCookie;
      lastLoginTime = Date.now();
      console.log("[Koomi] Login successful — session verified");
      return true;
    }

    console.error(`[Koomi] Login failed — dashboard verification returned ${verifyRes.status}`);
    return false;
  } catch (err: any) {
    console.error("[Koomi] Login error:", err.message);
    return false;
  }
}

async function ensureLoggedIn(): Promise<boolean> {
  if (sessionCookie && Date.now() - lastLoginTime < SESSION_TTL_MS) {
    return true;
  }
  return koomiLogin();
}

// ─── Dashboard Scraping ─────────────────────────────────────────────

/**
 * Fetch dashboard HTML for a specific store and date.
 * The Koomi dashboard is a POST form that accepts:
 *   - display_date: YYYY-MM-DD
 *   - location-selected[]: store Koomi ID
 *   - _qf__dashboard: "" (form token)
 *   - p: "0"
 */
async function fetchDashboardHtml(koomiLocationId: string, date: string): Promise<string | null> {
  const adminUrl = process.env.KOOMI_ADMIN_URL || "https://admin.koomi.com";
  const dashUrl = `${adminUrl}/franchise_app/dashboard/`;

  const formBody = new URLSearchParams();
  formBody.append("_qf__dashboard", "");
  formBody.append("display_date", date);
  formBody.append("p", "0");
  formBody.append("location-selected[]", koomiLocationId);

  try {
    const res = await fetch(dashUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": sessionCookie,
        "User-Agent": UA,
        "Referer": dashUrl,
      },
      body: formBody.toString(),
      redirect: "follow",
    });

    if (res.status !== 200) {
      console.error(`[Koomi] Dashboard fetch failed for location ${koomiLocationId}: HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Check if we got redirected to login page (session expired)
    if (html.includes("cms_login_submit") && !html.includes("franchise_app")) {
      console.warn("[Koomi] Session expired, re-logging in...");
      sessionCookie = "";
      lastLoginTime = 0;
      const loggedIn = await koomiLogin();
      if (!loggedIn) return null;

      // Retry the request
      const retryRes = await fetch(dashUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": sessionCookie,
          "User-Agent": UA,
          "Referer": dashUrl,
        },
        body: formBody.toString(),
        redirect: "follow",
      });

      if (retryRes.status !== 200) return null;
      return retryRes.text();
    }

    return html;
  } catch (err: any) {
    console.error(`[Koomi] Dashboard fetch error for location ${koomiLocationId}:`, err.message);
    return null;
  }
}

// ─── HTML Parsing ───────────────────────────────────────────────────

/**
 * Parse the dashboard HTML to extract:
 *   - Total Gross Sales: $ X,XXX.XX
 *   - Total Net Sales: $ X,XXX.XX
 *   - Total Net Salaries: $ X,XXX.XX (XX%)
 *
 * Exported for testing.
 */
export function parseDashboardData(html: string): { grossSales: number; netSales: number; netSalaries: number; labourPercent: number } | null {
  try {
    // Extract Total Gross Sales
    const grossMatch = html.match(/Total Gross Sales[\s\S]*?\$\s*([\d,]+\.?\d*)/);
    const grossSales = grossMatch ? parseFloat(grossMatch[1].replace(/,/g, "")) : 0;

    // Extract Total Net Sales
    const netMatch = html.match(/Total Net Sales[\s\S]*?\$\s*([\d,]+\.?\d*)/);
    const netSales = netMatch ? parseFloat(netMatch[1].replace(/,/g, "")) : 0;

    // Extract Total Net Salaries with percentage
    const salaryMatch = html.match(/Total Net Salaries[\s\S]*?\$\s*([\d,]+\.?\d*)\s*\((\d+)%\)/);
    const netSalaries = salaryMatch ? parseFloat(salaryMatch[1].replace(/,/g, "")) : 0;
    const labourPercent = salaryMatch ? parseInt(salaryMatch[2], 10) : 0;

    // Validate we got at least some data
    if (grossSales === 0 && netSales === 0 && netSalaries === 0) {
      if (!html.includes("Total Gross Sales")) {
        console.warn("[Koomi] Dashboard HTML does not contain expected data fields");
        return null;
      }
    }

    return { grossSales, netSales, netSalaries, labourPercent };
  } catch (err: any) {
    console.error("[Koomi] Parse error:", err.message);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Scrape daily sales data for a single store on a given date.
 */
export async function scrapeStoreDay(store: KoomiStore, date: string): Promise<KoomiDayData | null> {
  const loggedIn = await ensureLoggedIn();
  if (!loggedIn) {
    console.error("[Koomi] Cannot scrape — not logged in");
    return null;
  }

  const html = await fetchDashboardHtml(store.koomiId, date);
  if (!html) return null;

  const data = parseDashboardData(html);
  if (!data) return null;

  return {
    storeId: store.id,
    storeName: store.name,
    koomiLocationId: store.koomiId,
    date,
    grossSales: data.grossSales,
    netSales: data.netSales,
    netSalaries: data.netSalaries,
    labourPercent: data.labourPercent,
  };
}

/**
 * Scrape all 3 Koomi stores for a given date.
 */
export async function scrapeAllStores(date: string): Promise<KoomiDayData[]> {
  const results: KoomiDayData[] = [];

  for (const store of KOOMI_STORES) {
    try {
      const data = await scrapeStoreDay(store, date);
      if (data) {
        results.push(data);
        console.log(`[Koomi] ${store.name} on ${date}: Gross=$${data.grossSales}, Net=$${data.netSales}, Salaries=$${data.netSalaries} (${data.labourPercent}%)`);
      } else {
        console.warn(`[Koomi] No data for ${store.name} on ${date}`);
      }
    } catch (err: any) {
      console.error(`[Koomi] Error scraping ${store.name} on ${date}:`, err.message);
    }

    // Small delay between store requests to be polite
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Scrape multiple days for all stores (for backfill).
 */
export async function scrapeMultipleDays(daysBack: number): Promise<KoomiDayData[]> {
  const allData: KoomiDayData[] = [];

  for (let i = 0; i < daysBack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const dayData = await scrapeAllStores(dateStr);
    allData.push(...dayData);

    // Delay between days
    if (i < daysBack - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allData;
}

/**
 * Get today's date in YYYY-MM-DD format (EST timezone).
 */
export function getTodayEST(): string {
  const now = new Date();
  // Convert to EST (UTC-5)
  const est = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  return est.toISOString().slice(0, 10);
}
