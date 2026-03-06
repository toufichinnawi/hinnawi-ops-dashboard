import 'dotenv/config';

// Get yesterday's date in EST
const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const estDate = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Toronto" }); // YYYY-MM-DD
const displayDate = yesterday.toLocaleDateString("en-US", { timeZone: "America/Toronto", year: "numeric", month: "long", day: "2-digit" });

console.log(`[TestReport] Fetching data for yesterday: ${estDate} (${displayDate})`);

// Import database helpers
const { getKoomiSalesByDateRange, getSevenShiftsSalesByDateRange, getExcelLabourByDateRange } = await import("./server/db.ts");
const { sendDailyReportToChat } = await import("./server/teamsChat.ts");

const STORES = [
  { id: "tunnel", name: "Cathcart (Tunnel)", labourTarget: 24, koomiId: "1036" },
  { id: "ontario", name: "Ontario", labourTarget: 28 },
  { id: "mk", name: "Mackay", labourTarget: 23, koomiId: "2207" },
  { id: "pk", name: "President Kennedy", labourTarget: 18, koomiId: "1037" },
];

const koomiData = await getKoomiSalesByDateRange(estDate, estDate);
const sevenData = await getSevenShiftsSalesByDateRange(estDate, estDate);
const excelData = await getExcelLabourByDateRange(estDate, estDate);

console.log(`[TestReport] Koomi rows: ${koomiData.length}, 7shifts rows: ${sevenData.length}, Excel rows: ${excelData.length}`);

const storeReports = [];

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

  if (hasData) {
    storeReports.push({
      storeName: store.name,
      netSales,
      labourPercent,
      labourTarget: store.labourTarget,
    });
    console.log(`  ${store.name}: Sales=$${netSales.toFixed(2)}, Labour=${labourPercent.toFixed(2)}%`);
  } else {
    console.log(`  ${store.name}: No data`);
  }
}

if (storeReports.length === 0) {
  console.log("[TestReport] No data found for yesterday. Cannot send report.");
  process.exit(1);
}

console.log(`\n[TestReport] Sending report for ${displayDate} to TRD Management...`);
const result = await sendDailyReportToChat(displayDate, storeReports);

if (result.success) {
  console.log(`[TestReport] SUCCESS! Message ID: ${result.messageId}`);
} else {
  console.log(`[TestReport] FAILED: ${result.error}`);
}

process.exit(0);
