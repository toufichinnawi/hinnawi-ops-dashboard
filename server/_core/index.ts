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

      const { createReportSubmission } = await import("../db");
      const { sendTeamsNotification } = await import(
        "../teamsNotify"
      );
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
}

startServer().catch(console.error);
