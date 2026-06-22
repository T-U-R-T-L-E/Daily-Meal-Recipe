/**
 * Fault-Tolerant, Connection-Queue Aware Client Fetching Engine
 * Auto-handles:
 * 1. Infinite hanging sockets with a hard timeout.
 * 2. Exponential jittered backoff retries for connection limits/queue throttle (HTTP 503).
 * 3. Intelligent error boundaries, returning predictable models on ultimate exhaustion.
 */

export interface FaultTolerantFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
}

const STABLE_CLOUD_RUN_BACKEND = "https://daily-meal-recipe-650075039266.europe-west2.run.app";

export function getApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If we are on a custom domain (like dailymealrecipe.online, not localhost or standard run.app preview domains),
    // default directly to the stable Cloud Run backend endpoint
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.endsWith(".run.app")) {
      return `${STABLE_CLOUD_RUN_BACKEND}${cleanPath}`;
    }
  }
  
  return cleanPath;
}

export async function faultTolerantFetch(
  input: RequestInfo | URL,
  options?: FaultTolerantFetchOptions
): Promise<Response> {
  const {
    timeoutMs = 60000, // 60s for real-time culinary search grounding and AI scanner models
    maxRetries = 2, // reduced to avoid double-slamming the server if it's genuinely failing
    initialDelayMs = 800,
    ...fetchInit
  } = options || {};

  let requestUrl = typeof input === "string" ? getApiUrl(input) : input;
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(requestUrl, {
        ...fetchInit,
        signal: controller.signal
      });
      
      clearTimeout(id);

      // Verify that we did not receive an HTML response (indicates CDN/Static host page fallback)
      const contentType = response.headers.get("content-type") || "";
      const isHtmlResponse = contentType.includes("text/html");

      if (isHtmlResponse && typeof requestUrl === "string" && !requestUrl.startsWith(STABLE_CLOUD_RUN_BACKEND)) {
        console.warn(`[Self-Healing Router] Detected HTML document instead of API payload. Auto-routing endpoint to stable production Cloud Run server...`);
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const pathPart = origin ? requestUrl.replace(origin, "") : requestUrl;
        const cleanPath = pathPart.startsWith("/api/") ? pathPart : `/api${pathPart.startsWith("/") ? "" : "/"}${pathPart}`;
        requestUrl = `${STABLE_CLOUD_RUN_BACKEND}${cleanPath}`;
        attempt--; // Refund retry count
        continue;
      }

      // Throttling or connection limit retry handling
      if (response.status === 503 && attempt < maxRetries) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterMs = retryAfterHeader 
          ? parseInt(retryAfterHeader, 10) * 1000 
          : delay * (1 + Math.random() * 0.3); // Jittered multiplier
        
        console.warn(`[API Connection Protection] Status 503. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(retryAfterMs)}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfterMs));
        delay *= 2;
        continue;
      }

      return response;
    } catch (error: any) {
      clearTimeout(id);
      
      const isAbort = error.name === "AbortError";
      const isNetwork = error instanceof TypeError; // standard dropped socket/offline
      
      // Auto-fallback on network errors when running on custom domain
      if (isNetwork && typeof requestUrl === "string" && !requestUrl.startsWith(STABLE_CLOUD_RUN_BACKEND)) {
        console.warn(`[Self-Healing Router] Relative endpoints are unreachable. Dynamically routing to stable backend...`);
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const pathPart = origin ? requestUrl.replace(origin, "") : requestUrl;
        const cleanPath = pathPart.startsWith("/api/") ? pathPart : `/api${pathPart.startsWith("/") ? "" : "/"}${pathPart}`;
        requestUrl = `${STABLE_CLOUD_RUN_BACKEND}${cleanPath}`;
        attempt--; // Refund retry count
        continue;
      }

      if ((isAbort || isNetwork) && attempt < maxRetries) {
        const backoffMs = delay * (1 + Math.random() * 0.25);
        console.warn(`[API Network Recover] Attempt ${attempt} failed (${error.message || "Timeout"}). Retrying in ${Math.round(backoffMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        delay *= 2;
        continue;
      }
      
      throw error;
    }
  }

  throw new Error(`[API Exhaustion Exception] Failed to receive stable response after ${maxRetries} retries.`);
}

/**
 * Convenience wrapper returning JSON objects with standard runtime error handling fallback
 */
export async function faultTolerantFetchJson<T>(
  input: RequestInfo | URL,
  options?: FaultTolerantFetchOptions
): Promise<T> {
  const response = await faultTolerantFetch(input, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });

  if (!response.ok) {
    let errorMsg = `Server response returned error code ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.message || errorJson.error || errorMsg;
    } catch (e) {
      // Body not JSON
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
