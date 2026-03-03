// Design: "Golden Hour Operations" — Refined Editorial
// Collapsible sidebar with espresso background, warm amber accents
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  FileText,
  Store,
  Wrench,
  Bell,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Database,
  MessageSquare,
  CreditCard,
  Clock,
  Shield,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/_core/hooks/useAuth";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/labour", label: "Labour Monitor", icon: Users },
  { path: "/reports", label: "Report Tracker", icon: FileText },
  { path: "/stores", label: "Store Performance", icon: Store },
  { path: "/maintenance", label: "Maintenance", icon: Wrench },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/data", label: "Data Management", icon: Database },
  { path: "/clover", label: "Clover POS", icon: CreditCard },
  { path: "/7shifts", label: "7shifts", icon: Clock },
  { path: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { path: "/teams", label: "Teams Integration", icon: MessageSquare, adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { hasLiveData, lastUpdated } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col transition-all duration-300 ease-out",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
        style={{
          background: "linear-gradient(180deg, #2C1810 0%, #1C1210 100%)",
        }}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
            style={{ background: "#D4A853" }}>
            <Coffee className="w-5 h-5 text-[#1C1210]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold text-[#FFF8ED] tracking-wide truncate">
                Hinnawi Bros
              </h1>
              <p className="text-[10px] text-[#A8A29E] tracking-widest uppercase">
                Operations
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location === item.path;
            const isDataPage = item.path === "/data";
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                    isActive
                      ? "bg-[#D4A853]/15 text-[#D4A853]"
                      : "text-[#A8A29E] hover:text-[#FFF8ED] hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#D4A853]" />
                  )}
                  <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-[#D4A853]")} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {/* Live data indicator on Data Management nav */}
                  {isDataPage && hasLiveData && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#2C1810] border border-[#D4A853]/30 flex items-center justify-center text-[#D4A853] hover:bg-[#D4A853] hover:text-[#1C1210] transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Bottom info */}
        {!collapsed && (
          <div className="px-4 py-4 border-t border-white/10">
            {hasLiveData ? (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] text-emerald-400 uppercase tracking-widest">
                    Live Data
                  </p>
                </div>
                <p className="text-xs text-[#A8A29E] font-mono mt-0.5">
                  {lastUpdated
                    ? new Date(lastUpdated).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-[#78716C] uppercase tracking-widest">
                  Demo Data
                </p>
                <p className="text-xs text-[#A8A29E] font-mono mt-0.5">
                  Upload MYR data →
                </p>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
