import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, getQueryFn } from '@/lib/queryClient';
import type { PlantSpecies } from '@shared/schema';

export function usePlantSpecies() {
  // Get all plant species with optional search query
  const getPlantSpecies = (query?: string) => {
    const path = query 
      ? `/api/plant-species?q=${encodeURIComponent(query)}` 
      : '/api/plant-species';
    
    return useQuery<PlantSpecies[]>({
      queryKey: query ? ['plant-species', query] : ['plant-species'],
      queryFn: getQueryFn<PlantSpecies[]>({
        on401: 'throw',
        path
      })
    });
  };

  // Get a specific plant species by ID
  const getPlantSpeciesById = (id: number | null) => {
    return useQuery<PlantSpecies>({
      queryKey: ['plant-species', id ? id : 'detail'],
      queryFn: getQueryFn<PlantSpecies>({
        on401: 'throw',
        path: id ? `/api/plant-species/${id}` : '/api/plant-species/0'
      }),
      enabled: !!id
    });
  };

  // Add a new plant species
  const addPlantSpecies = useMutation({
    mutationFn: async (newSpecies: Omit<PlantSpecies, 'id'>) => {
      return apiRequest({
        method: 'POST',
        body: JSON.stringify(newSpecies),
        headers: {
          'Content-Type': 'application/json',
        },
        url: '/api/plant-species'
      });
    },
    onSuccess: () => {
      // Invalidate the plant species cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['plant-species'] });
    },
  });

  // Update a plant species
  const updatePlantSpecies = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PlantSpecies> }) => {
      return apiRequest({
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
        url: `/api/plant-species/${id}`
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidate the individual plant species and the list
      queryClient.invalidateQueries({ queryKey: ['plant-species', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['plant-species'] });
    },
  });

  // Delete a plant species
  const deletePlantSpecies = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest({
        method: 'DELETE',
        url: `/api/plant-species/${id}`
      });
    },
    onSuccess: () => {
      // Invalidate the plant species cache after deletion
      queryClient.invalidateQueries({ queryKey: ['plant-species'] });
    },
  });

  return {
    getPlantSpecies,
    getPlantSpeciesById,
    addPlantSpecies,
    updatePlantSpecies,
    deletePlantSpecies
  };
}