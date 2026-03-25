/**
 * Equipment & Maintenance Checklist Data
 * Source: Hinnawi Bros Bagel & Café — Equipment & Maintenance Checklist PDF
 * Prepared by: NOUJAD El Mostafa
 *
 * Grouped by task frequency: Daily, Twice Weekly, Weekly, Biweekly, Monthly, Quarterly, Annual, As Needed
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
    label: "Daily Tasks",
    shortLabel: "Daily",
    icon: "☀️",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    items: [
      { machine: "La Marzocco Linea PB", task: "Clean steam wand and purge after each use", explanation: "Prevents milk buildup, clogging, odor, and weak steam performance." },
      { machine: "La Marzocco Linea PB", task: "End-of-day backflush and clean portafilters", explanation: "Keeps group heads clean and protects shot quality and machine performance." },
      { machine: "Mahlkonig E65S", task: "Brush grounds around chute, fork, tray, and counter", explanation: "Prevents buildup and keeps the espresso station clean and consistent." },
      { machine: "FETCO Brewer", task: "Wipe exterior, basket area, and nearby counter", explanation: "Removes coffee residue and keeps the brewer zone clean and ready." },
      { machine: "Conveyor Bagel Toaster", task: "Empty crumb tray and remove loose crumbs after cooling", explanation: "Reduces fire risk, improves airflow, and keeps toast quality stable." },
      { machine: "MagiKitch'n Griddle", task: "Scrape plate, clean grease channel, and empty grease box", explanation: "Prevents carbon buildup, smoke, grease overflow, and uneven cooking." },
      { machine: "Lamber DSP4 Dishwasher", task: "Drain machine, clean filters, rinse interior, and inspect jets", explanation: "Keeps wash performance strong and avoids dirty water recirculation." },
      { machine: "Brema Ice Maker", task: "Check bin cleanliness and wipe visible dirt around unit", explanation: "Protects ice hygiene and keeps the area food-safe." },
      { machine: "Refrigeration Units", task: "Check temperature, door closing, spills, and visible dirt", explanation: "Helps catch cooling problems early and protects food holding conditions." },
      { machine: "Exhaust Hood / Hotte", task: "Wipe visible grease from hood exterior and underside edges", explanation: "Prevents daily grease accumulation and keeps the line cleaner and safer." },
      { machine: "Exhaust Hood / Hotte", task: "Check airflow, unusual noise, and visible grease dripping", explanation: "Helps detect ventilation problems before they grow into service issues." },
      { machine: "Portafilters & Baskets", task: "Rinse during service and soak, scrub, and rinse again at close", explanation: "Removes coffee oils and trapped grounds that affect taste and cleanliness." },
      { machine: "Milk Pitchers", task: "Wash, sanitize, and air dry after use", explanation: "Prevents milk residue, odor, and cross-contamination at the espresso station." },
      { machine: "Filter Coffee Thermoses", task: "Empty, rinse, wash, and air dry after each use", explanation: "Prevents stale coffee taste, odor, and residue inside the thermoses." },
      { machine: "All Equipment Areas", task: "Sweep and clean floor edges around machine fronts", explanation: "Prevents crumbs, grease, dirt, and standing water around equipment." },
    ],
  },
  {
    id: "twice-weekly",
    label: "Twice Weekly Tasks",
    shortLabel: "2x Week",
    icon: "📅",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    items: [
      { machine: "La Marzocco Linea PB", task: "Clean drip tray grill, tray, and drain collector", explanation: "Stops coffee sludge, odor, and drain blockage in the espresso station." },
      { machine: "Mahlkonig E65S", task: "Clean grind chamber and flapper area", explanation: "Helps maintain dose flow, cleanliness, and grind consistency." },
      { machine: "Conveyor Bagel Toaster", task: "Wipe loading and discharge zones more deeply", explanation: "Prevents heavier crumb accumulation around the toaster." },
    ],
  },
  {
    id: "weekly",
    label: "Weekly Tasks",
    shortLabel: "Weekly",
    icon: "📋",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    items: [
      { machine: "La Marzocco Linea PB", task: "Remove and soak diffuser screens and screws", explanation: "Removes coffee oils and residue that affect extraction and cleanliness." },
      { machine: "FETCO Brewer", task: "Remove and clean spray plate", explanation: "Improves water distribution and brew consistency." },
      { machine: "Mahlkonig Guatemala", task: "Dry clean hopper, body, and discharge area", explanation: "Prevents stale residue and keeps grinding performance cleaner and more stable." },
      { machine: "Refrigeration Units", task: "Clean gaskets, handles, drawer edges, and interior contact points", explanation: "Improves hygiene and helps doors and drawers seal properly." },
      { machine: "Brema Ice Maker Area", task: "Clean surrounding wall, counter, and floor area", explanation: "Reduces dust and dirt around a food-contact ice production zone." },
      { machine: "Lamber DSP4 Dishwasher", task: "Wipe door edges, seals, and exterior panels more deeply", explanation: "Helps prevent residue and keeps the machine cleaner long term." },
      { machine: "Exhaust Hood / Hotte", task: "Remove and degrease removable hood filters", explanation: "Reduces grease buildup and helps maintain proper airflow and fire safety." },
      { machine: "Exhaust Hood / Hotte", task: "Clean hood underside and light area", explanation: "Keeps the cooking line cleaner and prevents visible grease buildup." },
      { machine: "Portafilters & Baskets", task: "Remove baskets and clean under springs, inside spouts, and around rims", explanation: "Clears hidden coffee residue that quick washing does not remove." },
      { machine: "Milk Pitchers", task: "Deep clean spouts, handles, and base edges", explanation: "Removes milk stone and residue from hard-to-reach areas." },
      { machine: "Filter Coffee Thermoses", task: "Deep clean lids, spouts, and internal surfaces with coffee equipment cleaner", explanation: "Removes coffee oils and buildup from parts missed in routine washing." },
    ],
  },
  {
    id: "biweekly",
    label: "Biweekly Tasks",
    shortLabel: "Biweekly",
    icon: "🔄",
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    items: [
      { machine: "Mahlkonig Guatemala", task: "Perform short preventive maintenance cleaning", explanation: "Helps control residue buildup and supports long-term grind consistency." },
      { machine: "Exhaust Hood / Hotte", task: "Clean filter tracks, reachable inner edges, and grease collection points", explanation: "Prevents hidden grease accumulation inside the hood structure." },
      { machine: "Portafilters & Baskets", task: "Inspect baskets, springs, and handles for looseness, cracks, or wear", explanation: "Helps catch damaged parts before they affect extraction or safety." },
      { machine: "Filter Coffee Thermoses", task: "Check lids, seals, and pouring parts for wear or leakage", explanation: "Helps prevent leaking, heat loss, and messy service." },
    ],
  },
  {
    id: "monthly",
    label: "Monthly Tasks",
    shortLabel: "Monthly",
    icon: "📆",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    items: [
      { machine: "Refrigeration Units", task: "Clean condenser coils and base mechanical area", explanation: "Dirty coils reduce cooling efficiency and can lead to breakdowns." },
      { machine: "Brema Ice Maker", task: "Complete full cleaning and sanitizing", explanation: "Keeps the ice safe, clean, and free from contamination buildup." },
      { machine: "Lamber DSP4 Dishwasher", task: "Sanitize machine and review scale buildup", explanation: "Helps keep wash quality high and reduces limescale-related performance loss." },
      { machine: "MagiKitch'n Griddle", task: "Check thermostat accuracy and inspect plate condition", explanation: "Helps detect uneven heating, wear, and early performance issues." },
      { machine: "Refrigeration Units", task: "Inspect hinges, slides, seals, and alignment", explanation: "Prevents poor closing, temperature loss, and long-term door damage." },
      { machine: "Exhaust Hood / Hotte", task: "Inspect fan performance, airflow strength, vibration, and abnormal noise", explanation: "Helps identify ventilation problems before service failure happens." },
      { machine: "Milk Pitchers", task: "Remove badly dented, chipped, or damaged pitchers from service", explanation: "Damaged pitchers affect pouring control, cleanliness, and professional presentation." },
    ],
  },
  {
    id: "quarterly",
    label: "Quarterly Tasks",
    shortLabel: "Quarterly",
    icon: "🗓️",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    items: [
      { machine: "FETCO Brewer", task: "Check brew temperature, settings, water lines, and scale buildup", explanation: "Verifies brewer accuracy and helps catch leaks or mineral issues early." },
      { machine: "Exhaust Hood / Hotte", task: "Review duct cleaning records and service schedule", explanation: "Confirms the hood system is maintained beyond surface cleaning only." },
    ],
  },
  {
    id: "annual",
    label: "Annual Tasks",
    shortLabel: "Annual",
    icon: "📅",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    items: [
      { machine: "La Marzocco Linea PB", task: "Full annual preventive maintenance and steam boiler drain", explanation: "Protects machine health and reduces long-term scale and performance issues." },
      { machine: "MagiKitch'n Griddle", task: "Technician inspection and safety review", explanation: "Checks electrical safety, controls, and overall operating condition." },
      { machine: "Mahlkonig Guatemala", task: "Full internal service and burr inspection or replacement if needed", explanation: "Restores grinding performance and prevents long-term wear problems." },
      { machine: "Exhaust Hood / Hotte", task: "Professional inspection and deep cleaning per site schedule", explanation: "Surface cleaning alone is not enough for long-term hood safety." },
    ],
  },
  {
    id: "as-needed",
    label: "As Needed",
    shortLabel: "As Needed",
    icon: "⚠️",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    items: [
      { machine: "Mahlkonig E65S", task: "Replace burrs when grind quality drops", explanation: "Needed when shots become inconsistent, clumping increases, or burrs are worn." },
      { machine: "Mahlkonig Guatemala", task: "Service grinder when output drops or clogging increases", explanation: "These are warning signs of wear, blockage, or unstable grind performance." },
      { machine: "Refrigeration Units", task: "Investigate weak cooling, frost, leaks, or bad door sealing", explanation: "These are operating faults, not normal cleaning issues." },
      { machine: "Conveyor Bagel Toaster", task: "Inspect heat performance and belt condition if toast quality changes", explanation: "Needed when browning becomes uneven or output quality drops." },
      { machine: "Exhaust Hood / Hotte", task: "Report weak smoke capture, grease dripping, or abnormal fan noise", explanation: "These signs mean the ventilation system needs fast attention." },
      { machine: "Portafilters & Baskets", task: "Replace warped baskets or damaged springs when fit or flow becomes poor", explanation: "Bad basket fit or damaged springs can hurt extraction and workflow." },
      { machine: "Milk Pitchers", task: "Replace pitchers that no longer pour cleanly or sanitize properly", explanation: "Damaged edges, dents, or heavy staining should not stay in service." },
      { machine: "Filter Coffee Thermoses", task: "Remove thermoses from service if they leak, lose heat quickly, or smell bad after cleaning", explanation: "These are signs the unit is no longer holding product properly." },
      { machine: "All Equipment", task: "Report leaks, burning smell, strange noise, repeated reset, or poor performance", explanation: "These signs mean the issue is beyond routine cleaning and needs action fast." },
    ],
  },
];

/** Total number of checkable items across all sections */
export const TOTAL_EQUIPMENT_ITEMS = EQUIPMENT_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
