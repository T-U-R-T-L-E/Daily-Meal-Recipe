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

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...fetchInit,
        signal: controller.signal
      });
      
      clearTimeout(id);

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
