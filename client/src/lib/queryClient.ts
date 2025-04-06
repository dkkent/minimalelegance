import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorDetail = {};
    let responseText = '';
    
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorJson = await res.clone().json();
        errorDetail = errorJson;
        responseText = JSON.stringify(errorJson);
      } else {
        responseText = await res.text();
      }
    } catch (parseError) {
      // If JSON parsing fails, fall back to text
      try {
        responseText = await res.text();
      } catch (textError) {
        responseText = res.statusText;
      }
    }
    
    // For authentication errors, add more context
    if (res.status === 401) {
      console.error('Authentication error:', {
        status: res.status,
        url: res.url,
        responseText,
        cookies: document.cookie ? 'Present' : 'None',
      });
      
      throw new Error(`Authentication required: ${responseText}`, {
        cause: { 
          status: res.status, 
          url: res.url,
          detail: errorDetail,
          type: 'auth_error'
        }
      });
    }
    
    throw new Error(`${res.status}: ${responseText}`, {
      cause: { 
        status: res.status, 
        url: res.url,
        detail: errorDetail
      }
    });
  }
}

interface ApiRequestOptions {
  isFormData?: boolean;
  headers?: Record<string, string>;
}

export async function apiRequest(
  endpoint: string,
  options?: {
    method?: string;
    data?: unknown;
    headers?: Record<string, string>;
    isFormData?: boolean;
  }
): Promise<any> {
  const method = options?.method || 'GET';
  const data = options?.data;
  const isFormData = options?.isFormData || false;
  
  const headers: Record<string, string> = {
    // Apply custom headers if provided
    ...(options?.headers || {})
  };
  
  // Only set Content-Type for non-FormData requests and if not already set by custom headers
  if (data && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(endpoint, {
    method,
    headers,
    // For FormData, use the data as is; otherwise stringify it
    body: data ? (isFormData ? data as FormData : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // For empty responses (204 No Content)
  if (res.status === 204) {
    return null;
  }
  
  return await res.json();
}

type ResponseBehavior = "returnNull" | "returnUndefined" | "throw";
export const getQueryFn: <T>(options: {
  on401?: ResponseBehavior;
  on404?: ResponseBehavior;
}) => QueryFunction<T> =
  ({ on401 = "throw", on404 = "throw" }) =>
  async ({ queryKey }) => {
    console.log(`[API Request] ${queryKey[0]}, cookies: ${document.cookie ? 'Present' : 'None'}`);
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        // Add timestamp to prevent caching issues
        'X-Request-Time': new Date().toISOString(),
      }
    });

    // Enhanced debugging for auth issues
    if (res.status === 401) {
      console.warn(`[Auth Debug] Authentication failure for ${queryKey[0]}`, {
        status: res.status,
        cookies: document.cookie ? 'Present' : 'None',
        sessionID: document.cookie.match(/connect\.sid=([^;]+)/)?.length > 1 ? 'Found' : 'Not found'
      });
      
      if (on401 !== "throw") {
        return on401 === "returnNull" ? null : undefined;
      }
    }

    if (on404 !== "throw" && res.status === 404) {
      return on404 === "returnNull" ? null : undefined;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
