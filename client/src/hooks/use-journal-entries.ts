import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PlantJournalEntry, InsertPlantJournalEntry } from "@shared/schema";

export function useJournalEntries() {
  const queryClient = useQueryClient();

  const useGetPlantJournal = (plantId: number) => {
    return useQuery({
      queryKey: [`/api/plants/${plantId}/journal`, plantId],
      enabled: !!plantId,
    });
  };

  const createJournalEntry = useMutation({
    mutationFn: async ({ plantId, data }: { plantId: number; data: { imageUrl: string; caption?: string } }) => {
      return apiRequest('POST', `/api/plants/${plantId}/journal`, data);
    },
    onSuccess: (_, { plantId }) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/plants/${plantId}/journal`, plantId],
      });
    },
  });

  const deleteJournalEntry = useMutation({
    mutationFn: async ({ id, plantId }: { id: number; plantId: number }) => {
      return apiRequest('DELETE', `/api/journal/${id}`);
    },
    onSuccess: (_, { plantId }) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/plants/${plantId}/journal`, plantId],
      });
    },
  });

  return {
    useGetPlantJournal,
    createJournalEntry,
    deleteJournalEntry,
  };
}
