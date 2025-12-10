import React from 'react';
import { Plant } from '@shared/schema';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Droplet, ArrowRight } from 'lucide-react';
import { getPlantStatus } from '@/lib/plant-utils';
import { Link } from 'wouter';
import { formatDistance } from 'date-fns';

interface PlantListViewProps {
  plants: Plant[];
  onPlantWatered: (plantId: number) => void;
}

export function PlantListView({ plants, onPlantWatered }: PlantListViewProps) {
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
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Species</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Last Watered</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plants.map((plant) => {
            const status = getPlantStatus(plant);
            
            return (
              <TableRow key={plant.id}>
                <TableCell className="font-medium">{plant.name}</TableCell>
                <TableCell>{plant.species}</TableCell>
                <TableCell>{plant.location}</TableCell>
                <TableCell>
                  {plant.lastWatered ? (
                    formatDistance(new Date(plant.lastWatered), new Date(), { addSuffix: true })
                  ) : (
                    'Never'
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onPlantWatered(plant.id)}
                    disabled={status === "watered"}
                  >
                    <Droplet className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    asChild
                  >
                    <Link to={`/plants/${plant.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'overdue':
      return <Badge variant="destructive">Overdue</Badge>;
    case 'soon':
      return <Badge variant="secondary">Water soon</Badge>;
    case 'today':
      return <Badge>Water today</Badge>;
    case 'healthy':
      return <Badge variant="outline">Healthy</Badge>;
    default:
      return null;
  }
}