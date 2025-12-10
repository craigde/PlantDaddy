import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlants } from "@/hooks/use-plants";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, getDueText } from "@/lib/date-utils";
import { getPlantStatus } from "@/lib/plant-utils";
import { useLocation } from "wouter";

export default function Notifications() {
  const [_, navigate] = useLocation();
  const { plants, isLoading, waterPlant } = usePlants();

  const handleViewPlant = (id: number) => {
    navigate(`/plants/${id}`);
  };

  const plantsNeedingAttention = plants
    .filter((plant) => {
      const status = getPlantStatus(plant);
      return status === "overdue" || status === "soon";
    })
    .sort((a, b) => {
      // Sort by status (overdue first, then soon)
      const statusA = getPlantStatus(a);
      const statusB = getPlantStatus(b);
      
      if (statusA === "overdue" && statusB !== "overdue") return -1;
      if (statusA !== "overdue" && statusB === "overdue") return 1;
      
      // Then sort by last watered date (oldest first)
      return new Date(a.lastWatered).getTime() - new Date(b.lastWatered).getTime();
    });

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <Card className="p-4 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-4 pb-3 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Notifications</h1>
        <p className="text-muted-foreground">Plants that need your attention</p>
      </header>

      {plantsNeedingAttention.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-2">No plants need attention right now</p>
          <p className="text-sm text-muted-foreground/70">Everything is watered and happy!</p>
        </div>
      ) : (
        <Card className="p-4 mb-4">
          {plantsNeedingAttention.map((plant) => {
            const status = getPlantStatus(plant);
            const statusText = getDueText(new Date(plant.lastWatered), plant.wateringFrequency);
            const lastWateredText = formatDistanceToNow(new Date(plant.lastWatered));
            
            return (
              <div 
                key={plant.id} 
                className="mb-4 pb-3 border-b border-border last:border-b-0 last:mb-0 last:pb-0"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className={`material-icons ${
                      status === "overdue" ? "text-status-overdue" : "text-status-soon"
                    }`}>
                      notifications
                    </span>
                    <h3 className="font-semibold">{plant.name} needs water{status === "soon" ? " soon" : ""}</h3>
                  </div>
                  <span className="text-sm text-muted-foreground">Today</span>
                </div>
                
                <p className="text-muted-foreground text-sm mt-1">
                  Last watered {lastWateredText} ({statusText})
                </p>
                
                <div className="flex space-x-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewPlant(plant.id)}
                    className="text-primary border-primary"
                  >
                    View Details
                  </Button>
                  
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => waterPlant.mutate(plant.id)}
                    className="bg-primary text-white"
                  >
                    <span className="material-icons text-sm mr-1">opacity</span>
                    Water Now
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
