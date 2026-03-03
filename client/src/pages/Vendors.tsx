import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Phone, Mail, Building2, User } from "lucide-react";
import { toast } from "sonner";

export default function Vendors() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", contactRole: "", description: "", phone: "", email: "", notes: "",
  });

  const utils = trpc.useUtils();
  const { data: vendors = [], isLoading } = trpc.vendors.list.useQuery();

  const createMut = trpc.vendors.create.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Vendor added"); },
  });
  const updateMut = trpc.vendors.update.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Vendor updated"); },
  });
  const deleteMut = trpc.vendors.delete.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); toast.success("Vendor deleted"); },
  });

  function resetForm() {
    setForm({ name: "", contactRole: "", description: "", phone: "", email: "", notes: "" });
    setEditId(null);
  }

  function openEdit(v: any) {
    setForm({
      name: v.name, contactRole: v.contactRole || "", description: v.description || "",
      phone: v.phone || "", email: v.email || "", notes: v.notes || "",
    });
    setEditId(v.id);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: form.name,
      contactRole: form.contactRole || undefined,
      description: form.description || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
    };
    if (editId) updateMut.mutate({ id: editId, ...payload });
    else createMut.mutate(payload);
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Vendors & Suppliers</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your supplier contacts</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Company Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sysco" /></div>
                <div><Label>Contact / Role</Label><Input value={form.contactRole} onChange={(e) => setForm(f => ({ ...f, contactRole: e.target.value }))} placeholder="e.g. Sales Rep" /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What they supply" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="514-..." /></div>
                  <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." /></div>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" /></div>
                <Button onClick={handleSubmit} className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={createMut.isPending || updateMut.isPending}>
                  {editId ? "Update" : "Add"} Vendor
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)}
          </div>
        ) : vendors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No vendors yet</p>
              <p className="text-sm mt-1">Click "Add Vendor" to add your first supplier</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <Card key={v.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{v.name}</h3>
                        {v.contactRole && <p className="text-xs text-muted-foreground">{v.contactRole}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteMut.mutate({ id: v.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {v.description && <p className="text-sm text-muted-foreground mb-3">{v.description}</p>}
                  <div className="space-y-1.5">
                    {v.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {v.phone}
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" /> {v.email}
                      </div>
                    )}
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
