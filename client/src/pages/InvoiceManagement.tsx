/**
 * Invoice Management — Admin dashboard page for viewing and managing all submitted invoices
 */
import { useState, useEffect, useMemo } from "react";
import { Receipt, Search, Filter, Eye, Calendar, Store, Loader2, ExternalLink, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: number;
  storeCode: string;
  vendorName: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  lineItems: any[] | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  photoUrl: string;
  photoUrls: { url: string; key: string }[] | null;
  verifiedBy: string;
  notes: string | null;
  status: string;
  category: string | null;
  createdAt: string;
}

const STORES = [
  { code: "pk", name: "President Kennedy" },
  { code: "mk", name: "Mackay" },
  { code: "tn", name: "Tunnel" },
  { code: "ontario", name: "Ontario" },
];

const VENDORS = ["Gordon/GFS", "Dube Loiselle", "Costco", "Fernando", "JG Rive Sud"];

function getStoreName(code: string) {
  return STORES.find((s) => s.code === code)?.name || code;
}

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeFilter, setStoreFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/invoices");
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (storeFilter !== "all" && inv.storeCode !== storeFilter) return false;
      if (vendorFilter !== "all" && inv.vendorName !== vendorFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          inv.vendorName.toLowerCase().includes(q) ||
          inv.verifiedBy.toLowerCase().includes(q) ||
          (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
          (inv.notes && inv.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [invoices, storeFilter, vendorFilter, searchQuery]);

  // Summary stats
  const totalAmount = filtered.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const vendorBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filtered.forEach((inv) => {
      if (!map[inv.vendorName]) map[inv.vendorName] = { count: 0, total: 0 };
      map[inv.vendorName].count++;
      map[inv.vendorName].total += inv.total || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Invoice Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage all delivery invoices submitted by store staff
            </p>
          </div>
          <Button onClick={fetchInvoices} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Total Invoices</div>
              <div className="text-2xl font-bold mt-1">{filtered.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold mt-1">${totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Vendors</div>
              <div className="text-2xl font-bold mt-1">{vendorBreakdown.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Vendor Breakdown */}
        {vendorBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Vendor Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {vendorBreakdown.map(([vendor, data]) => (
                  <div key={vendor} className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground truncate">{vendor}</div>
                    <div className="text-lg font-bold mt-1">${data.total.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{data.count} invoice{data.count !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {STORES.map((s) => (
                <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {VENDORS.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No invoices found</p>
            <p className="text-sm mt-1">Invoices submitted from the portal will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img src={inv.photoUrl} alt="Invoice" className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{inv.vendorName}</span>
                    {inv.invoiceNumber && (
                      <span className="text-xs text-muted-foreground">#{inv.invoiceNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      {getStoreName(inv.storeCode)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {inv.invoiceDate || new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                    <span>by {inv.verifiedBy}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  {inv.total != null ? (
                    <div className="font-bold text-lg">${inv.total.toFixed(2)}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No total</div>
                  )}
                  <Badge variant={inv.status === "verified" ? "default" : "secondary"} className="text-[10px]">
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invoice Detail Dialog */}
        <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedInvoice && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Invoice from {selectedInvoice.vendorName}
                    {selectedInvoice.invoiceNumber && (
                      <span className="text-muted-foreground font-normal">#{selectedInvoice.invoiceNumber}</span>
                    )}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Photos */}
                  {selectedInvoice.photoUrls && Array.isArray(selectedInvoice.photoUrls) && selectedInvoice.photoUrls.length > 1 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Photos ({selectedInvoice.photoUrls.length})</div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedInvoice.photoUrls.map((p: any, i: number) => (
                          <div key={i} className="relative rounded-lg overflow-hidden border cursor-pointer hover:ring-2 ring-[#D4A853]" onClick={() => window.open(p.url, "_blank")}>
                            <img src={p.url} alt={`Invoice page ${i + 1}`} className="w-full h-40 object-cover" />
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Page {i + 1}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden border">
                      <img src={selectedInvoice.photoUrl} alt="Invoice" className="w-full" />
                    </div>
                  )}

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Store</div>
                      <div className="font-medium">{getStoreName(selectedInvoice.storeCode)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Date</div>
                      <div className="font-medium">{selectedInvoice.invoiceDate || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Verified By</div>
                      <div className="font-medium">{selectedInvoice.verifiedBy}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <Badge variant={selectedInvoice.status === "verified" ? "default" : "secondary"}>
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Category</div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedInvoice.category === "cogs" || !selectedInvoice.category ? "Cost of Goods Sold" : selectedInvoice.category}
                      </Badge>
                    </div>
                    {selectedInvoice.invoiceNumber && (
                      <div>
                        <div className="text-muted-foreground">Invoice #</div>
                        <div className="font-medium">{selectedInvoice.invoiceNumber}</div>
                      </div>
                    )}
                  </div>

                  {/* Line Items */}
                  {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Line Items</div>
                      <div className="border rounded-lg divide-y">
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                          <div className="col-span-6">Description</div>
                          <div className="col-span-2 text-right">Qty</div>
                          <div className="col-span-2 text-right">Unit Price</div>
                          <div className="col-span-2 text-right">Total</div>
                        </div>
                        {selectedInvoice.lineItems.map((item: any, i: number) => (
                          <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                            <div className="col-span-6 truncate">{item.description}</div>
                            <div className="col-span-2 text-right">{item.quantity ?? "-"}</div>
                            <div className="col-span-2 text-right">
                              {item.unitPrice != null ? `$${item.unitPrice.toFixed(2)}` : "-"}
                            </div>
                            <div className="col-span-2 text-right font-medium">
                              {item.total != null ? `$${item.total.toFixed(2)}` : "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-48 space-y-1 text-sm">
                      {selectedInvoice.subtotal != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedInvoice.tax != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span>${selectedInvoice.tax.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedInvoice.total != null && (
                        <div className="flex justify-between font-bold text-base border-t pt-1">
                          <span>Total</span>
                          <span>${selectedInvoice.total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div>
                      <div className="text-sm font-medium mb-1">Notes</div>
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                        {selectedInvoice.notes}
                      </div>
                    </div>
                  )}

                  {/* View full photo(s) */}
                  {selectedInvoice.photoUrls && Array.isArray(selectedInvoice.photoUrls) && selectedInvoice.photoUrls.length > 1 ? (
                    <div className="flex gap-2">
                      {selectedInvoice.photoUrls.map((p: any, i: number) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(p.url, "_blank")}
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Photo {i + 1}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedInvoice.photoUrl, "_blank")}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Full Photo
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
