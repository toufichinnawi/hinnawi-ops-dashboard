/**
 * Excel Parser Service — Parses the SharePoint {{DAILY REPORT}}.xlsx file
 * 
 * File structure (Sheet1):
 *   Col A: Id (form submission ID)
 *   Col B: Start time
 *   Col C: Completion time
 *   Col D: Email
 *   Col E: Name
 *   Col F: Business Date
 *   Col G: Store (Tunnel, Ontario, Mackay, President Kennedy)
 *   Col H: Net Sales ($)
 *   Col I: Labour ($)
 *   Col J: Notes
 *   Col K: Labour % (formula)
 */

import * as XLSX from "xlsx";

// Map store names from Excel to our internal store IDs
const STORE_NAME_TO_ID: Record<string, string> = {
  "Tunnel": "tunnel",
  "Ontario": "ontario",
  "Mackay": "mk",
  "President Kennedy": "pk",
};

export interface ParsedLabourRow {
  sourceRowId: number;
  date: string;       // YYYY-MM-DD
  store: string;      // Original store name from Excel
  storeId: string;    // Internal store ID
  netSales: number;
  labourCost: number;
  labourPercent: number;
  notes: string | null;
}

export interface ParseResult {
  success: boolean;
  rows: ParsedLabourRow[];
  dateRange: { from: string; to: string } | null;
  errors: string[];
  skipped: number;
}

/**
 * Parse an Excel buffer (from file upload) into structured labour data rows
 */
export function parseExcelBuffer(buffer: Buffer): ParseResult {
  const errors: string[] = [];
  const rows: ParsedLabourRow[] = [];
  let skipped = 0;

  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    
    // Use Sheet1 (the main data sheet)
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, rows: [], dateRange: null, errors: ["No sheets found in workbook"], skipped: 0 };
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return { success: false, rows: [], dateRange: null, errors: ["Sheet is empty"], skipped: 0 };
    }

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false, dateNF: "yyyy-mm-dd" });

    if (jsonData.length === 0) {
      return { success: false, rows: [], dateRange: null, errors: ["No data rows found"], skipped: 0 };
    }

    // Detect column names (they might vary slightly)
    const firstRow = jsonData[0];
    const colKeys = Object.keys(firstRow);
    
    // Find the relevant columns by position or name
    const idCol = findColumn(colKeys, ["Id", "ID", "id"]);
    const dateCol = findColumn(colKeys, ["Business Date", "BusinessDate", "Date", "business date"]);
    const storeCol = findColumn(colKeys, ["Store", "store", "Location"]);
    const salesCol = findColumn(colKeys, ["Net Sales", "NetSales", "Sales", "net sales"]);
    const labourCol = findColumn(colKeys, ["Labour", "Labor", "Labour Cost", "labor", "labour"]);
    const notesCol = findColumn(colKeys, ["Notes", "notes", "Comment", "Comments"]);

    if (!dateCol || !storeCol || !salesCol || !labourCol) {
      return {
        success: false,
        rows: [],
        dateRange: null,
        errors: [
          `Could not find required columns. Found: ${colKeys.join(", ")}`,
          `Missing: ${!dateCol ? "Business Date" : ""} ${!storeCol ? "Store" : ""} ${!salesCol ? "Net Sales" : ""} ${!labourCol ? "Labour" : ""}`.trim(),
        ],
        skipped: 0,
      };
    }

    console.log(`[ExcelParser] Detected columns — Date: "${dateCol}", Store: "${storeCol}", Sales: "${salesCol}", Labour: "${labourCol}"`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      try {
        const rawDate = row[dateCol];
        const rawStore = row[storeCol];
        const rawSales = row[salesCol];
        const rawLabour = row[labourCol];
        const rawNotes = notesCol ? row[notesCol] : null;
        const rawId = idCol ? row[idCol] : i + 1;

        // Skip rows with missing essential data
        if (!rawDate || !rawStore || rawSales === undefined || rawLabour === undefined) {
          skipped++;
          continue;
        }

        // Parse date
        const date = parseDate(rawDate);
        if (!date) {
          errors.push(`Row ${i + 2}: Invalid date "${rawDate}"`);
          skipped++;
          continue;
        }

        // Parse store name
        const storeName = String(rawStore).trim();
        const storeId = STORE_NAME_TO_ID[storeName];
        if (!storeId) {
          errors.push(`Row ${i + 2}: Unknown store "${storeName}"`);
          skipped++;
          continue;
        }

        // Parse numeric values
        const netSales = parseNumber(rawSales);
        const labourCost = parseNumber(rawLabour);

        if (isNaN(netSales) || isNaN(labourCost)) {
          errors.push(`Row ${i + 2}: Invalid numbers — sales="${rawSales}", labour="${rawLabour}"`);
          skipped++;
          continue;
        }

        const labourPercent = netSales > 0 ? parseFloat(((labourCost / netSales) * 100).toFixed(1)) : 0;

        rows.push({
          sourceRowId: typeof rawId === "number" ? rawId : parseInt(String(rawId)) || (i + 1),
          date,
          store: storeName,
          storeId,
          netSales,
          labourCost,
          labourPercent,
          notes: rawNotes ? String(rawNotes).trim() : null,
        });
      } catch (rowErr: any) {
        errors.push(`Row ${i + 2}: ${rowErr.message}`);
        skipped++;
      }
    }

    // Compute date range
    let dateRange: { from: string; to: string } | null = null;
    if (rows.length > 0) {
      const dates = rows.map(r => r.date).sort();
      dateRange = { from: dates[0], to: dates[dates.length - 1] };
    }

    console.log(`[ExcelParser] Parsed ${rows.length} rows, skipped ${skipped}, errors: ${errors.length}`);
    if (dateRange) {
      console.log(`[ExcelParser] Date range: ${dateRange.from} to ${dateRange.to}`);
    }

    return {
      success: rows.length > 0,
      rows,
      dateRange,
      errors,
      skipped,
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      dateRange: null,
      errors: [`Failed to parse Excel file: ${err.message}`],
      skipped: 0,
    };
  }
}

/**
 * Find a column key that matches one of the expected names
 */
function findColumn(keys: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const found = keys.find(k => k.toLowerCase().trim() === candidate.toLowerCase().trim());
    if (found) return found;
  }
  // Partial match fallback
  for (const candidate of candidates) {
    const found = keys.find(k => k.toLowerCase().includes(candidate.toLowerCase()));
    if (found) return found;
  }
  return null;
}

/**
 * Parse a date value from Excel (could be Date object, string, or serial number)
 */
function parseDate(value: any): string | null {
  if (!value) return null;

  // If it's already a Date object
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(value).trim();

  // Try YYYY-MM-DD format
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  // Try M/D/YYYY or MM/DD/YYYY format
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    return `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }

  // Try M/D/YY or MM/DD/YY format (2-digit year)
  const usMatch2 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (usMatch2) {
    const yy = parseInt(usMatch2[3]);
    const fullYear = yy >= 0 && yy <= 50 ? 2000 + yy : 1900 + yy;
    return `${fullYear}-${usMatch2[1].padStart(2, "0")}-${usMatch2[2].padStart(2, "0")}`;
  }

  // Try Excel serial number
  const num = parseFloat(str);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const date = XLSX.SSF.parse_date_code(num);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Parse a number from various formats (string with commas, currency symbols, etc.)
 */
function parseNumber(value: any): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[$,\s]/g, "").trim();
  return parseFloat(cleaned) || 0;
}
