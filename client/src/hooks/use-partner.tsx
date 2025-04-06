import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest } from "../lib/queryClient";
import { useAuth } from "./use-auth";
import { useEffect } from "react";

/**
 * A hook to fetch and access partner information
 * Automatically handles loading, error states and caching
 */
export function usePartner() {
  const { user } = useAuth();
  
  // Direct fetch for debugging
  useEffect(() => {
    if (user?.partnerId) {
      console.log("Fetching partner data directly for debugging...");
      fetch("/api/partner", { credentials: "include" })
        .then(res => {
          console.log("Partner API status:", res.status);
          return res.json();
        })
        .then(data => {
          console.log("Partner API data:", data);
        })
        .catch(err => {
          console.error("Partner API error:", err);
        });
    }
  }, [user]);
  
  const {
    data: partner,
    isLoading,
    error,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/partner"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/partner");
        const data = await res.json();
        console.log("Partner data from query:", data);
        return data;
      } catch (error) {
        console.error("Partner query error:", error);
        return null;
      }
    },
    // Only fetch if user is logged in and has a partnerId
    enabled: !!user && !!user.partnerId,
    // Important: provide a fallback initial value so it's never undefined
    initialData: null
  });

  return {
    partner,
    isLoading,
    error,
    refetch,
    hasPartner: !!partner,
  };
}