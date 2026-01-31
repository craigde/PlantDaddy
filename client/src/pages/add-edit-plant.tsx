import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usePlants } from "@/hooks/use-plants";
import { useToast } from "@/hooks/use-toast";
import { getWateringFrequencies } from "@/lib/plant-utils";
import { useLocations } from "@/hooks/use-locations";
import { useLocationState } from "@/hooks/use-location-state";
import { usePlantSpecies } from "@/hooks/use-plant-species";
import { Loader2, Upload, Image } from "lucide-react";
import { R2ImageUploader } from "@/components/R2ImageUploader";

export default function AddEditPlant() {
  const params = useParams();
  const id = params?.id;
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id && id !== "new";
  const plantId = isEditing && id ? parseInt(id) : null;
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Access recommended plant data from URL query parameters
  const [searchParams] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });
  
  const recommendedPlant = React.useMemo(() => {
    const name = searchParams.get('name');
    const species = searchParams.get('species');
    const wateringFrequencyStr = searchParams.get('wateringFrequency');
    const imageUrl = searchParams.get('imageUrl');
    
    if (name || species || wateringFrequencyStr || imageUrl) {
      return {
        name: name || '',
        species: species || '',
        wateringFrequency: wateringFrequencyStr ? parseInt(wateringFrequencyStr, 10) : 7,
        imageUrl: imageUrl || ''
      };
    }
    return undefined;
  }, [searchParams]);
  
  // Debug state
  useEffect(() => {
    if (recommendedPlant) {
      console.log("Recommended plant data from URL:", recommendedPlant);
    }
  }, [recommendedPlant]);

  const { useGetPlant, createPlant, updatePlant } = usePlants();
  
  // Debug form submission
  useEffect(() => {
    if (createPlant.error) {
      console.log("Form submission error:", createPlant.error);
    }
  }, [createPlant.error]);
  const { locations, isLoading: isLoadingLocations } = useLocations();
  const { getPlantSpecies } = usePlantSpecies();
  const { data: plantSpeciesData, isLoading: isLoadingSpecies } = getPlantSpecies();
  const { data: plantData, isLoading: isLoadingPlant } = useGetPlant(isEditing && id ? parseInt(id) : 0);

  // Form schema
  const formSchema = z.object({
    name: z.string().min(1, "Plant name is required"),
    species: z.string().optional(),
    location: z.string().min(1, "Location is required"),
    wateringFrequency: z.coerce.number().min(1, "Watering frequency is required"),
    lastWatered: z.string(),
    notes: z.string().optional(),
    imageUrl: z.string().optional(),
  });

  // Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: recommendedPlant?.name || "",
      species: recommendedPlant?.species || "",
      location: "",
      wateringFrequency: recommendedPlant?.wateringFrequency || 7,
      lastWatered: new Date().toISOString().split("T")[0],
      notes: "",
      imageUrl: recommendedPlant?.imageUrl,
    },
  });

  // Load plant data if editing
  useEffect(() => {
    if (isEditing && plantData) {
      // Cast to any to avoid TypeScript errors
      const plant = plantData as any;
      console.log("Populating edit form with plant data:", plant);
      
      form.reset({
        name: plant.name || "",
        species: plant.species || "",
        location: plant.location || "",
        wateringFrequency: plant.wateringFrequency || 7,
        lastWatered: plant.lastWatered ? new Date(plant.lastWatered).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        notes: plant.notes || "",
        imageUrl: plant.imageUrl || undefined,
      });
      
      // Set image preview if plant has an image
      if (plant.imageUrl) {
        setImagePreview(plant.imageUrl);
        console.log("Set image preview for edited plant:", plant.imageUrl);
      }
    } else if (!isEditing && recommendedPlant?.imageUrl) {
      // Set the species image as preview for new plants
      setImagePreview(recommendedPlant.imageUrl);
      console.log("Set image preview for new plant from recommended:", recommendedPlant.imageUrl);
    }
  }, [isEditing, plantData, recommendedPlant, form]);
  
  // Update form with recommended plant data when locations and species data are both loaded
  useEffect(() => {
    if (!isEditing && !isLoadingLocations && locations && locations.length > 0 && 
        !isLoadingSpecies && plantSpeciesData && recommendedPlant) {
      
      // If the species field is populated, ensure it matches one of our valid species options
      let speciesValue = recommendedPlant.species || form.getValues().species;
      let matchedWateringFrequency = recommendedPlant.wateringFrequency || form.getValues().wateringFrequency;
      let matchedImageUrl = recommendedPlant.imageUrl || form.getValues().imageUrl;

      // Log available species and the one we're trying to select
      console.log("Species from URL:", speciesValue);
      console.log("Available species:", plantSpeciesData.map(s => ({ name: s.name, scientific: s.scientificName })));

      // Try exact match by name first
      let matchedSpecies = plantSpeciesData.find(s => s.name === speciesValue);

      // Try matching by scientific name (case-insensitive, partial match)
      if (!matchedSpecies && speciesValue) {
        const lower = speciesValue.toLowerCase();
        matchedSpecies = plantSpeciesData.find(s =>
          s.scientificName?.toLowerCase() === lower ||
          s.name.toLowerCase() === lower ||
          s.scientificName?.toLowerCase().includes(lower) ||
          lower.includes(s.scientificName?.toLowerCase() || '')
        );
      }

      if (matchedSpecies) {
        console.log("Species matched:", matchedSpecies.name, "from", speciesValue);
        speciesValue = matchedSpecies.name;
        matchedWateringFrequency = matchedSpecies.wateringFrequency;
        if (matchedSpecies.imageUrl) {
          matchedImageUrl = matchedSpecies.imageUrl;
          setImagePreview(matchedSpecies.imageUrl);
        }
      } else {
        console.log("Species not found in dropdown options, using empty value");
        speciesValue = "";
      }
      
      form.reset({
        ...form.getValues(),
        name: recommendedPlant.name || form.getValues().name,
        species: speciesValue,
        location: locations[0].name,
        wateringFrequency: matchedWateringFrequency,
        imageUrl: matchedImageUrl,
      });
      console.log("Updated form with recommended plant data, species:", speciesValue, "imageUrl:", matchedImageUrl);
    } else if (!isEditing && !isLoadingLocations && locations && locations.length > 0) {
      form.reset({
        ...form.getValues(),
        location: locations[0].name,
      });
    }
  }, [isEditing, isLoadingLocations, locations, isLoadingSpecies, plantSpeciesData, recommendedPlant, form]);

  // R2 upload handler
  const handleR2Upload = async (imageUrl: string) => {
    if (!isEditing || !plantId) return;

    try {
      // Update the plant record with the new image URL
      await updatePlant.mutateAsync({
        id: plantId,
        data: { imageUrl }
      });

      // Update the preview
      setImagePreview(imageUrl);

      toast({
        title: "Image uploaded",
        description: "Plant image has been uploaded successfully."
      });
    } catch (error) {
      toast({
        title: "Failed to save image",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUploadError = (error: Error) => {
    toast({
      title: "Upload failed",
      description: error.message,
      variant: "destructive"
    });
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Form submission values:", values);
    console.log("Recommended plant:", recommendedPlant);
    
    // Get the lastWatered date and ensure it's properly formatted
    const lastWateredDate = new Date(values.lastWatered);
    console.log("Parsed lastWatered date:", lastWateredDate);
    
    // Convert string date to proper Date object for the API
    const processedValues = {
      ...values,
      // Explicitly create a new Date instance that Zod can validate
      lastWatered: lastWateredDate,
    };
    
    // Add imageUrl explicitly if this is a new plant from a recommended species
    if (!isEditing && recommendedPlant?.imageUrl) {
      processedValues.imageUrl = recommendedPlant.imageUrl;
      console.log("Using recommended plant image URL:", recommendedPlant.imageUrl);
    }
    
    console.log("Processed form values for submission:", processedValues);
    
    if (isEditing && plantId) {
      updatePlant.mutate(
        { id: plantId, data: processedValues },
        {
          onSuccess: (result) => {
            console.log("Plant updated successfully:", result);
            toast({
              title: "Plant updated",
              description: "Plant has been updated successfully.",
            });
            navigate(`/plants/${plantId}`);
          },
          onError: (error) => {
            console.error("Error updating plant:", error);
            toast({
              title: "Failed to update plant",
              description: "Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createPlant.mutate(processedValues, {
        onSuccess: (result) => {
          console.log("Plant created successfully:", result);
          toast({
            title: "Plant added",
            description: "New plant has been added successfully.",
          });
          navigate("/");
        },
        onError: (error) => {
          console.error("Error creating plant:", error);
          toast({
            title: "Failed to add plant",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleCancel = () => {
    if (isEditing && plantId) {
      navigate(`/plants/${plantId}`);
    } else {
      navigate("/");
    }
  };

  const isSubmitting = createPlant.isPending || updatePlant.isPending;

  return (
    <div>
      <div className="bg-card p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={handleCancel} className="mr-2">
            <span className="material-icons">arrow_back</span>
          </Button>
          <h1 className="text-xl font-bold font-heading">
            {isEditing ? "Edit Plant" : "Add New Plant"}
          </h1>
        </div>
      </div>

      <div className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="mb-6">
              <CardContent className="p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plant Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Monstera Deliciosa"
                          {...field}
                          disabled={isLoadingPlant}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Species</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value && plantSpeciesData) {
                            // Find the selected species in the data
                            const selectedSpecies = plantSpeciesData.find(s => s.name === value);
                            if (selectedSpecies) {
                              // Auto-fill watering frequency and set the species image
                              form.setValue('wateringFrequency', selectedSpecies.wateringFrequency);
                              if (selectedSpecies.imageUrl) {
                                form.setValue('imageUrl', selectedSpecies.imageUrl);
                                setImagePreview(selectedSpecies.imageUrl);
                              }
                            }
                          }
                        }}
                        value={field.value}
                        disabled={isLoadingPlant || isLoadingSpecies}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plant species" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingSpecies ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : !plantSpeciesData || plantSpeciesData.length === 0 ? (
                            <div className="p-2 text-center text-sm text-gray-500">
                              No species available
                            </div>
                          ) : (
                            <>
                              {plantSpeciesData.map((species) => (
                                <SelectItem key={species.id} value={species.name}>
                                  {species.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a species to auto-fill care information
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormLabel>Plant Image {isEditing ? "(Optional)" : ""}</FormLabel>
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="size-24 rounded-md">
                        {imagePreview ? (
                          <AvatarImage src={imagePreview} alt="Plant image" className="object-cover" />
                        ) : (
                          <AvatarFallback className="rounded-md bg-muted">
                            <Image className="size-10 text-muted-foreground" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="text-xs text-gray-500">
                        {imagePreview && !isEditing ? "Species image" : 
                         imagePreview ? "Current image" : "No image"}
                      </div>
                    </div>
                    
                    {isEditing && (
                      <div className="flex flex-col gap-2 w-full">
                        <R2ImageUploader
                          plantId={plantId || undefined}
                          onUpload={handleR2Upload}
                          onError={handleUploadError}
                          className="w-full"
                        >
                          <Button variant="outline" className="w-full" type="button">
                            <Upload className="size-4 mr-2" />
                            Upload Plant Image
                          </Button>
                        </R2ImageUploader>
                      </div>
                    )}
                  </div>
                  {!isEditing && imagePreview && (
                    <div className="text-sm text-gray-600">
                      This species image will be used as the default. You can replace it with your own image later.
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingPlant}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingLocations ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : locations.length === 0 ? (
                            <div className="p-2 text-center text-sm text-gray-500">
                              No locations available
                            </div>
                          ) : (
                            locations.map((location) => (
                              <SelectItem key={location.id} value={location.name}>
                                {location.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wateringFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Watering Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value.toString()}
                        disabled={isLoadingPlant}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getWateringFrequencies().map((freq) => (
                            <SelectItem key={freq.value} value={freq.value.toString()}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastWatered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Watered</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isLoadingPlant}
                        />
                      </FormControl>
                      <FormDescription>
                        When was this plant last watered?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special care instructions..."
                          className="h-24"
                          {...field}
                          disabled={isLoadingPlant}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                type="submit"
                className="bg-primary text-white px-6 py-3 rounded-full font-medium"
                disabled={isSubmitting || isLoadingPlant}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Plant" : "Save Plant"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
