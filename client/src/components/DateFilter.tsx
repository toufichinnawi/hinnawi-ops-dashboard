// DateFilter: Reusable date filtering component
// Supports: Single day, Date range, and Quick presets (Today, Yesterday, Last 7/30 days)
// Date Range mode uses a staged "Apply" button so both dates must be selected first.
import { useState, useMemo } from "react";
import { format, subDays, startOfDay, endOfDay, isEqual } from "date-fns";
import { CalendarIcon, ChevronDown, Check } from "lucide-react";
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
  return PRESETS[0].getValue(); // Today
}

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DateFilterMode>(value.mode);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value.from);

  // Staged range: this is what the user sees in the calendar while picking,
  // but it does NOT apply until they click "Apply Filter".
  const [stagedRange, setStagedRange] = useState<DateRange | undefined>({
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

  // Whether the staged range is complete (both from and to selected)
  const rangeComplete = !!(stagedRange?.from && stagedRange?.to);

  // Format the staged range for the helper text
  const stagedRangeText = useMemo(() => {
    if (!stagedRange?.from) return "Select start date";
    if (!stagedRange?.to) return `${format(stagedRange.from, "MMM d")} → Select end date`;
    return `${format(stagedRange.from, "MMM d")} – ${format(stagedRange.to, "MMM d, yyyy")}`;
  }, [stagedRange]);

  function handlePreset(preset: (typeof PRESETS)[number]) {
    const val = preset.getValue();
    onChange(val);
    setMode(val.mode);
    if (val.mode === "single") {
      setSelectedDate(val.from);
    } else {
      setStagedRange({ from: val.from, to: val.to });
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
    // Only stage the range — do NOT apply yet
    setStagedRange(range);
  }

  function handleApplyRange() {
    if (!stagedRange?.from || !stagedRange?.to) return;

    const val: DateFilterValue = {
      mode: "range",
      from: startOfDay(stagedRange.from),
      to: endOfDay(stagedRange.to),
      label: "Custom",
    };
    // Check if it matches a preset
    for (const preset of PRESETS) {
      const pv = preset.getValue();
      if (
        pv.mode === "range" &&
        isEqual(startOfDay(stagedRange.from), pv.from) &&
        isEqual(startOfDay(stagedRange.to), startOfDay(pv.to))
      ) {
        val.label = preset.label;
        break;
      }
    }
    onChange(val);
    setOpen(false);
  }

  function handleModeSwitch(newMode: DateFilterMode) {
    setMode(newMode);
    // When switching to range mode, initialize staged range from current value
    if (newMode === "range") {
      setStagedRange({ from: value.from, to: value.to });
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
              onClick={() => handleModeSwitch("single")}
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
              onClick={() => handleModeSwitch("range")}
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

          {/* Calendar + Apply button */}
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
              <>
                <Calendar
                  mode="range"
                  selected={stagedRange}
                  onSelect={handleRangeSelect}
                  disabled={{ after: new Date() }}
                  defaultMonth={stagedRange?.from}
                  numberOfMonths={1}
                />
                {/* Staged range summary + Apply button */}
                <div className="border-t border-border mt-1 pt-2 px-1 space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    {stagedRangeText}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleApplyRange}
                    disabled={!rangeComplete}
                    className={cn(
                      "w-full gap-1.5",
                      rangeComplete
                        ? "bg-[#D4A853] hover:bg-[#C49A48] text-white"
                        : ""
                    )}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Filter
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
