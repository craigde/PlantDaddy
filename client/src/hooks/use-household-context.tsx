import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { Household } from "./use-households";

const ACTIVE_HOUSEHOLD_KEY = "activeHouseholdId";

type HouseholdContextType = {
  households: Household[];
  activeHousehold: Household | null;
  activeHouseholdId: number | null;
  isLoading: boolean;
  hasLoaded: boolean;
  switchHousehold: (household: Household) => void;
  refreshHouseholds: () => Promise<void>;
};

const HouseholdContext = createContext<HouseholdContextType | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const {
    data: households = [],
    isLoading,
    isFetched,
  } = useQuery<Household[]>({
    queryKey: ["/api/households"],
    enabled: !!user,
  });

  // Sync active household when households data changes
  useEffect(() => {
    if (!isFetched) return;

    setHasLoaded(true);

    if (households.length === 0) {
      setActiveHousehold(null);
      localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
      return;
    }

    const savedId = localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
    const savedIdNum = savedId ? parseInt(savedId, 10) : null;

    // Try to restore saved household
    if (savedIdNum) {
      const saved = households.find((h) => h.id === savedIdNum);
      if (saved) {
        setActiveHousehold(saved);
        return;
      }
    }

    // Default to first household
    setActiveHousehold(households[0]);
    localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, String(households[0].id));
  }, [households, isFetched]);

  // Clear state on logout
  useEffect(() => {
    if (!user) {
      setActiveHousehold(null);
      setHasLoaded(false);
      localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
    }
  }, [user]);

  const switchHousehold = useCallback(
    (household: Household) => {
      setActiveHousehold(household);
      localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, String(household.id));

      // Invalidate data queries so they re-fetch with the new household header
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    [queryClient]
  );

  const refreshHouseholds = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/households"] });
  }, [queryClient]);

  return (
    <HouseholdContext.Provider
      value={{
        households,
        activeHousehold,
        activeHouseholdId: activeHousehold?.id ?? null,
        isLoading,
        hasLoaded,
        switchHousehold,
        refreshHouseholds,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHouseholdContext() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error("useHouseholdContext must be used within a HouseholdProvider");
  }
  return context;
}

/**
 * Get the active household ID from localStorage.
 * Used by the API client to inject the X-Household-Id header without needing React context.
 */
export function getActiveHouseholdId(): number | null {
  const saved = localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
  return saved ? parseInt(saved, 10) : null;
}
