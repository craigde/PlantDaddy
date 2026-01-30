import React from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { usePlants } from "@/hooks/use-plants";
import { getPlantStatus, getStatusText } from "@/lib/plant-utils";
import { formatDate, formatTime, formatDistanceToNow } from "@/lib/date-utils";
import { Plant } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image } from "lucide-react";
import { PlantCareTimeline } from "@/components/ui/plant-care-timeline";

export default function PlantDetails() {
  const params = useParams();
  const id = params?.id || "";
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  const plantId = parseInt(id) || 0;
  const { useGetPlant, deletePlant, waterPlant } = usePlants();
  const { data: plantData, isLoading } = useGetPlant(plantId);

  const handleWaterPlant = () => {
    waterPlant.mutate(plantId, {
      onSuccess: () => {
        toast({
          title: "Plant watered!",
          description: "Watering recorded successfully.",
        });
      },
      onError: () => {
        toast({
          title: "Failed to water plant",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleEditPlant = () => {
    navigate(`/plants/${plantId}/edit`);
  };

  const handleDeletePlant = () => {
    deletePlant.mutate(plantId, {
      onSuccess: () => {
        toast({
          title: "Plant deleted",
          description: "Plant has been removed successfully.",
        });
        navigate("/");
      },
      onError: () => {
        toast({
          title: "Failed to delete plant",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleBack = () => {
    navigate("/");
  };

  if (isLoading || !plantData) {
    return (
      <div>
        <div className="bg-white p-4 shadow-sm">
          <div className="flex items-center mb-4">
            <Button variant="ghost" onClick={handleBack} className="mr-2">
              <span className="material-icons">arrow_back</span>
            </Button>
            <Skeleton className="h-7 w-40" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>

        <div className="p-4">
          <Card className="mb-6">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div>
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  console.log("Full plant data from API:", plantData);
  
  // Cast to any to avoid TypeScript errors since we know the data structure
  const plant = plantData as any;
  
  // Add safety check for null values in date processing
  // If lastWatered is null or invalid, set it to today's date
  if (!plant.lastWatered || new Date(plant.lastWatered).toString() === 'Invalid Date') {
    console.log("Fixing invalid lastWatered date for plant:", plant.id);
    plant.lastWatered = new Date();
  }
  
  // Ensure species and location are treated as strings
  plant.species = plant.species || "";
  plant.location = plant.location || "";
  
  const status = getPlantStatus(plant as Plant);
  const statusText = getStatusText(plant as Plant);

  return (
    <div>
      <div className="bg-card p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={handleBack} className="mr-2">
            <span className="material-icons">arrow_back</span>
          </Button>
          <h1 className="text-xl font-bold font-heading">{plant.name}</h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <StatusDot plant={plant} className="mr-2" />
            <span
              className={`${
                status === "watered"
                  ? "text-status-watered"
                  : status === "soon"
                  ? "text-status-soon"
                  : "text-status-overdue"
              } font-medium`}
            >
              {statusText}
            </span>
          </div>
          <Button variant="ghost" onClick={handleEditPlant} className="text-gray-500">
            <span className="material-icons">edit</span>
          </Button>
        </div>
      </div>

      <div className="p-4">
        {plant.imageUrl && (
          <Card className="mb-6 overflow-hidden">
            <div className="relative h-48 w-full">
              <img 
                src={plant.imageUrl} 
                alt={plant.name} 
                className="w-full h-full object-cover"
              />
            </div>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-3 font-heading">Plant Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Species</p>
                <p className="font-medium">{plant.species || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Location</p>
                <p className="font-medium">{plant.location || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Watering Frequency</p>
                <p className="font-medium">Every {plant.wateringFrequency} days</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Last Watered</p>
                <p className="font-medium">{formatDate(new Date(plant.lastWatered))}</p>
              </div>
              {plant.notes && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-sm">Notes</p>
                  <p className="font-medium">{plant.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Water Plant Action Card */}
        {status !== "watered" && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Ready for Care</h3>
                  <p className="text-sm text-gray-500">Your plant is ready for watering</p>
                </div>
                <Button 
                  onClick={handleWaterPlant} 
                  variant="default" 
                  className="bg-primary text-white"
                  disabled={waterPlant.isPending}
                  data-testid="button-water-plant"
                >
                  {waterPlant.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <span className="material-icons text-sm mr-1">opacity</span>
                  )}
                  Water Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unified Care Timeline */}
        <PlantCareTimeline plantId={plantId} plantName={plant.name} />

        <div className="flex justify-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="text-red-500 font-medium flex items-center"
                disabled={deletePlant.isPending}
              >
                {deletePlant.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <span className="material-icons mr-1 text-sm">delete</span>
                )}
                Delete Plant
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {plant.name} and all of its watering history.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeletePlant}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
