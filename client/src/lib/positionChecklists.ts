/**
 * Position-based checklist configuration.
 * Maps each position slug (used in URL) to its display name
 * and assigned checklists.
 */

export type ChecklistType =
  | "manager-checklist"
  | "ops-manager-checklist"
  | "weekly-deep-cleaning"
  | "assistant-manager-checklist"
  | "store-manager-checklist"
  | "waste-report"
  | "equipment-maintenance"
  | "weekly-scorecard"
  | "training-evaluation"
  | "bagel-orders"
  | "performance-evaluation";

export interface ChecklistInfo {
  type: ChecklistType;
  label: string;
  description: string;
  icon: string;
}

export const ALL_CHECKLISTS: Record<ChecklistType, ChecklistInfo> = {
  "manager-checklist": {
    type: "manager-checklist",
    label: "Manager Checklist",
    description:
      "Rate store operations across key areas (bilingual EN/FR)",
    icon: "📋",
  },
  "ops-manager-checklist": {
    type: "ops-manager-checklist",
    label: "Operations Manager Checklist (Weekly Audit)",
    description:
      "Audit exterior, display, bathroom, equipment, product & service",
    icon: "🔍",
  },
  "weekly-deep-cleaning": {
    type: "weekly-deep-cleaning",
    label: "Weekly Deep Cleaning",
    description: "Deep cleaning checklist for all areas",
    icon: "🧹",
  },
  "assistant-manager-checklist": {
    type: "assistant-manager-checklist",
    label: "Assistant Manager Checklist",
    description: "5-star checklist for assistant managers",
    icon: "✅",
  },
  "store-manager-checklist": {
    type: "store-manager-checklist",
    label: "Store Evaluation Checklist",
    description:
      "Morning, afternoon, and closing task checklist",
    icon: "📝",
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
  "performance-evaluation": {
    type: "performance-evaluation",
    label: "Performance Evaluation",
    description:
      "Evaluate employee performance across competencies",
    icon: "⭐",
  },
};

export interface PositionConfig {
  slug: string;
  label: string;
  checklists: ChecklistType[];
}

export const POSITION_CHECKLISTS: Record<
  string,
  PositionConfig
> = {
  "operational-manager": {
    slug: "operational-manager",
    label: "Operational Manager",
    checklists: [
      "ops-manager-checklist",
      "manager-checklist",
    ],
  },
  "store-manager": {
    slug: "store-manager",
    label: "Store Manager",
    checklists: [
      "manager-checklist",
      "weekly-scorecard",
      "store-manager-checklist",
      "weekly-deep-cleaning",
    ],
  },
  "assistant-manager": {
    slug: "assistant-manager",
    label: "Assistant Manager",
    checklists: [
      "assistant-manager-checklist",
      "equipment-maintenance",
    ],
  },
  "shift-lead": {
    slug: "shift-lead",
    label: "Shift Lead",
    checklists: ["waste-report", "training-evaluation"],
  },
  cashier: {
    slug: "cashier",
    label: "Cashier",
    checklists: ["manager-checklist"],
  },
  barista: {
    slug: "barista",
    label: "Barista",
    checklists: ["manager-checklist"],
  },
  cook: {
    slug: "cook",
    label: "Cook",
    checklists: ["waste-report"],
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
