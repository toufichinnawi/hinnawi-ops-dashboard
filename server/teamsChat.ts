/**
 * Teams Chat Service — sends messages to Teams group chats via Microsoft Graph API
 * Uses Resource Owner Password Credentials (ROPC) flow with systems@bagelandcafe.com
 */
import axios from "axios";
import { ENV } from "./_core/env";
import { AXIOS_TIMEOUT_MS } from "../shared/const";
import type { StoreReport } from "./teams";

// ─── Chat ID Mapping ────────────────────────────────────────────

export const TEAMS_CHAT_IDS = {
  trd: "19:3a819daf63f440c0a3eeb2390331ed6c@thread.v2",
  ontario: "19:d45ac2a30add4c81aff992d9601418a1@thread.v2",
  tunnel: "19:aeb41e9753f7418db1f50c832985ee02@thread.v2",
  mackay: "19:e0c34661b5e9421ab2675ab58e535728@thread.v2",
  pk: "19:11c65fddb9c142f3b11ef6624ce7aae3@thread.v2",
} as const;

export type TeamsChatKey = keyof typeof TEAMS_CHAT_IDS;

// Map store IDs to their specific chat keys
const STORE_TO_CHAT: Record<string, TeamsChatKey> = {
  ontario: "ontario",
  tunnel: "tunnel",
  mk: "mackay",
  mackay: "mackay",
  pk: "pk",
};

// ─── Token Management ───────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getGraphToken(): Promise<string> {
  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return cachedToken;
  }

  const { msGraphUsername, msGraphPassword, msGraphClientId } = ENV;
  if (!msGraphUsername || !msGraphPassword) {
    throw new Error("[TeamsChat] MS_GRAPH_USERNAME and MS_GRAPH_PASSWORD are required");
  }

  const params = new URLSearchParams({
    client_id: msGraphClientId,
    scope: "https://graph.microsoft.com/.default",
    username: msGraphUsername,
    password: msGraphPassword,
    grant_type: "password",
  });

  const response = await axios.post(
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
    params.toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: AXIOS_TIMEOUT_MS,
    }
  );

  cachedToken = response.data.access_token;
  // Token typically expires in 1 hour
  tokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000;
  return cachedToken!;
}

// ─── Send Message to Chat ───────────────────────────────────────

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendChatMessage(
  chatId: string,
  htmlContent: string
): Promise<SendResult> {
  try {
    const token = await getGraphToken();
    const response = await axios.post(
      `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`,
      {
        body: {
          contentType: "html",
          content: htmlContent,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: AXIOS_TIMEOUT_MS,
      }
    );

    return {
      success: true,
      messageId: response.data.id,
    };
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || "Unknown error";
    console.error(`[TeamsChat] Failed to send to ${chatId}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ─── Format Helpers ─────────────────────────────────────────────

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Daily Sales & Labour Report ────────────────────────────────

function buildDailyReportHtml(date: string, stores: StoreReport[]): string {
  const totalSales = stores.reduce((sum, s) => sum + s.netSales, 0);
  const avgLabour = stores.length > 0
    ? stores.reduce((sum, s) => sum + s.labourPercent, 0) / stores.length
    : 0;

  let html = `<b>📊 Daily Sales &amp; Labour Report</b><br>`;
  html += `<b>${date}</b><br><br>`;

  stores.forEach((store, i) => {
    if (i > 0) {
      html += `────────────────────────<br>`;
    }
    const isOver = store.labourTarget !== undefined && store.labourPercent > store.labourTarget;
    html += `<b>Store:</b> ${store.storeName}<br>`;
    html += `<b>Net Sales:</b> ${formatCurrency(store.netSales)}<br>`;
    html += `<b>Labour%:</b> ${store.labourPercent.toFixed(2)}%${isOver ? " ⚠️" : ""}<br><br>`;
  });

  html += `════════════════════════<br>`;
  html += `<b>Total Net Sales:</b> ${formatCurrency(totalSales)}<br>`;
  html += `<b>Avg Labour%:</b> ${avgLabour.toFixed(2)}%<br><br>`;
  html += `<em>Hinnawi Bros Operations Dashboard</em>`;

  return html;
}

/**
 * Sends the daily sales & labour report to the TRD Management group chat.
 */
export async function sendDailyReportToChat(
  date: string,
  stores: StoreReport[]
): Promise<SendResult> {
  const html = buildDailyReportHtml(date, stores);
  console.log("[TeamsChat] Sending daily report to TRD Management...");
  const result = await sendChatMessage(TEAMS_CHAT_IDS.trd, html);
  if (result.success) {
    console.log("[TeamsChat] Daily report sent successfully");
  }
  return result;
}

// ─── High Labour Alert ──────────────────────────────────────────

function buildLabourAlertHtml(
  storeName: string,
  labourPercent: number,
  labourTarget: number,
  netSales: number,
  date: string
): string {
  const overBy = labourPercent - labourTarget;
  const emoji = overBy > 10 ? "🚨" : "⚠️";
  const severity = overBy > 10 ? "CRITICAL" : "WARNING";

  let html = `<b>${emoji} High Labour Alert — ${storeName}</b><br><br>`;
  html += `<b>Severity:</b> ${severity}<br>`;
  html += `<b>Store:</b> ${storeName}<br>`;
  html += `<b>Labour%:</b> ${labourPercent.toFixed(2)}% (Target: ${labourTarget}%)<br>`;
  html += `<b>Over by:</b> ${overBy.toFixed(1)}%<br>`;
  html += `<b>Net Sales:</b> ${formatCurrency(netSales)}<br>`;
  html += `<b>Date:</b> ${date}<br><br>`;
  html += `<em>Hinnawi Bros Operations Dashboard</em>`;

  return html;
}

/**
 * Sends a high labour alert to both the TRD Management chat
 * AND the store-specific management chat.
 */
export async function sendLabourAlertToChats(
  storeId: string,
  storeName: string,
  labourPercent: number,
  labourTarget: number,
  netSales: number,
  date: string
): Promise<{ trd: SendResult; store: SendResult | null }> {
  const html = buildLabourAlertHtml(storeName, labourPercent, labourTarget, netSales, date);

  console.log(`[TeamsChat] Sending labour alert for ${storeName} to TRD Management...`);
  const trdResult = await sendChatMessage(TEAMS_CHAT_IDS.trd, html);

  // Also send to the store-specific chat
  const storeChatKey = STORE_TO_CHAT[storeId];
  let storeResult: SendResult | null = null;
  if (storeChatKey) {
    console.log(`[TeamsChat] Sending labour alert for ${storeName} to ${storeChatKey} management...`);
    storeResult = await sendChatMessage(TEAMS_CHAT_IDS[storeChatKey], html);
  }

  return { trd: trdResult, store: storeResult };
}

/**
 * Test the Graph API connection by sending a test message to TRD Management.
 */
export async function testChatConnection(): Promise<SendResult> {
  const html = `<b>🧪 Connection Test</b><br>This is a test message from the Hinnawi Bros Operations Dashboard. If you see this, the automated Teams chat reports are working!`;
  return sendChatMessage(TEAMS_CHAT_IDS.trd, html);
}

export { sendChatMessage, STORE_TO_CHAT };
