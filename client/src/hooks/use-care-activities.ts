import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CareActivity, InsertCareActivity } from "@shared/schema";

export function useCareActivities() {
  const queryClient = useQueryClient();

  // Hook to get care activities for a specific plant
  const useGetPlantCareActivities = (plantId: number) => {
    return useQuery({
      queryKey: ['/api/plants', plantId, 'care-activities'],
      enabled: !!plantId,
    });
  };

  // Hook to create a new care activity
  const createCareActivity = useMutation({
    mutationFn: async ({ plantId, data }: { plantId: number; data: Omit<InsertCareActivity, 'plantId' | 'userId'> }) => {
      return apiRequest(`/api/plants/${plantId}/care-activities`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, { plantId }) => {
      // Invalidate care activities for the plant
      queryClient.invalidateQueries({
        queryKey: ['/api/plants', plantId, 'care-activities'],
      });
      // Also invalidate the plant details cache to refresh any aggregated data
      queryClient.invalidateQueries({
        queryKey: ['/api/plants', plantId],
      });
    },
  });

  // Hook to update a care activity
  const updateCareActivity = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCareActivity> }) => {
      return apiRequest(`/api/care-activities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (updatedActivity: CareActivity) => {
      // Invalidate care activities for the plant
      queryClient.invalidateQueries({
        queryKey: ['/api/plants', updatedActivity.plantId, 'care-activities'],
      });
      // Also invalidate the plant details cache
      queryClient.invalidateQueries({
        queryKey: ['/api/plants', updatedActivity.plantId],
      });
    },
  });

  // Hook to delete a care activity
  const deleteCareActivity = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/care-activities/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, id) => {
      // Since we don't have the plantId after deletion, invalidate all care activity queries
      queryClient.invalidateQueries({
        queryKey: ['/api/plants'],
      });
    },
  });

  return {
    useGetPlantCareActivities,
    createCareActivity,
    updateCareActivity,
    deleteCareActivity,
  };
}