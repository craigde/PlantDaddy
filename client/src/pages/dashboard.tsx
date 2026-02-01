import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PlantCard } from "@/components/ui/plant-card";
import { PlantGridView } from "@/components/ui/plant-grid-view";
import { PlantListView } from "@/components/ui/plant-list-view";
import { PlantCalendarView } from "@/components/ui/plant-calendar-view";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { usePlants } from "@/hooks/use-plants";
import { Skeleton } from "@/components/ui/skeleton";
import { groupPlantsByStatus } from "@/lib/plant-utils";
import { useViewMode } from "@/hooks/use-view-mode";
import { Loader2 } from "lucide-react";
import { CareStatsCard } from "@/components/ui/care-stats-card";

export default function Dashboard() {
  const [_, navigate] = useLocation();
  const { plants, isLoading, waterPlant } = usePlants();
  const { viewMode } = useViewMode();

  const handleWaterPlant = (plantId: number) => {
    waterPlant.mutate(plantId);
  };

  const handleSelectPlant = (plantId: number) => {
    navigate(`/plants/${plantId}`);
  };

  const handleAddPlant = () => {
    navigate("/plants/new");
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <h2 className="text-lg font-semibold mb-3 font-heading">Water Today</h2>
        <div className="space-y-4 mb-8">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>

        <h2 className="text-lg font-semibold mb-3 font-heading">Coming Up</h2>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const { plantsToWaterToday, upcomingPlants, recentlyWatered } = groupPlantsByStatus(plants);

  return (
    <div className="px-4 py-6">
      <header className="mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold font-heading">Welcome to PlantDaddy</h1>
          <ViewModeToggle />
        </div>
        <p className="text-muted-foreground mt-2">
          {plantsToWaterToday.length > 0 ? (
            <>
              You have{" "}
              <span className="font-semibold text-status-overdue">
                {plantsToWaterToday.length}
              </span>{" "}
              {plantsToWaterToday.length === 1 ? "plant" : "plants"} to water today
            </>
          ) : (
            <>All your plants are watered and happy!</>
          )}
        </p>
      </header>

      {plants.length === 0 ? (
        <div className="text-center py-12 px-4 bg-card rounded-xl shadow-sm">
          <div className="text-6xl mb-4 emoji-xl">🪴</div>
          <h3 className="text-xl font-bold mb-2">No plants yet!</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add your first plant to PlantDaddy and never forget to water your green friends again.
          </p>
          <Button onClick={handleAddPlant} className="bg-primary hover:bg-primary/90 text-white font-medium px-6">
            Add Your First Plant
          </Button>
        </div>
      ) : (
        <>
          <CareStatsCard />

          <div className="mt-2">
            {viewMode === 'grid' && (
              <PlantGridView
                plants={plants}
                onPlantWatered={handleWaterPlant}
              />
            )}
            
            {viewMode === 'list' && (
              <PlantListView
                plants={plants}
                onPlantWatered={handleWaterPlant}
              />
            )}
            
            {viewMode === 'calendar' && (
              <PlantCalendarView
                plants={plants}
                onPlantWatered={handleWaterPlant}
              />
            )}
          </div>
        </>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-6">
        <Button
          onClick={handleAddPlant}
          className="bg-primary text-white h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
          disabled={waterPlant.isPending}
        >
          {waterPlant.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <span className="material-icons">add</span>
          )}
        </Button>
      </div>
    </div>
  );
}
