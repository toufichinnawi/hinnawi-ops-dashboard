import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Package, Search } from "lucide-react";
import { toast } from "sonner";

export default function InventoryItems() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", category: "", unit: "each", parLevel: "" });

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.inventoryItems.list.useQuery(
    filterCategory !== "all" ? { category: filterCategory } : undefined
  );

  const createMut = trpc.inventoryItems.create.useMutation({
    onSuccess: () => { utils.inventoryItems.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Item added"); },
  });
  const updateMut = trpc.inventoryItems.update.useMutation({
    onSuccess: () => { utils.inventoryItems.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Item updated"); },
  });
  const deleteMut = trpc.inventoryItems.delete.useMutation({
    onSuccess: () => { utils.inventoryItems.list.invalidate(); toast.success("Item deleted"); },
  });

  function resetForm() {
    setForm({ name: "", category: "", unit: "each", parLevel: "" });
    setEditId(null);
  }

  function openEdit(item: any) {
    setForm({ name: item.name, category: item.category || "", unit: item.unit || "each", parLevel: item.parLevel ? String(item.parLevel) : "" });
    setEditId(item.id);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: form.name,
      category: form.category || undefined,
      unit: form.unit || "each",
      parLevel: form.parLevel ? parseFloat(form.parLevel) : undefined,
    };
    if (editId) updateMut.mutate({ id: editId, ...payload });
    else createMut.mutate(payload);
  }

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(cats).sort() as string[];
  }, [items]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || (i.category && i.category.toLowerCase().includes(q)));
  }, [items, search]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Inventory Items</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your product catalog</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Item" : "Add Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cream Cheese" /></div>
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Dairy" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="each, kg, lb" /></div>
                  <div><Label>Par Level</Label><Input type="number" value={form.parLevel} onChange={(e) => setForm(f => ({ ...f, parLevel: e.target.value }))} placeholder="Min stock" /></div>
                </div>
                <Button onClick={handleSubmit} className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={createMut.isPending || updateMut.isPending}>
                  {editId ? "Update" : "Add"} Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-white" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} items</span>
        </div>

        {/* Items Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading items...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{search ? "No items match your search" : "No inventory items yet"}</p>
                <p className="text-sm mt-1">{search ? "Try a different search term" : "Click \"Add Item\" to start building your catalog"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Unit</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Par Level</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium text-foreground">{item.name}</td>
                        <td className="p-3">
                          {item.category ? <Badge variant="outline" className="text-xs">{item.category}</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 text-muted-foreground">{item.unit}</td>
                        <td className="p-3 text-right font-mono">{item.parLevel ?? "—"}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteMut.mutate({ id: item.id })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
