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
    label: "Store Mgr Daily Checklist",
    description:
      "Rate store operations across key areas (bilingual EN/FR)",
    icon: "📋",
  },
  "ops-manager-checklist": {
    type: "ops-manager-checklist",
    label: "Ops. Mgr Weekly Audit",
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

/**
 * Position → Checklist assignments (updated per user request)
 *
 * Operations Manager: Ops. Mgr Weekly Audit
 * Store Manager: Store Mgr Daily Checklist, Weekly Scorecard, Performance Evaluation, Bagel Orders
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
    ],
  },
  "store-manager": {
    slug: "store-manager",
    label: "Store Manager",
    checklists: [
      "manager-checklist",
      "weekly-scorecard",
      "performance-evaluation",
      "bagel-orders",
    ],
  },
  "assistant-manager": {
    slug: "assistant-manager",
    label: "Assistant Manager",
    checklists: [
      "equipment-maintenance",
      "training-evaluation",
    ],
  },
  "staff": {
    slug: "staff",
    label: "Staff",
    checklists: ["waste-report"],
  },
  "bagel-factory": {
    slug: "bagel-factory",
    label: "Bagel Factory",
    checklists: [],
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
