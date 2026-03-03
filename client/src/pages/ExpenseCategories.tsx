import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Tag } from "lucide-react";
import { toast } from "sonner";

const SECTION_LABELS: Record<string, { label: string; color: string }> = {
  cogs: { label: "COGS", color: "bg-amber-100 text-amber-800" },
  operating: { label: "Operating", color: "bg-blue-100 text-blue-800" },
  labour: { label: "Labour", color: "bg-emerald-100 text-emerald-800" },
  other: { label: "Other", color: "bg-purple-100 text-purple-800" },
};

export default function ExpenseCategories() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", pnlSection: "operating" as "cogs" | "operating" | "labour" | "other", sortOrder: "0" });

  const utils = trpc.useUtils();
  const { data: categories = [], isLoading } = trpc.expenseCategories.list.useQuery();

  const createMut = trpc.expenseCategories.create.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Category added"); },
  });
  const updateMut = trpc.expenseCategories.update.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Category updated"); },
  });
  const deleteMut = trpc.expenseCategories.delete.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); toast.success("Category deleted"); },
  });

  function resetForm() {
    setForm({ name: "", description: "", pnlSection: "operating", sortOrder: "0" });
    setEditId(null);
  }

  function openEdit(c: any) {
    setForm({ name: c.name, description: c.description || "", pnlSection: c.pnlSection as "cogs" | "operating" | "labour" | "other", sortOrder: String(c.sortOrder || 0) });
    setEditId(c.id);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: form.name,
      description: form.description || undefined,
      pnlSection: form.pnlSection,
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    if (editId) updateMut.mutate({ id: editId, ...payload });
    else createMut.mutate(payload);
  }

  // Group categories by section
  const grouped = categories.reduce((acc, cat) => {
    const section = cat.pnlSection || "other";
    if (!acc[section]) acc[section] = [];
    acc[section].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>);

  const sectionOrder = ["cogs", "operating", "labour", "other"];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1000px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Expense Categories</h1>
            <p className="text-sm text-muted-foreground mt-1">Organize expenses by P&L section</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Category" : "Add Category"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dairy Products" /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" /></div>
                <div>
                  <Label>P&L Section *</Label>
                  <Select value={form.pnlSection} onValueChange={(v) => setForm(f => ({ ...f, pnlSection: v as "cogs" | "operating" | "labour" | "other" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cogs">Cost of Goods Sold (COGS)</SelectItem>
                      <SelectItem value="operating">Operating Expenses</SelectItem>
                      <SelectItem value="labour">Labour Costs</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={(e) => setForm(f => ({ ...f, sortOrder: e.target.value }))} /></div>
                <Button onClick={handleSubmit} className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={createMut.isPending || updateMut.isPending}>
                  {editId ? "Update" : "Add"} Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}
          </div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No categories yet</p>
              <p className="text-sm mt-1">Add categories to organize your expenses</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sectionOrder.map(section => {
              const cats = grouped[section];
              if (!cats || cats.length === 0) return null;
              const info = SECTION_LABELS[section] || { label: section, color: "bg-gray-100 text-gray-800" };
              return (
                <div key={section}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className={`text-xs ${info.color}`}>{info.label}</Badge>
                    <span className="text-xs text-muted-foreground">{cats.length} categories</span>
                  </div>
                  <div className="space-y-2">
                    {cats.map(cat => (
                      <Card key={cat.id} className="group hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                              <Tag className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{cat.name}</p>
                              {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteMut.mutate({ id: cat.id })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
