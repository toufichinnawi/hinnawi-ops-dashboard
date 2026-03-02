import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Labour from "./pages/Labour";
import Reports from "./pages/Reports";
import Stores from "./pages/Stores";
import Maintenance from "./pages/Maintenance";
import Alerts from "./pages/Alerts";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/labour" component={Labour} />
      <Route path="/reports" component={Reports} />
      <Route path="/stores" component={Stores} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
