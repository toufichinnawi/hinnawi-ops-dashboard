import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { stores } from "@/lib/data";
import { CircleDot, Filter, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateFilter, getDefaultDateFilter, type DateFilterValue } from "@/components/DateFilter";
import { format } from "date-fns";

const BAGEL_TYPES = [
  "Sesame Bagel", "Everything Bagel", "Plain Bagel", "Mini-Bagel Plain",
  "Poppy Seeds Bagel", "Multigrain Bagel", "Cheese Bagel", "Rosemary Bagel",
  "Cinnamon Sugar Bagel", "Cinnamon Raisin Bagel", "Blueberry Bagel", "Coconut Bagel",
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
  orders: { type: string; quantity: string; unit?: string }[];
  globalUnit: string; // legacy fallback
}

/**
 * Reusable Bagel Production content — used in both admin dashboard and portal.
 * @param defaultToToday - If true, defaults the date filter to "Today" instead of "Last 7 Days"
 */
export function BagelProductionContent({ defaultToToday }: { defaultToToday?: boolean } = {}) {
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
  const [selectedStore, setSelectedStore] = useState<string>("all");

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
        orders: (data?.orders || []).map((o: any) => ({
          type: o.type,
          quantity: o.quantity,
          unit: o.unit || data?.unit || "dozen",
        })),
        globalUnit: data?.unit || "dozen",
      };
    });
  }, [rawOrders]);

  // Filter by store
  const filteredOrders = useMemo(() => {
    if (selectedStore === "all") return orders;
    return orders.filter(o => o.storeId === selectedStore);
  }, [orders, selectedStore]);

  // Aggregate: total dozens per bagel type across all filtered orders
  // Convert units to dozens for aggregation: 1 unit = 1/12 dozen
  const aggregatedByType = useMemo(() => {
    const totals: Record<string, number> = {};
    BAGEL_TYPES.forEach(t => { totals[t] = 0; });
    filteredOrders.forEach(order => {
      order.orders.forEach((item: any) => {
        const qty = parseFloat(item.quantity) || 0;
        const itemUnit = item.unit || order.globalUnit || "dozen";
        const dozenQty = itemUnit === "unit" ? qty / 12 : qty;
        if (totals[item.type] !== undefined) {
          totals[item.type] += dozenQty;
        }
      });
    });
    return totals;
  }, [filteredOrders]);

  const totalDozens = Object.values(aggregatedByType).reduce((a, b) => a + b, 0);

  // Aggregate by store: for each store, total dozens per type
  const byStore = useMemo(() => {
    const storeMap: Record<string, Record<string, number>> = {};
    filteredOrders.forEach(order => {
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
  }, [filteredOrders]);

  const storeIds = Object.keys(byStore);

  // All store options including "Sales"
  const allStoreOptions = [
    ...stores.map(s => ({ id: s.id, name: s.name })),
    { id: "sales", name: "Sales" },
  ];

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
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="all">All Stores</option>
            {allStoreOptions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <DateFilter value={dateFilter} onChange={setDateFilter} allowFuture />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Orders</p>
            <p className="text-2xl font-mono font-bold mt-1">{filteredOrders.length}</p>
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
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Stores</p>
            <p className="text-2xl font-mono font-bold mt-1">{storeIds.length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading bagel orders...
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No bagel orders found for the selected period.</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting the date filter or submit bagel orders through the checklists.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Aggregated Totals Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Orders by Bagel Type</CardTitle>
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
                        {formatAlwaysDZ(totalDozens)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Individual Orders List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Individual Orders</CardTitle>
              <p className="text-xs text-muted-foreground">{filteredOrders.length} order(s) found</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredOrders
                  .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
                  .map((order, idx) => {
                    const nonZeroItems = order.orders.filter((o: any) => parseFloat(o.quantity) > 0);
                    return (
                      <div key={idx} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: getStoreColor(order.storeId) }} />
                            <span className="font-medium text-sm">{order.storeName}</span>
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
