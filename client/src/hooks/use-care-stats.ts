import { useQuery } from "@tanstack/react-query";

export interface CareStats {
  streak: number;
  monthlyTotal: number;
  monthlyByMember: { userId: number; username: string; count: number }[];
  monthlyByType: { type: string; count: number }[];
  totalPlants: number;
  plantsNeedingWater: number;
}

export function useCareStats() {
  return useQuery<CareStats>({
    queryKey: ["/api/care-stats"],
  });
}
