import React from "react";
import { cn } from "@/lib/utils";
import { Plant } from "@shared/schema";
import { getPlantStatus } from "@/lib/plant-utils";

type StatusDotProps = {
  plant: Plant;
  className?: string;
};

const StatusDot: React.FC<StatusDotProps> = ({ plant, className }) => {
  const status = getPlantStatus(plant);
  
  return (
    <div 
      className={cn(
        "h-3 w-3 rounded-full",
        {
          "bg-status-watered": status === "watered",
          "bg-status-soon": status === "soon",
          "bg-status-overdue": status === "overdue",
        },
        className
      )}
    />
  );
};

export { StatusDot };
