import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  listWebhooks, getWebhookById, createWebhook, updateWebhook, deleteWebhook,
  listAlertRules, createAlertRule, updateAlertRule, deleteAlertRule,
  listAlertHistory, createAlertHistoryEntry,
} from "./db";
import { sendTeamsAlert, testWebhookConnection, buildLabourAlert, buildReportOverdueAlert, buildSalesDropAlert, buildDailySummaryAlert } from "./teams";
import type { AlertPayload } from "./teams";

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
});

export type AppRouter = typeof appRouter;
