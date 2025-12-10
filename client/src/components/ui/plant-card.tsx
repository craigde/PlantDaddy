import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plant } from "@shared/schema";
import { getPlantStatus, getStatusText } from "@/lib/plant-utils";
import { formatDistanceToNow } from "@/lib/date-utils";
import { Image } from "lucide-react";

interface PlantCardProps {
  plant: Plant;
  onWatered: (plantId: number) => void;
  onSelect: (plantId: number) => void;
}

export function PlantCard({ plant, onWatered, onSelect }: PlantCardProps) {
  const status = getPlantStatus(plant);
  const statusText = getStatusText(plant);
  
  const handleClick = () => {
    onSelect(plant.id);
  };
  
  const handleWater = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWatered(plant.id);
  };
  
  // Ensure lastWatered is a proper Date object before formatting
  let lastWateredDate;
  try {
    lastWateredDate = plant.lastWatered ? new Date(plant.lastWatered) : null;
    if (lastWateredDate && isNaN(lastWateredDate.getTime())) {
      console.warn("Invalid lastWatered date in PlantCard:", plant.lastWatered);
      lastWateredDate = null;
    }
  } catch (error) {
    console.error("Error parsing lastWatered date:", error);
    lastWateredDate = null;
  }
  
  const lastWateredText = formatDistanceToNow(lastWateredDate);

  return (
    <Card 
      className="bg-card rounded-lg shadow-md mb-4 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border"
      onClick={handleClick}
    >
      {plant.imageUrl && (
        <div className="relative h-40 w-full">
          <img 
            src={plant.imageUrl} 
            alt={plant.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3">
            <StatusDot plant={plant} className="h-5 w-5 ring-2 ring-white" />
          </div>
        </div>
      )}
      
      <CardContent className={`p-4 ${plant.imageUrl ? 'border-t border-gray-100' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!plant.imageUrl && (
              <Avatar className="size-10 rounded-full mr-2">
                {plant.imageUrl ? (
                  <AvatarImage src={plant.imageUrl} alt={plant.name} />
                ) : (
                  <AvatarFallback className="bg-primary/10">
                    <span className="emoji-xl" role="img" aria-label="plant">🌿</span>
                  </AvatarFallback>
                )}
              </Avatar>
            )}
            {!plant.imageUrl && <StatusDot plant={plant} />}
            <h3 className="font-semibold font-heading text-base">{plant.name}</h3>
          </div>
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            status === 'watered' ? 'bg-emerald-50 text-status-watered' : 
            status === 'soon' ? 'bg-amber-50 text-status-soon' : 
            'bg-rose-50 text-status-overdue'
          }`}>
            {statusText}
          </span>
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <div>
            <p className="text-sm">{plant.location}</p>
            <p className="text-muted-foreground text-xs mt-1">Last watered: {lastWateredText}</p>
          </div>
          
          {status === 'watered' ? (
            <Button 
              variant="ghost" 
              className="text-status-watered bg-emerald-50 hover:bg-emerald-50 px-4 py-1.5 h-auto rounded-full text-sm font-medium cursor-default flex items-center"
              disabled={true}
            >
              <span className="material-icons text-sm mr-1">check_circle</span>
              Watered
            </Button>
          ) : (
            <Button 
              onClick={handleWater}
              variant={status === 'overdue' ? "default" : "outline"}
              className={`${
                status === 'overdue' 
                  ? 'bg-primary hover:bg-primary/90 text-white' 
                  : 'border border-primary text-primary hover:bg-primary/5'
              } px-4 py-1.5 h-auto rounded-full text-sm font-medium flex items-center shadow-sm`}
            >
              <span className="material-icons text-sm mr-1">opacity</span>
              Water Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
