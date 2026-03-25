/**
 * Position-based checklist configuration.
 * Maps each position slug (used in URL) to its display name
 * and assigned checklists.
 */

export type ChecklistType =
  | "manager-checklist"
  | "ops-manager-checklist"
  | "assistant-manager-checklist"
  | "waste-report"
  | "equipment-maintenance"
  | "weekly-scorecard"
  | "training-evaluation"
  | "bagel-orders"
  | "pastry-orders"
  | "daily-orders"
  | "performance-evaluation"
  | "manager-evaluation"
  | "deep-clean";

export interface ChecklistInfo {
  type: ChecklistType;
  label: string;
  description: string;
  icon: string;
  /** Schedule requirement for this checklist */
  schedule?: {
    frequency: "daily" | "weekly";
    /** Day of week (0=Sun, 1=Mon, ..., 3=Wed, ..., 6=Sat) */
    dueDay?: number;
    /** Time in HH:mm format */
    dueTime?: string;
    /** Human-readable schedule label */
    label: string;
  };
}

export const ALL_CHECKLISTS: Record<ChecklistType, ChecklistInfo> = {
  "manager-checklist": {
    type: "manager-checklist",
    label: "Store Weekly Checklist",
    description:
      "Rate store operations across key areas (bilingual EN/FR)",
    icon: "📋",
  },
  "ops-manager-checklist": {
    type: "ops-manager-checklist",
    label: "Store Weekly Audit",
    description:
      "Audit exterior, display, bathroom, equipment, product & service",
    icon: "🔍",
  },
  "assistant-manager-checklist": {
    type: "assistant-manager-checklist",
    label: "Assistant Manager Checklist",
    description: "5-star checklist for assistant managers",
    icon: "✅",
  },
  "waste-report": {
    type: "waste-report",
    label: "Leftovers & Waste Report",
    description:
      "Track bagel, pastry, and CK leftovers and waste",
    icon: "🗑️",
  },
  "equipment-maintenance": {
    type: "equipment-maintenance",
    label: "Equipment & Maintenance",
    description:
      "Daily, weekly, and monthly equipment checklists",
    icon: "🔧",
  },
  "weekly-scorecard": {
    type: "weekly-scorecard",
    label: "Weekly Scorecard",
    description:
      "Store manager weekly sales and labor scorecard",
    icon: "📊",
  },
  "training-evaluation": {
    type: "training-evaluation",
    label: "Training Evaluation",
    description:
      "Evaluate trainee progress across key areas",
    icon: "🎓",
  },
  "bagel-orders": {
    type: "bagel-orders",
    label: "Bagel Orders",
    description: "Enter daily bagel order quantities by type",
    icon: "🥯",
  },
  "pastry-orders": {
    type: "pastry-orders",
    label: "Pastry Orders",
    description: "Enter daily pastry order quantities by type",
    icon: "🥐",
  },
  "daily-orders": {
    type: "daily-orders",
    label: "Daily Orders",
    description: "Daily store supply orders: proteins, dairy, vegetables, sauces, coffee, food items, and packaging",
    icon: "📦",
  },
  "performance-evaluation": {
    type: "performance-evaluation",
    label: "Performance Evaluation",
    description:
      "Evaluate employee performance across competencies",
    icon: "⭐",
  },
  "manager-evaluation": {
    type: "manager-evaluation",
    label: "Manager Evaluation",
    description:
      "Semi-annual/annual store manager evaluation across financial, operational, leadership, growth, and accountability areas",
    icon: "👔",
  },
  "deep-clean": {
    type: "deep-clean",
    label: "Weekly Deep Clean Checklist",
    description:
      "Weekly deep cleaning checklist with manager verification",
    icon: "🧹",
    schedule: {
      frequency: "weekly",
      dueDay: 3, // Wednesday
      dueTime: "08:00",
      label: "Every Wednesday by 8:00 AM",
    },
  },
};

export interface PositionConfig {
  slug: string;
  label: string;
  checklists: ChecklistType[];
  skipStoreSelection?: boolean;
}

/**
 * Position → Checklist assignments (updated per user request)
 *
 * Operations Manager: Store Weekly Audit
 * Store Manager: Store Weekly Checklist, Leftovers & Waste, Weekly Scorecard, Performance Evaluation, Bagel Orders
 * Assistant Manager: Equipment & Maintenance, Training Evaluation
 * Staff: Leftovers & Waste
 */
export const POSITION_CHECKLISTS: Record<
  string,
  PositionConfig
> = {
  "operations-manager": {
    slug: "operations-manager",
    label: "Operations Manager",
    checklists: [
      "ops-manager-checklist",
      "daily-orders",
    ],
  },
  "store-manager": {
    slug: "store-manager",
    label: "Store Manager",
    checklists: [
      "manager-checklist",
      "deep-clean",
      "waste-report",
      "weekly-scorecard",
      "performance-evaluation",
      "bagel-orders",
      "daily-orders",
    ],
  },
  "assistant-manager": {
    slug: "assistant-manager",
    label: "Assistant Manager",
    checklists: [
      "equipment-maintenance",
      "training-evaluation",
      "daily-orders",
    ],
  },
  "staff": {
    slug: "staff",
    label: "Staff",
    checklists: ["waste-report", "daily-orders"],
  },
  "bagel-factory": {
    slug: "bagel-factory",
    label: "Bagel Factory",
    checklists: [],
  },
  "pastry-kitchen": {
    slug: "pastry-kitchen",
    label: "Pastry Kitchen",
    checklists: ["pastry-orders"],
    skipStoreSelection: true,
  },
};

export function getPositionConfig(
  slug: string
): PositionConfig | null {
  return POSITION_CHECKLISTS[slug] || null;
}

export function getChecklistInfo(
  type: ChecklistType
): ChecklistInfo {
  return ALL_CHECKLISTS[type];
}
