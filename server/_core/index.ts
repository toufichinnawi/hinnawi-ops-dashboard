import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerChatRoutes } from "./chat";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Chat API with streaming and tool calling
  registerChatRoutes(app);

  // ─── QuickBooks Online OAuth2 Routes ───
  app.get("/api/quickbooks/connect", async (_req, res) => {
    try {
      const { getQboAuthUrl } = await import("../quickbooks");
      const protocol = process.env.NODE_ENV === "production" ? "https" : _req.protocol;
      const redirectUri = `${protocol}://${_req.get("host")}/api/quickbooks/callback`;
      const state = Math.random().toString(36).substring(2, 15);
      const authUrl = getQboAuthUrl(redirectUri, state);
      res.redirect(authUrl);
    } catch (err) {
      console.error("[QBO] Connect error:", err);
      res.status(500).json({ error: "Failed to initiate QuickBooks connection" });
    }
  });

  app.get("/api/quickbooks/callback", async (req, res) => {
    try {
      const { code, realmId } = req.query as Record<string, string>;
      if (!code || !realmId) {
        return res.status(400).send("Missing code or realmId from QuickBooks");
      }
      const { exchangeCodeForTokens, getCompanyInfo } = await import("../quickbooks");
      const { upsertQboToken } = await import("../db");
      const protocol = process.env.NODE_ENV === "production" ? "https" : req.protocol;
      const redirectUri = `${protocol}://${req.get("host")}/api/quickbooks/callback`;
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      tokens.realmId = realmId;

      // Get company name
      let companyName = "QuickBooks Company";
      try {
        const info = await getCompanyInfo(realmId, tokens.accessToken);
        companyName = info.companyName;
      } catch (e) {
        console.warn("[QBO] Could not fetch company name:", e);
      }

      // Store tokens in database
      await upsertQboToken({
        realmId,
        companyName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        isActive: true,
      });

      console.log(`[QBO] Successfully connected to ${companyName} (realm: ${realmId})`);
      // Redirect back to the QuickBooks integration page
      res.redirect("/quickbooks?connected=true");
    } catch (err) {
      console.error("[QBO] Callback error:", err);
      res.redirect("/quickbooks?error=connection_failed");
    }
  });
  // Public API endpoint to check if a report already exists for a store+type+date
  app.get("/api/public/check-existing-report", async (req, res) => {
    try {
      const { location, reportType, reportDate } = req.query as Record<string, string>;
      if (!location || !reportType || !reportDate) {
        return res.status(400).json({ error: "Missing required query params" });
      }
      // Normalize location
      const LOCATION_MAP: Record<string, string> = {
        "President Kennedy": "PK", "president kennedy": "PK", "pk": "PK", "PK": "PK",
        "Mackay": "MK", "mackay": "MK", "mk": "MK", "MK": "MK",
        "Ontario": "ON", "ontario": "ON", "on": "ON", "ON": "ON",
        "Tunnel": "TN", "tunnel": "TN", "tn": "TN", "TN": "TN",
      };
      const REPORT_TYPE_MAP: Record<string, string> = {
        "Manager Checklist": "manager-checklist",
        "Operations Manager Checklist (Weekly Audit)": "ops-manager-checklist",
        "Ops. Mgr Weekly Audit": "ops-manager-checklist",
        "Weekly Store Audit": "ops-manager-checklist",
        "Deep Cleaning": "weekly-deep-cleaning",
        "Weekly Deep Cleaning": "weekly-deep-cleaning",
        "Assistant Manager Checklist": "assistant-manager-checklist",
        "Store Manager Checklist": "store-manager-checklist",
        "Store Evaluation Checklist": "store-manager-checklist",
        "Leftovers & Waste Report": "waste-report",
        "Leftovers & Waste": "waste-report",
        "Equipment & Maintenance": "equipment-maintenance",
        "Equipment Maintenance": "equipment-maintenance",
        "Weekly Scorecard": "weekly-scorecard",
        "Training Evaluation": "training-evaluation",
        "Bagel Orders": "bagel-orders",
        "Performance Evaluation": "performance-evaluation",
      };
      const normLoc = LOCATION_MAP[location] || location;
      const normType = REPORT_TYPE_MAP[reportType] || reportType;
      const { checkExistingReport } = await import("../db");
      const existing = await checkExistingReport(normLoc, normType, reportDate);
      res.json({ exists: !!existing, report: existing });
    } catch (err) {
      console.error("[Public API] Check existing error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public API endpoint for report submissions without login
  app.post("/api/public/submit-report", async (req, res) => {
    try {
      const {
        submitterName,
        reportType,
        location,
        reportDate,
        data,
        totalScore,
        overwrite,
      } = req.body;
      if (!submitterName || !reportType || !location || !reportDate) {
        return res
          .status(400)
          .json({ error: "Missing required fields" });
      }

      // ─── Normalize reportType to slug format ─────────────────────
      const REPORT_TYPE_MAP: Record<string, string> = {
        "Manager Checklist": "manager-checklist",
        "Operations Manager Checklist (Weekly Audit)": "ops-manager-checklist",
        "Ops. Mgr Weekly Audit": "ops-manager-checklist",
        "Weekly Store Audit": "ops-manager-checklist",
        "Deep Cleaning": "weekly-deep-cleaning",
        "Weekly Deep Cleaning": "weekly-deep-cleaning",
        "Assistant Manager Checklist": "assistant-manager-checklist",
        "Store Manager Checklist": "store-manager-checklist",
        "Store Evaluation Checklist": "store-manager-checklist",
        "Leftovers & Waste Report": "waste-report",
        "Leftovers & Waste": "waste-report",
        "Equipment & Maintenance": "equipment-maintenance",
        "Equipment Maintenance": "equipment-maintenance",
        "Weekly Scorecard": "weekly-scorecard",
        "Training Evaluation": "training-evaluation",
        "Bagel Orders": "bagel-orders",
        "Performance Evaluation": "performance-evaluation",
      };
      const normalizedReportType = REPORT_TYPE_MAP[reportType] || reportType;

      // ─── Normalize location to store code ─────────────────────────
      const LOCATION_MAP: Record<string, string> = {
        "President Kennedy": "PK",
        "president kennedy": "PK",
        "pk": "PK",
        "PK": "PK",
        "Mackay": "MK",
        "mackay": "MK",
        "mk": "MK",
        "MK": "MK",
        "Ontario": "ON",
        "ontario": "ON",
        "on": "ON",
        "ON": "ON",
        "Tunnel": "TN",
        "tunnel": "TN",
        "tn": "TN",
        "TN": "TN",
      };
      const normalizedLocation = LOCATION_MAP[location] || location;

      const { createReportSubmission, checkExistingReport, deleteReportSubmission } = await import("../db");
      const { sendTeamsNotification } = await import(
        "../teamsNotify"
      );

      // Check for existing report and handle overwrite
      const existing = await checkExistingReport(normalizedLocation, normalizedReportType, reportDate);
      if (existing && !overwrite) {
        return res.status(409).json({
          error: "duplicate",
          message: "A report already exists for this store, checklist type, and date.",
          existingReport: existing,
        });
      }
      if (existing && overwrite) {
        await deleteReportSubmission(existing.id);
      }
      // Embed submitterName into data JSON so it's available for drill-down views
      const enrichedData = typeof data === "object" && data !== null
        ? { ...data, submitterName }
        : { raw: data, submitterName };
      const result = await createReportSubmission({
        userId: null as any,
        reportType: normalizedReportType,
        location: normalizedLocation,
        reportDate,
        data: enrichedData,
        totalScore: totalScore || null,
        status: "submitted",
      });
      sendTeamsNotification({
        reportType: normalizedReportType,
        location: normalizedLocation,
        submittedBy: submitterName,
        reportDate,
        totalScore,
        details:
          typeof data === "object" ? data : undefined,
      }).catch((err: any) =>
        console.error(
          "[Teams] Public notification error:",
          err
        )
      );
      res.json({ success: true, id: result });
    } catch (err) {
      console.error("[Public API] Submit error:", err);
      res
        .status(500)
        .json({ error: "Internal server error" });
    }
  });

  // Public API endpoint for reading all reports (used by portal)
  app.get("/api/public/reports", async (_req, res) => {
    try {
      const { getAllReports } = await import("../db");
      const reports = await getAllReports();
      res.json({ success: true, data: reports });
    } catch (err) {
      console.error("[Public API] Reports error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public API endpoint for updating a report (used by portal)
  app.put("/api/public/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid report ID" });
      const { data, totalScore, status } = req.body;
      const { updateReportSubmission } = await import("../db");
      const updateData: any = {};
      if (data !== undefined) updateData.data = data;
      if (totalScore !== undefined) updateData.totalScore = totalScore;
      if (status !== undefined) updateData.status = status;
      await updateReportSubmission(id, updateData);
      res.json({ success: true });
    } catch (err) {
      console.error("[Public API] Update report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public API endpoint for deleting a report (used by portal)
  app.delete("/api/public/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid report ID" });
      const { deleteReportSubmission } = await import("../db");
      await deleteReportSubmission(id);
      res.json({ success: true });
    } catch (err) {
      console.error("[Public API] Delete report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // ─── Automated Midnight Sync (Clover + 7shifts) ───────────────
  // Runs daily at midnight to pull yesterday's data so it's ready in the morning
  async function runAutoSync() {
    console.log(`[AutoSync] Starting automated daily sync at ${new Date().toISOString()}`);
    try {
      const { listCloverConnections, upsertCloverDailySales, updateCloverConnection } = await import("../db");
      const { fetchPayments, aggregatePaymentsByDay, getDateRange } = await import("../clover");
      const { listSevenShiftsConnections, upsertSevenShiftsDailySales, updateSevenShiftsConnection } = await import("../db");
      const { fetchDailySalesAndLabor, getDateRangeStrings } = await import("../sevenShifts");

      // Sync last 3 days to catch any late-settling transactions
      const daysBack = 3;

      // Clover sync
      const cloverConns = await listCloverConnections();
      const activeClover = cloverConns.filter(c => c.isActive);
      for (const conn of activeClover) {
        try {
          const { startTime, endTime } = getDateRange(daysBack);
          const payments = await fetchPayments(conn.merchantId, conn.accessToken, startTime, endTime);
          const dailySales = aggregatePaymentsByDay(payments);
          for (const day of dailySales) {
            await upsertCloverDailySales({
              connectionId: conn.id,
              merchantId: conn.merchantId,
              date: day.date,
              totalSales: day.totalSales,
              totalTips: day.totalTips,
              totalTax: day.totalTax,
              orderCount: day.orderCount,
              netSales: day.netSales,
              refundAmount: day.refundAmount,
            });
          }
          await updateCloverConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: true });
          console.log(`[AutoSync] Clover: ${conn.storeName} synced ${dailySales.length} days`);
        } catch (err: any) {
          await updateCloverConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: false });
          console.error(`[AutoSync] Clover: ${conn.storeName} failed:`, err.message);
        }
      }

      // Koomi/MYR sync (scraper)
      try {
        const { upsertKoomiDailySales } = await import("../db");
        const { scrapeAllStores, getTodayEST } = await import("../koomi");

        // Scrape last 3 days for each Koomi store
        for (let i = 0; i < daysBack; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);

          const storeData = await scrapeAllStores(dateStr);
          for (const s of storeData) {
            await upsertKoomiDailySales({
              storeId: s.storeId,
              storeName: s.storeName,
              koomiLocationId: s.koomiLocationId,
              date: s.date,
              grossSales: s.grossSales,
              netSales: s.netSales,
              netSalaries: s.netSalaries,
              labourPercent: s.labourPercent,
            });
          }
          console.log(`[AutoSync] Koomi: ${dateStr} synced ${storeData.length} stores`);
        }
      } catch (err: any) {
        console.error(`[AutoSync] Koomi failed:`, err.message);
      }

      // 7shifts sync
      const sevenConns = await listSevenShiftsConnections();
      const activeSeven = sevenConns.filter(c => c.isActive);
      for (const conn of activeSeven) {
        try {
          const { startDate, endDate } = getDateRangeStrings(daysBack);
          const dailyData = await fetchDailySalesAndLabor(conn.companyId, conn.locationId, conn.accessToken, startDate, endDate);
          for (const day of dailyData) {
            await upsertSevenShiftsDailySales({
              connectionId: conn.id,
              locationId: conn.locationId,
              date: day.date,
              totalSales: day.actual_sales / 100,
              projectedSales: day.projected_sales / 100,
              labourCost: day.actual_labor_cost / 100,
              projectedLabourCost: day.projected_labor_cost / 100,
              labourMinutes: day.actual_labor_minutes,
              overtimeMinutes: day.actual_ot_minutes,
              labourPercent: day.labor_percent,
              salesPerLabourHour: day.sales_per_labor_hour / 100,
              orderCount: day.actual_items,
            });
          }
          await updateSevenShiftsConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: true });
          console.log(`[AutoSync] 7shifts: ${conn.storeName} synced ${dailyData.length} days`);
        } catch (err: any) {
          await updateSevenShiftsConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: false });
          console.error(`[AutoSync] 7shifts: ${conn.storeName} failed:`, err.message);
        }
      }

      console.log(`[AutoSync] Completed at ${new Date().toISOString()}`);
    } catch (err) {
      console.error("[AutoSync] Fatal error:", err);
    }
  }

  // ─── Sync Schedule (locked in) ─────────────────────────────────
  // 1. Every 5 minutes between 7:00 AM and 8:00 PM daily
  // 2. One-time sync at 9:00 PM daily
  // 3. One-time sync at 12:00 AM (midnight) daily
  const syncLog = new Set<string>(); // track "HH:MM-YYYY-MM-DD" to avoid double-fires

  setInterval(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const key = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}-${now.toISOString().split("T")[0]}`;

    if (syncLog.has(key)) return;

    let shouldSync = false;

    // Rule 1: Every 5 minutes between 7:00 AM and 8:00 PM (inclusive of 7:00, last at 20:00)
    if (h >= 7 && h <= 20 && m % 5 === 0) {
      shouldSync = true;
    }

    // Rule 2: One-time sync at 9:00 PM (21:00)
    if (h === 21 && m === 0) {
      shouldSync = true;
    }

    // Rule 3: One-time sync at 12:00 AM (00:00)
    if (h === 0 && m === 0) {
      shouldSync = true;
    }

    if (shouldSync) {
      syncLog.add(key);
      console.log(`[AutoSync] Triggered at ${now.toLocaleTimeString()} (${key})`);
      runAutoSync();

      // Clean up old entries to prevent memory growth (keep only today)
      const today = now.toISOString().split("T")[0];
      Array.from(syncLog).forEach(entry => {
        if (!entry.endsWith(today)) syncLog.delete(entry);
      });
    }
  }, 30_000); // Check every 30 seconds for precision

  console.log("[AutoSync] Sync schedule active: every 5min 7AM-8PM + 9PM + 12AM daily");
}

startServer().catch(console.error);
