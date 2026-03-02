// Design: "Golden Hour Operations" — Refined Editorial
// Frosted glass cards with warm-tinted backdrop, serif headings, mono numbers
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KPI } from "@/lib/data";

interface KPICardProps {
  kpi: KPI;
  invertTrend?: boolean;
  className?: string;
}

function formatValue(value: number, format: KPI["format"]): string {
  switch (format) {
    case "currency":
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "number":
      return value.toLocaleString("en-US");
    default:
      return String(value);
  }
}

export default function KPICard({ kpi, invertTrend = false, className }: KPICardProps) {
  const isPositive = invertTrend ? kpi.trend < 0 : kpi.trend > 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-[#D4A853]/5",
        className
      )}
    >
      {/* Thin gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D4A853]/60 via-[#D4A853] to-[#D4A853]/60" />

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {kpi.title}
      </p>

      <div className="mt-2 flex items-end gap-3">
        <span className="text-3xl font-mono font-semibold tracking-tight text-foreground">
          {formatValue(kpi.value, kpi.format)}
        </span>

        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium pb-1",
            isPositive ? "text-emerald-600" : "text-red-500"
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{Math.abs(kpi.trend).toFixed(1)}%</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{kpi.subtitle}</p>
        <p className="text-[10px] text-muted-foreground/70">{kpi.trendLabel}</p>
      </div>
    </div>
  );
}
