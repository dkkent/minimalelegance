import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface ApiRequestOptions {
  isFormData?: boolean;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: ApiRequestOptions
): Promise<Response> {
  const isFormData = options?.isFormData || false;
  
  const headers: Record<string, string> = {};
  
  // Only set Content-Type for non-FormData requests
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    // For FormData, use the data as is; otherwise stringify it
    body: data ? (isFormData ? data as FormData : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
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
