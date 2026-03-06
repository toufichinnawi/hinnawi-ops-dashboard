/**
 * Teams Webhook Service
 * Sends Adaptive Card messages to Microsoft Teams via Incoming Webhooks (Workflows)
 */
import axios from "axios";
import { AXIOS_TIMEOUT_MS } from "../shared/const";

// ─── Adaptive Card Templates ─────────────────────────────────────

interface AlertPayload {
  title: string;
  message: string;
  severity: "critical" | "warning" | "info" | "success";
  storeName?: string;
  metric?: string;
  currentValue?: string;
  threshold?: string;
  timestamp?: string;
}

const severityColors: Record<string, string> = {
  critical: "attention",
  warning: "warning",
  info: "accent",
  success: "good",
};

const severityEmoji: Record<string, string> = {
  critical: "\u{1F6A8}",
  warning: "\u{26A0}\u{FE0F}",
  info: "\u{2139}\u{FE0F}",
  success: "\u{2705}",
};

function buildAdaptiveCard(payload: AlertPayload) {
  const facts: Array<{ title: string; value: string }> = [];

  if (payload.storeName) {
    facts.push({ title: "Store", value: payload.storeName });
  }
  if (payload.metric) {
    facts.push({ title: "Metric", value: payload.metric });
  }
  if (payload.currentValue) {
    facts.push({ title: "Current Value", value: payload.currentValue });
  }
  if (payload.threshold) {
    facts.push({ title: "Threshold", value: payload.threshold });
  }
  facts.push({
    title: "Time",
    value: payload.timestamp || new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }),
  });

  const body: any[] = [
    {
      type: "TextBlock",
      text: `${severityEmoji[payload.severity] || ""} ${payload.title}`,
      weight: "Bolder",
      size: "Medium",
      color: severityColors[payload.severity] || "default",
      wrap: true,
    },
    {
      type: "TextBlock",
      text: payload.message,
      wrap: true,
      spacing: "Small",
    },
  ];

  if (facts.length > 0) {
    body.push({
      type: "FactSet",
      facts,
      spacing: "Medium",
    });
  }

  body.push({
    type: "TextBlock",
    text: "Hinnawi Bros Operations Dashboard",
    size: "Small",
    isSubtle: true,
    spacing: "Medium",
    horizontalAlignment: "Right",
  });

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body,
        },
      },
    ],
  };
}

// ─── Send to Teams ───────────────────────────────────────────────

export async function sendTeamsAlert(
  webhookUrl: string,
  payload: AlertPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const card = buildAdaptiveCard(payload);
    const response = await axios.post(webhookUrl, card, {
      headers: { "Content-Type": "application/json" },
      timeout: AXIOS_TIMEOUT_MS,
    });

    // Teams webhooks return 200 or 202 on success
    if (response.status >= 200 && response.status < 300) {
      return { success: true };
    }
    return { success: false, error: `Unexpected status: ${response.status}` };
  } catch (err: any) {
    const errorMsg = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message || "Unknown error";
    console.error("[Teams] Failed to send alert:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function testWebhookConnection(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  return sendTeamsAlert(webhookUrl, {
    title: "Connection Test",
    message: "This is a test message from the Hinnawi Bros Operations Dashboard. If you can see this, the webhook is configured correctly!",
    severity: "success",
    timestamp: new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }),
  });
}

// ─── Pre-built Alert Generators ──────────────────────────────────

export function buildLabourAlert(
  storeName: string,
  labourPercent: number,
  threshold: number
): AlertPayload {
  const severity = labourPercent > threshold + 5 ? "critical" : "warning";
  return {
    title: "Labour Cost Alert",
    message: `Labour costs at ${storeName} have exceeded the target threshold.`,
    severity,
    storeName,
    metric: "Labour %",
    currentValue: `${labourPercent.toFixed(1)}%`,
    threshold: `${threshold}%`,
  };
}

export function buildReportOverdueAlert(
  storeName: string,
  reportType: string,
  managerName?: string
): AlertPayload {
  return {
    title: "Overdue Report",
    message: `The ${reportType} for ${storeName} has not been submitted.${managerName ? ` Assigned to: ${managerName}` : ""}`,
    severity: "warning",
    storeName,
    metric: reportType,
  };
}

export function buildSalesDropAlert(
  storeName: string,
  currentSales: number,
  previousSales: number,
  dropPercent: number
): AlertPayload {
  return {
    title: "Sales Drop Alert",
    message: `Sales at ${storeName} have dropped significantly compared to the previous period.`,
    severity: dropPercent > 20 ? "critical" : "warning",
    storeName,
    metric: "Daily Sales",
    currentValue: `$${currentSales.toLocaleString()}`,
    threshold: `$${previousSales.toLocaleString()} (previous)`,
  };
}

export function buildDailySummaryAlert(
  totalSales: number,
  avgLabourPercent: number,
  reportsSubmitted: number,
  totalReports: number,
  storeCount: number
): AlertPayload {
  return {
    title: "Daily Operations Summary",
    message: `End-of-day summary for all ${storeCount} stores.`,
    severity: "info",
    metric: "Daily Summary",
    currentValue: `Sales: $${totalSales.toLocaleString()} | Labour: ${avgLabourPercent.toFixed(1)}% | Reports: ${reportsSubmitted}/${totalReports}`,
  };
}

// ─── Daily Sales & Labour Report Card ────────────────────────────

export interface StoreReport {
  storeName: string;
  netSales: number;
  labourPercent: number;
  labourTarget?: number;
}

/**
 * Builds a formatted Adaptive Card for the daily sales & labour report.
 * Format matches the user's requested style:
 *   Store: Tunnel
 *   Net Sales: $902.98
 *   Labour%: 15.66
 */
export function buildDailySalesLabourCard(date: string, stores: StoreReport[]) {
  const body: any[] = [
    {
      type: "TextBlock",
      text: `\u{1F4CA} Daily Sales & Labour Report`,
      weight: "Bolder",
      size: "Medium",
      color: "accent",
      wrap: true,
    },
    {
      type: "TextBlock",
      text: date,
      weight: "Bolder",
      size: "Default",
      spacing: "Small",
    },
  ];

  stores.forEach((store, i) => {
    const isOverTarget = store.labourTarget !== undefined && store.labourPercent > store.labourTarget;
    const labourColor = isOverTarget ? "attention" : "default";

    if (i > 0) {
      body.push({
        type: "TextBlock",
        text: "────────────────────────",
        spacing: "Small",
        isSubtle: true,
        size: "Small",
      });
    }

    body.push({
      type: "FactSet",
      facts: [
        { title: "Store", value: store.storeName },
        { title: "Net Sales", value: `$${store.netSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { title: "Labour%", value: `${store.labourPercent.toFixed(2)}%${isOverTarget ? " \u{26A0}\u{FE0F}" : ""}` },
      ],
      spacing: i === 0 ? "Medium" : "Small",
    });
  });

  // Total summary row
  const totalSales = stores.reduce((sum, s) => sum + s.netSales, 0);
  const avgLabour = stores.length > 0
    ? stores.reduce((sum, s) => sum + s.labourPercent, 0) / stores.length
    : 0;

  body.push(
    {
      type: "TextBlock",
      text: "════════════════════════",
      spacing: "Small",
      isSubtle: true,
      size: "Small",
    },
    {
      type: "FactSet",
      facts: [
        { title: "Total Net Sales", value: `$${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { title: "Avg Labour%", value: `${avgLabour.toFixed(2)}%` },
      ],
      spacing: "Small",
    },
    {
      type: "TextBlock",
      text: "Hinnawi Bros Operations Dashboard",
      size: "Small",
      isSubtle: true,
      spacing: "Medium",
      horizontalAlignment: "Right",
    }
  );

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body,
        },
      },
    ],
  };
}

/**
 * Sends the daily sales & labour report card to a webhook URL.
 */
export async function sendDailySalesLabourReport(
  webhookUrl: string,
  date: string,
  stores: StoreReport[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const card = buildDailySalesLabourCard(date, stores);
    const response = await axios.post(webhookUrl, card, {
      headers: { "Content-Type": "application/json" },
      timeout: AXIOS_TIMEOUT_MS,
    });
    if (response.status >= 200 && response.status < 300) {
      return { success: true };
    }
    return { success: false, error: `Unexpected status: ${response.status}` };
  } catch (err: any) {
    const errorMsg = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message || "Unknown error";
    console.error("[Teams] Failed to send daily report:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ─── High Labour Alert (per-store, automatic) ───────────────────

/**
 * Builds and sends a high labour alert for a specific store.
 * Triggered automatically when labour % exceeds the store's target.
 */
export function buildHighLabourAlert(
  storeName: string,
  labourPercent: number,
  labourTarget: number,
  netSales: number,
  date: string
): AlertPayload {
  const overBy = labourPercent - labourTarget;
  const severity = overBy > 10 ? "critical" : "warning";
  return {
    title: `High Labour Alert — ${storeName}`,
    message: `Labour at ${storeName} is ${overBy.toFixed(1)}% above the ${labourTarget}% target.`,
    severity,
    storeName,
    metric: "Labour %",
    currentValue: `${labourPercent.toFixed(2)}% (Target: ${labourTarget}%)`,
    threshold: `Net Sales: $${netSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    timestamp: date,
  };
}

export type { AlertPayload };
