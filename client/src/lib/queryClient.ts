import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorDetail = {};
    let responseText = '';
    let isHtmlResponse = false;
    
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get('content-type');
      console.log(`Response content-type for ${res.url}:`, contentType);
      
      if (contentType && contentType.includes('application/json')) {
        const errorJson = await res.clone().json();
        errorDetail = errorJson;
        responseText = JSON.stringify(errorJson);
      } else {
        responseText = await res.text();
        
        // Detect if this is an HTML response that might indicate a server error
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          isHtmlResponse = true;
          console.error('Received HTML response instead of JSON', {
            status: res.status,
            url: res.url,
            contentType,
            responsePreview: responseText.substring(0, 100) + '...'
          });
          // Provide a clearer error message for HTML responses
          responseText = 'Server error: Received HTML response instead of JSON. This usually indicates a server-side error.';
        }
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      // If JSON parsing fails, fall back to text
      try {
        responseText = await res.text();
        
        // Check again for HTML
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          isHtmlResponse = true;
          console.error('Received HTML response after parse error', {
            status: res.status,
            url: res.url,
            responsePreview: responseText.substring(0, 100) + '...'
          });
          responseText = 'Server error: Received HTML response instead of JSON. This usually indicates a server-side error.';
        }
      } catch (textError) {
        console.error('Error getting response text:', textError);
        responseText = res.statusText;
      }
    }
    
    // For authentication errors, add more context
    if (res.status === 401) {
      console.error('Authentication error:', {
        status: res.status,
        url: res.url,
        responseText: isHtmlResponse ? 'HTML content (truncated)' : responseText,
        cookies: document.cookie ? 'Present' : 'None',
      });
      
      throw new Error(`Authentication required: ${responseText}`, {
        cause: { 
          status: res.status, 
          url: res.url,
          detail: errorDetail,
          type: 'auth_error',
          isHtmlResponse
        }
      });
    }
    
    console.error(`API Error (${res.status}):`, {
      url: res.url,
      responseText: isHtmlResponse ? 'HTML content (truncated)' : responseText
    });
    
    throw new Error(`${res.status}: ${responseText}`, {
      cause: { 
        status: res.status, 
        url: res.url,
        detail: errorDetail,
        isHtmlResponse
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
      // Safe cookie checking
      const cookiesPresent = typeof document !== 'undefined' && document.cookie ? 'Present' : 'None';
      const sessionMatch = cookiesPresent === 'Present' ? document.cookie.match(/connect\.sid=([^;]+)/) : null;
      console.warn(`[Auth Debug] Authentication failure for ${queryKey[0]}`, {
        status: res.status,
        cookies: cookiesPresent,
        sessionID: sessionMatch && sessionMatch.length > 1 ? 'Found' : 'Not found'
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
