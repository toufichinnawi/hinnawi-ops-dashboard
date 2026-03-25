/**
 * Equipment & Maintenance Checklist Data
 * Store-level equipment checks: Daily, Weekly, Monthly
 */

export interface EquipmentTask {
  machine: string;
  task: string;
  explanation: string;
}

export interface EquipmentSection {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  items: EquipmentTask[];
}

export const EQUIPMENT_SECTIONS: EquipmentSection[] = [
  {
    id: "daily",
    label: "Daily Checks",
    shortLabel: "Daily",
    icon: "☀️",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    items: [
      { machine: "Grill", task: "Clean surface and grease tray", explanation: "" },
      { machine: "Grill", task: "Check temperature", explanation: "" },
      { machine: "Espresso Machine", task: "Backflush (water)", explanation: "" },
      { machine: "Espresso Machine", task: "Clean steam wand", explanation: "" },
      { machine: "Espresso Machine", task: "Empty drip tray", explanation: "" },
      { machine: "Filter Coffee", task: "Clean brew basket & spray head", explanation: "" },
      { machine: "Espresso Grinder", task: "Brush grind chamber", explanation: "" },
      { machine: "Drinks Fridge", task: "Temp 2-4 C & clean glass", explanation: "" },
      { machine: "Dishwasher", task: "Clean filter & check rinse aid", explanation: "" },
      { machine: "Ice Machine", task: "Check ice quality", explanation: "" },
      { machine: "POS System", task: "Clean screen", explanation: "" },
      { machine: "Security Cameras", task: "Confirm recording", explanation: "" },
      { machine: "Fire Extinguisher", task: "Visible & accessible", explanation: "" },
    ],
  },
  {
    id: "weekly",
    label: "Weekly Checks",
    shortLabel: "Weekly",
    icon: "📋",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    items: [
      { machine: "Grill", task: "Deep clean & degrease", explanation: "" },
      { machine: "Espresso Machine", task: "Backflush with detergent & soak portafilters", explanation: "" },
      { machine: "Grinder", task: "Deep clean burrs", explanation: "" },
      { machine: "Ice Machine", task: "Sanitize interior", explanation: "" },
      { machine: "Dishwasher", task: "Run cleaning cycle", explanation: "" },
    ],
  },
  {
    id: "monthly",
    label: "Monthly Checks",
    shortLabel: "Monthly",
    icon: "📆",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    items: [
      { machine: "Espresso Machine", task: "Inspect gaskets & pressure", explanation: "" },
      { machine: "Water Filtration", task: "Replace filter if required", explanation: "" },
      { machine: "Refrigeration", task: "Clean condenser coils", explanation: "" },
      { machine: "HVAC / Hood", task: "Replace or clean filters", explanation: "" },
    ],
  },
];

/** Total number of checkable items across all sections */
export const TOTAL_EQUIPMENT_ITEMS = EQUIPMENT_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
