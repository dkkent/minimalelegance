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
  
  // We've removed the direct fetch debugging code that was exposing sensitive information
  // This improves security by not logging user data to the console
  
  const {
    data: partner,
    isLoading,
    error,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/partner"],
    queryFn: async () => {
      try {
        // Check if user has a partnerId before proceeding
        if (!user?.partnerId) {
          console.log("No partnerId found in user object, returning null");
          return null;
        }
        
        const data = await apiRequest("/api/partner");
        
        if (!data) {
          console.error("Partner API returned no data");
          return null;
        }
        
        // Only log minimal information about the partner data for debugging
        const hasProfilePicture = !!data.profilePicture;
        console.log("Partner data loaded:", { 
          id: data.id, 
          hasProfilePicture
        });
        
        return data;
      } catch (error) {
        console.error("Partner query error:", error);
        return null;
      }
    },
    // Only fetch if user is logged in and has a partnerId
    enabled: !!user && !!user.partnerId,
    staleTime: 0, // Consider data always stale
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