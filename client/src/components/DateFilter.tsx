// DateFilter: Reusable date filtering component
// Supports: Single day, Date range, and Quick presets (Today, Yesterday, Last 7/30 days)
import { useState, useMemo } from "react";
import { format, subDays, startOfDay, endOfDay, isEqual } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export type DateFilterMode = "single" | "range";

export interface DateFilterValue {
  mode: DateFilterMode;
  /** For single mode: the selected date. For range mode: the start date */
  from: Date;
  /** For range mode: the end date. For single mode: same as `from` */
  to: Date;
  /** Human-readable label for the active filter */
  label: string;
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
}

const today = startOfDay(new Date());

export const PRESETS = [
  {
    label: "Today",
    getValue: () => ({ mode: "single" as const, from: today, to: endOfDay(today), label: "Today" }),
  },
  {
    label: "Yesterday",
    getValue: () => {
      const d = subDays(today, 1);
      return { mode: "single" as const, from: startOfDay(d), to: endOfDay(d), label: "Yesterday" };
    },
  },
  {
    label: "Last 7 Days",
    getValue: () => ({
      mode: "range" as const,
      from: startOfDay(subDays(today, 6)),
      to: endOfDay(today),
      label: "Last 7 Days",
    }),
  },
  {
    label: "Last 14 Days",
    getValue: () => ({
      mode: "range" as const,
      from: startOfDay(subDays(today, 13)),
      to: endOfDay(today),
      label: "Last 14 Days",
    }),
  },
  {
    label: "Last 30 Days",
    getValue: () => ({
      mode: "range" as const,
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today),
      label: "Last 30 Days",
    }),
  },
];

export function getDefaultDateFilter(): DateFilterValue {
  return PRESETS[2].getValue(); // Last 7 Days
}

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DateFilterMode>(value.mode);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value.from);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: value.from,
    to: value.to,
  });

  const displayText = useMemo(() => {
    if (value.label && value.label !== "Custom") return value.label;
    if (value.mode === "single") {
      return format(value.from, "MMM d, yyyy");
    }
    return `${format(value.from, "MMM d")} – ${format(value.to, "MMM d, yyyy")}`;
  }, [value]);

  function handlePreset(preset: (typeof PRESETS)[number]) {
    const val = preset.getValue();
    onChange(val);
    setMode(val.mode);
    if (val.mode === "single") {
      setSelectedDate(val.from);
    } else {
      setSelectedRange({ from: val.from, to: val.to });
    }
    setOpen(false);
  }

  function handleSingleSelect(date: Date | undefined) {
    if (!date) return;
    setSelectedDate(date);
    const val: DateFilterValue = {
      mode: "single",
      from: startOfDay(date),
      to: endOfDay(date),
      label: isEqual(startOfDay(date), today)
        ? "Today"
        : isEqual(startOfDay(date), subDays(today, 1))
          ? "Yesterday"
          : format(date, "MMM d, yyyy"),
    };
    onChange(val);
    setOpen(false);
  }

  function handleRangeSelect(range: DateRange | undefined) {
    if (!range) return;
    setSelectedRange(range);
    if (range.from && range.to) {
      const val: DateFilterValue = {
        mode: "range",
        from: startOfDay(range.from),
        to: endOfDay(range.to),
        label: "Custom",
      };
      // Check if it matches a preset
      for (const preset of PRESETS) {
        const pv = preset.getValue();
        if (
          pv.mode === "range" &&
          isEqual(startOfDay(range.from), pv.from) &&
          isEqual(startOfDay(range.to), startOfDay(pv.to))
        ) {
          val.label = preset.label;
          break;
        }
      }
      onChange(val);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 px-3 gap-2 text-sm font-normal bg-card border-border/60 hover:bg-accent/50",
            className
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{displayText}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="flex">
          {/* Presets sidebar */}
          <div className="border-r border-border p-2 space-y-0.5 min-w-[140px]">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1.5 font-medium">
              Quick Select
            </p>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={cn(
                  "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                  value.label === preset.label
                    ? "bg-[#D4A853]/10 text-[#D4A853] font-medium"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {preset.label}
              </button>
            ))}
            <div className="border-t border-border my-2" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1.5 font-medium">
              Mode
            </p>
            <button
              onClick={() => setMode("single")}
              className={cn(
                "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                mode === "single"
                  ? "bg-[#D4A853]/10 text-[#D4A853] font-medium"
                  : "text-foreground hover:bg-accent"
              )}
            >
              Single Day
            </button>
            <button
              onClick={() => setMode("range")}
              className={cn(
                "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                mode === "range"
                  ? "bg-[#D4A853]/10 text-[#D4A853] font-medium"
                  : "text-foreground hover:bg-accent"
              )}
            >
              Date Range
            </button>
          </div>

          {/* Calendar */}
          <div className="p-2">
            {mode === "single" ? (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleSingleSelect}
                disabled={{ after: new Date() }}
                defaultMonth={selectedDate}
              />
            ) : (
              <Calendar
                mode="range"
                selected={selectedRange}
                onSelect={handleRangeSelect}
                disabled={{ after: new Date() }}
                defaultMonth={selectedRange?.from}
                numberOfMonths={1}
              />
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
