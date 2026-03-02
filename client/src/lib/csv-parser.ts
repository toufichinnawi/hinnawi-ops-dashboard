// MYR POS CSV Report Parser
// Handles Net Report, Breakdown Report, and Labour/Punch Clock data
import Papa from "papaparse";

export interface ParsedNetReport {
  storeName: string;
  period: string;
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  dailyBreakdown: { date: string; sales: number; orders: number }[];
  taxCollected: number;
  refunds: number;
}

export interface ParsedBreakdownReport {
  storeName: string;
  period: string;
  items: { name: string; category: string; qtySold: number; revenue: number; qtyRefunded: number }[];
}

export interface ParsedLabourReport {
  storeName: string;
  period: string;
  employees: { name: string; role: string; hoursWorked: number; labourCost: number }[];
  totalHours: number;
  totalCost: number;
}

export type ReportType = "net" | "breakdown" | "labour" | "unknown";

// Detect what type of MYR report this CSV is
export function detectReportType(headers: string[]): ReportType {
  const lower = headers.map((h) => h.toLowerCase().trim());

  // Net report typically has date, sales/revenue, orders columns
  if (
    lower.some((h) => h.includes("date") || h.includes("day")) &&
    lower.some((h) => h.includes("sales") || h.includes("revenue") || h.includes("net") || h.includes("total"))
  ) {
    // Check if it also has labour columns — if so, it's a combined report
    if (lower.some((h) => h.includes("labour") || h.includes("labor") || h.includes("wage") || h.includes("hours"))) {
      return "labour";
    }
    return "net";
  }

  // Breakdown report has item/product, quantity, category columns
  if (
    lower.some((h) => h.includes("item") || h.includes("product") || h.includes("name")) &&
    lower.some((h) => h.includes("qty") || h.includes("quantity") || h.includes("sold"))
  ) {
    return "breakdown";
  }

  // Labour report has employee, hours, cost/wage columns
  if (
    lower.some((h) => h.includes("employee") || h.includes("staff") || h.includes("name")) &&
    lower.some((h) => h.includes("hours") || h.includes("hour") || h.includes("labour") || h.includes("labor") || h.includes("wage") || h.includes("cost"))
  ) {
    return "labour";
  }

  return "unknown";
}

// Parse a numeric value from a string, handling currency symbols and commas
function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Find the best matching column header
function findCol(headers: string[], ...keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex((h) => h.toLowerCase().trim().includes(kw));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseNetReport(csvText: string, storeName: string): ParsedNetReport {
  const result = Papa.parse(csvText, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];

  if (rows.length < 2) {
    return { storeName, period: "", totalSales: 0, totalOrders: 0, avgOrderValue: 0, dailyBreakdown: [], taxCollected: 0, refunds: 0 };
  }

  const headers = rows[0];
  const dateCol = findCol(headers, "date", "day", "period");
  const salesCol = findCol(headers, "net sales", "total sales", "sales", "revenue", "net", "total");
  const ordersCol = findCol(headers, "orders", "order count", "transactions", "# orders", "count");
  const taxCol = findCol(headers, "tax", "taxes");
  const refundCol = findCol(headers, "refund", "void");

  const dataRows = rows.slice(1).filter((r) => r.length >= 2 && r[0].trim() !== "");

  const dailyBreakdown = dataRows.map((r) => ({
    date: dateCol >= 0 ? r[dateCol]?.trim() ?? "" : "",
    sales: salesCol >= 0 ? parseNum(r[salesCol]) : 0,
    orders: ordersCol >= 0 ? parseNum(r[ordersCol]) : 0,
  })).filter((d) => d.date && (d.sales > 0 || d.orders > 0));

  const totalSales = dailyBreakdown.reduce((s, d) => s + d.sales, 0);
  const totalOrders = dailyBreakdown.reduce((s, d) => s + d.orders, 0);
  const taxCollected = dataRows.reduce((s, r) => s + (taxCol >= 0 ? parseNum(r[taxCol]) : 0), 0);
  const refunds = dataRows.reduce((s, r) => s + (refundCol >= 0 ? parseNum(r[refundCol]) : 0), 0);

  const firstDate = dailyBreakdown[0]?.date ?? "";
  const lastDate = dailyBreakdown[dailyBreakdown.length - 1]?.date ?? "";
  const period = firstDate && lastDate ? `${firstDate} — ${lastDate}` : "";

  return {
    storeName,
    period,
    totalSales,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    dailyBreakdown,
    taxCollected,
    refunds,
  };
}

export function parseBreakdownReport(csvText: string, storeName: string): ParsedBreakdownReport {
  const result = Papa.parse(csvText, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];

  if (rows.length < 2) {
    return { storeName, period: "", items: [] };
  }

  const headers = rows[0];
  const nameCol = findCol(headers, "item", "product", "name", "description");
  const catCol = findCol(headers, "category", "group", "type");
  const qtyCol = findCol(headers, "qty sold", "quantity sold", "qty", "quantity", "sold");
  const revCol = findCol(headers, "revenue", "sales", "total", "amount");
  const refQtyCol = findCol(headers, "qty refund", "refund qty", "refunded");

  const dataRows = rows.slice(1).filter((r) => r.length >= 2);

  const items = dataRows.map((r) => ({
    name: nameCol >= 0 ? r[nameCol]?.trim() ?? "" : "",
    category: catCol >= 0 ? r[catCol]?.trim() ?? "" : "Uncategorized",
    qtySold: qtyCol >= 0 ? parseNum(r[qtyCol]) : 0,
    revenue: revCol >= 0 ? parseNum(r[revCol]) : 0,
    qtyRefunded: refQtyCol >= 0 ? parseNum(r[refQtyCol]) : 0,
  })).filter((item) => item.name);

  return { storeName, period: "", items };
}

export function parseLabourReport(csvText: string, storeName: string): ParsedLabourReport {
  const result = Papa.parse(csvText, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];

  if (rows.length < 2) {
    return { storeName, period: "", employees: [], totalHours: 0, totalCost: 0 };
  }

  const headers = rows[0];
  const nameCol = findCol(headers, "employee", "staff", "name", "worker");
  const roleCol = findCol(headers, "role", "position", "title", "job");
  const hoursCol = findCol(headers, "hours", "total hours", "hours worked");
  const costCol = findCol(headers, "cost", "wage", "labour", "labor", "pay", "amount");

  // If this is a combined net+labour report (date, sales, labour columns)
  const dateCol = findCol(headers, "date", "day");
  const salesCol = findCol(headers, "sales", "revenue", "net");
  const labourCol = findCol(headers, "labour", "labor", "wage", "labour cost", "labor cost");

  // Combined report format: date | sales | labour cost | hours
  if (dateCol >= 0 && salesCol >= 0 && labourCol >= 0 && nameCol < 0) {
    const dataRows = rows.slice(1).filter((r) => r.length >= 2 && r[0].trim() !== "");
    const totalCost = dataRows.reduce((s, r) => s + parseNum(r[labourCol]), 0);
    const totalHours = hoursCol >= 0 ? dataRows.reduce((s, r) => s + parseNum(r[hoursCol]), 0) : 0;

    return {
      storeName,
      period: "",
      employees: [],
      totalHours,
      totalCost,
    };
  }

  // Standard employee-level labour report
  const dataRows = rows.slice(1).filter((r) => r.length >= 2);

  const employees = dataRows.map((r) => ({
    name: nameCol >= 0 ? r[nameCol]?.trim() ?? "" : "",
    role: roleCol >= 0 ? r[roleCol]?.trim() ?? "" : "",
    hoursWorked: hoursCol >= 0 ? parseNum(r[hoursCol]) : 0,
    labourCost: costCol >= 0 ? parseNum(r[costCol]) : 0,
  })).filter((e) => e.name);

  const totalHours = employees.reduce((s, e) => s + e.hoursWorked, 0);
  const totalCost = employees.reduce((s, e) => s + e.labourCost, 0);

  return { storeName, period: "", employees, totalHours, totalCost };
}

export interface ParseResult {
  type: ReportType;
  storeName: string;
  fileName: string;
  uploadedAt: string;
  net?: ParsedNetReport;
  breakdown?: ParsedBreakdownReport;
  labour?: ParsedLabourReport;
  error?: string;
}

export function parseCSV(csvText: string, fileName: string, storeName: string): ParseResult {
  try {
    const preview = Papa.parse(csvText, { header: false, skipEmptyLines: true, preview: 2 });
    const headers = (preview.data as string[][])[0] ?? [];

    const type = detectReportType(headers);

    const base: ParseResult = {
      type,
      storeName,
      fileName,
      uploadedAt: new Date().toISOString(),
    };

    switch (type) {
      case "net":
        return { ...base, net: parseNetReport(csvText, storeName) };
      case "breakdown":
        return { ...base, breakdown: parseBreakdownReport(csvText, storeName) };
      case "labour":
        return { ...base, labour: parseLabourReport(csvText, storeName) };
      default:
        return { ...base, error: "Could not detect report type. Please ensure the CSV has appropriate column headers (e.g., Date, Sales, Orders for Net Reports; Employee, Hours, Cost for Labour Reports)." };
    }
  } catch (err) {
    return {
      type: "unknown",
      storeName,
      fileName,
      uploadedAt: new Date().toISOString(),
      error: `Failed to parse CSV: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
