import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Household = {
  id: number;
  name: string;
  inviteCode: string;
  createdBy: number;
  createdAt: string;
  role: string;
};

export type HouseholdMember = {
  id: number;
  householdId: number;
  userId: number;
  role: string;
  joinedAt: string;
  username: string;
};

export type HouseholdDetail = {
  id: number;
  name: string;
  inviteCode: string;
  createdBy: number;
  createdAt: string;
  members: HouseholdMember[];
};

export function useHouseholds() {
  const queryClient = useQueryClient();

  const {
    data: households = [],
    isLoading,
    error,
  } = useQuery<Household[]>({
    queryKey: ["/api/households"],
  });

  const createHousehold = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/households", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
    },
  });

  const joinHousehold = useMutation({
    mutationFn: async (inviteCode: string) => {
      return await apiRequest("POST", "/api/households/join", { inviteCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
    },
  });

  const renameHousehold = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return await apiRequest("PATCH", `/api/households/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
    },
  });

  const regenerateInviteCode = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/households/${id}/invite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({
      householdId,
      userId,
      role,
    }: {
      householdId: number;
      userId: number;
      role: string;
    }) => {
      return await apiRequest(
        "PATCH",
        `/api/households/${householdId}/members/${userId}`,
        { role }
      );
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({
      householdId,
      userId,
    }: {
      householdId: number;
      userId: number;
    }) => {
      return await apiRequest(
        "DELETE",
        `/api/households/${householdId}/members/${userId}`
      );
    },
  });

  return {
    households,
    isLoading,
    error,
    createHousehold,
    joinHousehold,
    renameHousehold,
    regenerateInviteCode,
    updateMemberRole,
    removeMember,
  };
}

export function useHouseholdDetail(householdId: number | null) {
  const {
    data: detail,
    isLoading,
    error,
    refetch,
  } = useQuery<HouseholdDetail>({
    queryKey: ["/api/households", householdId],
    queryFn: async () => {
      if (!householdId) throw new Error("No household ID");
      return await apiRequest("GET", `/api/households/${householdId}`);
    },
    enabled: !!householdId,
  });

  return { detail, isLoading, error, refetch };
}
