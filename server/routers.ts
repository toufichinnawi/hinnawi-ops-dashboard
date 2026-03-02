import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  listWebhooks, getWebhookById, createWebhook, updateWebhook, deleteWebhook,
  listAlertRules, createAlertRule, updateAlertRule, deleteAlertRule,
  listAlertHistory, createAlertHistoryEntry,
  listCloverConnections, getCloverConnectionById, getCloverConnectionByMerchantId,
  createCloverConnection, updateCloverConnection, deleteCloverConnection,
  upsertCloverDailySales, getAllCloverSales, getCloverSalesByConnection, getCloverSalesByDateRange,
  upsertCloverShift, getAllCloverShifts,
} from "./db";
import { sendTeamsAlert, testWebhookConnection, buildLabourAlert, buildReportOverdueAlert, buildSalesDropAlert, buildDailySummaryAlert } from "./teams";
import type { AlertPayload } from "./teams";
import {
  getCloverAuthUrl, exchangeCloverCode, fetchMerchantInfo,
  fetchPayments, fetchShifts, aggregatePaymentsByDay, aggregateShifts, getDateRange,
} from "./clover";

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
      .input(z.object({ connectionId: z.number(), daysBack: z.number().min(1).max(90).optional() }))
      .mutation(async ({ input }) => {
        const connection = await getCloverConnectionById(input.connectionId);
        if (!connection) throw new Error("Connection not found");
        if (!connection.isActive) throw new Error("Connection is disabled");

        const daysBack = input.daysBack ?? 7;
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
      .input(z.object({ daysBack: z.number().min(1).max(90).optional() }).optional())
      .mutation(async ({ input }) => {
        const connections = await listCloverConnections();
        const active = connections.filter(c => c.isActive);
        const results: Array<{ storeName: string; success: boolean; error?: string }> = [];

        for (const conn of active) {
          try {
            const daysBack = input?.daysBack ?? 30;
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
    salesData: protectedProcedure
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
});

export type AppRouter = typeof appRouter;
