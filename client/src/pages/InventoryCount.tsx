import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Save, Package } from "lucide-react";
import { toast } from "sonner";

const STORES = [
  { code: "PK", name: "Park Extension" },
  { code: "MK", name: "Mackay" },
  { code: "ON", name: "Ontario" },
  { code: "TN", name: "Tunnel" },
];

export default function InventoryCount() {
  const [storeCode, setStoreCode] = useState("PK");
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0, 10));
  const [counts, setCounts] = useState<Record<number, string>>({});

  const utils = trpc.useUtils();
  const { data: items = [] } = trpc.inventoryItems.list.useQuery();
  const { data: existingCounts = [] } = trpc.inventoryCounts.list.useQuery({ storeCode, countDate });

  const saveMut = trpc.inventoryCounts.bulkUpsert.useMutation({
    onSuccess: () => {
      utils.inventoryCounts.list.invalidate();
      toast.success("Count saved");
    },
  });

  // Merge existing counts into local state
  useMemo(() => {
    const map: Record<number, string> = {};
    existingCounts.forEach(c => { map[c.itemId] = String(c.quantity); });
    setCounts(prev => ({ ...map, ...Object.fromEntries(Object.entries(prev).filter(([_, v]) => v !== "")) }));
  }, [existingCounts]);

  function handleSave(itemId: number) {
    const qty = parseFloat(counts[itemId] || "0");
    if (isNaN(qty)) { toast.error("Invalid quantity"); return; }
    saveMut.mutate({ counts: [{ itemId, storeCode, countDate, quantity: qty, countedBy: "Dashboard User" }] });
  }

  function handleSaveAll() {
    const entries = Object.entries(counts).filter(([_, v]) => v !== "" && !isNaN(parseFloat(v)));
    if (entries.length === 0) { toast.error("No counts to save"); return; }
    const batch = entries.map(([itemId, qty]) => ({
      itemId: parseInt(itemId), storeCode, countDate, quantity: parseFloat(qty), countedBy: "Dashboard User",
    }));
    saveMut.mutate({ counts: batch });
  }

  // Group items by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    items.forEach(item => {
      const cat = item.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1000px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Inventory Count</h1>
            <p className="text-sm text-muted-foreground mt-1">Record stock counts per store and date</p>
          </div>
          <Button onClick={handleSaveAll} className="bg-amber-600 hover:bg-amber-700 text-white" disabled={saveMut.isPending}>
            <Save className="w-4 h-4 mr-2" /> Save All Counts
          </Button>
        </div>

        {/* Store + Date Selector */}
        <div className="flex items-center gap-3">
          <Select value={storeCode} onValueChange={setStoreCode}>
            <SelectTrigger className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STORES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="w-[180px] bg-white" value={countDate} onChange={(e) => setCountDate(e.target.value)} />
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No inventory items</p>
              <p className="text-sm mt-1">Add items in the Inventory Items page first</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([category, catItems]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{category}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {catItems.map(item => {
                      const existing = existingCounts.find(c => c.itemId === item.id);
                      return (
                        <div key={item.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.unit}{item.parLevel ? ` · Par: ${item.parLevel}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              className="w-[100px] text-right bg-white"
                              placeholder="0"
                              value={counts[item.id] || ""}
                              onChange={(e) => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSave(item.id)} disabled={saveMut.isPending}>
                              <Save className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          {existing && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              Last: {existing.quantity}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
