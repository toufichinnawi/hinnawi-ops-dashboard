import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from "./contexts/DataContext";
import Home from "./pages/Home";
import Labour from "./pages/Labour";
import Reports from "./pages/Reports";
import Stores from "./pages/Stores";
import Maintenance from "./pages/Maintenance";
import Alerts from "./pages/Alerts";
import DataManagement from "./pages/DataManagement";
import TeamsIntegration from "./pages/TeamsIntegration";
import CloverIntegration from "./pages/CloverIntegration";
import SevenShiftsIntegration from "./pages/SevenShiftsIntegration";
import PositionChecklists from "@/pages/public/PositionChecklists";
import Checklists from "@/pages/Checklists";
import ChecklistViewer from "@/pages/ChecklistViewer";
import ProfitLoss from "@/pages/ProfitLoss";
import ExpenseEntry from "@/pages/ExpenseEntry";
import Vendors from "@/pages/Vendors";
import ExpenseCategories from "@/pages/ExpenseCategories";
import CogsTargets from "@/pages/CogsTargets";
import InventoryItems from "@/pages/InventoryItems";
import InventoryCount from "@/pages/InventoryCount";
import ReportHistory from "@/pages/ReportHistory";
import ExternalTools from "@/pages/ExternalTools";
import AdminPanel from "@/pages/AdminPanel";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      {/* Analytics */}
      <Route path="/" component={Home} />
      <Route path="/labour" component={Labour} />
      <Route path="/stores" component={Stores} />
      <Route path="/alerts" component={Alerts} />

      {/* Accounting */}
      <Route path="/accounting/pnl" component={ProfitLoss} />
      <Route path="/accounting/expenses" component={ExpenseEntry} />
      <Route path="/accounting/vendors" component={Vendors} />
      <Route path="/accounting/categories" component={ExpenseCategories} />
      <Route path="/accounting/cogs" component={CogsTargets} />

      {/* Inventory */}
      <Route path="/inventory/items" component={InventoryItems} />
      <Route path="/inventory/count" component={InventoryCount} />

      {/* Reports & Checklists */}
      <Route path="/reports" component={Reports} />
      <Route path="/checklists" component={Checklists} />
      <Route path="/checklists/:position" component={ChecklistViewer} />
      <Route path="/reports/history" component={ReportHistory} />

      {/* Integrations */}
      <Route path="/data" component={DataManagement} />
      <Route path="/clover" component={CloverIntegration} />
      <Route path="/7shifts" component={SevenShiftsIntegration} />
      <Route path="/teams" component={TeamsIntegration} />
      <Route path="/tools" component={ExternalTools} />

      {/* Settings */}
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/admin" component={AdminPanel} />

      {/* Public (no auth) */}
      <Route path="/public/:position" component={PositionChecklists} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
