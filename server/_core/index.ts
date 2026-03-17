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
      // Hardcode to match exactly what's registered in Intuit Developer Portal
      const redirectUri = `https://hinnawidash-i5zcri4c.manus.space/api/quickbooks/callback`;
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
      // Must match exactly what's registered in Intuit Developer Portal
      const redirectUri = `https://hinnawidash-i5zcri4c.manus.space/api/quickbooks/callback`;
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
        "Store Manager Weekly Audit": "ops-manager-checklist",
        "Store Weekly Audit": "ops-manager-checklist",
        "Weekly Store Audit": "ops-manager-checklist",
        "Assistant Manager Checklist": "assistant-manager-checklist",
        "Leftovers & Waste Report": "waste-report",
        "Leftovers & Waste": "waste-report",
        "Equipment & Maintenance": "equipment-maintenance",
        "Equipment Maintenance": "equipment-maintenance",
        "Weekly Scorecard": "weekly-scorecard",
        "Training Evaluation": "training-evaluation",
        "Bagel Orders": "bagel-orders",
        "Pastry Orders": "pastry-orders",
        "Performance Evaluation": "performance-evaluation",
        "Weekly Deep Clean Checklist": "deep-clean",
        "Deep Clean Checklist": "deep-clean",
        "Weekly Deep Clean": "deep-clean",
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
      if (!submitterName || !String(submitterName).trim() || !reportType || !location || !reportDate) {
        return res
          .status(400)
          .json({ error: "Missing required fields (submitter name is required)" });
      }

      // ─── Normalize reportType to slug format ─────────────────────
      const REPORT_TYPE_MAP: Record<string, string> = {
        "Manager Checklist": "manager-checklist",
        "Operations Manager Checklist (Weekly Audit)": "ops-manager-checklist",
        "Ops. Mgr Weekly Audit": "ops-manager-checklist",
        "Store Manager Weekly Audit": "ops-manager-checklist",
        "Store Weekly Audit": "ops-manager-checklist",
        "Weekly Store Audit": "ops-manager-checklist",
        "Assistant Manager Checklist": "assistant-manager-checklist",
        "Leftovers & Waste Report": "waste-report",
        "Leftovers & Waste": "waste-report",
        "Equipment & Maintenance": "equipment-maintenance",
        "Equipment Maintenance": "equipment-maintenance",
        "Weekly Scorecard": "weekly-scorecard",
        "Training Evaluation": "training-evaluation",
        "Bagel Orders": "bagel-orders",
        "Pastry Orders": "pastry-orders",
        "Performance Evaluation": "performance-evaluation",
        "Weekly Deep Clean Checklist": "deep-clean",
        "Deep Clean Checklist": "deep-clean",
        "Weekly Deep Clean": "deep-clean",
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

      const { createReportSubmission, checkExistingReport, deleteReportSubmission, getDraft } = await import("../db");
      const { sendTeamsNotification } = await import(
        "../teamsNotify"
      );

      // Delete any existing draft for this location/type/date before submitting
      const existingDraft = await getDraft(normalizedLocation, normalizedReportType, reportDate);
      if (existingDraft) {
        await deleteReportSubmission(existingDraft.id);
      }

      // For Sales bagel orders, uniqueness is per client name (multiple clients per date)
      const isSalesBagelOrder = normalizedReportType === "bagel-orders" && normalizedLocation.toLowerCase() === "sales";
      const clientName = typeof data === "object" && data !== null ? data.clientName : undefined;

      if (isSalesBagelOrder && clientName) {
        // Check for existing Sales bagel order for the same client + date
        const { checkExistingSalesOrder } = await import("../db");
        const existingSalesOrder = await checkExistingSalesOrder(normalizedLocation, normalizedReportType, reportDate, clientName);
        if (existingSalesOrder) {
          if (!overwrite) {
            return res.status(409).json({
              error: "duplicate",
              message: `A ${reportType} for this client on ${reportDate} already exists.`,
              existing: { id: existingSalesOrder.id, submitterName: (existingSalesOrder as any).data?.submitterName || "Unknown", submittedAt: existingSalesOrder.createdAt },
            });
          }
          await deleteReportSubmission(existingSalesOrder.id);
        }
      } else {
        // Check for existing submitted report for the same store/type/date
        const existing = await checkExistingReport(normalizedLocation, normalizedReportType, reportDate);
        if (existing) {
          if (!overwrite) {
            return res.status(409).json({
              error: "duplicate",
              message: `A ${reportType} for ${location} on ${reportDate} has already been submitted.`,
              existing: { id: existing.id, submitterName: (existing as any).data?.submitterName || "Unknown", submittedAt: existing.createdAt },
            });
          }
          await deleteReportSubmission(existing.id);
        }
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

  // Public API endpoint for uploading photos (used by checklist forms)
  app.post("/api/public/upload-photo", async (req, res) => {
    try {
      const { base64, fileName, contentType } = req.body;
      if (!base64 || !fileName || !contentType) {
        return res.status(400).json({ error: "Missing required fields: base64, fileName, contentType" });
      }
      // Validate it's an image
      if (!contentType.startsWith("image/")) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }
      // Limit to 10MB
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large (max 10MB)" });
      }
      const { storagePut } = await import("../storage");
      const suffix = Math.random().toString(36).substring(2, 10);
      const ext = fileName.split(".").pop() || "jpg";
      const key = `checklist-photos/${Date.now()}-${suffix}.${ext}`;
      const { url } = await storagePut(key, buffer, contentType);
      console.log(`[Photo Upload] Uploaded ${key} (${(buffer.length / 1024).toFixed(1)}KB)`);
      res.json({ success: true, url });
    } catch (err) {
      console.error("[Photo Upload] Error:", err);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  // ─── Draft Save/Load API (server-side drafts for weekly checklists) ───

  app.post("/api/public/save-draft", async (req, res) => {
    try {
      const { submitterName, reportType, location, reportDate, data, totalScore } = req.body;
      if (!reportType || !location || !reportDate) {
        return res.status(400).json({ error: "Missing required fields: reportType, location, reportDate" });
      }

      // Normalize reportType and location (same maps as submit-report)
      const REPORT_TYPE_MAP: Record<string, string> = {
        "Manager Checklist": "manager-checklist",
        "Operations Manager Checklist (Weekly Audit)": "ops-manager-checklist",
        "Ops. Mgr Weekly Audit": "ops-manager-checklist",
        "Store Manager Weekly Audit": "ops-manager-checklist",
        "Store Weekly Audit": "ops-manager-checklist",
        "Weekly Store Audit": "ops-manager-checklist",
        "Assistant Manager Checklist": "assistant-manager-checklist",
        "Leftovers & Waste Report": "waste-report",
        "Leftovers & Waste": "waste-report",
        "Equipment & Maintenance": "equipment-maintenance",
        "Equipment Maintenance": "equipment-maintenance",
        "Weekly Scorecard": "weekly-scorecard",
        "Training Evaluation": "training-evaluation",
        "Bagel Orders": "bagel-orders",
        "Pastry Orders": "pastry-orders",
        "Performance Evaluation": "performance-evaluation",
        "Weekly Deep Clean Checklist": "deep-clean",
        "Deep Clean Checklist": "deep-clean",
        "Weekly Deep Clean": "deep-clean",
      };
      const normalizedReportType = REPORT_TYPE_MAP[reportType] || reportType;

      const LOCATION_MAP: Record<string, string> = {
        "President Kennedy": "PK", "president kennedy": "PK", "pk": "PK", "PK": "PK",
        "Mackay": "MK", "mackay": "MK", "mk": "MK", "MK": "MK",
        "Ontario": "ON", "ontario": "ON", "on": "ON", "ON": "ON",
        "Tunnel": "TN", "tunnel": "TN", "tn": "TN", "TN": "TN",
      };
      const normalizedLocation = LOCATION_MAP[location] || location;

      const enrichedData = typeof data === "object" && data !== null
        ? { ...data, submitterName: submitterName || data.submitterName }
        : { raw: data, submitterName };

      const { saveDraft } = await import("../db");
      const result = await saveDraft({
        location: normalizedLocation,
        reportType: normalizedReportType,
        reportDate,
        data: enrichedData,
        totalScore: totalScore || null,
        submitterName,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("[Public API] Save draft error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/public/draft", async (req, res) => {
    try {
      const { location, reportType, reportDate } = req.query as Record<string, string>;
      if (!location || !reportType || !reportDate) {
        return res.status(400).json({ error: "Missing required query params: location, reportType, reportDate" });
      }

      const REPORT_TYPE_MAP: Record<string, string> = {
        "Manager Checklist": "manager-checklist",
        "Store Weekly Checklist": "manager-checklist",
        "Store Weekly Audit": "ops-manager-checklist",
        "ops-manager-checklist": "ops-manager-checklist",
        "manager-checklist": "manager-checklist",
        "Weekly Deep Clean Checklist": "deep-clean",
        "deep-clean": "deep-clean",
      };
      const normalizedReportType = REPORT_TYPE_MAP[reportType] || reportType;

      const LOCATION_MAP: Record<string, string> = {
        "President Kennedy": "PK", "president kennedy": "PK", "pk": "PK", "PK": "PK",
        "Mackay": "MK", "mackay": "MK", "mk": "MK", "MK": "MK",
        "Ontario": "ON", "ontario": "ON", "on": "ON", "ON": "ON",
        "Tunnel": "TN", "tunnel": "TN", "tn": "TN", "TN": "TN",
      };
      const normalizedLocation = LOCATION_MAP[location] || location;

      const { getDraft } = await import("../db");
      const draft = await getDraft(normalizedLocation, normalizedReportType, reportDate);
      if (draft) {
        res.json({ success: true, draft });
      } else {
        res.json({ success: true, draft: null });
      }
    } catch (err) {
      console.error("[Public API] Get draft error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── Invoice API ───

  // Upload invoice photo + run OCR
  app.post("/api/public/invoices/upload", async (req, res) => {
    try {
      const { base64, fileName, contentType } = req.body;
      if (!base64 || !fileName || !contentType) {
        return res.status(400).json({ error: "Missing required fields: base64, fileName, contentType" });
      }
      if (!contentType.startsWith("image/")) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large (max 10MB)" });
      }
      // Upload to S3
      const { storagePut } = await import("../storage");
      const suffix = Math.random().toString(36).substring(2, 10);
      const ext = fileName.split(".").pop() || "jpg";
      const key = `invoices/${Date.now()}-${suffix}.${ext}`;
      const { url } = await storagePut(key, buffer, contentType);
      console.log(`[Invoice Upload] Uploaded ${key} (${(buffer.length / 1024).toFixed(1)}KB)`);

      // Run OCR
      let ocrData = null;
      try {
        const { extractInvoiceData } = await import("../invoiceOcr");
        ocrData = await extractInvoiceData(url);
        console.log(`[Invoice OCR] Extracted: vendor=${ocrData.vendorName}, total=${ocrData.total}`);
      } catch (ocrErr) {
        console.error("[Invoice OCR] Extraction failed:", ocrErr);
      }

      res.json({ success: true, photoUrl: url, photoKey: key, ocrData });
    } catch (err) {
      console.error("[Invoice Upload] Error:", err);
      res.status(500).json({ error: "Failed to upload invoice photo" });
    }
  });

  // Upload photo only (no OCR) — used by multi-page flow
  app.post("/api/public/invoices/upload-photo", async (req, res) => {
    try {
      const { base64, fileName, contentType } = req.body;
      if (!base64 || !fileName || !contentType) {
        return res.status(400).json({ error: "Missing required fields: base64, fileName, contentType" });
      }
      if (!contentType.startsWith("image/")) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large (max 10MB)" });
      }
      const { storagePut } = await import("../storage");
      const suffix = Math.random().toString(36).substring(2, 10);
      const ext = fileName.split(".").pop() || "jpg";
      const key = `invoices/${Date.now()}-${suffix}.${ext}`;
      const { url } = await storagePut(key, buffer, contentType);
      console.log(`[Invoice Upload] Uploaded ${key} (${(buffer.length / 1024).toFixed(1)}KB)`);
      res.json({ success: true, photoUrl: url, photoKey: key });
    } catch (err) {
      console.error("[Invoice Upload] Error:", err);
      res.status(500).json({ error: "Failed to upload invoice photo" });
    }
  });

  // Analyze multiple invoice pages with AI
  app.post("/api/public/invoices/analyze", async (req, res) => {
    try {
      const { imageUrls } = req.body;
      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "Missing required field: imageUrls (array of URLs)" });
      }
      if (imageUrls.length > 20) {
        return res.status(400).json({ error: "Too many pages (max 20)" });
      }
      const { extractInvoiceDataMultiPage } = await import("../invoiceOcr");
      const ocrData = await extractInvoiceDataMultiPage(imageUrls);
      console.log(`[Invoice OCR] Multi-page (${imageUrls.length} pages): vendor=${ocrData.vendorName}, total=${ocrData.total}`);
      res.json({ success: true, ocrData });
    } catch (err) {
      console.error("[Invoice Analyze] Error:", err);
      res.status(500).json({ error: "Failed to analyze invoice" });
    }
  });

  // Create invoice record
  app.post("/api/public/invoices", async (req, res) => {
    try {
      const { storeCode, vendorName, invoiceNumber, invoiceDate, lineItems, subtotal, tax, total, photoUrl, photoUrls, photoKey, ocrRawData, verifiedBy, notes, category } = req.body;
      if (!storeCode || !vendorName || !photoUrl || !verifiedBy) {
        return res.status(400).json({ error: "Missing required fields: storeCode, vendorName, photoUrl, verifiedBy" });
      }
      const { createInvoice } = await import("../db");
      const id = await createInvoice({
        storeCode,
        vendorName,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: invoiceDate || null,
        lineItems: lineItems || null,
        subtotal: subtotal || null,
        tax: tax || null,
        total: total || null,
        photoUrl,
        photoUrls: photoUrls || null,
        photoKey: photoKey || null,
        ocrRawData: ocrRawData || null,
        category: category || "cogs",
        verifiedBy,
        notes: notes || null,
      });
      console.log(`[Invoice] Created #${id} for ${storeCode} from ${vendorName} by ${verifiedBy} (category: ${category || 'cogs'})`);
      res.json({ success: true, id });
    } catch (err) {
      console.error("[Invoice] Create error:", err);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // List invoices with optional filters
  app.get("/api/public/invoices", async (req, res) => {
    try {
      const { storeCode, vendorName, fromDate, toDate, status } = req.query as Record<string, string>;
      const { getAllInvoices } = await import("../db");
      const invoices = await getAllInvoices({ storeCode, vendorName, fromDate, toDate, status });
      res.json({ success: true, invoices });
    } catch (err) {
      console.error("[Invoice] List error:", err);
      res.status(500).json({ error: "Failed to list invoices" });
    }
  });

  // Get single invoice
  app.get("/api/public/invoices/:id", async (req, res) => {
    try {
      const { getInvoiceById } = await import("../db");
      const invoice = await getInvoiceById(parseInt(req.params.id));
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json({ success: true, invoice });
    } catch (err) {
      console.error("[Invoice] Get error:", err);
      res.status(500).json({ error: "Failed to get invoice" });
    }
  });

  // ─── Report Notes & Flags ───

  app.get("/api/public/reports/:id/notes", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) return res.status(400).json({ error: "Invalid report ID" });
      const { getReportNotes } = await import("../db");
      const notes = await getReportNotes(reportId);
      // Filter out flag-only entries for the notes list
      const realNotes = notes.filter(n => n.note !== "__FLAG__");
      const flagEntry = notes.find(n => n.note === "__FLAG__");
      res.json({ success: true, notes: realNotes, flag: flagEntry?.flagType || "none" });
    } catch (err) {
      console.error("[ReportNotes] Get error:", err);
      res.status(500).json({ error: "Failed to get notes" });
    }
  });

  app.post("/api/public/reports/:id/notes", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) return res.status(400).json({ error: "Invalid report ID" });
      const { note, createdBy } = req.body;
      if (!note || !note.trim()) return res.status(400).json({ error: "Note text is required" });
      if (!createdBy || !createdBy.trim()) return res.status(400).json({ error: "Author name is required" });
      const { createReportNote } = await import("../db");
      const result = await createReportNote({ reportId, note: note.trim(), createdBy: createdBy.trim(), flagType: "none" });
      res.json({ success: true, id: result.id });
    } catch (err) {
      console.error("[ReportNotes] Create error:", err);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  app.put("/api/public/report-notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid note ID" });
      const { note } = req.body;
      if (!note || !note.trim()) return res.status(400).json({ error: "Note text is required" });
      const { updateReportNote } = await import("../db");
      await updateReportNote(id, { note: note.trim() });
      res.json({ success: true });
    } catch (err) {
      console.error("[ReportNotes] Update error:", err);
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  app.delete("/api/public/report-notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid note ID" });
      const { deleteReportNote } = await import("../db");
      await deleteReportNote(id);
      res.json({ success: true });
    } catch (err) {
      console.error("[ReportNotes] Delete error:", err);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  app.post("/api/public/reports/:id/flag", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) return res.status(400).json({ error: "Invalid report ID" });
      const { flagType, createdBy } = req.body;
      if (!flagType) return res.status(400).json({ error: "Flag type is required" });
      if (!createdBy || !createdBy.trim()) return res.status(400).json({ error: "Author name is required" });
      const { setReportFlag } = await import("../db");
      await setReportFlag(reportId, flagType, createdBy.trim());
      res.json({ success: true });
    } catch (err) {
      console.error("[ReportNotes] Flag error:", err);
      res.status(500).json({ error: "Failed to set flag" });
    }
  });

  app.post("/api/public/reports/flags", async (req, res) => {
    try {
      const { reportIds } = req.body;
      if (!Array.isArray(reportIds)) return res.status(400).json({ error: "reportIds must be an array" });
      const { getReportFlags } = await import("../db");
      const flags = await getReportFlags(reportIds);
      res.json({ success: true, flags });
    } catch (err) {
      console.error("[ReportNotes] Flags error:", err);
      res.status(500).json({ error: "Failed to get flags" });
    }
  });

  // ─── COGS Summary (Invoice totals by store for date range) ─────
  app.get("/api/public/cogs-summary", async (req, res) => {
    try {
      const { fromDate, toDate } = req.query as Record<string, string>;
      const { getAllInvoices } = await import("../db");
      const invoices = await getAllInvoices({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: "verified",
      });

      // Only include COGS-category invoices
      const cogsInvoices = invoices.filter((inv: any) => !inv.category || inv.category === "cogs");

      // Group by store
      const byStore: Record<string, { total: number; count: number; invoices: any[] }> = {};
      for (const inv of cogsInvoices) {
        const code = inv.storeCode;
        if (!byStore[code]) byStore[code] = { total: 0, count: 0, invoices: [] };
        byStore[code].total += inv.total || 0;
        byStore[code].count++;
        byStore[code].invoices.push({
          id: inv.id,
          vendorName: inv.vendorName,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          total: inv.total,
        });
      }

      const totalCogs = cogsInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      res.json({
        success: true,
        totalCogs,
        totalInvoices: cogsInvoices.length,
        byStore,
      });
    } catch (err) {
      console.error("[COGS] Summary error:", err);
      res.status(500).json({ error: "Failed to get COGS summary" });
    }
  });

  // ─── Active Alerts (Real-time) ─────────────────────────────────
  app.get("/api/public/active-alerts", async (_req, res) => {
    try {
      const { getReportsByDateRange, getKoomiSalesByDateRange, getSevenShiftsSalesByDateRange, getExcelLabourByDateRange } = await import("../db");

      // Compute current week range (Monday 00:00 to Friday 23:59 in ET)
      const now = new Date();
      const etDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
      const dayOfWeek = etDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

      // Find this week's Monday
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(etDate);
      monday.setDate(etDate.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      const today = etDate.toISOString().slice(0, 10);
      const mondayStr = monday.toISOString().slice(0, 10);
      const fridayStr = friday.toISOString().slice(0, 10);

      // Store config with closing hours (EST)
      const STORES = [
        { id: "pk", code: "PK", name: "President Kennedy", shortName: "PK", labourTarget: 18, koomiId: "1037", closingHour: 18 },
        { id: "mk", code: "MK", name: "Mackay", shortName: "MK", labourTarget: 23, koomiId: "2207", closingHour: 17 },
        { id: "ontario", code: "ON", name: "Ontario", shortName: "ON", labourTarget: 28, closingHour: 15 },
        { id: "tunnel", code: "TN", name: "Cathcart (Tunnel)", shortName: "TN", labourTarget: 24, koomiId: "1036", closedWeekends: true, closingHour: 14 },
      ];

      // Current hour in ET for closing-time checks
      const currentEstHour = etDate.getHours();

      const alerts: Array<{ id: string; type: "critical" | "warning" | "info" | "success"; message: string; store: string; category: string; timestamp: string }> = [];

      // 1. Fetch all reports for this week
      const weekReports = await getReportsByDateRange(mondayStr, fridayStr);

      // 2. Check: Ops Manager weekly audit (ops-manager-checklist) for each store this week
      for (const store of STORES) {
        const hasAudit = weekReports.some(
          r => r.location === store.code && r.reportType === "ops-manager-checklist"
        );
        if (!hasAudit) {
          alerts.push({
            id: `audit-${store.id}`,
            type: "warning",
            message: `Ops Manager has not completed the weekly audit for ${store.name}`,
            store: store.id,
            category: "missing-audit",
            timestamp: now.toISOString(),
          });
        }
      }

      // 3. Check: Leftovers & Waste Report (waste-report) for today
      // Only show alert AFTER the store's closing time
      const todayReports = weekReports.filter(r => r.reportDate === today);
      for (const store of STORES) {
        // Skip weekend-closed stores on weekends
        if (store.closedWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
        // Only flag as missing after the store has closed
        if (currentEstHour < store.closingHour) continue;
        const hasWasteReport = todayReports.some(
          r => r.location === store.code && r.reportType === "waste-report"
        );
        if (!hasWasteReport) {
          alerts.push({
            id: `daily-${store.id}`,
            type: "critical",
            message: `${store.name} has not submitted today's Leftovers & Waste Report`,
            store: store.id,
            category: "missing-daily",
            timestamp: now.toISOString(),
          });
        }
      }

      // 4. Check: Store Weekly Checklist (manager-checklist) this week
      for (const store of STORES) {
        const hasWeeklyChecklist = weekReports.some(
          r => r.location === store.code && r.reportType === "manager-checklist"
        );
        if (!hasWeeklyChecklist) {
          alerts.push({
            id: `weekly-${store.id}`,
            type: "info",
            message: `${store.name} has not submitted the Store Weekly Checklist this week`,
            store: store.id,
            category: "missing-weekly",
            timestamp: now.toISOString(),
          });
        }
      }

      // 5. Check: Weekly Deep Clean (due every Wednesday)
      const isWednesdayOrLater = dayOfWeek >= 3 || dayOfWeek === 0; // Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
      if (isWednesdayOrLater) {
        for (const store of STORES) {
          const hasDeepClean = weekReports.some(
            r => r.location === store.code && (r.reportType === "deep-clean" || r.reportType === "Weekly Deep Clean Checklist")
          );
          if (!hasDeepClean) {
            alerts.push({
              id: `deepclean-${store.id}`,
              type: "critical",
              message: `${store.name} has not submitted the Weekly Deep Clean (due every Wednesday)`,
              store: store.id,
              category: "missing-deepclean",
              timestamp: now.toISOString(),
            });
          }
        }
      } else {
        // Before Wednesday, show as info reminder
        for (const store of STORES) {
          const hasDeepClean = weekReports.some(
            r => r.location === store.code && (r.reportType === "deep-clean" || r.reportType === "Weekly Deep Clean Checklist")
          );
          if (!hasDeepClean) {
            alerts.push({
              id: `deepclean-${store.id}`,
              type: "info",
              message: `${store.name} — Weekly Deep Clean not yet submitted (due Wednesday)`,
              store: store.id,
              category: "missing-deepclean",
              timestamp: now.toISOString(),
            });
          }
        }
      }

      // 6. Check: High labour % (real-time from today's data)
      const koomiData = await getKoomiSalesByDateRange(today, today);
      const sevenData = await getSevenShiftsSalesByDateRange(today, today);
      const excelData = await getExcelLabourByDateRange(today, today);

      for (const store of STORES) {
        let labourPercent = 0;
        let netSales = 0;
        let hasData = false;

        // Koomi data
        if (store.koomiId) {
          const koomiRow = koomiData.find((k: any) => k.koomiLocationId === store.koomiId);
          if (koomiRow) {
            netSales = Number(koomiRow.netSales) || 0;
            labourPercent = Number(koomiRow.labourPercent) || 0;
            hasData = true;
          }
        }

        // 7shifts data (Ontario)
        if (store.id === "ontario") {
          const sevenRow = sevenData.find((s: any) => s.date === today);
          if (sevenRow) {
            netSales = Number(sevenRow.totalSales) || 0;
            labourPercent = Number(sevenRow.labourPercent) || 0;
            hasData = true;
          }
        }

        // Excel override
        const excelRow = excelData.find((e: any) => e.storeId === store.id);
        if (excelRow) {
          if (Number(excelRow.netSales) > 0) netSales = Number(excelRow.netSales);
          if (Number(excelRow.labourPercent) > 0) labourPercent = Number(excelRow.labourPercent);
          hasData = true;
        }

        if (hasData && labourPercent > store.labourTarget) {
          const overBy = (labourPercent - store.labourTarget).toFixed(1);
          const severity = labourPercent > store.labourTarget + 10 ? "critical" : "warning";
          alerts.push({
            id: `labour-${store.id}`,
            type: severity,
            message: `${store.name} labour at ${labourPercent.toFixed(1)}% — ${overBy}% over target (${store.labourTarget}%)`,
            store: store.id,
            category: "high-labour",
            timestamp: now.toISOString(),
          });
        } else if (hasData && labourPercent > 0 && labourPercent <= store.labourTarget) {
          alerts.push({
            id: `labour-ok-${store.id}`,
            type: "success",
            message: `${store.name} labour at ${labourPercent.toFixed(1)}% — below target (${store.labourTarget}%)`,
            store: store.id,
            category: "labour-ok",
            timestamp: now.toISOString(),
          });
        }
      }

      // Sort: critical first, then warning, info, success
      const priority = { critical: 0, warning: 1, info: 2, success: 3 };
      alerts.sort((a, b) => priority[a.type] - priority[b.type]);

      res.json({
        success: true,
        alerts,
        weekRange: { from: mondayStr, to: fridayStr },
        today,
        generatedAt: now.toISOString(),
      });
    } catch (err) {
      console.error("[ActiveAlerts] Error:", err);
      res.status(500).json({ error: "Failed to compute alerts" });
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
              labourPercent: day.labor_percent * 100,
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

  // ─── Daily Sales & Labour Report (8 PM) ──────────────────────
  async function sendDailyReport() {
    console.log(`[DailyReport] Building daily sales & labour report...`);
    try {
      const { listWebhooks, getKoomiSalesByDateRange, getSevenShiftsSalesByDateRange, getExcelLabourByDateRange } = await import("../db");
      const { sendDailySalesLabourReport } = await import("../teams");
      const { createAlertHistoryEntry } = await import("../db");
      type StoreReportType = import("../teams").StoreReport;

      // Get today's date in EST
      const now = new Date();
      const estDate = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" }); // YYYY-MM-DD
      const displayDate = now.toLocaleDateString("en-US", { timeZone: "America/Toronto", year: "numeric", month: "long", day: "2-digit" });

      // Store config (server-side mirror of client/src/lib/data.ts)
      const STORES = [
        { id: "tunnel", name: "Cathcart (Tunnel)", labourTarget: 24, koomiId: "1036" },
        { id: "ontario", name: "Ontario", labourTarget: 28 },
        { id: "mk", name: "Mackay", labourTarget: 23, koomiId: "2207" },
        { id: "pk", name: "President Kennedy", labourTarget: 18, koomiId: "1037" },
      ];

      // Fetch data from all sources
      const koomiData = await getKoomiSalesByDateRange(estDate, estDate);
      const sevenData = await getSevenShiftsSalesByDateRange(estDate, estDate);
      const excelData = await getExcelLabourByDateRange(estDate, estDate);

      const storeReports: StoreReportType[] = [];

      for (const store of STORES) {
        let netSales = 0;
        let labourPercent = 0;
        let hasData = false;

        // Koomi data (PK, Mackay, Tunnel)
        if (store.koomiId) {
          const koomiRow = koomiData.find(k => k.koomiLocationId === store.koomiId);
          if (koomiRow) {
            netSales = Number(koomiRow.netSales) || 0;
            labourPercent = Number(koomiRow.labourPercent) || 0;
            hasData = true;
          }
        }

        // 7shifts data (Ontario)
        if (store.id === "ontario") {
          const sevenRow = sevenData.find(s => s.date === estDate);
          if (sevenRow) {
            netSales = Number(sevenRow.totalSales) || 0;
            labourPercent = Number(sevenRow.labourPercent) || 0;
            hasData = true;
          }
        }

        // Excel labour data override (if available, more accurate)
        const excelRow = excelData.find(e => e.storeId === store.id);
        if (excelRow) {
          if (Number(excelRow.netSales) > 0) netSales = Number(excelRow.netSales);
          if (Number(excelRow.labourPercent) > 0) labourPercent = Number(excelRow.labourPercent);
          hasData = true;
        }

        if (hasData) {
          storeReports.push({
            storeName: store.name,
            netSales,
            labourPercent,
            labourTarget: store.labourTarget,
          });
        }
      }

      if (storeReports.length === 0) {
        console.log("[DailyReport] No store data available for today, skipping report.");
        return;
      }

      // Send to Teams group chat via Graph API
      const { sendDailyReportToChat } = await import("../teamsChat");
      const chatResult = await sendDailyReportToChat(displayDate, storeReports);
      console.log(`[DailyReport] Teams chat (TRD Management): ${chatResult.success ? "OK" : chatResult.error}`);

      await createAlertHistoryEntry({
        webhookId: null,
        alertType: "daily-sales-labour-report",
        title: `Daily Sales & Labour Report`,
        severity: "info",
        message: `Daily report for ${displayDate}: ${storeReports.length} stores, $${storeReports.reduce((s, r) => s + r.netSales, 0).toFixed(2)} total sales`,
        delivered: chatResult.success,
        errorMessage: chatResult.error || null,
      });

      // Also send to webhook(s) if configured
      const webhooks = await listWebhooks();
      const activeWebhooks = webhooks.filter(w => w.isActive);

      for (const webhook of activeWebhooks) {
        const result = await sendDailySalesLabourReport(webhook.webhookUrl, displayDate, storeReports);
        console.log(`[DailyReport] Sent to webhook ${webhook.id} (${webhook.name}): ${result.success ? "OK" : result.error}`);

        await createAlertHistoryEntry({
          webhookId: webhook.id,
          alertType: "daily-sales-labour-report",
          title: `Daily Sales & Labour Report`,
          severity: "info",
          message: `Daily report for ${displayDate}: ${storeReports.length} stores, $${storeReports.reduce((s, r) => s + r.netSales, 0).toFixed(2)} total sales`,
          delivered: result.success,
          errorMessage: result.error || null,
        });
      }

      console.log(`[DailyReport] Completed. Sent to Teams chat + ${activeWebhooks.length} webhook(s).`);
    } catch (err: any) {
      console.error("[DailyReport] Failed:", err.message);
    }
  }

  // ─── High Labour Alert (after each sync) ─────────────────────
  async function checkHighLabourAlerts() {
    console.log(`[LabourAlert] Checking labour thresholds...`);
    try {
      const { getKoomiSalesByDateRange, getSevenShiftsSalesByDateRange, getExcelLabourByDateRange, createAlertHistoryEntry } = await import("../db");
      const { sendAllLabourAlerts } = await import("../teamsChat");

      const now = new Date();
      const estDate = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
      const displayDate = now.toLocaleDateString("en-US", { timeZone: "America/Toronto", year: "numeric", month: "long", day: "2-digit" });

      const STORES = [
        { id: "tunnel", name: "Cathcart (Tunnel)", labourTarget: 24, koomiId: "1036" },
        { id: "ontario", name: "Ontario", labourTarget: 28 },
        { id: "mk", name: "Mackay", labourTarget: 23, koomiId: "2207" },
        { id: "pk", name: "President Kennedy", labourTarget: 18, koomiId: "1037" },
      ];

      const koomiData = await getKoomiSalesByDateRange(estDate, estDate);
      const sevenData = await getSevenShiftsSalesByDateRange(estDate, estDate);
      const excelData = await getExcelLabourByDateRange(estDate, estDate);

      const storesAboveTarget: Array<{ storeId: string; storeName: string; labourPercent: number; labourTarget: number; netSales: number; labourCost: number }> = [];

      for (const store of STORES) {
        let netSales = 0;
        let labourPercent = 0;
        let hasData = false;

        if (store.koomiId) {
          const koomiRow = koomiData.find(k => k.koomiLocationId === store.koomiId);
          if (koomiRow) {
            netSales = Number(koomiRow.netSales) || 0;
            labourPercent = Number(koomiRow.labourPercent) || 0;
            hasData = true;
          }
        }
        if (store.id === "ontario") {
          const sevenRow = sevenData.find(s => s.date === estDate);
          if (sevenRow) {
            netSales = Number(sevenRow.totalSales) || 0;
            labourPercent = Number(sevenRow.labourPercent) || 0;
            hasData = true;
          }
        }
        const excelRow = excelData.find(e => e.storeId === store.id);
        if (excelRow) {
          if (Number(excelRow.netSales) > 0) netSales = Number(excelRow.netSales);
          if (Number(excelRow.labourPercent) > 0) labourPercent = Number(excelRow.labourPercent);
          hasData = true;
        }

        if (!hasData || labourPercent <= store.labourTarget) continue;

        const labourCost = (labourPercent / 100) * netSales;
        storesAboveTarget.push({
          storeId: store.id,
          storeName: store.name,
          labourPercent,
          labourTarget: store.labourTarget,
          netSales,
          labourCost,
        });
      }

      if (storesAboveTarget.length === 0) {
        console.log("[LabourAlert] No stores above target. No alerts sent.");
        return;
      }

      // Send all alerts: TRD gets all, each store gets its own
      const results = await sendAllLabourAlerts(displayDate, storesAboveTarget);

      for (const store of storesAboveTarget) {
        console.log(`[LabourAlert] ${store.storeName}: ${store.labourPercent.toFixed(1)}% > ${store.labourTarget}%`);
        await createAlertHistoryEntry({
          webhookId: null,
          alertType: "high-labour",
          title: `High Labour Alert \u2014 ${store.storeName}`,
          severity: store.labourPercent > store.labourTarget + 10 ? "critical" : "warning",
          message: `${store.storeName}: Labour ${store.labourPercent.toFixed(1)}% exceeds target ${store.labourTarget}%`,
          delivered: true,
          errorMessage: null,
        });
      }

      console.log(`[LabourAlert] Sent ${storesAboveTarget.length} alert(s) to Teams chats.`);
    } catch (err: any) {
      console.error("[LabourAlert] Failed:", err.message);
    }
  }

  // ─── Waste Report Closing-Time Alerts ─────────────────────────
  // Each store gets a reminder at their closing time if they haven't submitted
  // their Leftovers & Waste Report for today. A follow-up is sent 30 min later.
  const WASTE_ALERT_STORES = [
    { id: "tunnel", code: "TN", name: "Cathcart (Tunnel)", closingHour: 14, closedWeekends: true },
    { id: "ontario", code: "ON", name: "Ontario", closingHour: 15 },
    { id: "mk", code: "MK", name: "Mackay", closingHour: 17 },
    { id: "pk", code: "PK", name: "President Kennedy", closingHour: 18 },
  ];

  async function checkWasteReportForStore(
    store: typeof WASTE_ALERT_STORES[number],
    isFollowUp: boolean
  ) {
    try {
      const { getReportsByDateRange, createAlertHistoryEntry } = await import("../db");
      const { sendChatMessage, TEAMS_CHAT_IDS, STORE_TO_CHAT } = await import("../teamsChat");

      const now = new Date();
      const estDate = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

      // Check if waste report already submitted for today
      const todayReports = await getReportsByDateRange(estDate, estDate);
      const hasWasteReport = todayReports.some(
        (r: any) => r.location === store.code && r.reportType === "waste-report"
      );

      if (hasWasteReport) {
        console.log(`[WasteAlert] ${store.name}: Already submitted waste report for ${estDate}. Skipping.`);
        return;
      }

      // Build the alert message
      const closingTimeStr = store.closingHour <= 12
        ? `${store.closingHour}:00 PM`
        : store.closingHour === 12 ? "12:00 PM"
        : `${store.closingHour > 12 ? store.closingHour - 12 : store.closingHour}:00 PM`;

      const alertEmoji = isFollowUp ? "\u{1F6A8}" : "\u{1F4CB}";
      const urgency = isFollowUp ? "OVERDUE" : "REMINDER";
      const severity: "critical" | "warning" = isFollowUp ? "critical" : "warning";

      let html = `${alertEmoji} <b>Leftovers & Waste Report — ${urgency}</b><br><br>`;
      html += `<b>Store:</b> ${store.name}<br>`;
      html += `<b>Date:</b> ${estDate}<br>`;
      html += `<b>Store Closing:</b> ${closingTimeStr} EST<br><br>`;

      if (isFollowUp) {
        html += `<b>\u{26A0}\u{FE0F} This report is now overdue.</b> The store closed 30 minutes ago and the Leftovers & Waste form has not been submitted.<br><br>`;
        html += `Please complete and submit the form immediately.`;
      } else {
        html += `It's closing time! Please complete the <b>Leftovers & Waste</b> form before leaving.<br><br>`;
        html += `A follow-up alert will be sent in 30 minutes if the form is not submitted.`;
      }

      // Send to the store-specific chat
      const storeChatKey = STORE_TO_CHAT[store.id];
      if (storeChatKey) {
        console.log(`[WasteAlert] Sending ${urgency} to ${store.name} chat...`);
        await sendChatMessage(TEAMS_CHAT_IDS[storeChatKey], html);
      }

      // Send to TRD Management
      console.log(`[WasteAlert] Sending ${urgency} for ${store.name} to TRD Management...`);
      await sendChatMessage(TEAMS_CHAT_IDS.trd, html);

      // Log to alert history
      await createAlertHistoryEntry({
        webhookId: null,
        alertType: isFollowUp ? "waste-overdue" : "waste-reminder",
        title: `Leftovers & Waste ${urgency} \u2014 ${store.name}`,
        severity,
        message: `${store.name} has not submitted the Leftovers & Waste Report (closing time: ${closingTimeStr})`,
        storeId: store.id,
        delivered: true,
        errorMessage: null,
      });

      console.log(`[WasteAlert] ${store.name}: ${urgency} alert sent successfully`);
    } catch (err: any) {
      console.error(`[WasteAlert] ${store.name}: Failed to send alert:`, err.message);
    }
  }

  // ─── Schedule: Daily Report at 8 PM + Labour Alerts + Waste Alerts ─
  const reportLog = new Set<string>();

  setInterval(() => {
    const now = new Date();
    // Use EST timezone
    const estHour = parseInt(now.toLocaleString("en-US", { timeZone: "America/Toronto", hour: "numeric", hour12: false }));
    const estMin = parseInt(now.toLocaleString("en-US", { timeZone: "America/Toronto", minute: "numeric" }));
    const estDate = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
    const dayOfWeek = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" })).getDay();
    const reportKey = `report-${estDate}`;

    // Daily report at 8 PM EST
    if (estHour === 20 && estMin === 0 && !reportLog.has(reportKey)) {
      reportLog.add(reportKey);
      sendDailyReport();
    }

    // Labour alert check at 8 PM EST (same time as daily report)
    const labourKey = `labour-${estDate}`;
    if (estHour === 20 && estMin === 0 && !reportLog.has(labourKey)) {
      reportLog.add(labourKey);
      checkHighLabourAlerts();
    }

    // ─── Waste Report Alerts: At each store's closing time + 30 min follow-up ───
    for (const store of WASTE_ALERT_STORES) {
      // Skip weekend-closed stores on weekends
      if (store.closedWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

      // First reminder: at closing time (e.g., 14:00 for Tunnel)
      const reminderKey = `waste-${store.id}-${estDate}`;
      if (estHour === store.closingHour && estMin === 0 && !reportLog.has(reminderKey)) {
        reportLog.add(reminderKey);
        checkWasteReportForStore(store, false);
      }

      // Follow-up: 30 minutes after closing (e.g., 14:30 for Tunnel)
      const followUpKey = `waste-followup-${store.id}-${estDate}`;
      if (estHour === store.closingHour && estMin === 30 && !reportLog.has(followUpKey)) {
        reportLog.add(followUpKey);
        checkWasteReportForStore(store, true);
      }
    }

    // Clean up old entries
    Array.from(reportLog).forEach(entry => {
      if (!entry.includes(estDate)) reportLog.delete(entry);
    });
  }, 30_000);

  console.log("[Schedule] Daily report at 8PM + Labour alerts at 8PM + Waste alerts at store closing times (TN:2PM, ON:3PM, MK:5PM, PK:6PM)");
}

startServer().catch(console.error);
