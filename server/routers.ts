import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getReportsByDateRange, updateReportSubmission, deleteReportSubmission, getReportById,
  listWebhooks, getWebhookById, createWebhook, updateWebhook, deleteWebhook,
  listAlertRules, createAlertRule, updateAlertRule, deleteAlertRule,
  listAlertHistory, createAlertHistoryEntry,
  listCloverConnections, getCloverConnectionById, getCloverConnectionByMerchantId,
  createCloverConnection, updateCloverConnection, deleteCloverConnection,
  upsertCloverDailySales, getAllCloverSales, getCloverSalesByConnection, getCloverSalesByDateRange,
  upsertCloverShift, getAllCloverShifts,
  listSevenShiftsConnections, getSevenShiftsConnectionById, getSevenShiftsConnectionByLocationId,
  createSevenShiftsConnection, updateSevenShiftsConnection, deleteSevenShiftsConnection,
  upsertSevenShiftsDailySales, getAllSevenShiftsSales, getSevenShiftsSalesByDateRange,
  getSevenShiftsSalesByConnection,
  bulkUpsertExcelLabourData, getAllExcelLabourData, getExcelLabourByDateRange,
  getExcelLabourByStore, deleteAllExcelLabourData,
  getLatestExcelSyncMeta, createExcelSyncMeta,
  createReportSubmission, getReportsByUser, getAllReports,
  getAllStorePins, upsertStorePin, verifyStorePin, getActiveStorePinsPublic,
  getAllPositionPins, upsertPositionPin, verifyPositionPin, getActivePositionPinsPublic, seedDefaultPositionPins,
  getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
  getVendors, createVendor, updateVendor, deleteVendor,
  getExpenses, createExpense, updateExpense, deleteExpense, getExpensesByMonth,
  getCogsTargets, upsertCogsTarget,
  getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  getInventoryCounts, bulkUpsertInventoryCounts,
  getAllUsers, updateUserRole,
  upsertKoomiDailySales, getAllKoomiSales, getKoomiSalesByStore, getKoomiSalesByDateRange,
  getActiveQboToken, updateQboToken, deleteQboToken, upsertQboCogs, getQboCogsByDateRange, getAllQboCogs,
} from "./db";
import { parseExcelBuffer } from "./excelParser";
import { sendTeamsNotification } from "./teamsNotify";
import { sendTeamsAlert, testWebhookConnection, buildLabourAlert, buildReportOverdueAlert, buildSalesDropAlert, buildDailySummaryAlert } from "./teams";
import type { AlertPayload } from "./teams";
import {
  getCloverAuthUrl, exchangeCloverCode, fetchMerchantInfo,
  fetchPayments, fetchShifts, aggregatePaymentsByDay, aggregateShifts, getDateRange,
} from "./clover";
import {
  fetchCompanies, fetchLocations, fetchDailySalesAndLabor, getDateRangeStrings,
} from "./sevenShifts";
import {
  scrapeAllStores, scrapeMultipleDays, KOOMI_STORES, koomiLogin, getTodayEST,
} from "./koomi";
import {
  refreshAccessToken, syncQboCogs,
} from "./quickbooks";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Teams Webhooks ────────────────────────────────────────────
  webhooks: router({
    list: protectedProcedure.query(async () => {
      return listWebhooks();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        webhookUrl: z.string().url(),
        channelName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createWebhook({
          name: input.name,
          webhookUrl: input.webhookUrl,
          channelName: input.channelName ?? null,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        webhookUrl: z.string().url().optional(),
        channelName: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateWebhook(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteWebhook(input.id);
        return { success: true };
      }),

    test: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const webhook = await getWebhookById(input.id);
        if (!webhook) throw new Error("Webhook not found");

        const result = await testWebhookConnection(webhook.webhookUrl);

        await updateWebhook(input.id, {
          lastTestedAt: new Date(),
          lastTestSuccess: result.success,
        });

        return result;
      }),

    testUrl: protectedProcedure
      .input(z.object({ webhookUrl: z.string().url() }))
      .mutation(async ({ input }) => {
        return testWebhookConnection(input.webhookUrl);
      }),
  }),

  // ─── Alert Rules ───────────────────────────────────────────────
  alertRules: router({
    list: protectedProcedure.query(async () => {
      return listAlertRules();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["labour_threshold", "report_overdue", "sales_drop", "custom"]),
        webhookId: z.number(),
        threshold: z.number().optional(),
        config: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        await createAlertRule({
          name: input.name,
          type: input.type,
          webhookId: input.webhookId,
          threshold: input.threshold ?? null,
          config: input.config ?? null,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
        threshold: z.number().optional(),
        config: z.any().optional(),
        webhookId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateAlertRule(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAlertRule(input.id);
        return { success: true };
      }),
  }),

  // ─── Alert History ─────────────────────────────────────────────
  alertHistory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ input }) => {
        return listAlertHistory(input?.limit ?? 50);
      }),
  }),

  // ─── Send Alert (manual trigger or from dashboard) ─────────────
  alerts: router({
    send: protectedProcedure
      .input(z.object({
        webhookId: z.number(),
        title: z.string(),
        message: z.string(),
        severity: z.enum(["critical", "warning", "info", "success"]),
        storeName: z.string().optional(),
        metric: z.string().optional(),
        currentValue: z.string().optional(),
        threshold: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const webhook = await getWebhookById(input.webhookId);
        if (!webhook) throw new Error("Webhook not found");
        if (!webhook.isActive) throw new Error("Webhook is disabled");

        const payload: AlertPayload = {
          title: input.title,
          message: input.message,
          severity: input.severity,
          storeName: input.storeName,
          metric: input.metric,
          currentValue: input.currentValue,
          threshold: input.threshold,
        };

        const result = await sendTeamsAlert(webhook.webhookUrl, payload);

        await createAlertHistoryEntry({
          webhookId: webhook.id,
          alertType: "manual",
          title: input.title,
          message: input.message,
          storeId: input.storeName ?? null,
          severity: input.severity,
          delivered: result.success,
          errorMessage: result.error ?? null,
        });

        return result;
      }),

    sendLabourAlert: protectedProcedure
      .input(z.object({
        webhookId: z.number(),
        storeName: z.string(),
        labourPercent: z.number(),
        threshold: z.number(),
      }))
      .mutation(async ({ input }) => {
        const webhook = await getWebhookById(input.webhookId);
        if (!webhook) throw new Error("Webhook not found");

        const payload = buildLabourAlert(input.storeName, input.labourPercent, input.threshold);
        const result = await sendTeamsAlert(webhook.webhookUrl, payload);

        await createAlertHistoryEntry({
          webhookId: webhook.id,
          alertType: "labour_threshold",
          title: payload.title,
          message: payload.message,
          storeId: input.storeName,
          severity: payload.severity,
          delivered: result.success,
          errorMessage: result.error ?? null,
        });

        return result;
      }),

    sendReportOverdue: protectedProcedure
      .input(z.object({
        webhookId: z.number(),
        storeName: z.string(),
        reportType: z.string(),
        managerName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const webhook = await getWebhookById(input.webhookId);
        if (!webhook) throw new Error("Webhook not found");

        const payload = buildReportOverdueAlert(input.storeName, input.reportType, input.managerName);
        const result = await sendTeamsAlert(webhook.webhookUrl, payload);

        await createAlertHistoryEntry({
          webhookId: webhook.id,
          alertType: "report_overdue",
          title: payload.title,
          message: payload.message,
          storeId: input.storeName,
          severity: payload.severity,
          delivered: result.success,
          errorMessage: result.error ?? null,
        });

        return result;
      }),

    sendDailySummary: protectedProcedure
      .input(z.object({
        webhookId: z.number(),
        totalSales: z.number(),
        avgLabourPercent: z.number(),
        reportsSubmitted: z.number(),
        totalReports: z.number(),
        storeCount: z.number(),
      }))
      .mutation(async ({ input }) => {
        const webhook = await getWebhookById(input.webhookId);
        if (!webhook) throw new Error("Webhook not found");

        const payload = buildDailySummaryAlert(
          input.totalSales, input.avgLabourPercent,
          input.reportsSubmitted, input.totalReports, input.storeCount
        );
        const result = await sendTeamsAlert(webhook.webhookUrl, payload);

        await createAlertHistoryEntry({
          webhookId: webhook.id,
          alertType: "daily_summary",
          title: payload.title,
          message: payload.message,
          severity: payload.severity,
          delivered: result.success,
          errorMessage: result.error ?? null,
        });

        return result;
      }),
  }),

  // ─── Clover POS Integration ───────────────────────────────────
  clover: router({
    // Get OAuth URL to start connection
    getAuthUrl: protectedProcedure.query(() => {
      const baseUrl = process.env.VITE_APP_URL || "";
      const redirectUri = `${baseUrl}/api/clover/callback`;
      return { url: getCloverAuthUrl(redirectUri) };
    }),

    // Exchange authorization code for access token
    connect: protectedProcedure
      .input(z.object({
        code: z.string(),
        merchantId: z.string(),
        storeName: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        // Exchange code for token
        const { accessToken } = await exchangeCloverCode(input.code);

        // Fetch merchant info to verify connection
        const merchant = await fetchMerchantInfo(input.merchantId, accessToken);

        // Check if already connected
        const existing = await getCloverConnectionByMerchantId(input.merchantId);
        if (existing) {
          await updateCloverConnection(existing.id, {
            accessToken,
            storeName: input.storeName,
            isActive: true,
          });
        } else {
          await createCloverConnection({
            storeName: input.storeName,
            merchantId: input.merchantId,
            accessToken,
          });
        }

        return { success: true, merchantName: merchant.name };
      }),

    // Manual connect with API token (simpler for non-developers)
    connectManual: protectedProcedure
      .input(z.object({
        storeName: z.string().min(1),
        merchantId: z.string().min(1),
        accessToken: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        // Verify the token works by fetching merchant info
        try {
          const merchant = await fetchMerchantInfo(input.merchantId, input.accessToken);

          const existing = await getCloverConnectionByMerchantId(input.merchantId);
          if (existing) {
            await updateCloverConnection(existing.id, {
              accessToken: input.accessToken,
              storeName: input.storeName,
              isActive: true,
            });
          } else {
            await createCloverConnection({
              storeName: input.storeName,
              merchantId: input.merchantId,
              accessToken: input.accessToken,
            });
          }

          return { success: true, merchantName: merchant.name };
        } catch (error: any) {
          throw new Error(`Could not connect to Clover: ${error.message}`);
        }
      }),

    // List all connected stores
    connections: protectedProcedure.query(async () => {
      try {
        console.log("[Clover Route] Fetching connections...");
        const connections = await listCloverConnections();
        console.log(`[Clover Route] Got ${connections.length} connections`);
        // Don't expose access tokens to the frontend
        return connections.map(c => ({
          id: c.id,
          storeName: c.storeName,
          merchantId: c.merchantId,
          isActive: c.isActive,
          lastSyncAt: c.lastSyncAt,
          lastSyncSuccess: c.lastSyncSuccess,
          createdAt: c.createdAt,
        }));
      } catch (error) {
        console.error("[Clover Route] connections error:", error);
        throw error;
      }
    }),

    // Disconnect a store
    disconnect: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCloverConnection(input.id);
        return { success: true };
      }),

    // Toggle connection active/inactive
    toggleConnection: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateCloverConnection(input.id, { isActive: input.isActive });
        return { success: true };
      }),

    // Sync data for a specific connection
    syncStore: protectedProcedure
      .input(z.object({ connectionId: z.number(), daysBack: z.number().min(1).max(180).optional() }))
      .mutation(async ({ input }) => {
        const connection = await getCloverConnectionById(input.connectionId);
        if (!connection) throw new Error("Connection not found");
        if (!connection.isActive) throw new Error("Connection is disabled");

        const daysBack = input.daysBack ?? 60;
        const { startTime, endTime } = getDateRange(daysBack);

        try {
          console.log(`[Clover Sync] Starting sync for ${connection.storeName} (${connection.merchantId}), ${daysBack} days back`);
          // Fetch payments and aggregate by day
          const payments = await fetchPayments(connection.merchantId, connection.accessToken, startTime, endTime);
          console.log(`[Clover Sync] Fetched ${payments.length} payments for ${connection.storeName}`);
          const dailySales = aggregatePaymentsByDay(payments);

          for (const day of dailySales) {
            await upsertCloverDailySales({
              connectionId: connection.id,
              merchantId: connection.merchantId,
              date: day.date,
              totalSales: day.totalSales,
              totalTips: day.totalTips,
              totalTax: day.totalTax,
              orderCount: day.orderCount,
              refundAmount: day.refundAmount,
              netSales: day.netSales,
            });
          }

          // Fetch shifts
          console.log(`[Clover Sync] Fetching shifts for ${connection.storeName}...`);
          const shifts = await fetchShifts(connection.merchantId, connection.accessToken, startTime, endTime);
          console.log(`[Clover Sync] Fetched ${shifts.length} shifts for ${connection.storeName}`);
          for (const shift of shifts) {
            const hours = shift.outTime ? (shift.outTime - shift.inTime) / (1000 * 60 * 60) : null;
            await upsertCloverShift({
              connectionId: connection.id,
              merchantId: connection.merchantId,
              employeeId: shift.employee.id,
              employeeName: shift.employee.name || "Unknown",
              shiftId: shift.id,
              inTime: new Date(shift.inTime),
              outTime: shift.outTime ? new Date(shift.outTime) : null,
              hoursWorked: hours,
            });
          }

          await updateCloverConnection(connection.id, {
            lastSyncAt: new Date(),
            lastSyncSuccess: true,
          });

          return {
            success: true,
            salesDays: dailySales.length,
            shiftsProcessed: shifts.length,
            totalPayments: payments.length,
          };
        } catch (error: any) {
          await updateCloverConnection(connection.id, {
            lastSyncAt: new Date(),
            lastSyncSuccess: false,
          });
          console.error(`[Clover Sync] Failed for ${connection.storeName}: ${error.message}`);
          throw new Error(`Sync failed for ${connection.storeName}: ${error.message}`);
        }
      }),

    // Sync all active connections
    syncAll: protectedProcedure
      .input(z.object({ daysBack: z.number().min(1).max(180).optional() }).optional())
      .mutation(async ({ input }) => {
        const connections = await listCloverConnections();
        const active = connections.filter(c => c.isActive);
        const results: Array<{ storeName: string; success: boolean; error?: string }> = [];

        for (const conn of active) {
          try {
            const daysBack = input?.daysBack ?? 60;
            const { startTime, endTime } = getDateRange(daysBack);

            console.log(`[Clover SyncAll] Starting sync for ${conn.storeName} (${conn.merchantId}), ${daysBack} days back`);
            const payments = await fetchPayments(conn.merchantId, conn.accessToken, startTime, endTime);
            console.log(`[Clover SyncAll] Fetched ${payments.length} payments for ${conn.storeName}`);
            const dailySales = aggregatePaymentsByDay(payments);
            console.log(`[Clover SyncAll] Aggregated into ${dailySales.length} daily records for ${conn.storeName}`);

            for (const day of dailySales) {
              try {
                await upsertCloverDailySales({
                  connectionId: conn.id,
                  merchantId: conn.merchantId,
                  date: day.date,
                  totalSales: day.totalSales,
                  totalTips: day.totalTips,
                  totalTax: day.totalTax,
                  orderCount: day.orderCount,
                  refundAmount: day.refundAmount,
                  netSales: day.netSales,
                });
              } catch (upsertErr: any) {
                console.error(`[Clover SyncAll] Failed to upsert sales for ${conn.storeName} ${day.date}:`, upsertErr.message);
                throw upsertErr;
              }
            }
            console.log(`[Clover SyncAll] Saved ${dailySales.length} sales records for ${conn.storeName}`);

            const shifts = await fetchShifts(conn.merchantId, conn.accessToken, startTime, endTime);
            console.log(`[Clover SyncAll] Fetched ${shifts.length} shifts for ${conn.storeName}`);
            for (const shift of shifts) {
              const hours = shift.outTime ? (shift.outTime - shift.inTime) / (1000 * 60 * 60) : null;
              try {
                await upsertCloverShift({
                  connectionId: conn.id,
                  merchantId: conn.merchantId,
                  employeeId: shift.employee.id,
                  employeeName: shift.employee.name || "Unknown",
                  shiftId: shift.id,
                  inTime: new Date(shift.inTime),
                  outTime: shift.outTime ? new Date(shift.outTime) : null,
                  hoursWorked: hours,
                });
              } catch (upsertErr: any) {
                console.error(`[Clover SyncAll] Failed to upsert shift ${shift.id} for ${conn.storeName}:`, upsertErr.message);
                throw upsertErr;
              }
            }
            console.log(`[Clover SyncAll] Saved ${shifts.length} shifts for ${conn.storeName}`);

            await updateCloverConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: true });
            console.log(`[Clover SyncAll] ✓ Sync complete for ${conn.storeName}`);
            results.push({ storeName: conn.storeName, success: true });
          } catch (error: any) {
            console.error(`[Clover SyncAll] ✗ FAILED for ${conn.storeName}: ${error.message}`);
            console.error(`[Clover SyncAll] Full error:`, error);
            await updateCloverConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: false });
            results.push({ storeName: conn.storeName, success: false, error: error.message });
          }
        }

        return { results, totalSynced: results.filter(r => r.success).length };
      }),

    // Get aggregated sales data for the dashboard
    salesData: publicProcedure
      .input(z.object({
        connectionId: z.number().optional(),
        limit: z.number().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        // If date range is provided, use date-filtered query
        if (input?.fromDate && input?.toDate) {
          console.log(`[Clover salesData] Querying date range: ${input.fromDate} to ${input.toDate}`);
          const results = await getCloverSalesByDateRange(input.fromDate, input.toDate);
          console.log(`[Clover salesData] Returned ${results.length} rows for ${input.fromDate} to ${input.toDate}`);
          return results;
        }
        if (input?.connectionId) {
          return getCloverSalesByConnection(input.connectionId, input.limit ?? 30);
        }
        return getAllCloverSales(input?.limit ?? 120);
      }),

    // Get shift/labour data for the dashboard
    shiftData: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllCloverShifts(input?.limit ?? 500);
      }),
  }),

  // ─── 7shifts Integration ───────────────────────────────────────
  sevenShifts: router({
    // List companies (auto-discovered from token)
    companies: protectedProcedure.query(async () => {
      const token = process.env.SEVEN_SHIFTS_ACCESS_TOKEN;
      if (!token) throw new Error("7shifts access token not configured");
      return fetchCompanies(token);
    }),

    // List locations for a company
    locations: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        const token = process.env.SEVEN_SHIFTS_ACCESS_TOKEN;
        if (!token) throw new Error("7shifts access token not configured");
        return fetchLocations(input.companyId, token);
      }),

    // Connect a location
    connect: protectedProcedure
      .input(z.object({
        storeName: z.string().min(1),
        companyId: z.number(),
        companyName: z.string(),
        locationId: z.number(),
        locationName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const token = process.env.SEVEN_SHIFTS_ACCESS_TOKEN;
        if (!token) throw new Error("7shifts access token not configured");

        // Check if already connected
        const existing = await getSevenShiftsConnectionByLocationId(input.locationId);
        if (existing) {
          await updateSevenShiftsConnection(existing.id, {
            storeName: input.storeName,
            accessToken: token,
            isActive: true,
          });
        } else {
          await createSevenShiftsConnection({
            storeName: input.storeName,
            companyId: input.companyId,
            companyName: input.companyName,
            locationId: input.locationId,
            locationName: input.locationName,
            accessToken: token,
          });
        }

        return { success: true };
      }),

    // List connections
    connections: protectedProcedure.query(async () => {
      const connections = await listSevenShiftsConnections();
      return connections.map(c => ({
        id: c.id,
        storeName: c.storeName,
        companyId: c.companyId,
        companyName: c.companyName,
        locationId: c.locationId,
        locationName: c.locationName,
        isActive: c.isActive,
        lastSyncAt: c.lastSyncAt,
        lastSyncSuccess: c.lastSyncSuccess,
        createdAt: c.createdAt,
      }));
    }),

    // Disconnect
    disconnect: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSevenShiftsConnection(input.id);
        return { success: true };
      }),

    // Sync data for a specific connection
    syncStore: protectedProcedure
      .input(z.object({ connectionId: z.number(), daysBack: z.number().min(1).max(180).optional() }))
      .mutation(async ({ input }) => {
        const connection = await getSevenShiftsConnectionById(input.connectionId);
        if (!connection) throw new Error("Connection not found");
        if (!connection.isActive) throw new Error("Connection is disabled");

        const daysBack = input.daysBack ?? 60;
        const { startDate, endDate } = getDateRangeStrings(daysBack);

        try {
          console.log(`[7shifts Sync] Starting sync for ${connection.storeName} (location ${connection.locationId}), ${daysBack} days back`);

          const dailyData = await fetchDailySalesAndLabor(
            connection.companyId,
            connection.locationId,
            connection.accessToken,
            startDate,
            endDate
          );

          console.log(`[7shifts Sync] Fetched ${dailyData.length} daily records for ${connection.storeName}`);

          for (const day of dailyData) {
            await upsertSevenShiftsDailySales({
              connectionId: connection.id,
              locationId: connection.locationId,
              date: day.date,
              totalSales: day.actual_sales / 100, // cents to dollars
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

          await updateSevenShiftsConnection(connection.id, {
            lastSyncAt: new Date(),
            lastSyncSuccess: true,
          });

          console.log(`[7shifts Sync] \u2713 Complete for ${connection.storeName}: ${dailyData.length} days saved`);

          return {
            success: true,
            daysProcessed: dailyData.length,
          };
        } catch (error: any) {
          await updateSevenShiftsConnection(connection.id, {
            lastSyncAt: new Date(),
            lastSyncSuccess: false,
          });
          console.error(`[7shifts Sync] Failed for ${connection.storeName}: ${error.message}`);
          throw new Error(`Sync failed for ${connection.storeName}: ${error.message}`);
        }
      }),

    // Sync all active connections
    syncAll: protectedProcedure
      .input(z.object({ daysBack: z.number().min(1).max(180).optional() }).optional())
      .mutation(async ({ input }) => {
        const connections = await listSevenShiftsConnections();
        const active = connections.filter(c => c.isActive);
        const results: Array<{ storeName: string; success: boolean; error?: string; daysProcessed?: number }> = [];

        for (const conn of active) {
          try {
            const daysBack = input?.daysBack ?? 60;
            const { startDate, endDate } = getDateRangeStrings(daysBack);

            console.log(`[7shifts SyncAll] Starting sync for ${conn.storeName} (location ${conn.locationId}), ${daysBack} days back`);

            const dailyData = await fetchDailySalesAndLabor(
              conn.companyId,
              conn.locationId,
              conn.accessToken,
              startDate,
              endDate
            );

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
            console.log(`[7shifts SyncAll] \u2713 Complete for ${conn.storeName}: ${dailyData.length} days`);
            results.push({ storeName: conn.storeName, success: true, daysProcessed: dailyData.length });
          } catch (error: any) {
            console.error(`[7shifts SyncAll] \u2717 FAILED for ${conn.storeName}: ${error.message}`);
            await updateSevenShiftsConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: false });
            results.push({ storeName: conn.storeName, success: false, error: error.message });
          }
        }

        return { results, totalSynced: results.filter(r => r.success).length };
      }),

    // Get sales data (for dashboard)
    salesData: publicProcedure
      .input(z.object({
        connectionId: z.number().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        if (input?.fromDate && input?.toDate) {
          return getSevenShiftsSalesByDateRange(input.fromDate, input.toDate);
        }
        if (input?.connectionId) {
          return getSevenShiftsSalesByConnection(input.connectionId, input.limit ?? 60);
        }
        return getAllSevenShiftsSales(input?.limit ?? 120);
      }),
  }),

  // ─── Excel Labour Data (SharePoint Daily Report) ──────────────
  excelLabour: router({
    // Upload and parse an Excel file
    upload: protectedProcedure
      .input(z.object({
        fileBase64: z.string(), // Base64-encoded .xlsx file
        fileName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        console.log(`[Excel] Parsing uploaded file: ${input.fileName ?? "unknown"}`);
        const buffer = Buffer.from(input.fileBase64, "base64");
        const result = parseExcelBuffer(buffer);

        if (!result.success) {
          await createExcelSyncMeta({
            fileName: input.fileName ?? "unknown.xlsx",
            rowCount: 0,
            dateRange: null,
            syncSuccess: false,
            errorMessage: result.errors.join("; "),
          });
          return { success: false, errors: result.errors, rowCount: 0, skipped: result.skipped };
        }

        // Upsert all parsed rows into database
        const upserted = await bulkUpsertExcelLabourData(
          result.rows.map(r => ({
            date: r.date,
            store: r.store,
            storeId: r.storeId,
            netSales: r.netSales,
            labourCost: r.labourCost,
            labourPercent: r.labourPercent,
            notes: r.notes,
            sourceRowId: r.sourceRowId,
          }))
        );

        const dateRange = result.dateRange
          ? `${result.dateRange.from} to ${result.dateRange.to}`
          : null;

        await createExcelSyncMeta({
          fileName: input.fileName ?? "unknown.xlsx",
          rowCount: upserted,
          dateRange,
          syncSuccess: true,
        });

        console.log(`[Excel] Uploaded ${upserted} rows, date range: ${dateRange}`);

        return {
          success: true,
          rowCount: upserted,
          dateRange: result.dateRange,
          errors: result.errors,
          skipped: result.skipped,
        };
      }),

    // Get all labour data
    data: publicProcedure
      .input(z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        storeId: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        if (input?.fromDate && input?.toDate) {
          return getExcelLabourByDateRange(input.fromDate, input.toDate);
        }
        if (input?.storeId) {
          return getExcelLabourByStore(input.storeId, input.limit ?? 60);
        }
        return getAllExcelLabourData(input?.limit ?? 500);
      }),

    // Get sync metadata
    syncMeta: protectedProcedure.query(async () => {
      return getLatestExcelSyncMeta();
    }),

    // Clear all Excel data
    clearAll: protectedProcedure.mutation(async () => {
      await deleteAllExcelLabourData();
      return { success: true };
    }),
  }),

  // ─── Koomi/MYR POS (Scraper) ──────────────────────────────────
  koomi: router({
    // List available Koomi stores
    stores: protectedProcedure.query(() => {
      return KOOMI_STORES;
    }),

    // Get all Koomi sales data
    allSales: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
      .query(async ({ input }) => {
        return getAllKoomiSales(input?.limit ?? 120);
      }),

    // Get sales by store
    salesByStore: protectedProcedure
      .input(z.object({ storeId: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getKoomiSalesByStore(input.storeId, input.limit ?? 60);
      }),

    // Get sales by date range (public so dashboard can access without auth)
    salesByDateRange: publicProcedure
      .input(z.object({ fromDate: z.string(), toDate: z.string() }))
      .query(async ({ input }) => {
        return getKoomiSalesByDateRange(input.fromDate, input.toDate);
      }),

    // Test login
    testLogin: protectedProcedure.mutation(async () => {
      const success = await koomiLogin();
      return { success, message: success ? "Successfully logged into Koomi admin" : "Login failed — check credentials" };
    }),

    // Sync today's data
    syncToday: protectedProcedure.mutation(async () => {
      const today = getTodayEST();
      const data = await scrapeAllStores(today);
      let saved = 0;
      for (const d of data) {
        await upsertKoomiDailySales({
          storeId: d.storeId,
          storeName: d.storeName,
          koomiLocationId: d.koomiLocationId,
          date: d.date,
          grossSales: d.grossSales,
          netSales: d.netSales,
          netSalaries: d.netSalaries,
          labourPercent: d.labourPercent,
        });
        saved++;
      }
      return { success: true, date: today, storesSynced: saved, data };
    }),

    // Sync multiple days (backfill)
    syncDays: protectedProcedure
      .input(z.object({ daysBack: z.number().min(1).max(90) }))
      .mutation(async ({ input }) => {
        const data = await scrapeMultipleDays(input.daysBack);
        let saved = 0;
        for (const d of data) {
          await upsertKoomiDailySales({
            storeId: d.storeId,
            storeName: d.storeName,
            koomiLocationId: d.koomiLocationId,
            date: d.date,
            grossSales: d.grossSales,
            netSales: d.netSales,
            netSalaries: d.netSalaries,
            labourPercent: d.labourPercent,
          });
          saved++;
        }
        return { success: true, daysBack: input.daysBack, recordsSaved: saved, data };
      }),
  }),

  // ─── QuickBooks Online ─────────────────────────────────────────
  quickbooks: router({
    // Get connection status
    status: publicProcedure.query(async () => {
      const token = await getActiveQboToken();
      if (!token) return { connected: false };
      const isExpired = token.refreshTokenExpiresAt < new Date();
      return {
        connected: !isExpired,
        companyName: token.companyName,
        realmId: token.realmId,
        lastSyncAt: token.lastSyncAt,
        lastSyncSuccess: token.lastSyncSuccess,
        accessTokenExpired: token.accessTokenExpiresAt < new Date(),
        refreshTokenExpired: isExpired,
      };
    }),

    // Disconnect QuickBooks
    disconnect: protectedProcedure.mutation(async () => {
      const token = await getActiveQboToken();
      if (token) await deleteQboToken(token.id);
      return { success: true };
    }),

    // Sync COGS data from QuickBooks P&L report
    syncCogs: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        const token = await getActiveQboToken();
        if (!token) throw new Error("QuickBooks not connected");

        let accessToken = token.accessToken;

        // Refresh access token if expired
        if (token.accessTokenExpiresAt < new Date()) {
          try {
            const refreshed = await refreshAccessToken(token.refreshToken);
            accessToken = refreshed.accessToken;
            await updateQboToken(token.id, {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
              refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
            });
          } catch (err) {
            await updateQboToken(token.id, { lastSyncSuccess: false });
            throw new Error("Failed to refresh QuickBooks token. Please reconnect.");
          }
        }

        try {
          const cogsData = await syncQboCogs(
            token.realmId,
            accessToken,
            input.startDate,
            input.endDate
          );

          // Map QBO location names to store IDs
          const LOCATION_TO_STORE: Record<string, string> = {
            "mackay": "mk",
            "mk": "mk",
            "tunnel": "tunnel",
            "cathcart": "tunnel",
            "tn": "tunnel",
            "president kennedy": "pk",
            "pk": "pk",
            "ontario": "ontario",
            "on": "ontario",
          };

          let saved = 0;
          for (const loc of cogsData) {
            const storeId = LOCATION_TO_STORE[loc.locationName.toLowerCase()] || loc.locationName.toLowerCase();
            await upsertQboCogs({
              realmId: token.realmId,
              storeId,
              storeName: loc.locationName,
              qboLocationId: loc.locationId,
              qboLocationName: loc.locationName,
              periodStart: input.startDate,
              periodEnd: input.endDate,
              cogsAmount: loc.cogsAmount,
              revenue: loc.revenue,
              grossProfit: loc.grossProfit,
              cogsPercent: loc.cogsPercent,
              cogsBreakdown: loc.cogsBreakdown,
            });
            saved++;
          }

          await updateQboToken(token.id, {
            lastSyncAt: new Date(),
            lastSyncSuccess: true,
          });

          return {
            success: true,
            locationsSynced: saved,
            locations: cogsData.map(l => ({
              name: l.locationName,
              cogs: l.cogsAmount,
              revenue: l.revenue,
              cogsPercent: l.cogsPercent,
            })),
          };
        } catch (err: any) {
          await updateQboToken(token.id, { lastSyncSuccess: false });
          throw new Error(`QuickBooks sync failed: ${err.message}`);
        }
      }),

    // Get COGS data by date range
    cogsByDateRange: publicProcedure
      .input(z.object({
        fromDate: z.string(),
        toDate: z.string(),
      }))
      .query(async ({ input }) => {
        return getQboCogsByDateRange(input.fromDate, input.toDate);
      }),

    // Get all COGS data
    allCogs: publicProcedure.query(async () => {
      return getAllQboCogs();
    }),
  }),

  // ─── Combined Sync All Sources ────────────────────────────────
  syncAllSources: protectedProcedure
    .input(z.object({ daysBack: z.number().min(1).max(180).optional() }).optional())
    .mutation(async ({ input }) => {
      const daysBack = input?.daysBack ?? 60;
      const results: { source: string; success: boolean; message: string; details?: any }[] = [];

      // Run Clover, 7shifts, and Koomi sync in parallel
      const [cloverResult, sevenShiftsResult, koomiResult] = await Promise.allSettled([
        // Clover sync
        (async () => {
          const connections = await listCloverConnections();
          const active = connections.filter(c => c.isActive);
          if (active.length === 0) return { source: "Clover", success: true, message: "No active connections", synced: 0 };

          const { startTime, endTime } = getDateRange(daysBack);
          let synced = 0;
          const storeResults: any[] = [];

          for (const conn of active) {
            try {
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
              synced++;
              storeResults.push({ store: conn.storeName, success: true, days: dailySales.length });
            } catch (err: any) {
              await updateCloverConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: false });
              storeResults.push({ store: conn.storeName, success: false, error: err.message });
            }
          }
          return { source: "Clover", success: synced > 0, message: `${synced}/${active.length} stores synced`, synced, storeResults };
        })(),

        // 7shifts sync
        (async () => {
          const connections = await listSevenShiftsConnections();
          const active = connections.filter(c => c.isActive);
          if (active.length === 0) return { source: "7shifts", success: true, message: "No active connections", synced: 0 };

          let synced = 0;
          const storeResults: any[] = [];

          for (const conn of active) {
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
              synced++;
              storeResults.push({ store: conn.storeName, success: true, days: dailyData.length });
            } catch (err: any) {
              await updateSevenShiftsConnection(conn.id, { lastSyncAt: new Date(), lastSyncSuccess: false });
              storeResults.push({ store: conn.storeName, success: false, error: err.message });
            }
          }
          return { source: "7shifts", success: synced > 0, message: `${synced}/${active.length} locations synced`, synced, storeResults };
        })(),

        // Koomi/MYR sync (scraper)
        (async () => {
          try {
            // Koomi scraper syncs last 3 days (same as Clover/7shifts auto-sync)
            const koomiDaysBack = Math.min(daysBack, 7); // Limit scraper to 7 days max to avoid overloading
            const data = await scrapeMultipleDays(koomiDaysBack);
            let saved = 0;
            const storeResults: any[] = [];
            const storeMap = new Map<string, { success: number; total: number }>();

            for (const d of data) {
              await upsertKoomiDailySales({
                storeId: d.storeId,
                storeName: d.storeName,
                koomiLocationId: d.koomiLocationId,
                date: d.date,
                grossSales: d.grossSales,
                netSales: d.netSales,
                netSalaries: d.netSalaries,
                labourPercent: d.labourPercent,
              });
              saved++;
              const existing = storeMap.get(d.storeId) || { success: 0, total: 0 };
              existing.success++;
              existing.total++;
              storeMap.set(d.storeId, existing);
            }

            Array.from(storeMap.entries()).forEach(([storeId, counts]) => {
              storeResults.push({ store: storeId, success: true, days: counts.success });
            });

            return { source: "Koomi", success: saved > 0, message: `${saved} records saved from ${KOOMI_STORES.length} stores`, synced: saved, storeResults };
          } catch (err: any) {
            return { source: "Koomi", success: false, message: err.message, synced: 0 };
          }
        })(),
      ]);

      // Process results
      if (cloverResult.status === "fulfilled") {
        results.push(cloverResult.value);
      } else {
        results.push({ source: "Clover", success: false, message: cloverResult.reason?.message ?? "Unknown error" });
      }
      if (sevenShiftsResult.status === "fulfilled") {
        results.push(sevenShiftsResult.value);
      } else {
        results.push({ source: "7shifts", success: false, message: sevenShiftsResult.reason?.message ?? "Unknown error" });
      }
      if (koomiResult.status === "fulfilled") {
        results.push(koomiResult.value);
      } else {
        results.push({ source: "Koomi", success: false, message: koomiResult.reason?.message ?? "Unknown error" });
      }

      return { results, allSuccess: results.every(r => r.success) };
    }),

  // ─── Reports & Checklists ──────────────────────────────────────
  reports: router({
    submit: protectedProcedure
      .input(
        z.object({
          reportType: z.string(),
          location: z.string(),
          reportDate: z.string(),
          data: z.any(),
          totalScore: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createReportSubmission({
          userId: ctx.user.id,
          reportType: input.reportType,
          location: input.location,
          reportDate: input.reportDate,
          data: input.data,
          totalScore: input.totalScore || null,
          status: "submitted",
        });

        sendTeamsNotification({
          reportType: input.reportType,
          location: input.location,
          submittedBy: ctx.user.name || ctx.user.email || "Unknown",
          reportDate: input.reportDate,
          totalScore: input.totalScore,
          details:
            typeof input.data === "object" ? input.data : undefined,
        }).catch((err) =>
          console.error("[Teams] Notification error:", err)
        );

        return result;
      }),

    myReports: protectedProcedure.query(async ({ ctx }) => {
      return getReportsByUser(ctx.user.id);
    }),

    allReports: protectedProcedure.query(async () => {
      return getAllReports();
    }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.any().optional(),
        totalScore: z.string().optional(),
        status: z.enum(["draft", "submitted", "reviewed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const updateData: any = {};
        if (input.data !== undefined) updateData.data = input.data;
        if (input.totalScore !== undefined) updateData.totalScore = input.totalScore;
        if (input.status !== undefined) updateData.status = input.status;
        return updateReportSubmission(input.id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteReportSubmission(input.id);
      }),

    sendWasteEmail: publicProcedure
      .input(z.object({
        subject: z.string(),
        body: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Use MS Graph API to send email via systems@bagelandcafe.com
          const axios = (await import("axios")).default;
          const { ENV } = await import("./_core/env");
          const { AXIOS_TIMEOUT_MS } = await import("../shared/const");

          const { msGraphUsername, msGraphPassword, msGraphClientId } = ENV;
          if (!msGraphUsername || !msGraphPassword) {
            throw new Error("MS Graph credentials not configured");
          }

          // Get token via ROPC flow
          const tokenParams = new URLSearchParams({
            client_id: msGraphClientId,
            scope: "https://graph.microsoft.com/.default",
            username: msGraphUsername,
            password: msGraphPassword,
            grant_type: "password",
          });
          const tokenRes = await axios.post(
            "https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
            tokenParams.toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: AXIOS_TIMEOUT_MS }
          );
          const accessToken = tokenRes.data.access_token;

          // Send email via Graph API
          const emailPayload = {
            message: {
              subject: input.subject,
              body: {
                contentType: "Text",
                content: input.body,
              },
              toRecipients: [
                { emailAddress: { address: "toufic@bagelandcafe.com" } },
              ],
            },
            saveToSentItems: true,
          };

          await axios.post(
            `https://graph.microsoft.com/v1.0/me/sendMail`,
            emailPayload,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              timeout: AXIOS_TIMEOUT_MS,
            }
          );

          return { success: true };
        } catch (err: any) {
          console.error("[WasteEmail] Failed to send:", err?.response?.data || err.message);
          return { success: false, error: err.message };
        }
      }),
  }),

  // ─── Store PINs ───────────────────────────────────────────────
  storePins: router({
    list: adminProcedure.query(async () => {
      return getAllStorePins();
    }),

    upsert: adminProcedure
      .input(
        z.object({
          storeCode: z.string().min(1),
          storeName: z.string().min(1),
          pin: z.string().min(4).max(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertStorePin({
          ...input,
          updatedBy: ctx.user.id,
        });
      }),

    // Public: get list of stores (no PIN exposed)
    stores: publicProcedure.query(async () => {
      return getActiveStorePinsPublic();
    }),

    // Public: verify a PIN
    verify: publicProcedure
      .input(
        z.object({
          storeCode: z.string(),
          pin: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const valid = await verifyStorePin(
          input.storeCode,
          input.pin
        );
        return { valid };
      }),
  }),

  // ─── Position PINs ────────────────────────────────────────────────
  positionPins: router({
    list: adminProcedure.query(async () => {
      return getAllPositionPins();
    }),

    upsert: adminProcedure
      .input(
        z.object({
          positionSlug: z.string().min(1),
          positionLabel: z.string().min(1),
          pin: z.string().min(4).max(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertPositionPin({
          ...input,
          updatedBy: ctx.user.id,
        });
      }),

    // Public: list positions (no PINs exposed)
    positions: publicProcedure.query(async () => {
      // Seed defaults on first access
      await seedDefaultPositionPins();
      return getActivePositionPinsPublic();
    }),

    // Public: verify a position PIN
    verify: publicProcedure
      .input(
        z.object({
          positionSlug: z.string(),
          pin: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Seed defaults if table is empty
        await seedDefaultPositionPins();
        const valid = await verifyPositionPin(
          input.positionSlug,
          input.pin
        );
        return { valid };
      }),
  }),

  // ─── Expense Categories ───
  expenseCategories: router({
    list: protectedProcedure.query(async () => {
      return getExpenseCategories();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        pnlSection: z.enum(["cogs", "operating", "labour", "other"]).default("other"),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return createExpenseCategory(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        pnlSection: z.enum(["cogs", "operating", "labour", "other"]).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateExpenseCategory(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteExpenseCategory(input.id);
        return { success: true };
      }),
  }),

  // ─── Vendors ───
  vendors: router({
    list: protectedProcedure.query(async () => {
      return getVendors();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        contactRole: z.string().optional(),
        description: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createVendor(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        contactRole: z.string().optional(),
        description: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateVendor(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteVendor(input.id);
        return { success: true };
      }),
  }),

  // ─── Expenses ───
  expenses: router({
    list: protectedProcedure
      .input(z.object({
        storeCode: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.string().optional(),
        categoryId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getExpenses(input ?? undefined);
      }),
    byMonth: protectedProcedure
      .input(z.object({ month: z.number(), year: z.number() }))
      .query(async ({ input }) => {
        return getExpensesByMonth(input.month, input.year);
      }),
    create: protectedProcedure
      .input(z.object({
        storeCode: z.string(),
        categoryId: z.number(),
        vendorId: z.number().optional(),
        amount: z.number(),
        description: z.string().optional(),
        expenseDate: z.string(),
        status: z.enum(["pending", "approved", "rejected"]).default("pending"),
      }))
      .mutation(async ({ input, ctx }) => {
        return createExpense({ ...input, createdBy: ctx.user?.id });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        storeCode: z.string().optional(),
        categoryId: z.number().optional(),
        vendorId: z.number().optional(),
        amount: z.number().optional(),
        description: z.string().optional(),
        expenseDate: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateExpense(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteExpense(input.id);
        return { success: true };
      }),
  }),

  // ─── COGS Targets ───
  cogsTargets: router({
    list: protectedProcedure
      .input(z.object({ month: z.number(), year: z.number() }))
      .query(async ({ input }) => {
        return getCogsTargets(input.month, input.year);
      }),
    upsert: protectedProcedure
      .input(z.object({
        storeCode: z.string(),
        month: z.number(),
        year: z.number(),
        targetAmount: z.number(),
      }))
      .mutation(async ({ input }) => {
        return upsertCogsTarget(input);
      }),
  }),

  // ─── Inventory Items ───
  inventoryItems: router({
    list: protectedProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getInventoryItems(input?.category);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        unit: z.string().default("each"),
        parLevel: z.number().optional(),
        cost: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return createInventoryItem(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        category: z.string().optional(),
        unit: z.string().optional(),
        parLevel: z.number().optional(),
        cost: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateInventoryItem(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteInventoryItem(input.id);
        return { success: true };
      }),
  }),

  // ─── Inventory Counts ───
  inventoryCounts: router({
    list: protectedProcedure
      .input(z.object({ storeCode: z.string(), countDate: z.string() }))
      .query(async ({ input }) => {
        return getInventoryCounts(input.storeCode, input.countDate);
      }),
    bulkUpsert: protectedProcedure
      .input(z.object({
        counts: z.array(z.object({
          itemId: z.number(),
          storeCode: z.string(),
          countDate: z.string(),
          quantity: z.number(),
          countedBy: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        return bulkUpsertInventoryCounts(input.counts);
      }),
  }),

  // ─── P&L ───
  pnl: router({
    summary: protectedProcedure
      .input(z.object({ month: z.number(), year: z.number() }))
      .query(async ({ input }) => {
        const monthExpenses = await getExpensesByMonth(input.month, input.year);
        const categories = await getExpenseCategories();
        const catMap = new Map(categories.map(c => [c.id, c]));

        const sections: Record<string, number> = { cogs: 0, operating: 0, labour: 0, other: 0 };
        const byCategory: Record<string, { name: string; section: string; total: number }> = {};

        for (const exp of monthExpenses) {
          const cat = catMap.get(exp.categoryId);
          const section = cat?.pnlSection ?? "other";
          sections[section] += exp.amount;
          const catName = cat?.name ?? "Uncategorized";
          if (!byCategory[catName]) byCategory[catName] = { name: catName, section, total: 0 };
          byCategory[catName].total += exp.amount;
        }

        return {
          month: input.month,
          year: input.year,
          cogs: sections.cogs,
          operatingExpenses: sections.operating,
          labourExpenses: sections.labour,
          otherExpenses: sections.other,
          totalExpenses: Object.values(sections).reduce((a, b) => a + b, 0),
          byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
        };
      }),
  }),

  // ─── Scorecard ───
  scorecard: router({
    getData: publicProcedure
      .input(
        z.object({
          fromDate: z.string(),
          toDate: z.string(),
        })
      )
      .query(async ({ input }) => {
        const { getReportsByDateRange } = await import("./db");
        const reports = await getReportsByDateRange(input.fromDate, input.toDate);
        return reports;
      }),
  }),

  // ─── Admin ───
  admin: router({
    users: adminProcedure.query(async () => {
      return getAllUsers();
    }),
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  // ─── Waste Analysis ───
  wasteAnalysis: router({
    byStore: protectedProcedure
      .input(z.object({ fromDate: z.string(), toDate: z.string() }))
      .query(async ({ input }) => {
        const { getReportsByDateRange } = await import("./db");
        const { calcBagelCost, calcPastryCost, calcCKCost } = await import("../shared/wastePricing");
        const reports = await getReportsByDateRange(input.fromDate, input.toDate);
        const wasteReports = reports.filter(
          (r: any) => r.reportType === "waste" || r.reportType === "Leftovers & Waste"
        );

        // Per-store aggregation
        const byStore: Record<string, {
          storeId: string; reportCount: number;
          leftoverCost: number; wasteCost: number; totalCost: number;
          bagelLeftover: number; bagelWaste: number;
          pastryLeftover: number; pastryWaste: number;
          ckLeftover: number; ckWaste: number;
        }> = {};

        // Top wasted items
        const itemMap: Record<string, { name: string; category: string; wasteCost: number; wasteQty: number }> = {};

        for (const report of wasteReports) {
          const storeId = report.location || "unknown";
          if (!byStore[storeId]) {
            byStore[storeId] = {
              storeId, reportCount: 0,
              leftoverCost: 0, wasteCost: 0, totalCost: 0,
              bagelLeftover: 0, bagelWaste: 0,
              pastryLeftover: 0, pastryWaste: 0,
              ckLeftover: 0, ckWaste: 0,
            };
          }
          const s = byStore[storeId];
          s.reportCount++;

          let data: any;
          try { data = typeof report.data === "string" ? JSON.parse(report.data) : report.data; } catch { continue; }
          if (!data) continue;

          // If the form already computed costs, use them
          if (data.costs) {
            s.leftoverCost += data.costs.leftoverTotal ?? 0;
            s.wasteCost += data.costs.wasteTotal ?? 0;
            s.totalCost += data.costs.grandTotal ?? 0;
            s.bagelLeftover += data.costs.bagelLeftover ?? 0;
            s.bagelWaste += data.costs.bagelWaste ?? 0;
            s.pastryLeftover += data.costs.pastryLeftover ?? 0;
            s.pastryWaste += data.costs.pastryWaste ?? 0;
            s.ckLeftover += data.costs.ckLeftover ?? 0;
            s.ckWaste += data.costs.ckWaste ?? 0;
          } else {
            // Recalculate from raw items
            const sections = [
              { key: "bagels", calc: (item: any) => calcBagelCost(item.leftover ?? 0, item.leftoverType ?? "bag") + calcBagelCost(item.waste ?? 0, item.wasteType ?? "bag"), category: "Bagels" },
              { key: "pastries", calc: (item: any) => calcPastryCost(item.name, item.leftover ?? 0) + calcPastryCost(item.name, item.waste ?? 0), category: "Pastries" },
              { key: "ckItems", calc: (item: any) => calcCKCost(item.name, item.leftover ?? 0, item.leftoverType ?? "unit") + calcCKCost(item.name, item.waste ?? 0, item.wasteType ?? "unit"), category: "CK Items" },
            ];
            for (const sec of sections) {
              const items = data[sec.key] ?? [];
              for (const item of items) {
                let lc = 0, wc = 0;
                if (sec.key === "bagels") {
                  lc = calcBagelCost(item.leftover ?? 0, item.leftoverType ?? "bag");
                  wc = calcBagelCost(item.waste ?? 0, item.wasteType ?? "bag");
                } else if (sec.key === "pastries") {
                  lc = calcPastryCost(item.name, item.leftover ?? 0);
                  wc = calcPastryCost(item.name, item.waste ?? 0);
                } else {
                  lc = calcCKCost(item.name, item.leftover ?? 0, item.leftoverType ?? "unit");
                  wc = calcCKCost(item.name, item.waste ?? 0, item.wasteType ?? "unit");
                }
                s.leftoverCost += lc;
                s.wasteCost += wc;
                s.totalCost += lc + wc;
                if (sec.key === "bagels") { s.bagelLeftover += lc; s.bagelWaste += wc; }
                else if (sec.key === "pastries") { s.pastryLeftover += lc; s.pastryWaste += wc; }
                else { s.ckLeftover += lc; s.ckWaste += wc; }
              }
            }
          }

          // Build top wasted items from raw data
          for (const sec of ["bagels", "pastries", "ckItems"]) {
            const items = data[sec] ?? [];
            const category = sec === "bagels" ? "Bagels" : sec === "pastries" ? "Pastries" : "CK Items";
            for (const item of items) {
              const wQty = item.waste ?? 0;
              if (wQty <= 0) continue;
              let wCost = 0;
              if (sec === "bagels") wCost = calcBagelCost(wQty, item.wasteType ?? "bag");
              else if (sec === "pastries") wCost = calcPastryCost(item.name, wQty);
              else wCost = calcCKCost(item.name, wQty, item.wasteType ?? "unit");
              const key = `${item.name}__${category}`;
              if (!itemMap[key]) itemMap[key] = { name: item.name, category, wasteCost: 0, wasteQty: 0 };
              itemMap[key].wasteCost += wCost;
              itemMap[key].wasteQty += wQty;
            }
          }
        }

        const topWastedItems = Object.values(itemMap).sort((a, b) => b.wasteCost - a.wasteCost).slice(0, 15);

        return {
          byStore: Object.values(byStore),
          topWastedItems,
          totalReports: wasteReports.length,
        };
      }),
  }),

  // ─── Production ───
  production: router({
    bagelOrders: protectedProcedure
      .input(
        z.object({
          fromDate: z.string(),
          toDate: z.string(),
        })
      )
      .query(async ({ input }) => {
        const { getReportsByDateRange } = await import("./db");
        const reports = await getReportsByDateRange(input.fromDate, input.toDate);
        // Filter to only bagel order reports (handle both report type formats)
        return reports.filter(
          (r: any) =>
            r.reportType === "bagel-orders" ||
            r.reportType === "Bagel Orders"
        );
      }),
  }),
});

export type AppRouter = typeof appRouter;
