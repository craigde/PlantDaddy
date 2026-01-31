import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import PlantDetails from "@/pages/plant-details";
import AddEditPlant from "@/pages/add-edit-plant";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import PlantExplorer from "@/pages/plant-explorer";
import IdentifyPlant from "@/pages/identify-plant";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin";
import HouseholdOnboarding from "@/pages/household-onboarding";
import { NavBar } from "@/components/layout/nav-bar";
import { Header } from "@/components/layout/header";
import { usePlants } from "@/hooks/use-plants";
import { getPlantStatus } from "@/lib/plant-utils";
import { ThemeProvider, ThemeConsumer } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { HouseholdProvider, useHouseholdContext } from "@/hooks/use-household-context";
import { ProtectedRoute } from "@/lib/protected-route";
import { ViewModeProvider } from "@/hooks/use-view-mode";
import { Loader2 } from "lucide-react";

function AppNavBar() {
  const { plants, isLoading } = usePlants();
  
  const notificationCount = !isLoading
    ? plants.filter(plant => {
        const status = getPlantStatus(plant);
        return status === "overdue" || (status === "soon" && new Date(plant.lastWatered).getDate() === new Date().getDate());
      }).length
    : 0;
    
  return <NavBar notificationCount={notificationCount} />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <AppNavBar />
    </div>
  );
}

function HouseholdGate() {
  const { households, isLoading, hasLoaded } = useHouseholdContext();

  if (isLoading || !hasLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (households.length === 0) {
    return <HouseholdOnboarding />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/plants/new" component={AddEditPlant} />
        <Route path="/plants/:id/edit" component={AddEditPlant} />
        <Route path="/plants/:id" component={PlantDetails} />
        <Route path="/identify-plant" component={IdentifyPlant} />
        <Route path="/plant-explorer" component={PlantExplorer} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function ProtectedAppRoutes() {
  return <HouseholdGate />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/*" component={ProtectedAppRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <HouseholdProvider>
            <ViewModeProvider>
              <ThemeConsumer>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </ThemeConsumer>
            </ViewModeProvider>
          </HouseholdProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
