// Design: "Golden Hour Operations" — Refined Editorial
// Frosted glass cards with warm-tinted backdrop, serif headings, mono numbers
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KPI } from "@/lib/data";

interface KPICardProps {
  kpi: KPI;
  invertTrend?: boolean;
  className?: string;
  /** When set, the card turns red/alert if kpi.value exceeds this threshold */
  alertAbove?: number;
}

function formatValue(value: number, format: KPI["format"]): string {
  switch (format) {
    case "currency":
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "number":
      return value.toLocaleString("en-US");
    default:
      return String(value);
  }
}

export default function KPICard({ kpi, invertTrend = false, className, alertAbove }: KPICardProps) {
  const isPositive = invertTrend ? kpi.trend < 0 : kpi.trend > 0;
  const isAlert = alertAbove !== undefined && kpi.value > alertAbove;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 transition-shadow duration-300",
        isAlert
          ? "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 hover:shadow-lg hover:shadow-red-500/10"
          : "border-border/60 bg-card hover:shadow-lg hover:shadow-[#D4A853]/5",
        className
      )}
    >
      {/* Thin accent line at top — red when alert, gold otherwise */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px]",
          isAlert
            ? "bg-gradient-to-r from-red-400/60 via-red-500 to-red-400/60"
            : "bg-gradient-to-r from-[#D4A853]/60 via-[#D4A853] to-[#D4A853]/60"
        )}
      />

      <div className="flex items-center justify-between">
        <p className={cn(
          "text-xs font-medium uppercase tracking-wider",
          isAlert ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
        )}>
          {kpi.title}
        </p>
        {isAlert && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-red-500 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
            Above Target
          </span>
        )}
      </div>

      <div className="mt-2 flex items-end gap-3">
        <span className={cn(
          "text-3xl font-mono font-semibold tracking-tight",
          isAlert ? "text-red-600 dark:text-red-400" : "text-foreground"
        )}>
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
        <p className={cn(
          "text-[11px]",
          isAlert ? "text-red-500/80 dark:text-red-400/70" : "text-muted-foreground"
        )}>
          {kpi.subtitle}
        </p>
        <p className="text-[10px] text-muted-foreground/70">{kpi.trendLabel}</p>
      </div>
    </div>
  );
}
