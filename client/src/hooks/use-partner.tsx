import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";
import { useAuth } from "./use-auth";

/**
 * A hook to fetch and access partner information
 * Automatically handles loading, error states and caching
 */
export function usePartner() {
  const { user } = useAuth();
  
  const {
    data: partner,
    isLoading,
    error,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/partner"],
    queryFn: getQueryFn({ on404: "returnNull" }),
    // Only fetch if user is logged in and has a partnerId
    enabled: !!user && !!user.partnerId,
  });

  return {
    partner: partner || null,
    isLoading,
    error,
    refetch,
    hasPartner: !!partner,
  };
}