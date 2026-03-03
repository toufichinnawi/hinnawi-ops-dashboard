import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, MapPin, User, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STORES = [
  { code: "PK", name: "Park Extension" },
  { code: "MK", name: "Mackay" },
  { code: "ON", name: "Ontario" },
  { code: "TN", name: "Tunnel" },
];

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
};

export default function ReportHistory() {
  const [filterStore, setFilterStore] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: allReports = [], isLoading } = trpc.reports.allReports.useQuery();

  // Client-side filtering
  const reports = useMemo(() => {
    return allReports.filter((r: any) => {
      if (filterStore !== "all" && r.storeCode !== filterStore) return false;
      if (filterType !== "all" && r.type !== filterType) return false;
      return true;
    });
  }, [allReports, filterStore, filterType]);

  // Get unique types for filter
  const reportTypes = useMemo(() => {
    const types = new Set(allReports.map((r: any) => r.type));
    return Array.from(types).sort();
  }, [allReports]);

  function parsePayload(payload: string | null) {
    if (!payload) return null;
    try { return JSON.parse(payload); } catch { return null; }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
        ))}
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Report History</h1>
            <p className="text-sm text-muted-foreground mt-1">View submitted reports and checklists</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterStore} onValueChange={setFilterStore}>
            <SelectTrigger className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {STORES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px] bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {reportTypes.map(t => <SelectItem key={String(t)} value={String(t)}>{String(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{reports.length} reports</span>
        </div>

        {/* Reports List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No reports found</p>
              <p className="text-sm mt-1">Submitted checklists and reports will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report: any) => {
              const payload = parsePayload(report.payload);
              return (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center mt-0.5">
                          <FileText className="w-4.5 h-4.5 text-amber-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-foreground">{report.type}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {STORES.find(s => s.code === report.storeCode)?.name || report.storeCode}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(report.createdAt).toLocaleDateString("en-CA")}
                            </span>
                            {report.submittedBy && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {report.submittedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[report.status] || ""}`}>
                        {report.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Report Detail Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedReport.type}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Store</p>
                      <p className="font-medium">{STORES.find(s => s.code === selectedReport.storeCode)?.name || selectedReport.storeCode}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">{new Date(selectedReport.createdAt).toLocaleString("en-CA")}</p>
                    </div>
                    {selectedReport.submittedBy && (
                      <div>
                        <p className="text-muted-foreground text-xs">Submitted By</p>
                        <p className="font-medium">{selectedReport.submittedBy}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[selectedReport.status] || ""}`}>
                        {selectedReport.status}
                      </Badge>
                    </div>
                  </div>
                  {(() => {
                    const payload = parsePayload(selectedReport.payload);
                    if (!payload) return <p className="text-sm text-muted-foreground">No detailed data available</p>;
                    return (
                      <div className="space-y-3 border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</p>
                        {Object.entries(payload).map(([key, value]) => {
                          if (key === "items" && Array.isArray(value)) {
                            return (
                              <div key={key} className="space-y-2">
                                {(value as any[]).map((item, i) => (
                                  <div key={i} className="p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium">{item.label || item.name || `Item ${i + 1}`}</p>
                                      {item.rating !== undefined && renderStars(item.rating)}
                                    </div>
                                    {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          if (typeof value === "object" && value !== null) {
                            return (
                              <div key={key} className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs font-medium text-muted-foreground mb-1">{key}</p>
                                <pre className="text-xs text-foreground whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                              </div>
                            );
                          }
                          return (
                            <div key={key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                              <p className="text-sm text-muted-foreground">{key}</p>
                              <p className="text-sm font-medium">{String(value)}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
