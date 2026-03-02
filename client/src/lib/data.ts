// Hinnawi Bros Operations Dashboard — Data Module
// Design: "Golden Hour Operations" — Refined Editorial
// All data is demo/sample data for dashboard visualization

export interface Store {
  id: string;
  name: string;
  shortName: string;
  color: string;
  image: string;
  labourTarget: number;
  closedWeekends?: boolean;
}

export interface KPI {
  title: string;
  value: number;
  format: "currency" | "percent" | "number";
  trend: number;
  trendLabel: string;
  subtitle?: string;
}

export interface WeeklySales {
  week: string;
  pk: number;
  mk: number;
  ontario: number;
  tunnel: number;
}

export interface LabourEntry {
  store: string;
  revenue: number;
  labourCost: number;
  labourPercent: number;
  target: number;
  employees: number;
  hoursWorked: number;
}

export interface ReportSubmission {
  id: string;
  type: string;
  store: string;
  submittedBy: string;
  role: string;
  submittedAt: string;
  status: "submitted" | "pending" | "overdue";
}

export interface Alert {
  id: string;
  type: "warning" | "critical" | "info" | "success";
  message: string;
  store: string;
  timestamp: string;
}

export interface DailyTraffic {
  day: string;
  pk: number;
  mk: number;
  ontario: number;
  tunnel: number;
}

export interface HourlySales {
  hour: string;
  sales: number;
  orders: number;
}

export const stores: Store[] = [
  {
    id: "pk",
    name: "President Kennedy",
    shortName: "PK",
    color: "#D4A853",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663391168179/i5zcri4CVdStBBckDWTaVK/store-montreal-RcRt6eBtLfwQpQzQtscz4r.webp",
    labourTarget: 18,
  },
  {
    id: "mk",
    name: "Mackay",
    shortName: "MK",
    color: "#3B82F6",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663391168179/i5zcri4CVdStBBckDWTaVK/store-laval-dpjkGF2brpbGH54kMSVUMD.webp",
    labourTarget: 23,
  },
  {
    id: "ontario",
    name: "Ontario",
    shortName: "ON",
    color: "#10B981",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    labourTarget: 28,
  },
  {
    id: "tunnel",
    name: "Cathcart (Tunnel)",
    shortName: "TN",
    color: "#F97316",
    image: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=80",
    labourTarget: 24,
    closedWeekends: true,
  },
];

export const overviewKPIs: KPI[] = [
  {
    title: "Total Revenue",
    value: 87420,
    format: "currency",
    trend: 4.2,
    trendLabel: "vs last week",
    subtitle: "All 4 stores combined",
  },
  {
    title: "Labour Cost",
    value: 24878,
    format: "currency",
    trend: -1.8,
    trendLabel: "vs last week",
    subtitle: "28.5% of revenue",
  },
  {
    title: "Labour %",
    value: 28.5,
    format: "percent",
    trend: -2.1,
    trendLabel: "vs last week",
    subtitle: "Target: 30%",
  },
  {
    title: "Total Orders",
    value: 4218,
    format: "number",
    trend: 3.7,
    trendLabel: "vs last week",
    subtitle: "Avg $20.73 per order",
  },
];

export const weeklySales: WeeklySales[] = [
  { week: "Jan 6", pk: 6200, mk: 5100, ontario: 4800, tunnel: 5400 },
  { week: "Jan 13", pk: 6500, mk: 5300, ontario: 4900, tunnel: 5600 },
  { week: "Jan 20", pk: 6100, mk: 5000, ontario: 5100, tunnel: 5300 },
  { week: "Jan 27", pk: 6800, mk: 5500, ontario: 5200, tunnel: 5800 },
  { week: "Feb 3", pk: 6400, mk: 5200, ontario: 4700, tunnel: 5500 },
  { week: "Feb 10", pk: 6900, mk: 5600, ontario: 5300, tunnel: 5700 },
  { week: "Feb 17", pk: 7100, mk: 5400, ontario: 5000, tunnel: 5900 },
  { week: "Feb 24", pk: 6700, mk: 5800, ontario: 5400, tunnel: 5520 },
];

export const labourData: LabourEntry[] = [
  {
    store: "pk",
    revenue: 26800,
    labourCost: 7236,
    labourPercent: 27.0,
    target: 30,
    employees: 12,
    hoursWorked: 482,
  },
  {
    store: "mk",
    revenue: 22100,
    labourCost: 6630,
    labourPercent: 30.0,
    target: 30,
    employees: 10,
    hoursWorked: 420,
  },
  {
    store: "ontario",
    revenue: 20400,
    labourCost: 5712,
    labourPercent: 28.0,
    target: 30,
    employees: 9,
    hoursWorked: 378,
  },
  {
    store: "tunnel",
    revenue: 18120,
    labourCost: 5300,
    labourPercent: 29.2,
    target: 30,
    employees: 8,
    hoursWorked: 356,
  },
];

export const reportSubmissions: ReportSubmission[] = [
  {
    id: "1",
    type: "Daily Report",
    store: "pk",
    submittedBy: "Maria Santos",
    role: "Store Manager",
    submittedAt: "2026-03-02T08:15:00",
    status: "submitted",
  },
  {
    id: "2",
    type: "Daily Report",
    store: "mk",
    submittedBy: "Ahmed Hassan",
    role: "Store Manager",
    submittedAt: "2026-03-02T08:30:00",
    status: "submitted",
  },
  {
    id: "3",
    type: "Daily Report",
    store: "ontario",
    submittedBy: "Sophie Chen",
    role: "Store Manager",
    submittedAt: "",
    status: "pending",
  },
  {
    id: "4",
    type: "Daily Report",
    store: "tunnel",
    submittedBy: "James Wilson",
    role: "Store Manager",
    submittedAt: "",
    status: "overdue",
  },
  {
    id: "5",
    type: "Scorecard",
    store: "pk",
    submittedBy: "Maria Santos",
    role: "Store Manager",
    submittedAt: "2026-03-01T17:00:00",
    status: "submitted",
  },
  {
    id: "6",
    type: "Scorecard",
    store: "mk",
    submittedBy: "Ahmed Hassan",
    role: "Store Manager",
    submittedAt: "2026-03-01T16:45:00",
    status: "submitted",
  },
  {
    id: "7",
    type: "Scorecard",
    store: "ontario",
    submittedBy: "Sophie Chen",
    role: "Store Manager",
    submittedAt: "",
    status: "pending",
  },
  {
    id: "8",
    type: "Scorecard",
    store: "tunnel",
    submittedBy: "James Wilson",
    role: "Store Manager",
    submittedAt: "2026-03-01T17:30:00",
    status: "submitted",
  },
  {
    id: "9",
    type: "Waste Report",
    store: "pk",
    submittedBy: "Carlos Rivera",
    role: "Shift Lead",
    submittedAt: "2026-03-02T07:00:00",
    status: "submitted",
  },
  {
    id: "10",
    type: "Waste Report",
    store: "mk",
    submittedBy: "Fatima Ali",
    role: "Shift Lead",
    submittedAt: "",
    status: "pending",
  },
  {
    id: "11",
    type: "Operations Checklist",
    store: "pk",
    submittedBy: "Maria Santos",
    role: "Store Manager",
    submittedAt: "2026-03-02T09:00:00",
    status: "submitted",
  },
  {
    id: "12",
    type: "Operations Checklist",
    store: "mk",
    submittedBy: "Ahmed Hassan",
    role: "Store Manager",
    submittedAt: "2026-03-02T09:15:00",
    status: "submitted",
  },
  {
    id: "13",
    type: "Deep Cleaning",
    store: "ontario",
    submittedBy: "Sophie Chen",
    role: "Store Manager",
    submittedAt: "",
    status: "overdue",
  },
  {
    id: "14",
    type: "Staff Evaluation",
    store: "pk",
    submittedBy: "Maria Santos",
    role: "Store Manager",
    submittedAt: "2026-02-28T14:00:00",
    status: "submitted",
  },
];

export const alerts: Alert[] = [
  {
    id: "1",
    type: "critical",
    message: "Daily Report overdue — Tunnel store has not submitted today's report",
    store: "tunnel",
    timestamp: "2026-03-02T10:00:00",
  },
  {
    id: "2",
    type: "warning",
    message: "Labour % at 30.0% — Mackay is at the target threshold",
    store: "mk",
    timestamp: "2026-03-02T09:30:00",
  },
  {
    id: "3",
    type: "info",
    message: "Deep Cleaning checklist overdue for Ontario store",
    store: "ontario",
    timestamp: "2026-03-02T09:00:00",
  },
  {
    id: "4",
    type: "success",
    message: "PK store labour % improved to 27.0% — below target",
    store: "pk",
    timestamp: "2026-03-02T08:00:00",
  },
  {
    id: "5",
    type: "warning",
    message: "Ontario Daily Report still pending submission",
    store: "ontario",
    timestamp: "2026-03-02T10:15:00",
  },
];

export const weeklyTraffic: DailyTraffic[] = [
  { day: "Mon", pk: 145, mk: 120, ontario: 110, tunnel: 125 },
  { day: "Tue", pk: 160, mk: 135, ontario: 118, tunnel: 130 },
  { day: "Wed", pk: 155, mk: 128, ontario: 122, tunnel: 128 },
  { day: "Thu", pk: 170, mk: 140, ontario: 130, tunnel: 140 },
  { day: "Fri", pk: 195, mk: 160, ontario: 145, tunnel: 155 },
  { day: "Sat", pk: 180, mk: 150, ontario: 135, tunnel: 148 },
  { day: "Sun", pk: 130, mk: 105, ontario: 95, tunnel: 110 },
];

export const hourlySales: HourlySales[] = [
  { hour: "6am", sales: 420, orders: 28 },
  { hour: "7am", sales: 1250, orders: 72 },
  { hour: "8am", sales: 2100, orders: 115 },
  { hour: "9am", sales: 1800, orders: 98 },
  { hour: "10am", sales: 1350, orders: 74 },
  { hour: "11am", sales: 1900, orders: 105 },
  { hour: "12pm", sales: 2400, orders: 132 },
  { hour: "1pm", sales: 2100, orders: 118 },
  { hour: "2pm", sales: 1500, orders: 82 },
  { hour: "3pm", sales: 1100, orders: 60 },
  { hour: "4pm", sales: 850, orders: 46 },
  { hour: "5pm", sales: 650, orders: 35 },
];

export const teamsChannels = [
  { name: "# 01-general", status: "active", messages: 12 },
  { name: "# 02-labour-monitoring", status: "active", messages: 4 },
  { name: "# 03-report-submissions", status: "active", messages: 8 },
  { name: "# 04-store-pk", status: "active", messages: 3 },
  { name: "# 05-store-mk", status: "active", messages: 5 },
  { name: "# 06-store-ontario", status: "active", messages: 2 },
  { name: "# 07-store-tunnel", status: "active", messages: 1 },
  { name: "# 08-maintenance", status: "active", messages: 2 },
  { name: "# 09-ceo-dashboard", status: "active", messages: 0 },
];

export const labourTrend = [
  { period: "Period 1", pk: 29.5, mk: 31.2, ontario: 30.1, tunnel: 30.8 },
  { period: "Period 2", pk: 28.8, mk: 30.5, ontario: 29.4, tunnel: 30.2 },
  { period: "Period 3", pk: 29.1, mk: 31.0, ontario: 28.8, tunnel: 29.9 },
  { period: "Period 4", pk: 28.2, mk: 30.8, ontario: 29.2, tunnel: 30.5 },
  { period: "Period 5", pk: 27.5, mk: 30.2, ontario: 28.5, tunnel: 29.8 },
  { period: "Period 6", pk: 27.0, mk: 30.0, ontario: 28.0, tunnel: 29.2 },
];
