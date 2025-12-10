import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, InsertLocation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useLocations() {
  const queryClient = useQueryClient();
  
  // Fetch all locations
  const {
    data: locations = [],
    isLoading,
    error,
  } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });
  
  // Create a new location
  const createLocation = useMutation({
    mutationFn: async (location: Omit<InsertLocation, "userId">) => {
      // The userId will be added on the server from the authenticated session
      return await apiRequest("POST", "/api/locations", location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });
  
  // Update a location
  const updateLocation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLocation> }) => {
      return await apiRequest("PATCH", `/api/locations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });
  
  // Delete a location
  const deleteLocation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });
  
  return {
    locations,
    isLoading,
    error,
    createLocation,
    updateLocation,
    deleteLocation,
  };
}