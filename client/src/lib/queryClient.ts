import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getActiveHouseholdId } from "@/hooks/use-household-context";

function getHouseholdHeaders(): Record<string, string> {
  const id = getActiveHouseholdId();
  return id ? { "X-Household-Id": String(id) } : {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // First try to parse as JSON for structured error messages
      const errorData = await res.json();
      console.error('API Error Response:', errorData);
      
      if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      // If parsing JSON fails, use text or status
      if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
        throw e; // Rethrow if it's a custom error we created above
      }
      
      // Otherwise, get the response text
      const text = await res.text() || res.statusText;
      console.error('API Error Response (text):', text);
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  urlOrOptions: string | (RequestInit & { url?: string; method?: string }),
  pathOrOptions?: string | RequestInit,
  data?: any,
): Promise<any> {
  let url: string;
  let fetchOptions: RequestInit = {};

  // Handle different calling styles:
  // 1. apiRequest({ url: '/endpoint', method: 'POST', body: JSON.stringify(data) })
  // 2. apiRequest('/endpoint', { method: 'POST', body: JSON.stringify(data) })
  // 3. apiRequest('POST', '/endpoint', data)

  if (typeof urlOrOptions === 'string') {
    if (typeof pathOrOptions === 'string') {
      // Style 3: apiRequest('POST', '/endpoint', data)
      const method = urlOrOptions;
      url = pathOrOptions;
      
      fetchOptions.method = method;
      
      if (data) {
        fetchOptions.headers = {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        };
        fetchOptions.body = JSON.stringify(data);
      }
    } else {
      // Style 2: apiRequest('/endpoint', { method: 'POST', body: JSON.stringify(data) })
      url = urlOrOptions;
      fetchOptions = pathOrOptions || {};
    }
  } else {
    // Style 1: apiRequest({ url: '/endpoint', method: 'POST', body: JSON.stringify(data) })
    const { url: optionsUrl, method, ...restOptions } = urlOrOptions;
    url = optionsUrl || '';
    fetchOptions = { method, ...restOptions };
  }

  console.log("API Request:", {
    url,
    method: fetchOptions.method || 'GET',
    headers: fetchOptions.headers
  });

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...getHouseholdHeaders(),
        ...fetchOptions.headers,
      },
      credentials: "include",
    });

    console.log("API Response status:", res.status);
    
    // Check if the response is ok (status in the range 200-299)
    if (!res.ok) {
      // Try to extract error message from server response
      let errorMessage = `Error: ${res.status} ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData && typeof errorData === 'object') {
          if ('error' in errorData) {
            errorMessage = errorData.error;
          } else if ('message' in errorData) {
            errorMessage = errorData.message;
          }
        }
        console.error('API Error Response:', errorData);
      } catch (parseErr) {
        // If JSON parsing fails, try to get the response text
        try {
          const errorText = await res.text();
          if (errorText && errorText.trim()) {
            errorMessage = errorText;
          }
          console.error('API Error Response (text):', errorText);
        } catch (textErr) {
          console.error('Failed to parse error response:', textErr);
        }
      }

      // Throw a formatted error with the extracted message
      throw new Error(errorMessage);
    }
    
    // For successful responses, try to parse as JSON
    try {
      const data = await res.json();
      return data;
    } catch (e) {
      console.log('Response is not JSON, returning raw response');
      // If the response is not JSON, just return the raw response
      return res;
    }
  } catch (networkError) {
    // Handle network errors (e.g., connection refused, timeout, etc.)
    console.error('Network error during API request:', networkError);
    
    if (networkError instanceof Error) {
      // If it's already an Error object (like from above), just rethrow it
      throw networkError;
    } else {
      // If it's some other type, wrap it in an Error
      throw new Error(`Network error: ${String(networkError)}`);
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  path?: string;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, path }) =>
  async ({ queryKey }) => {
    // Use provided path or first query key as URL
    const url = path || queryKey[0] as string;
    
    try {
      const res = await fetch(url, {
        headers: {
          ...getHouseholdHeaders(),
        },
        credentials: "include",
      });
      
      console.log(`Query response for ${url}: status ${res.status}`);

      // Handle 401 Unauthorized based on the provided behavior
      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          console.log(`Returning null for 401 response on ${url}`);
          return null;
        } else {
          throw new Error("Unauthorized");
        }
      }

      // Handle other error responses
      if (!res.ok) {
        // Try to extract error message from server response
        let errorMessage = `Error: ${res.status} ${res.statusText}`;
        try {
          const errorData = await res.json();
          if (errorData && typeof errorData === 'object') {
            if ('error' in errorData) {
              errorMessage = errorData.error;
            } else if ('message' in errorData) {
              errorMessage = errorData.message;
            }
          }
          console.error('Query Error Response:', errorData);
        } catch (parseErr) {
          // If JSON parsing fails, try to get the response text
          try {
            const errorText = await res.text();
            if (errorText && errorText.trim()) {
              errorMessage = errorText;
            }
            console.error('Query Error Response (text):', errorText);
          } catch (textErr) {
            console.error('Failed to parse error response:', textErr);
          }
        }

        throw new Error(errorMessage);
      }
      
      // Parse successful responses
      try {
        const data = await res.json();
        return data;
      } catch (parseErr) {
        console.error(`Failed to parse JSON response from ${url}:`, parseErr);
        return null; // Return null for non-JSON responses
      }
    } catch (networkError) {
      // Handle network errors
      console.error(`Network error during query to ${url}:`, networkError);
      if (networkError instanceof Error) {
        throw networkError;
      } else {
        throw new Error(`Network error: ${String(networkError)}`);
      }
    }
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
