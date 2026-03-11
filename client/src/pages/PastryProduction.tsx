import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { stores } from "@/lib/data";
import { CakeSlice, Package, Users2, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateFilter, getDefaultDateFilter, type DateFilterValue } from "@/components/DateFilter";
import { format } from "date-fns";

const PASTRY_ITEMS = [
  "Banana Bread with Nuts", "Croissant", "Croissant aux Amandes", "Chocolatine",
  "Chocolate Chips Cookie", "Muffin a L'Erable", "Muffin Bleuets", "Muffin Pistaches",
  "Muffin Chocolat", "Yogurt Granola", "Fresh orange juice", "Gateau aux Carottes",
  "Granola bag", "Bagel Chips Bags", "Maple Pecan Bar", "Pudding",
];

// Map various location formats to a canonical store ID
function normalizeLocation(loc: string): string {
  const lower = loc.toLowerCase().trim();
  if (lower === "pk" || lower === "president kennedy" || lower.includes("kennedy")) return "pk";
  if (lower === "mk" || lower === "mackay" || lower.includes("mackay")) return "mk";
  if (lower === "on" || lower === "ontario" || lower.includes("ontario")) return "ontario";
  if (lower === "tn" || lower === "tunnel" || lower === "cathcart" || lower.includes("tunnel") || lower.includes("cathcart")) return "tunnel";
  return lower;
}

function getStoreName(storeId: string): string {
  const store = stores.find(s => s.id === storeId);
  return store ? store.name : storeId;
}

function getStoreShortName(storeId: string): string {
  const store = stores.find(s => s.id === storeId);
  return store ? store.shortName : storeId;
}

function getStoreColor(storeId: string): string {
  const store = stores.find(s => s.id === storeId);
  return store?.color || "#6B7280";
}

interface PastryOrderRow {
  storeId: string;
  storeName: string;
  orderDate: string;
  submittedBy: string;
  orders: { type: string; quantity: string; unit?: string }[];
}

/**
 * Reusable Pastry Production content — used in both admin dashboard and portal.
 * @param defaultToToday - If true, defaults the date filter to "Today" instead of "Last 7 Days"
 * @param storeFilter - If set, locks the view to a specific store
 */
export function PastryProductionContent({ defaultToToday, storeFilter }: { defaultToToday?: boolean; storeFilter?: string } = {}) {
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

  const { data: rawOrders, isLoading } = trpc.production.pastryOrders.useQuery(
    { fromDate, toDate },
    { enabled: !!fromDate && !!toDate }
  );

  // Parse raw report submissions into structured pastry orders
  const orders: PastryOrderRow[] = useMemo(() => {
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
          unit: o.unit || "unit",
        })),
      };
    });
  }, [rawOrders]);

  // Filter by selected store
  const filteredOrders = useMemo(() => {
    if (selectedStore === "all") return orders;
    return orders.filter(o => o.storeId === selectedStore);
  }, [orders, selectedStore]);

  // Aggregate by item type
  const aggregatedByType = useMemo(() => {
    const totals: Record<string, number> = {};
    PASTRY_ITEMS.forEach(t => { totals[t] = 0; });
    filteredOrders.forEach(order => {
      order.orders.forEach((item: any) => {
        const qty = parseFloat(item.quantity) || 0;
        if (totals[item.type] !== undefined) {
          totals[item.type] += qty;
        }
      });
    });
    return totals;
  }, [filteredOrders]);

  const totalUnits = Object.values(aggregatedByType).reduce((a, b) => a + b, 0);

  // Aggregate by store
  const byStore = useMemo(() => {
    const storeMap: Record<string, Record<string, number>> = {};
    filteredOrders.forEach(order => {
      if (!storeMap[order.storeId]) {
        storeMap[order.storeId] = {};
        PASTRY_ITEMS.forEach(t => { storeMap[order.storeId][t] = 0; });
      }
      order.orders.forEach((item: any) => {
        const qty = parseFloat(item.quantity) || 0;
        if (storeMap[order.storeId][item.type] !== undefined) {
          storeMap[order.storeId][item.type] += qty;
        }
      });
    });
    return storeMap;
  }, [filteredOrders]);

  const storeIds = Object.keys(byStore);

  // All store options for the dropdown
  const allStoreOptions = stores.map(s => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <CakeSlice className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-foreground">Pastry Production</h1>
            <p className="text-sm text-muted-foreground">View pastry orders by store and item</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Orders</p>
            <p className="text-2xl font-mono font-bold mt-1">{filteredOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Units</p>
            <p className="text-2xl font-mono font-bold mt-1">{totalUnits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Locations</p>
            <p className="text-2xl font-mono font-bold mt-1">{storeIds.length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading pastry orders...
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No pastry orders found for the selected period.</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting the date filter or submit pastry orders through the portal.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              STORE ORDERS — Breakdown by Store
              ═══════════════════════════════════════════════════════════════ */}
          {storeIds.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Store className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-serif text-foreground">Orders by Store</h2>
                <span className="text-xs text-muted-foreground ml-1">({filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""})</span>
              </div>

              {storeIds.map(storeId => {
                const storeData = byStore[storeId];
                const storeTotal = Object.values(storeData).reduce((a, b) => a + b, 0);
                const storeOrderCount = filteredOrders.filter(o => o.storeId === storeId).length;
                const color = getStoreColor(storeId);

                return (
                  <Card key={storeId} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                        {getStoreName(storeId)}
                        <span className="text-xs text-muted-foreground font-normal ml-auto">
                          {storeOrderCount} order{storeOrderCount !== 1 ? "s" : ""} · {storeTotal} units total
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium text-xs">Item</th>
                              <th className="text-center p-3 font-medium text-xs">Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PASTRY_ITEMS.map(type => {
                              const val = storeData[type] || 0;
                              return (
                                <tr key={type} className="border-t hover:bg-muted/20 transition-colors">
                                  <td className="p-3 text-sm">{type}</td>
                                  <td className="p-3 text-center font-mono text-sm">
                                    {val > 0 ? (
                                      <span className="font-semibold">{val % 1 === 0 ? val : val.toFixed(1)}</span>
                                    ) : (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-muted/30">
                            <tr className="border-t-2">
                              <td className="p-3 font-semibold text-sm">Total</td>
                              <td className="p-3 text-center font-mono font-bold text-sm">{storeTotal % 1 === 0 ? storeTotal : storeTotal.toFixed(1)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              GRAND TOTAL — All items combined
              ═══════════════════════════════════════════════════════════════ */}
          <Card className="border-rose-200 bg-rose-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CakeSlice className="w-4 h-4 text-rose-500" />
                Grand Total — All Stores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-rose-100/60">
                    <tr>
                      <th className="text-left p-3 font-medium text-xs">Item</th>
                      {storeIds.map(id => (
                        <th key={id} className="text-center p-3 font-medium text-xs">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: getStoreColor(id) }} />
                            {getStoreShortName(id)}
                          </div>
                        </th>
                      ))}
                      <th className="text-center p-3 font-bold text-xs bg-rose-100/80">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PASTRY_ITEMS.map(type => {
                      const total = aggregatedByType[type] || 0;
                      return (
                        <tr key={type} className="border-t hover:bg-rose-50/50 transition-colors">
                          <td className="p-3 text-sm">{type}</td>
                          {storeIds.map(id => {
                            const val = byStore[id]?.[type] || 0;
                            return (
                              <td key={id} className="p-3 text-center font-mono text-sm">
                                {val > 0 ? (
                                  <span className="font-semibold">{val % 1 === 0 ? val : val.toFixed(1)}</span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-mono font-bold text-sm bg-rose-50/50">
                            {total > 0 ? (total % 1 === 0 ? total : total.toFixed(1)) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-rose-100/40">
                    <tr className="border-t-2">
                      <td className="p-3 font-bold text-sm">Grand Total</td>
                      {storeIds.map(id => {
                        const storeTotal = Object.values(byStore[id] || {}).reduce((a, b) => a + b, 0);
                        return (
                          <td key={id} className="p-3 text-center font-mono font-bold text-sm">
                            {storeTotal > 0 ? (storeTotal % 1 === 0 ? storeTotal : storeTotal.toFixed(1)) : "—"}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-mono font-bold text-sm bg-rose-100/60">
                        {totalUnits > 0 ? (totalUnits % 1 === 0 ? totalUnits : totalUnits.toFixed(1)) : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function PastryProduction() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <PastryProductionContent />
      </div>
    </DashboardLayout>
  );
}
