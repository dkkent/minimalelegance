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
      console.log("User has partnerId:", user.partnerId);
      console.log("Fetching partner data directly for debugging...");
      fetch("/api/partner", { 
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(res => {
          console.log("Partner API status:", res.status);
          return res.json();
        })
        .then(data => {
          console.log("Partner API raw data:", data);
          if (data && data.profilePicture) {
            console.log("Partner profile raw:", data.profilePicture);
            
            // Test the image
            const img = new Image();
            img.onload = () => console.log("✅ Direct fetch - image loaded:", data.profilePicture);
            img.onerror = () => console.error("❌ Direct fetch - image failed:", data.profilePicture);
            img.src = data.profilePicture;
          }
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
        // Check if user has a partnerId before proceeding
        if (!user?.partnerId) {
          console.log("No partnerId found in user object, returning null");
          return null;
        }
        
        const res = await apiRequest("GET", "/api/partner");
        
        if (!res.ok) {
          console.error(`Partner API returned status: ${res.status}`);
          if (res.status === 404) return null;
          throw new Error(`Failed to fetch partner data: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log("Partner data from useQuery:", data);
        
        if (!data) {
          console.log("Partner data is null");
          return null;
        }
        
        // Debug log for avatar-specific data
        if (data.profilePicture) {
          console.log("Partner profile picture from query:", data.profilePicture);
        } else {
          console.log("Partner has no profile picture");
        }
        
        return data;
      } catch (error) {
        console.error("Partner query error:", error);
        return null;
      }
    },
    // Only fetch if user is logged in and has a partnerId
    enabled: !!user && !!user.partnerId,
    staleTime: 0,
    cacheTime: 0,
    refetchInterval: 1000, // Refetch every second
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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