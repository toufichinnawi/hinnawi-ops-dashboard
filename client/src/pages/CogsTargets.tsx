import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

const STORES = [
  { code: "PK", name: "Park Extension", color: "#D4A853" },
  { code: "MK", name: "Mackay", color: "#3B82F6" },
  { code: "ON", name: "Ontario", color: "#10B981" },
  { code: "TN", name: "Tunnel", color: "#F59E0B" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CogsTargets() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ storeCode: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()), targetAmount: "" });

  const utils = trpc.useUtils();
  const { data: targets = [], isLoading } = trpc.cogsTargets.list.useQuery({ month: 0, year });

  const upsertMut = trpc.cogsTargets.upsert.useMutation({
    onSuccess: () => { utils.cogsTargets.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Target saved"); },
  });

  function resetForm() {
    setForm({ storeCode: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()), targetAmount: "" });
    setEditId(null);
  }

  function openEdit(t: any) {
    setForm({ storeCode: t.storeCode, month: String(t.month), year: String(t.year), targetAmount: String(t.targetAmount) });
    setEditId(t.id);
    setDialogOpen(true);
  }

  function handleSubmit() {
    const amount = parseFloat(form.targetAmount);
    if (!form.storeCode || isNaN(amount)) { toast.error("Please fill required fields"); return; }
    upsertMut.mutate({ storeCode: form.storeCode, month: parseInt(form.month), year: parseInt(form.year), targetAmount: amount });
  }

  // Chart data: group by month, show each store as a bar
  const chartData = useMemo(() => {
    const byMonth: Record<number, Record<string, number>> = {};
    targets.forEach(t => {
      if (!byMonth[t.month]) byMonth[t.month] = {};
      byMonth[t.month][t.storeCode] = t.targetAmount;
    });
    return MONTHS.map((name, i) => ({
      month: name.slice(0, 3),
      ...STORES.reduce((acc, s) => ({ ...acc, [s.code]: byMonth[i + 1]?.[s.code] || 0 }), {}),
    }));
  }, [targets]);

  const fmt = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: 0 })}`;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">COGS Targets</h1>
            <p className="text-sm text-muted-foreground mt-1">Monthly cost of goods sold budget targets per store</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Target
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{editId ? "Edit Target" : "Add Target"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Store *</Label>
                    <Select value={form.storeCode} onValueChange={(v) => setForm(f => ({ ...f, storeCode: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                      <SelectContent>{STORES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Month *</Label>
                      <Select value={form.month} onValueChange={(v) => setForm(f => ({ ...f, month: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Year *</Label>
                      <Select value={form.year} onValueChange={(v) => setForm(f => ({ ...f, year: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Target Amount ($) *</Label><Input type="number" step="0.01" value={form.targetAmount} onChange={(e) => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="0.00" /></div>
                  <Button onClick={handleSubmit} className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={upsertMut.isPending}>
                    {editId ? "Update" : "Add"} Target
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Monthly COGS Targets — {year}</CardTitle>
          </CardHeader>
          <CardContent>
            {targets.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  {STORES.map(s => (
                    <Bar key={s.code} dataKey={s.code} name={s.name} fill={s.color} radius={[2, 2, 0, 0]} barSize={16} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No targets set for {year}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        {targets.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Store</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Target</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map(t => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3">{STORES.find(s => s.code === t.storeCode)?.name || t.storeCode}</td>
                        <td className="p-3">{MONTHS[t.month - 1]} {t.year}</td>
                        <td className="p-3 text-right font-mono font-medium">{fmt(t.targetAmount)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
