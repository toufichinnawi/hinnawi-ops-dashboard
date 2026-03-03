import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, DollarSign } from "lucide-react";
import { toast } from "sonner";

const STORES = [
  { code: "PK", name: "Park Extension" },
  { code: "MK", name: "Mackay" },
  { code: "ON", name: "Ontario" },
  { code: "TN", name: "Tunnel" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ExpenseEntry() {

  const [filterStore, setFilterStore] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    storeCode: "",
    categoryId: 0,
    vendorId: undefined as number | undefined,
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    status: "pending" as "pending" | "approved" | "rejected",
  });

  const utils = trpc.useUtils();
  const { data: expenses = [], isLoading } = trpc.expenses.list.useQuery(
    filterStore !== "all" || filterStatus !== "all"
      ? {
          ...(filterStore !== "all" ? { storeCode: filterStore } : {}),
          ...(filterStatus !== "all" ? { status: filterStatus } : {}),
        }
      : undefined
  );
  const { data: categories = [] } = trpc.expenseCategories.list.useQuery();
  const { data: vendors = [] } = trpc.vendors.list.useQuery();

  const createMut = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Expense added");
    },
  });
  const updateMut = trpc.expenses.update.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Expense updated");
    },
  });
  const deleteMut = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      toast.success("Expense deleted");
    },
  });

  function resetForm() {
    setForm({
      storeCode: "",
      categoryId: 0,
      amount: "",
      description: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      status: "pending",
      vendorId: undefined,
    });
    setEditId(null);
  }

  function openEdit(exp: any) {
    setForm({
      storeCode: exp.storeCode,
      categoryId: exp.categoryId,
      vendorId: exp.vendorId || undefined,
      amount: String(exp.amount),
      description: exp.description || "",
      expenseDate: exp.expenseDate,
      status: exp.status,
    });
    setEditId(exp.id);
    setDialogOpen(true);
  }

  function handleSubmit() {
    const amount = parseFloat(form.amount);
    if (!form.storeCode || !form.categoryId || isNaN(amount)) {
      toast.error("Please fill required fields");
      return;
    }
    const payload = {
      storeCode: form.storeCode,
      categoryId: form.categoryId,
      vendorId: form.vendorId,
      amount,
      description: form.description || undefined,
      expenseDate: form.expenseDate,
      status: form.status,
    };
    if (editId) {
      updateMut.mutate({ id: editId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
  const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Expense Entry</h1>
            <p className="text-sm text-muted-foreground mt-1">Log and manage store expenses</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Expense" : "Add Expense"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Store *</Label>
                    <Select value={form.storeCode} onValueChange={(v) => setForm(f => ({ ...f, storeCode: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                      <SelectContent>
                        {STORES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" value={form.expenseDate} onChange={(e) => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select value={form.categoryId ? String(form.categoryId) : ""} onValueChange={(v) => setForm(f => ({ ...f, categoryId: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vendor</Label>
                  <Select value={form.vendorId ? String(form.vendorId) : "none"} onValueChange={(v) => setForm(f => ({ ...f, vendorId: v === "none" ? undefined : Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No vendor</SelectItem>
                      {vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount ($) *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input placeholder="Optional description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={createMut.isPending || updateMut.isPending}>
                  {editId ? "Update" : "Add"} Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters + Total */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterStore} onValueChange={setFilterStore}>
            <SelectTrigger className="w-[150px] bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {STORES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="font-mono font-semibold text-foreground">
              ${totalAmount.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-muted-foreground">({expenses.length} entries)</span>
          </div>
        </div>

        {/* Expense Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No expenses found</p>
                <p className="text-sm mt-1">Click "Add Expense" to log your first entry</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Store</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Vendor</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs">{exp.expenseDate}</td>
                        <td className="p-3">{STORES.find(s => s.code === exp.storeCode)?.name || exp.storeCode}</td>
                        <td className="p-3">{catMap.get(exp.categoryId) || "—"}</td>
                        <td className="p-3 text-muted-foreground">{exp.vendorId ? vendorMap.get(exp.vendorId) || "—" : "—"}</td>
                        <td className="p-3 text-right font-mono font-medium">${exp.amount.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[exp.status]}`}>
                            {exp.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(exp)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteMut.mutate({ id: exp.id })}>
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
