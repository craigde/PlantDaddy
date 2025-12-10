import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PlantHealthRecord, InsertPlantHealthRecord } from "@shared/schema";

export function useHealthRecords() {
  const queryClient = useQueryClient();

  // Hook to get health records for a specific plant
  const useGetPlantHealthRecords = (plantId: number) => {
    return useQuery({
      queryKey: [`/api/plants/${plantId}/health-records`, plantId],
      enabled: !!plantId,
    });
  };

  // Hook to create a new health record
  const createHealthRecord = useMutation({
    mutationFn: async ({ plantId, data }: { plantId: number; data: Omit<InsertPlantHealthRecord, 'plantId' | 'userId'> }) => {
      return apiRequest('POST', `/api/plants/${plantId}/health-records`, data);
    },
    onSuccess: (_, { plantId }) => {
      // Invalidate health records for the plant
      queryClient.invalidateQueries({
        queryKey: [`/api/plants/${plantId}/health-records`, plantId],
      });
      // Also invalidate the plant details cache to refresh any aggregated data
      queryClient.invalidateQueries({
        queryKey: ['/api/plants', plantId],
      });
    },
  });

  // Hook to update a health record
  const updateHealthRecord = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPlantHealthRecord> }) => {
      return apiRequest(`/api/health-records/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (updatedRecord: PlantHealthRecord) => {
      // Invalidate health records for the plant
      queryClient.invalidateQueries({
        queryKey: [`/api/plants/${updatedRecord.plantId}/health-records`, updatedRecord.plantId],
      });
      // Also invalidate the plant details cache
      queryClient.invalidateQueries({
        queryKey: ['/api/plants', updatedRecord.plantId],
      });
    },
  });

  // Hook to delete a health record
  const deleteHealthRecord = useMutation({
    mutationFn: async ({ id, plantId }: { id: number; plantId: number }) => {
      return apiRequest(`/api/health-records/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, { plantId }) => {
      // Invalidate health records for the plant
      queryClient.invalidateQueries({
        queryKey: [`/api/plants/${plantId}/health-records`, plantId],
      });
      // Also invalidate the plant details cache
      queryClient.invalidateQueries({
        queryKey: ['/api/plants', plantId],
      });
    },
  });

  return {
    useGetPlantHealthRecords,
    createHealthRecord,
    updateHealthRecord,
    deleteHealthRecord,
  };
}