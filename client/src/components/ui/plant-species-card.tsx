import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';
import type { PlantSpecies } from '@shared/schema';
import { cn } from '@/lib/utils';

interface PlantSpeciesCardProps {
  species: PlantSpecies;
  onSelect: (speciesId: number) => void;
}

export function PlantSpeciesCard({ species, onSelect }: PlantSpeciesCardProps) {
  // Helper function to get badge color based on care level
  const getCareLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800 dark:text-green-100';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100';
      case 'difficult':
        return 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  // Default plant silhouette if no image is provided
  const imageUrl = species.imageUrl || '/uploads/plant-silhouette.svg';

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative pt-[56.25%] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={species.name} 
          className="absolute inset-0 w-full h-full object-cover transform hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            // Fallback if image fails to load
            const target = e.target as HTMLImageElement;
            target.src = '/uploads/plant-silhouette.svg';
          }}
        />
      </div>
      <CardHeader className="px-4 pt-4 pb-0">
        <CardTitle className="text-xl font-semibold line-clamp-1">
          {species.name}
        </CardTitle>
        <div className="text-sm italic text-muted-foreground line-clamp-1 mt-1">
          {species.scientificName}
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-2 flex-grow">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className={cn(getCareLevelColor(species.careLevel))}>
            {species.careLevel.charAt(0).toUpperCase() + species.careLevel.slice(1)}
          </Badge>
          <Badge variant="outline">
            {species.wateringFrequency === 1 
              ? 'Daily watering' 
              : `Water every ${species.wateringFrequency} days`}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {species.description}
        </p>
      </CardContent>
      <CardFooter className="px-4 pt-0 pb-4">
        <Button
          onClick={() => onSelect(species.id)}
          variant="outline"
          className="w-full"
        >
          <InfoIcon className="mr-2 h-4 w-4" />
          Plant Details
        </Button>
      </CardFooter>
    </Card>
  );
}