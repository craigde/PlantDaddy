import React from 'react';
import { Plant } from '@shared/schema';
import { PlantCard } from './plant-card';
import { useLocation } from 'wouter';

interface PlantGridViewProps {
  plants: Plant[];
  onPlantWatered: (plantId: number) => void;
}

export function PlantGridView({ plants, onPlantWatered }: PlantGridViewProps) {
  const [_, setLocation] = useLocation();
  
  const handlePlantSelect = (plantId: number) => {
    setLocation(`/plants/${plantId}`);
  };
  if (plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-center p-4">
        <p className="text-lg text-muted-foreground">No plants added yet.</p>
        <p className="text-sm text-muted-foreground">
          Add your first plant using the + button below.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {plants.map((plant) => (
        <PlantCard 
          key={plant.id} 
          plant={plant} 
          onWatered={() => onPlantWatered(plant.id)}
          onSelect={handlePlantSelect}
        />
      ))}
    </div>
  );
}