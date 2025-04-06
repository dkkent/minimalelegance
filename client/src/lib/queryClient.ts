import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (on401 !== "throw" && res.status === 401) {
      return on401 === "returnNull" ? null : undefined;
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
