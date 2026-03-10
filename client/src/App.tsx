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
import KoomiIntegration from "./pages/KoomiIntegration";
import QuickBooksIntegration from "./pages/QuickBooksIntegration";
import SevenShiftsIntegration from "./pages/SevenShiftsIntegration";
import PositionChecklists from "@/pages/public/PositionChecklists";
import DirectChecklist from "@/pages/DirectChecklist";
import Checklists from "@/pages/Checklists";
import ProfitLoss from "@/pages/ProfitLoss";
import ExpenseEntry from "@/pages/ExpenseEntry";
import Vendors from "@/pages/Vendors";
import ExpenseCategories from "@/pages/ExpenseCategories";
import CogsTargets from "@/pages/CogsTargets";
import InventoryItems from "@/pages/InventoryItems";
import InventoryCount from "@/pages/InventoryCount";
import ReportHistory from "@/pages/ReportHistory";
import ChecklistsByPosition from "@/pages/ChecklistsByPosition";
import ExternalTools from "@/pages/ExternalTools";
import AdminPanel from "@/pages/AdminPanel";
import OperationsScorecard from "@/pages/OperationsScorecard";
import Portal from "@/pages/public/Portal";
import BagelProduction from "@/pages/BagelProduction";
import PastryProduction from "@/pages/PastryProduction";
import CKPreps from "@/pages/CKPreps";
import InvoiceManagement from "@/pages/InvoiceManagement";

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

      {/* Production */}
      <Route path="/production/bagels" component={BagelProduction} />
      <Route path="/production/pastry" component={PastryProduction} />
      <Route path="/production/ck-preps" component={CKPreps} />

      {/* Reports & Checklists — each checklist type has its own route */}
      <Route path="/checklists" component={Checklists} />
      <Route path="/checklists/portal" component={ChecklistsByPosition} />
      <Route path="/checklists/:type" component={DirectChecklist} />
      <Route path="/reports/scorecard" component={OperationsScorecard} />
      <Route path="/reports/history" component={ReportHistory} />
      <Route path="/invoices" component={InvoiceManagement} />

      {/* Integrations */}
      <Route path="/data" component={DataManagement} />
      <Route path="/clover" component={CloverIntegration} />
      <Route path="/koomi" component={KoomiIntegration} />
      <Route path="/quickbooks" component={QuickBooksIntegration} />
      <Route path="/7shifts" component={SevenShiftsIntegration} />
      <Route path="/teams" component={TeamsIntegration} />
      <Route path="/tools" component={ExternalTools} />

      {/* Settings */}
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/admin" component={AdminPanel} />

      {/* Public (no auth) — PIN-gated for employees */}
      <Route path="/portal" component={Portal} />
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
