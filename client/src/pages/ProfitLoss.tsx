import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingDown, TrendingUp, PieChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SECTION_COLORS: Record<string, string> = {
  cogs: "#D4A853",
  operating: "#3B82F6",
  labour: "#10B981",
  other: "#8B5CF6",
};

const SECTION_LABELS: Record<string, string> = {
  cogs: "Cost of Goods Sold",
  operating: "Operating Expenses",
  labour: "Labour Costs",
  other: "Other Expenses",
};

export default function ProfitLoss() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: pnl, isLoading } = trpc.pnl.summary.useQuery({ month, year });

  const chartData = useMemo(() => {
    if (!pnl) return [];
    return [
      { name: "COGS", value: pnl.cogs, fill: SECTION_COLORS.cogs },
      { name: "Operating", value: pnl.operatingExpenses, fill: SECTION_COLORS.operating },
      { name: "Labour", value: pnl.labourExpenses, fill: SECTION_COLORS.labour },
      { name: "Other", value: pnl.otherExpenses, fill: SECTION_COLORS.other },
    ].filter(d => d.value > 0);
  }, [pnl]);

  const fmt = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Profit & Loss</h1>
            <p className="text-sm text-muted-foreground mt-1">Monthly expense breakdown by category</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : pnl ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                    <DollarSign className="w-3.5 h-3.5" />
                    TOTAL EXPENSES
                  </div>
                  <p className="text-2xl font-mono font-semibold text-foreground">{fmt(pnl.totalExpenses)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{MONTHS[month - 1]} {year}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4" style={{ borderLeftColor: SECTION_COLORS.cogs }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                    <TrendingDown className="w-3.5 h-3.5" />
                    COGS
                  </div>
                  <p className="text-2xl font-mono font-semibold text-foreground">{fmt(pnl.cogs)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pnl.totalExpenses > 0 ? ((pnl.cogs / pnl.totalExpenses) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4" style={{ borderLeftColor: SECTION_COLORS.labour }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    LABOUR
                  </div>
                  <p className="text-2xl font-mono font-semibold text-foreground">{fmt(pnl.labourExpenses)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pnl.totalExpenses > 0 ? ((pnl.labourExpenses / pnl.totalExpenses) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4" style={{ borderLeftColor: SECTION_COLORS.operating }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                    <PieChart className="w-3.5 h-3.5" />
                    OPERATING
                  </div>
                  <p className="text-2xl font-mono font-semibold text-foreground">{fmt(pnl.operatingExpenses)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pnl.totalExpenses > 0 ? ((pnl.operatingExpenses / pnl.totalExpenses) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Chart + Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Expense Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                      No expenses recorded for this month
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {pnl.byCategory.length > 0 ? (
                    <div className="space-y-3">
                      {pnl.byCategory.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: SECTION_COLORS[cat.section] || "#999" }} />
                            <div>
                              <p className="text-sm font-medium text-foreground">{cat.name}</p>
                              <p className="text-xs text-muted-foreground">{SECTION_LABELS[cat.section] || cat.section}</p>
                            </div>
                          </div>
                          <p className="text-sm font-mono font-medium text-foreground">{fmt(cat.total)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                      No categories to display
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <p>No data available for this period.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
