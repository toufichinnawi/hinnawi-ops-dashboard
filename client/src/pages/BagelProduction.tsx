import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { stores } from "@/lib/data";
import { CircleDot, Package, Users2, Store, BoxIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateFilter, getDefaultDateFilter, type DateFilterValue } from "@/components/DateFilter";
import { format } from "date-fns";

const BAGEL_TYPES = [
  "Sesame Bagel", "Everything Bagel", "Plain Bagel", "Mini-Bagel Plain",
  "Poppy Seeds Bagel", "Multigrain Bagel", "Cheese Bagel", "Rosemary Bagel",
  "Cinnamon Sugar Bagel", "Cinnamon Raisin Bagel", "Blueberry Bagel", "Coconut Bagel",
];

// White Dough bagels: 1 DZ = 1 Kg
const WHITE_DOUGH_TYPES = [
  "Sesame Bagel", "Everything Bagel", "Plain Bagel", "Poppy Seeds Bagel",
];

// Map various location formats to a canonical store ID
function normalizeLocation(loc: string): string {
  const lower = loc.toLowerCase().trim();
  if (lower === "pk" || lower === "president kennedy" || lower.includes("kennedy")) return "pk";
  if (lower === "mk" || lower === "mackay" || lower.includes("mackay")) return "mk";
  if (lower === "on" || lower === "ontario" || lower.includes("ontario")) return "ontario";
  if (lower === "tn" || lower === "tunnel" || lower === "cathcart" || lower.includes("tunnel") || lower.includes("cathcart")) return "tunnel";
  if (lower === "sales" || lower.includes("sales")) return "sales";
  return lower;
}

function getStoreName(storeId: string): string {
  if (storeId === "sales") return "Sales";
  const store = stores.find(s => s.id === storeId);
  return store ? store.name : storeId;
}

function getStoreShortName(storeId: string): string {
  if (storeId === "sales") return "Sales";
  const store = stores.find(s => s.id === storeId);
  return store ? store.shortName : storeId;
}

function getStoreColor(storeId: string): string {
  if (storeId === "sales") return "#8B5CF6";
  const store = stores.find(s => s.id === storeId);
  return store?.color || "#6B7280";
}

/**
 * Smart DZ/Units formatter:
 * - Whole numbers (1, 2, 3...) → "1 DZ", "2 DZ"
 * - Whole + 0.5 (0.5, 1.5, 2.5...) → "0.5 DZ", "1.5 DZ"
 * - Anything else (0.3, 1.3, 5.7...) → convert to units (×12) → "4 Units", "16 Units"
 *
 * The value coming in is always in dozens.
 */
function formatDozenValue(dozenVal: number): { display: string; isDz: boolean } {
  if (dozenVal === 0) return { display: "—", isDz: true };

  // Check if the value is a clean dozen amount (whole number or .5)
  const remainder = dozenVal % 1;
  const isCleanDz = remainder === 0 || Math.abs(remainder) === 0.5;

  if (isCleanDz) {
    // Show as DZ
    const formatted = dozenVal % 1 === 0 ? dozenVal.toString() : dozenVal.toFixed(1);
    return { display: `${formatted} DZ`, isDz: true };
  } else {
    // Convert to units
    const units = Math.round(dozenVal * 12);
    return { display: `${units} Units`, isDz: false };
  }
}

/**
 * Always format as dozens — used for the Total column.
 * Shows the value in DZ with up to 1 decimal place.
 */
function formatAlwaysDZ(dozenVal: number): string {
  if (dozenVal === 0) return "—";
  const formatted = dozenVal % 1 === 0 ? dozenVal.toString() : dozenVal.toFixed(1);
  return `${formatted} DZ`;
}

interface BagelOrderRow {
  storeId: string;
  storeName: string;
  orderDate: string;
  submittedBy: string;
  clientName?: string;
  orders: { type: string; quantity: string; unit?: string }[];
  globalUnit: string; // legacy fallback
}

/**
 * Reusable Bagel Production content — used in both admin dashboard and portal.
 * @param defaultToToday - If true, defaults the date filter to "Today" instead of "Last 7 Days"
 * @param storeFilter - If set, locks the view to a specific store (e.g. "pk", "mk") and hides the store selector
 */
export function BagelProductionContent({ defaultToToday, storeFilter }: { defaultToToday?: boolean; storeFilter?: string } = {}) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() => {
    if (defaultToToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { mode: "single" as const, label: "Today", from: today, to: end };
    }
    return getDefaultDateFilter();
  });
  const [selectedStore, setSelectedStore] = useState<string>(storeFilter || "all");

  const fromDate = format(dateFilter.from, "yyyy-MM-dd");
  const toDate = format(dateFilter.to, "yyyy-MM-dd");

  const { data: rawOrders, isLoading } = trpc.production.bagelOrders.useQuery(
    { fromDate, toDate },
    { enabled: !!fromDate && !!toDate }
  );

  // Parse raw report submissions into structured bagel orders
  const orders: BagelOrderRow[] = useMemo(() => {
    if (!rawOrders) return [];
    return rawOrders.map((r: any) => {
      const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      const storeId = normalizeLocation(r.location);
      return {
        storeId,
        storeName: getStoreName(storeId),
        orderDate: data?.orderForDate || r.reportDate,
        submittedBy: data?.submittedVia || "Dashboard",
        clientName: data?.clientName || undefined,
        orders: (data?.orders || []).map((o: any) => ({
          type: o.type,
          quantity: o.quantity,
          unit: o.unit || data?.unit || "dozen",
        })),
        globalUnit: data?.unit || "dozen",
      };
    });
  }, [rawOrders]);

  // Separate Sales orders from Store orders
  const salesOrders = useMemo(() => orders.filter(o => o.storeId === "sales"), [orders]);
  const storeOrders = useMemo(() => orders.filter(o => o.storeId !== "sales"), [orders]);

  // Filter store orders by selected store
  const filteredStoreOrders = useMemo(() => {
    if (selectedStore === "all") return storeOrders;
    if (selectedStore === "sales") return []; // Sales is shown separately
    return storeOrders.filter(o => o.storeId === selectedStore);
  }, [storeOrders, selectedStore]);

  // For "all" view, show all orders (sales + stores); for specific store, show only that
  const allFilteredOrders = useMemo(() => {
    if (selectedStore === "all") return orders;
    if (selectedStore === "sales") return salesOrders;
    return storeOrders.filter(o => o.storeId === selectedStore);
  }, [orders, salesOrders, storeOrders, selectedStore]);

  // ─── Box Orders: Extract box items from Sales orders ───
  // Box orders are completely separate — NOT included in White Dough or dozen calculations
  const boxOrdersByClient = useMemo(() => {
    const clientMap: Record<string, { type: string; quantity: number }[]> = {};
    salesOrders.forEach(order => {
      const client = order.clientName || "Unknown Client";
      order.orders.forEach((item: any) => {
        const qty = parseFloat(item.quantity) || 0;
        if (qty <= 0) return;
        const itemUnit = item.unit || order.globalUnit || "dozen";
        if (itemUnit === "box") {
          if (!clientMap[client]) clientMap[client] = [];
          // Check if this type already exists for this client, merge if so
          const existing = clientMap[client].find(e => e.type === item.type);
          if (existing) {
            existing.quantity += qty;
          } else {
            clientMap[client].push({ type: item.type, quantity: qty });
          }
        }
      });
    });
    return clientMap;
  }, [salesOrders]);

  const boxClientNames = Object.keys(boxOrdersByClient).sort();
  const hasBoxOrders = boxClientNames.length > 0;

  // ─── Sales: Group by Client Name (EXCLUDING box items) ───
  const salesByClient = useMemo(() => {
    const clientMap: Record<string, Record<string, number>> = {};
    salesOrders.forEach(order => {
      const client = order.clientName || "Unknown Client";
      if (!clientMap[client]) {
        clientMap[client] = {};
        BAGEL_TYPES.forEach(t => { clientMap[client][t] = 0; });
      }
      order.orders.forEach((item: any) => {
        const qty = parseFloat(item.quantity) || 0;
        const itemUnit = item.unit || order.globalUnit || "dozen";
        // SKIP box items — they are handled separately
        if (itemUnit === "box") return;
        const dozenQty = itemUnit === "unit" ? qty / 12 : qty;
        if (clientMap[client][item.type] !== undefined) {
          clientMap[client][item.type] += dozenQty;
        }
      });
    });
    return clientMap;
  }, [salesOrders]);

  const clientNames = Object.keys(salesByClient).sort();

  // Clients White Dough: total white dough Kg per client (EXCLUDING box items)
  const clientsWhiteDough = useMemo(() => {
    const result: Record<string, number> = {};
    clientNames.forEach(client => {
      result[client] = WHITE_DOUGH_TYPES.reduce((sum, t) => sum + (salesByClient[client]?.[t] || 0), 0);
    });
    return result;
  }, [salesByClient, clientNames]);

  const totalClientsWhiteDoughKg = Object.values(clientsWhiteDough).reduce((a, b) => a + b, 0);

  // ─── Store Orders: Aggregate by store ───
  // aggregatedByType now also excludes box items from all orders
  const aggregatedByType = useMemo(() => {
    const totals: Record<string, number> = {};
    BAGEL_TYPES.forEach(t => { totals[t] = 0; });
    allFilteredOrders.forEach(order => {
      order.orders.forEach((item: any) => {
        const qty = parseFloat(item.quantity) || 0;
        const itemUnit = item.unit || order.globalUnit || "dozen";
        // SKIP box items
        if (itemUnit === "box") return;
        const dozenQty = itemUnit === "unit" ? qty / 12 : qty;
        if (totals[item.type] !== undefined) {
          totals[item.type] += dozenQty;
        }
      });
    });
    return totals;
  }, [allFilteredOrders]);

  const totalDozens = Object.values(aggregatedByType).reduce((a, b) => a + b, 0);

  // White Dough total in Kg (1 DZ = 1 Kg) — all orders combined (excluding box)
  const whiteDoughKg = WHITE_DOUGH_TYPES.reduce((sum, t) => sum + (aggregatedByType[t] || 0), 0);

  // Aggregate store orders by store (excluding sales)
  const byStore = useMemo(() => {
    const storeMap: Record<string, Record<string, number>> = {};
    filteredStoreOrders.forEach(order => {
      if (!storeMap[order.storeId]) {
        storeMap[order.storeId] = {};
        BAGEL_TYPES.forEach(t => { storeMap[order.storeId][t] = 0; });
      }
      order.orders.forEach((item: any) => {
        const qty = parseFloat(item.quantity) || 0;
        const itemUnit = item.unit || order.globalUnit || "dozen";
        const dozenQty = itemUnit === "unit" ? qty / 12 : qty;
        if (storeMap[order.storeId][item.type] !== undefined) {
          storeMap[order.storeId][item.type] += dozenQty;
        }
      });
    });
    return storeMap;
  }, [filteredStoreOrders]);

  const storeIds = Object.keys(byStore);

  // Store white dough totals
  const storeWhiteDoughKg = useMemo(() => {
    return storeIds.reduce((sum, id) => {
      return sum + WHITE_DOUGH_TYPES.reduce((s, t) => s + (byStore[id]?.[t] || 0), 0);
    }, 0);
  }, [byStore, storeIds]);

  // All store options (excluding "Sales" from the dropdown since it's shown separately)
  const allStoreOptions = [
    ...stores.map(s => ({ id: s.id, name: s.name })),
  ];

  // Total box count across all clients
  const totalBoxCount = boxClientNames.reduce((sum, client) => {
    return sum + boxOrdersByClient[client].reduce((s, item) => s + item.quantity, 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-[#D4A853]" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-foreground">Bagel Production</h1>
            <p className="text-sm text-muted-foreground">View bagel orders by store and item</p>
         
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!storeFilter && (
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">All Locations</option>
              {allStoreOptions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <DateFilter value={dateFilter} onChange={setDateFilter} allowFuture />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Orders</p>
            <p className="text-2xl font-mono font-bold mt-1">{allFilteredOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Dozens</p>
            <p className="text-2xl font-mono font-bold mt-1">{totalDozens.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Units</p>
            <p className="text-2xl font-mono font-bold mt-1">{(totalDozens * 12).toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Locations</p>
            <p className="text-2xl font-mono font-bold mt-1">{storeIds.length + (salesOrders.length > 0 ? 1 : 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* White Dough Summary — Three Separate Boxes + Dube Loiselle Orders */}
      <div className={cn("grid grid-cols-1 gap-4", hasBoxOrders ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <p className="text-xs text-purple-600 uppercase tracking-wide font-medium">Clients White Dough Total</p>
            </div>
            <p className="text-2xl font-mono font-bold mt-1">{totalClientsWhiteDoughKg % 1 === 0 ? totalClientsWhiteDoughKg : totalClientsWhiteDoughKg.toFixed(1)} <span className="text-sm font-semibold">Kg</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sesame, Everything, Plain, Poppy</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4A853]/30 bg-[#D4A853]/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-[#D4A853]" />
              <p className="text-xs text-[#D4A853] uppercase tracking-wide font-medium">Stores White Dough Total</p>
            </div>
            <p className="text-2xl font-mono font-bold mt-1">{storeWhiteDoughKg % 1 === 0 ? storeWhiteDoughKg : storeWhiteDoughKg.toFixed(1)} <span className="text-sm font-semibold">Kg</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sesame, Everything, Plain, Poppy</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <p className="text-xs text-emerald-600 uppercase tracking-wide font-bold">TOTAL WHITE DOUGH</p>
            </div>
            <p className="text-2xl font-mono font-bold mt-1">{whiteDoughKg % 1 === 0 ? whiteDoughKg : whiteDoughKg.toFixed(1)} <span className="text-sm font-semibold">Kg</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Clients + Stores combined</p>
          </CardContent>
        </Card>
        {hasBoxOrders && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <p className="text-xs text-blue-600 uppercase tracking-wide font-bold">Dube Loiselle Orders</p>
              </div>
              <p className="text-2xl font-mono font-bold mt-1">{totalBoxCount % 1 === 0 ? totalBoxCount : totalBoxCount.toFixed(1)} <span className="text-sm font-semibold">Boxes</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Separate from White Dough</p>
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading bagel orders...
          </CardContent>
        </Card>
      ) : allFilteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No bagel orders found for the selected period.</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting the date filter or submit bagel orders through the checklists.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              DUBE LOISELLE ORDERS — Box orders (separate from White Dough)
              ═══════════════════════════════════════════════════════════════ */}
          {hasBoxOrders && (selectedStore === "all" || selectedStore === "sales") && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <BoxIcon className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-serif text-foreground">Dube Loiselle Orders</h2>
                <span className="text-xs text-muted-foreground ml-1">(Box orders — not included in White Dough)</span>
              </div>

              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="pt-5 pb-5">
                  <div className="space-y-5">
                    {boxClientNames.map(client => (
                      <div key={client}>
                        <h3 className="font-semibold text-sm text-blue-700 mb-2">{client}</h3>
                        <div className="space-y-1.5 pl-4">
                          {boxOrdersByClient[client].map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <span className="text-sm font-mono">
                                <span className="font-bold">{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}</span>
                                {" "}
                                <span className="text-muted-foreground">box{item.quantity !== 1 ? "es" : ""}</span>
                                {" "}
                                <span className="font-medium">{item.type}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SALES SECTION — Orders by Client (excluding box items)
              ═══════════════════════════════════════════════════════════════ */}
          {salesOrders.length > 0 && (selectedStore === "all" || selectedStore === "sales") && (
            <>
              {/* Section Header */}
              <div className="flex items-center gap-2 pt-2">
                <Users2 className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-serif text-foreground">Sales Orders by Client</h2>
                <span className="text-xs text-muted-foreground ml-1">({salesOrders.length} order{salesOrders.length !== 1 ? "s" : ""})</span>
              </div>

              {/* Clients White Dough Box */}
              <Card className="border-purple-200 bg-purple-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500" />
                    Clients White Dough
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    White dough requirement per client (1 DZ = 1 Kg) — Sesame, Everything, Plain, Poppy
                  </p>
                </CardHeader>
                <CardContent>
                  {clientNames.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-purple-100/60">
                          <tr>
                            <th className="text-left p-3 font-medium text-xs">Client</th>
                            {WHITE_DOUGH_TYPES.map(t => (
                              <th key={t} className="text-center p-3 font-medium text-xs">{t.replace(" Bagel", "")}</th>
                            ))}
                            <th className="text-center p-3 font-semibold text-xs bg-purple-100/80">Total (Kg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientNames.map(client => {
                            const clientTotal = clientsWhiteDough[client] || 0;
                            return (
                              <tr key={client} className="border-t hover:bg-purple-50/50 transition-colors">
                                <td className="p-3 text-sm font-medium">{client}</td>
                                {WHITE_DOUGH_TYPES.map(t => {
                                  const val = salesByClient[client]?.[t] || 0;
                                  return (
                                    <td key={t} className="p-3 text-center font-mono text-sm">
                                      {val > 0 ? (
                                        <span className="font-semibold">{formatDozenValue(val).display}</span>
                                      ) : (
                                        <span className="text-muted-foreground/40">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="p-3 text-center font-mono text-sm font-bold bg-purple-50/80">
                                  {clientTotal > 0 ? `${clientTotal % 1 === 0 ? clientTotal : clientTotal.toFixed(1)} Kg` : "—"}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Total row */}
                          <tr className="border-t-2 border-purple-200 bg-purple-100/40 font-bold">
                            <td className="p-3 text-sm">TOTAL</td>
                            {WHITE_DOUGH_TYPES.map(t => {
                              const colTotal = clientNames.reduce((sum, c) => sum + (salesByClient[c]?.[t] || 0), 0);
                              return (
                                <td key={t} className="p-3 text-center font-mono text-sm">
                                  {colTotal > 0 ? formatDozenValue(colTotal).display : "—"}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center font-mono text-sm text-purple-700">
                              {totalClientsWhiteDoughKg > 0 ? `${totalClientsWhiteDoughKg % 1 === 0 ? totalClientsWhiteDoughKg : totalClientsWhiteDoughKg.toFixed(1)} Kg` : "—"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No client orders found.</p>
                  )}
                </CardContent>
              </Card>

              {/* Sales Orders by Client — Full breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sales — All Bagel Types by Client</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {dateFilter.label} — Quantities shown as DZ (dozens) or Units. Box orders shown separately above.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-purple-50/80">
                        <tr>
                          <th className="text-left p-3 font-medium text-xs">Bagel Type</th>
                          {clientNames.map(client => (
                            <th key={client} className="text-center p-3 font-medium text-xs">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                {client}
                              </span>
                            </th>
                          ))}
                          <th className="text-center p-3 font-semibold text-xs bg-muted/80">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {BAGEL_TYPES.map(type => {
                          const rowTotal = clientNames.reduce((sum, c) => sum + (salesByClient[c]?.[type] || 0), 0);
                          if (rowTotal === 0) return null; // Skip empty rows
                          return (
                            <tr key={type} className="border-t hover:bg-muted/30 transition-colors">
                              <td className="p-3 text-sm font-medium">{type}</td>
                              {clientNames.map(client => {
                                const val = salesByClient[client]?.[type] || 0;
                                const formatted = formatDozenValue(val);
                                return (
                                  <td key={client} className="p-3 text-center font-mono text-sm">
                                    {val > 0 ? (
                                      <span className="font-semibold text-foreground">{formatted.display}</span>
                                    ) : (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-3 text-center font-mono text-sm font-semibold bg-muted/30">
                                {formatAlwaysDZ(rowTotal)}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Show all rows including zero if nothing was filtered */}
                        {BAGEL_TYPES.every(type => clientNames.reduce((sum, c) => sum + (salesByClient[c]?.[type] || 0), 0) === 0) && (
                          <tr className="border-t"><td colSpan={clientNames.length + 2} className="p-4 text-center text-muted-foreground text-sm">No items ordered</td></tr>
                        )}
                        {/* Totals row */}
                        <tr className="border-t-2 border-border bg-muted/50 font-bold">
                          <td className="p-3 text-sm">TOTAL</td>
                          {clientNames.map(client => {
                            const clientTotal = BAGEL_TYPES.reduce((sum, t) => sum + (salesByClient[client]?.[t] || 0), 0);
                            const formatted = formatDozenValue(clientTotal);
                            return (
                              <td key={client} className="p-3 text-center font-mono text-sm">
                                {clientTotal > 0 ? formatted.display : "—"}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-mono text-sm bg-purple-100/50 text-purple-700">
                            {formatAlwaysDZ(clientNames.reduce((sum, c) => sum + BAGEL_TYPES.reduce((s, t) => s + (salesByClient[c]?.[t] || 0), 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STORE ORDERS SECTION
              ═══════════════════════════════════════════════════════════════ */}
          {filteredStoreOrders.length > 0 && selectedStore !== "sales" && (
            <>
              {/* Section Header */}
              <div className="flex items-center gap-2 pt-2">
                <Store className="w-5 h-5 text-[#D4A853]" />
                <h2 className="text-lg font-serif text-foreground">Store Orders</h2>
                <span className="text-xs text-muted-foreground ml-1">({filteredStoreOrders.length} order{filteredStoreOrders.length !== 1 ? "s" : ""})</span>
              </div>

              {/* Store Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Store Orders by Bagel Type</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {dateFilter.label} — Quantities shown as DZ (dozens) or Units
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium text-xs">Bagel Type</th>
                          {storeIds.map(id => (
                            <th key={id} className="text-center p-3 font-medium text-xs">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: getStoreColor(id) }} />
                                {getStoreShortName(id)}
                              </span>
                            </th>
                          ))}
                          <th className="text-center p-3 font-semibold text-xs bg-muted/80">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {BAGEL_TYPES.map(type => {
                          const rowTotal = storeIds.reduce((sum, id) => sum + (byStore[id]?.[type] || 0), 0);
                          return (
                            <tr key={type} className="border-t hover:bg-muted/30 transition-colors">
                              <td className="p-3 text-sm font-medium">{type}</td>
                              {storeIds.map(id => {
                                const val = byStore[id]?.[type] || 0;
                                const formatted = formatDozenValue(val);
                                return (
                                  <td key={id} className="p-3 text-center font-mono text-sm">
                                    {val > 0 ? (
                                      <span className="font-semibold text-foreground">
                                        {formatted.display}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-3 text-center font-mono text-sm font-semibold bg-muted/30">
                                {formatAlwaysDZ(rowTotal)}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Totals row */}
                        <tr className="border-t-2 border-border bg-muted/50 font-bold">
                          <td className="p-3 text-sm">TOTAL</td>
                          {storeIds.map(id => {
                            const storeTotal = BAGEL_TYPES.reduce((sum, t) => sum + (byStore[id]?.[t] || 0), 0);
                            const formatted = formatDozenValue(storeTotal);
                            return (
                              <td key={id} className="p-3 text-center font-mono text-sm">
                                {storeTotal > 0 ? formatted.display : "—"}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-mono text-sm bg-[#D4A853]/10 text-[#D4A853]">
                            {formatAlwaysDZ(storeIds.reduce((sum, id) => sum + BAGEL_TYPES.reduce((s, t) => s + (byStore[id]?.[t] || 0), 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              INDIVIDUAL ORDERS LIST
              ═══════════════════════════════════════════════════════════════ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Individual Orders</CardTitle>
              <p className="text-xs text-muted-foreground">{allFilteredOrders.length} order(s) found</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allFilteredOrders
                  .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
                  .map((order, idx) => {
                    const nonZeroItems = order.orders.filter((o: any) => parseFloat(o.quantity) > 0);
                    return (
                      <div key={idx} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: getStoreColor(order.storeId) }} />
                            <span className="font-medium text-sm">{order.storeName}</span>
                            {order.clientName && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs font-medium text-purple-600">{order.clientName}</span>
                              </>
                            )}
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.orderDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                        {nonZeroItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {nonZeroItems.map((item: any, i: number) => {
                              const qty = parseFloat(item.quantity) || 0;
                              const itemUnit = item.unit || order.globalUnit || "dozen";
                              if (itemUnit === "box") {
                                // Display box items distinctly
                                return (
                                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {item.type}: <span className="font-mono font-semibold">{qty % 1 === 0 ? qty : qty.toFixed(1)} box{qty !== 1 ? "es" : ""}</span>
                                  </span>
                                );
                              }
                              // Convert to dozens first, then format
                              const dozenVal = itemUnit === "unit" ? qty / 12 : qty;
                              const formatted = formatDozenValue(dozenVal);
                              return (
                                <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                                  {item.type}: <span className="font-mono font-semibold">{formatted.display}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No items ordered</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function BagelProduction() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        <BagelProductionContent />
      </div>
    </DashboardLayout>
  );
}
