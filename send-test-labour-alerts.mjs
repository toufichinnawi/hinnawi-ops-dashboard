import 'dotenv/config';

// Get yesterday's date in EST
const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const estDate = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Toronto" }); // YYYY-MM-DD
const displayDate = yesterday.toLocaleDateString("en-US", { timeZone: "America/Toronto", year: "numeric", month: "long", day: "2-digit" });

console.log(`[TestLabourAlert] Checking yesterday's data: ${estDate} (${displayDate})`);

const { getKoomiSalesByDateRange, getSevenShiftsSalesByDateRange, getExcelLabourByDateRange } = await import("./server/db.ts");
const { sendLabourAlertToChats } = await import("./server/teamsChat.ts");

const STORES = [
  { id: "tunnel", name: "Cathcart (Tunnel)", labourTarget: 24, koomiId: "1036" },
  { id: "ontario", name: "Ontario", labourTarget: 28 },
  { id: "mk", name: "Mackay", labourTarget: 23, koomiId: "2207" },
  { id: "pk", name: "President Kennedy", labourTarget: 18, koomiId: "1037" },
];

const koomiData = await getKoomiSalesByDateRange(estDate, estDate);
const sevenData = await getSevenShiftsSalesByDateRange(estDate, estDate);
const excelData = await getExcelLabourByDateRange(estDate, estDate);

console.log(`Koomi rows: ${koomiData.length}, 7shifts rows: ${sevenData.length}, Excel rows: ${excelData.length}`);

// Ontario labour cost override from user: $172
const ONTARIO_LABOUR_COST_OVERRIDE = 172;

let alertsSent = 0;

for (const store of STORES) {
  let netSales = 0;
  let labourPercent = 0;
  let labourCost = 0;
  let hasData = false;

  if (store.koomiId) {
    const koomiRow = koomiData.find(k => k.koomiLocationId === store.koomiId);
    if (koomiRow) {
      netSales = Number(koomiRow.netSales) || 0;
      labourPercent = Number(koomiRow.labourPercent) || 0;
      labourCost = (labourPercent / 100) * netSales;
      hasData = true;
    }
  }
  if (store.id === "ontario") {
    const sevenRow = sevenData.find(s => s.date === estDate);
    if (sevenRow) {
      netSales = Number(sevenRow.totalSales) || 0;
      hasData = true;
    }
    // Use the user-provided labour cost for Ontario
    labourCost = ONTARIO_LABOUR_COST_OVERRIDE;
    labourPercent = netSales > 0 ? (labourCost / netSales) * 100 : 0;
  }
  const excelRow = excelData.find(e => e.storeId === store.id);
  if (excelRow) {
    if (Number(excelRow.netSales) > 0) netSales = Number(excelRow.netSales);
    if (Number(excelRow.labourPercent) > 0) labourPercent = Number(excelRow.labourPercent);
    if (Number(excelRow.labourCost) > 0) labourCost = Number(excelRow.labourCost);
    else labourCost = (labourPercent / 100) * netSales;
    hasData = true;
  }

  if (!hasData) {
    console.log(`  ${store.name}: No data, skipping`);
    continue;
  }

  console.log(`  ${store.name}: Sales=$${netSales.toFixed(2)}, Labour=${labourPercent.toFixed(2)}%, LabourCost=$${labourCost.toFixed(2)}, Target=${store.labourTarget}%`);

  if (labourPercent <= store.labourTarget) {
    console.log(`    → Below target, no alert needed`);
    continue;
  }

  console.log(`    → ABOVE TARGET! Sending alert...`);
  const result = await sendLabourAlertToChats(store.id, store.name, labourPercent, store.labourTarget, netSales, labourCost, displayDate);
  console.log(`    → TRD: ${result.trd.success ? "OK" : result.trd.error}`);
  if (result.store) {
    console.log(`    → Store chat: ${result.store.success ? "OK" : result.store.error}`);
  }
  alertsSent++;
}

console.log(`\n[TestLabourAlert] Done. ${alertsSent} alert(s) sent.`);
process.exit(0);
