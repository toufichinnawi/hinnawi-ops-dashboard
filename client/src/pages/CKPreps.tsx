import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { stores } from "@/lib/data";
import { ClipboardList, Package, Store } from "lucide-react";
import { DateFilter, getDefaultDateFilter, type DateFilterValue } from "@/components/DateFilter";
import { format } from "date-fns";

// All items from the Daily Orders form, grouped by section
const DAILY_ORDER_SECTIONS = [
  {
    id: "proteins",
    label: "Proteins / Deli",
    icon: "\ud83e\udd69",
    items: [
      { name: "Chicken", unit: "bags" },
      { name: "Turkey", unit: "bags / slicing pieces" },
      { name: "Sliced ham packs", unit: "packs" },
      { name: "Smoked meat (90g)", unit: "packs" },
      { name: "Bacon jam", unit: "jars" },
    ],
  },
  {
    id: "dairy",
    label: "Dairy & Cheese",
    icon: "\ud83e\uddc0",
    items: [
      { name: "Sliced cheddar packs", unit: "packs" },
      { name: "Block cheddar (for slicing)", unit: "blocks" },
      { name: "Sliced mozzarella packs", unit: "packs" },
      { name: "Hinnawi cream cheese", unit: "tubs" },
    ],
  },
  {
    id: "vegetables",
    label: "Vegetables",
    icon: "\ud83e\udd2c",
    items: [
      { name: "Lettuce", unit: "heads" },
      { name: "Tomatoes", unit: "units" },
      { name: "Cucumber", unit: "units" },
      { name: "Onions", unit: "units" },
      { name: "Pepper", unit: "units" },
      { name: "Avocadoes", unit: "units" },
      { name: "Lemon", unit: "units" },
    ],
  },
  {
    id: "sauces",
    label: "Sauces & Spreads",
    icon: "\ud83e\uded9",
    items: [
      { name: "Spicy mayo", unit: "bottles" },
      { name: "Honey mustard", unit: "bottles" },
    ],
  },
  {
    id: "pickles",
    label: "Pickles",
    icon: "\ud83e\udd52",
    items: [
      { name: "Pickles", unit: "jars" },
    ],
  },
  {
    id: "coffee",
    label: "Coffee & Beverages",
    icon: "\u2615",
    items: [
      { name: "Amelia Espresso Coffee Beans (large bags)", unit: "bags" },
      { name: "Filter coffee bags", unit: "bags" },
      { name: "Small bags (espresso / filter)", unit: "bags" },
      { name: "Orange juice", unit: "units" },
      { name: "Coffee containers", unit: "units" },
    ],
  },
  {
    id: "food-items",
    label: "Food Items (Ready / Other)",
    icon: "\ud83e\udd50",
    items: [
      { name: "Granola yogurt", unit: "units" },
      { name: "Chia pudding", unit: "units" },
    ],
  },
  {
    id: "packaging",
    label: "Packaging & Supplies",
    icon: "\ud83d\udce6",
    items: [
      { name: "Coffee cups (medium & large)", unit: "sleeves" },
      { name: "Coffee cup lids", unit: "sleeves" },
      { name: "Wax paper", unit: "rolls" },
      { name: "Sandwich bags (large)", unit: "packs" },
      { name: "Custom boxes", unit: "units" },
      { name: "Coffee bags", unit: "packs" },
      { name: "Delivery bins", unit: "units" },
    ],
  },
];

// Flat list of all item names for aggregation
const ALL_ITEMS = DAILY_ORDER_SECTIONS.flatMap(s => s.items.map(i => i.name));

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

interface DailyOrderRow {
  storeId: string;
  storeName: string;
  orderDate: string;
  submittedBy: string;
  items: { name: string; quantity: number; unit: string }[];
}

/**
 * Reusable CK Preps content — used in both admin dashboard and portal.
 */
export function CKPrepsContent({ defaultToToday, storeFilter }: { defaultToToday?: boolean; storeFilter?: string } = {}) {
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

  const { data: rawOrders, isLoading } = trpc.production.dailyOrders.useQuery(
    { fromDate, toDate },
    { enabled: !!fromDate && !!toDate }
  );

  // Parse raw report submissions into structured daily orders
  const orders: DailyOrderRow[] = useMemo(() => {
    if (!rawOrders) return [];
    return rawOrders.map((r: any) => {
      const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      const storeId = normalizeLocation(r.location);
      // Daily Orders store items in data.sections[].items[]
      const items: { name: string; quantity: number; unit: string }[] = [];
      if (data?.sections && Array.isArray(data.sections)) {
        data.sections.forEach((section: any) => {
          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item: any) => {
              const qty = parseFloat(item.quantity) || 0;
              if (qty > 0) {
                items.push({ name: item.name, quantity: qty, unit: item.unit || "units" });
              }
            });
          }
        });
      }
      return {
        storeId,
        storeName: getStoreName(storeId),
        orderDate: data?.orderForDate || r.reportDate,
        submittedBy: r.submitterName || "Unknown",
        items,
      };
    });
  }, [rawOrders]);

  // Filter by selected store
  const filteredOrders = useMemo(() => {
    if (selectedStore === "all") return orders;
    return orders.filter(o => o.storeId === selectedStore);
  }, [orders, selectedStore]);

  // Aggregate by item
  const aggregatedByItem = useMemo(() => {
    const totals: Record<string, number> = {};
    ALL_ITEMS.forEach(name => { totals[name] = 0; });
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (totals[item.name] !== undefined) {
          totals[item.name] += item.quantity;
        }
      });
    });
    return totals;
  }, [filteredOrders]);

  const totalItemsOrdered = Object.values(aggregatedByItem).reduce((a, b) => a + b, 0);
  const uniqueItemsOrdered = Object.values(aggregatedByItem).filter(v => v > 0).length;

  // Aggregate by store
  const byStore = useMemo(() => {
    const storeMap: Record<string, Record<string, number>> = {};
    filteredOrders.forEach(order => {
      if (!storeMap[order.storeId]) {
        storeMap[order.storeId] = {};
        ALL_ITEMS.forEach(name => { storeMap[order.storeId][name] = 0; });
      }
      order.items.forEach(item => {
        if (storeMap[order.storeId][item.name] !== undefined) {
          storeMap[order.storeId][item.name] += item.quantity;
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-foreground">CK Preps</h1>
            <p className="text-sm text-muted-foreground">Daily orders received from stores — prep & fulfillment view</p>
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
            <p className="text-2xl font-mono font-bold mt-1">{filteredOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Items</p>
            <p className="text-2xl font-mono font-bold mt-1">{totalItemsOrdered % 1 === 0 ? totalItemsOrdered : totalItemsOrdered.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Unique Items</p>
            <p className="text-2xl font-mono font-bold mt-1">{uniqueItemsOrdered}</p>
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
            Loading daily orders...
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No daily orders found for the selected period.</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting the date filter or submit daily orders through the portal.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              ORDERS BY STORE — Each store's order breakdown
              ═══════════════════════════════════════════════════════════════ */}
          {storeIds.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Store className="w-5 h-5 text-amber-600" />
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
                          {storeOrderCount} order{storeOrderCount !== 1 ? "s" : ""} · {storeTotal % 1 === 0 ? storeTotal : storeTotal.toFixed(1)} items total
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {DAILY_ORDER_SECTIONS.map(section => {
                        const sectionItems = section.items.filter(item => (storeData[item.name] || 0) > 0);
                        if (sectionItems.length === 0) return null;
                        return (
                          <div key={section.id} className="mb-4 last:mb-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span>{section.icon}</span>
                              <span className="text-sm font-semibold text-foreground">{section.label}</span>
                            </div>
                            <div className="border rounded-lg overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="text-left p-3 font-medium text-xs">Item</th>
                                    <th className="text-center p-3 font-medium text-xs">Quantity</th>
                                    <th className="text-center p-3 font-medium text-xs">Unit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sectionItems.map(item => {
                                    const val = storeData[item.name] || 0;
                                    return (
                                      <tr key={item.name} className="border-t hover:bg-muted/20 transition-colors">
                                        <td className="p-3 text-sm">{item.name}</td>
                                        <td className="p-3 text-center font-mono text-sm font-semibold">
                                          {val % 1 === 0 ? val : val.toFixed(1)}
                                        </td>
                                        <td className="p-3 text-center text-xs text-muted-foreground">{item.unit}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              GRAND TOTAL — All items combined across all stores
              ═══════════════════════════════════════════════════════════════ */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                Grand Total — All Stores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {DAILY_ORDER_SECTIONS.map(section => {
                const sectionHasData = section.items.some(item => (aggregatedByItem[item.name] || 0) > 0);
                if (!sectionHasData) return null;
                return (
                  <div key={section.id} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{section.icon}</span>
                      <span className="text-sm font-semibold text-foreground">{section.label}</span>
                    </div>
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-amber-100/60">
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
                            <th className="text-center p-3 font-bold text-xs bg-amber-100/80">Total</th>
                            <th className="text-center p-3 font-medium text-xs">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.items.map(item => {
                            const total = aggregatedByItem[item.name] || 0;
                            if (total === 0) return null;
                            return (
                              <tr key={item.name} className="border-t hover:bg-amber-50/50 transition-colors">
                                <td className="p-3 text-sm">{item.name}</td>
                                {storeIds.map(id => {
                                  const val = byStore[id]?.[item.name] || 0;
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
                                <td className="p-3 text-center font-mono font-bold text-sm bg-amber-50/50">
                                  {total % 1 === 0 ? total : total.toFixed(1)}
                                </td>
                                <td className="p-3 text-center text-xs text-muted-foreground">{item.unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function CKPreps() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <CKPrepsContent />
      </div>
    </DashboardLayout>
  );
}
