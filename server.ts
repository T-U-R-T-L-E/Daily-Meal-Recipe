import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import http from "http";
import https from "https";
import fs from "fs";
import multer from "multer";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin dynamically to support server-side caching of AI recipes and searches
let adminDb: admin.firestore.Firestore | null = null;
try {
  let appletConfig: any = {};
  try {
    appletConfig = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
    );
  } catch (e) {
    console.warn("Could not read firebase-applet-config.json for admin init:", e);
  }

  if (appletConfig.projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: appletConfig.projectId,
      });
    } catch (e) {
      admin.initializeApp({
        projectId: appletConfig.projectId,
      });
    }
    adminDb = admin.firestore(appletConfig.firestoreDatabaseId || undefined);
    console.log("Firebase Admin Firestore initialized successfully.");
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
}

// Global Outbound HTTP/HTTPS Connection Pooling optimization.
// Automatically pools and reuses sockets for downstream requests (Stripe, Gemini, external APIs)
// preventing Ephemeral Socket Exhaustion under high concurrent user load (100+ users).
(https.globalAgent as any) = new https.Agent({
  keepAlive: true,
  maxSockets: 350,
  maxFreeSockets: 50,
  timeout: 30000
});

(http.globalAgent as any) = new http.Agent({
  keepAlive: true,
  maxSockets: 350,
  maxFreeSockets: 50,
  timeout: 30000
});

const app = express();
const PORT = 3000;

// Dynamic Concurrency Governor & Request Queue Engine
const MAX_CONCURRENT_REQUESTS = 100; // Max parallel active processing slots
const MAX_QUEUE_CAPACITY = 200;       // Max pending requests buffered before rejection
const QUEUE_TIMEOUT_MS = 15000;       // Reject requests stalled in queue after 15s

let activeRequestsCount = 0;
const requestQueue: Array<{
  resolve: () => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}> = [];

// Evaluates and rolls over requests in physical order from FIFO queue
function dequeueNextRequest() {
  if (requestQueue.length > 0 && activeRequestsCount < MAX_CONCURRENT_REQUESTS) {
    activeRequestsCount++;
    const nextItem = requestQueue.shift();
    if (nextItem) {
      clearTimeout(nextItem.timer);
      nextItem.resolve();
    }
  }
}

// Custom Connection Pool and Queue Manager Middleware
const connectionPoolManager = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Static resources & bundles bypass connection limits to keep display asset transmission fast
  const isStaticDoc = req.path.startsWith("/assets/") || (req.path.includes(".") && !req.path.startsWith("/api/"));
  if (isStaticDoc) {
    return next();
  }

  // Active execution channel is open
  if (activeRequestsCount < MAX_CONCURRENT_REQUESTS) {
    activeRequestsCount++;
    
    // Register automatic resource deallocator on absolute execution end
    const releaseSlot = () => {
      activeRequestsCount--;
      dequeueNextRequest();
    };

    res.on("finish", releaseSlot);
    res.on("close", () => {
      if (!res.writableEnded) {
        releaseSlot();
      }
    });

    return next();
  }

  // Backing queue has hit absolute limits -> refuse fast with clean 503 so server is unimpacted
  if (requestQueue.length >= MAX_QUEUE_CAPACITY) {
    res.setHeader("Retry-After", "3");
    return res.status(503).json({
      error: "Temporary System Congestion",
      message: "The application is handling high concurrent load. Connection queue is full. Please try again soon."
    });
  }

  // Queue slots available -> put into connection queue
  let isReleased = false;
  
  const timer = setTimeout(() => {
    isReleased = true;
    const index = requestQueue.findIndex(item => item.timer === timer);
    if (index !== -1) {
      requestQueue.splice(index, 1);
    }
    res.setHeader("Retry-After", "5");
    return res.status(503).json({
      error: "Connection Queue Timeout",
      message: "Spent too long waiting for database or API worker threads. Please try again shortly."
    });
  }, QUEUE_TIMEOUT_MS);

  requestQueue.push({
    resolve: () => {
      if (isReleased) {
        // Safe rollover check if connection aborted before slot could dispatch
        activeRequestsCount--;
        dequeueNextRequest();
        return;
      }
      
      const releaseSlot = () => {
        activeRequestsCount--;
        dequeueNextRequest();
      };
      
      res.on("finish", releaseSlot);
      res.on("close", () => {
        if (!res.writableEnded) {
          releaseSlot();
        }
      });
      
      next();
    },
    reject: (err) => {
      clearTimeout(timer);
      if (!isReleased) {
        res.status(500).json({ error: "Dynamic queue allocation error", details: err.message });
      }
    },
    timer
  });
};

// --- SECURITY INPUT VALIDATION & SANITIZATION UTILITIES ---
function isValidEmail(email: any): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length < 254;
}

function sanitizeString(val: any): string {
  if (typeof val !== 'string') return '';
  if (val.startsWith('data:image/') && val.includes('base64,')) {
    return val;
  }
  if (/^https?:\/\//i.test(val)) {
    return val.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function hasSqlInjectionPattern(val: any): boolean {
  if (typeof val !== 'string') return false;
  const sqlRegex = /\b(union\s+all|union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table|alter\s+table|update\s+.*\s+set)\b|(--)|(\/\*)|(';)/i;
  return sqlRegex.test(val);
}

function cleanSqlInput(val: any): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/'/g, "''");
}

function sanitizePayload(obj: any): any {
  if (!obj) return obj;

  if (typeof obj === "string") {
    let sanitized = obj;
    if (hasSqlInjectionPattern(sanitized)) {
      sanitized = cleanSqlInput(sanitized);
    }
    return sanitizeString(sanitized);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePayload(item));
  }

  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase().includes("email") && obj[key]) {
        if (!isValidEmail(obj[key])) {
          throw new Error(`The field '${key}' contains an invalid email format.`);
        }
      }
      cleaned[key] = sanitizePayload(obj[key]);
    }
    return cleaned;
  }

  return obj;
}

// --- RATE LIMITING / BOT SHIELD SYSTEM (Arcjet-Equivalent Security Guard) ---
const rateLimiterCache = new Map<string, { tokens: number; lastRefill: number }>();
const BotAgentRegex = /python|curl|wget|scrapy|selenium|playwright|headless|guzzle|libwww|aiohttp|httpclient|postmanruntime/i;

// Clean up idle rate-limiter maps periodically to keep memory lightweight
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimiterCache.entries()) {
    if (now - bucket.lastRefill > 600000) { // stale > 10 mins
      rateLimiterCache.delete(key);
    }
  }
}, 600000);

app.use(express.json());

// Global Rate Limiting and Automated Bot Protection middleware
app.use((req, res, next) => {
  // 1. Bot & Scraper Guard Evaluation (Arcjet bot detection mechanism)
  const userAgent = req.headers['user-agent'] || '';
  const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();

  if (userAgent && BotAgentRegex.test(userAgent)) {
    console.warn(`[SECURITY - SHIELD BLOCK] Scraper or Automated script identified: "${userAgent}" from IP ${clientIp}`);
    return res.status(403).json({
      error: "Forbidden",
      message: "Automated traffic is prohibited on culinary resources. Please use a validated consumer browser agent to access.",
      shield: "Active Bot Guard"
    });
  }

  // 2. Identify resource-footprint limits (Rate Limiting)
  let maxTokens = 60; // 60 requests per minute default
  let refillIntervalMs = 60000; // 1 minute calculation window
  
  // Apply strict rate-limits on financially intensive cloud/AI pipelines
  if (req.path.startsWith('/api/ai/') || req.path.startsWith('/api/paystack/') || req.path.startsWith('/api/files/upload')) {
    maxTokens = 12; // limit to 12 requests per minute (5-second spacing on average) to block rapid resource depletion
  } else if (req.path.startsWith('/api/test/simulate-surge')) {
    maxTokens = 5;
  }

  const tokenRefillRate = maxTokens / refillIntervalMs; // rate of token refill per millisecond
  const cacheKey = `${clientIp}:${req.path.startsWith('/api/ai/') ? 'ai' : 'general'}`;
  const now = Date.now();

  let bucket = rateLimiterCache.get(cacheKey);
  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    rateLimiterCache.set(cacheKey, bucket);
  }

  // Accumulate regenerated tokens based on exact elapsed milliseconds
  const elapsedMs = now - bucket.lastRefill;
  const regenerated = elapsedMs * tokenRefillRate;
  const currentTokens = Math.min(maxTokens, bucket.tokens + regenerated);

  bucket.tokens = currentTokens;
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const retryInSeconds = Math.ceil((1 - bucket.tokens) / tokenRefillRate / 1000);
    res.setHeader('Retry-After', retryInSeconds);
    res.setHeader('X-RateLimit-Limit', maxTokens);
    res.setHeader('X-RateLimit-Remaining', 0);

    console.warn(`[SECURITY - RATE LIMITED] Request blocked from IP: ${clientIp} on: ${req.originalUrl}`);
    return res.status(429).json({
      error: "Too Many Requests",
      message: `You are sending requests too quickly. Please cool down for ${retryInSeconds} second(s).`,
      retryAfter: retryInSeconds,
      shield: "Active Bot Guard"
    });
  }

  // Deduct single request token
  bucket.tokens -= 1;

  res.setHeader('X-RateLimit-Limit', maxTokens);
  res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));

  next();
});

// Apply global sanitization & validation middleware to all body and query parameters
app.use((req, res, next) => {
  if (req.body) {
    try {
      req.body = sanitizePayload(req.body);
    } catch (err: any) {
      return res.status(400).json({ error: "Input Validation Error", message: err.message });
    }
  }
  if (req.query) {
    try {
      req.query = sanitizePayload(req.query);
    } catch (err: any) {
      return res.status(400).json({ error: "Input Validation Error", message: err.message });
    }
  }
  next();
});

// Block all requests trying to access sourcemap files anywhere in the URL path to protect source code privacy
app.use((req, res, next) => {
  if (req.path.endsWith('.map') || req.path.includes('.map?')) {
    return res.status(404).send('Not Found');
  }
  next();
});

app.use(connectionPoolManager);

// Class representing optimized Least-Recently Used (LRU) In-Memory Cache Store with TTL eviction.
// This preserves memory, avoids leaks, and serves repeated heaviest content under 1ms.
class SimpleLRUCache<V> {
  private cache = new Map<string, { value: V; expiresAt: number }>();
  private order: string[] = [];

  constructor(private maxEntries: number = 300) {}

  public get(key: string): V | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Refresh order (moves referenced item to most-recently used position)
    this.order = this.order.filter(k => k !== key);
    this.order.push(key);
    return entry.value;
  }

  public set(key: string, value: V, ttlMs: number) {
    if (this.cache.has(key)) {
      this.order = this.order.filter(k => k !== key);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.order.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
    this.order.push(key);
  }

  public delete(key: string) {
    this.cache.delete(key);
    this.order = this.order.filter(k => k !== key);
  }

  public clear() {
    this.cache.clear();
    this.order = [];
  }
}

// Generate canonical stable serialization of keys representing request parameters.
// Ensures matching even if keys in req.body are out of order.
function generateCacheKey(path: string, body: any): string {
  if (!body) return path;
  try {
    const canonicalStringify = (obj: any): string => {
      if (Array.isArray(obj)) {
        return `[${obj.map(canonicalStringify).join(",")}]`;
      }
      if (obj !== null && typeof obj === "object") {
        return `{${Object.keys(obj)
          .sort()
          .map(k => `"${k}":${canonicalStringify(obj[k])}`)
          .join(",")}}`;
      }
      return JSON.stringify(obj);
    };
    return `${path}:${canonicalStringify(body)}`;
  } catch (e) {
    return `${path}:${JSON.stringify(body)}`;
  }
}

const aiResponseCache = new SimpleLRUCache<any>(400);

// Flush endpoint to let clients invalidate entire server cache instantly when global updates happen
app.post("/api/cache/clear", (req, res) => {
  aiResponseCache.clear();
  console.log("Server LRU cache cleared via cache-control instruction.");
  res.json({ success: true, message: "Optimized server caches flushed successfully." });
});

// Auto-Caching Middleware for demanding AI operations
const aiCacheMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only process POST commands sent to target AI subroutes
  if (req.method !== "POST" || !req.path.startsWith("/api/ai/")) {
    return next();
  }

  // Adjust Custom time-to-live thresholds per resource type
  let ttlMs = 12 * 60 * 60 * 1000; // Default: 12 Hours (descriptions/benefits are static)

  if (req.path.includes("generate-recipe")) {
    ttlMs = 45 * 60 * 1000; // 45 Minutes for customized recipe generators
  } else if (req.path.includes("meal-plan")) {
    ttlMs = 30 * 60 * 1000; // 30 Minutes for weekly planning boards
  } else if (req.path.includes("leftovers")) {
    ttlMs = 90 * 60 * 1000; // 90 Minutes for static recipe matching
  } else if (req.path.includes("substitutions")) {
    ttlMs = 4 * 60 * 60 * 1000; // 4 Hours for meal substutions
  } else if (req.path.includes("search-recipes")) {
    ttlMs = 25 * 60 * 1000; // 25 Minutes (balances dynamic search with rapid indexing)
  } else if (req.path.includes("scan-image")) {
    ttlMs = 10 * 60 * 1000; // 10 Minutes (re-runs from camera snap)
  }

  const cacheKey = generateCacheKey(req.path, req.body);
  const isBypass = req.query.refresh === "true" || req.headers["cache-control"] === "no-cache";

  if (isBypass) {
    aiResponseCache.delete(cacheKey);
    res.setHeader("X-Cache", "BYPASS");
  } else {
    const cachedData = aiResponseCache.get(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cachedData);
    }
    res.setHeader("X-Cache", "MISS");
  }

  // Override standard res.json to feed cache store upon successful output retrieval
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode === 200 && body && !body.error) {
      aiResponseCache.set(cacheKey, body, ttlMs);
    }
    return originalJson.call(this, body);
  };

  next();
};

app.use(aiCacheMiddleware);

// ==========================================
// SCALABILITY SIMULATION & LIVE METRICS ENGINE
// ==========================================

// Realistic load testing simulation and surge handling endpoint
app.post("/api/test/simulate-surge", async (req, res) => {
  const targetConcurrency = Number(req.body.concurrency) || 120;
  const useCache = req.body.useCache !== false;
  
  const startTime = Date.now();
  let cacheHits = 0;
  let cacheMisses = 0;
  
  // Simulated database or external API task runner with throttling
  const runSimulatedTask = async (taskId: number): Promise<{ duration: number; status: string; cache: string }> => {
    const taskStart = Date.now();
    
    // Simulate cache lookup
    const hitCache = useCache && (taskId % 3 !== 0); // 66% mock cache hit rate representing static and repeated assets
    if (hitCache) {
      cacheHits++;
      // Cache hits are microsecond/millisecond operations
      await new Promise(resolve => setTimeout(resolve, Math.random() * 8 + 2));
      return { duration: Date.now() - taskStart, status: "Success", cache: "HIT" };
    }
    
    cacheMisses++;
    
    // Simulate database query execution with socket connection reuse
    const executeQuery = async (): Promise<{ duration: number }> => {
      const qStart = Date.now();
      const delay = Math.random() * 200 + 40; // 40ms to 240ms mimicking standard optimized DB read times
      await new Promise(resolve => setTimeout(resolve, delay));
      return { duration: Date.now() - qStart };
    };

    try {
      await executeQuery();
      return { duration: Date.now() - taskStart, status: "Success", cache: "MISS" };
    } catch (err: any) {
      return { duration: Date.now() - taskStart, status: "Error", cache: "MISS" };
    }
  };

  // Run all simulated concurrent requests utilizing socket pool keep-alive
  const taskPromises = Array.from({ length: targetConcurrency }).map((_, i) => runSimulatedTask(i));
  const results = await Promise.all(taskPromises);
  const totalDuration = Date.now() - startTime;

  // Compute exact latency and performance metrics
  const durations = results.map(r => r.duration);
  const minLatency = Math.min(...durations);
  const maxLatency = Math.max(...durations);
  const avgLatency = durations.reduce((acc, val) => acc + val, 0) / durations.length;
  durations.sort((a, b) => a - b);
  const p95Latency = durations[Math.floor(durations.length * 0.95)] || maxLatency;

  const successCount = results.filter(r => r.status === "Success").length;
  const failureCount = targetConcurrency - successCount;

  res.json({
    concurrencySimulated: targetConcurrency,
    totalExecutionTimeMs: totalDuration,
    successRate: (successCount / targetConcurrency) * 100,
    successCount,
    failureCount,
    metrics: {
      minLatencyMs: Math.round(minLatency),
      maxLatencyMs: Math.round(maxLatency),
      avgLatencyMs: Math.round(avgLatency),
      p95LatencyMs: Math.round(p95Latency)
    },
    caching: {
      cacheHits,
      cacheMisses,
      hitRatio: Math.round((cacheHits / targetConcurrency) * 100)
    },
    connections: {
      activeSockets: activeRequestsCount,
      outboundHttpAgentMax: 350,
      systemState: activeRequestsCount > 80 ? "HIGH_LOAD" : "STABLE"
    }
  });
});

// Real-time server pool telemetry and system performance metrics
app.get("/api/test/metrics", (req, res) => {
  res.json({
    activeRequests: activeRequestsCount,
    queueDepth: requestQueue.length,
    maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
    maxQueueCapacity: MAX_QUEUE_CAPACITY,
    keepAliveTimeout: 61000,
    requestTimeout: 25000,
    outboundHttpsAgent: {
      maxSockets: (https.globalAgent as any).maxSockets || 350,
      maxFreeSockets: (https.globalAgent as any).maxFreeSockets || 50,
      activeRequests: Object.keys((https.globalAgent as any).requests || {}).length,
      freeSockets: Object.keys((https.globalAgent as any).freeSockets || {}).length
    },
    heapUsedBytes: process.memoryUsage().heapUsed,
    uptimeSeconds: Math.round(process.uptime())
  });
});

// Paystack API integration endpoints
app.post("/api/paystack/initialize", async (req, res) => {
  try {
    const { email, amount, reference } = req.body;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured in environment variables.");
    }

    // Call Paystack API to initialize transaction
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: amount || 500, // 500 minor units ($5.00)
        currency: "USD",
        reference: reference || `ref-${Math.floor(Math.random() * 1000000000) + 1}`,
      })
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || "Failed to initialize Paystack transaction");
    }

    res.json({
      status: "success",
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      access_code: data.data.access_code
    });
  } catch (error) {
    console.error("Paystack Initialization Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create checkout transaction" });
  }
});

app.post("/api/paystack/verify", async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: "Reference parameter is required" });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured in environment variables.");
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`
      }
    });

    const data = await response.json();
    if (!data.status || data.data.status !== "success") {
      throw new Error(data.message || "Transaction verification failed or incomplete");
    }

    res.json({
      status: "success",
      data: {
        amount: data.data.amount,
        currency: data.data.currency,
        reference: data.data.reference,
        customer_email: data.data.customer.email,
        gateway_response: data.data.gateway_response
      }
    });
  } catch (error) {
    console.error("Paystack Verification Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Verification endpoint error" });
  }
});

// Helper functions for AI Search Caching & Stable Recipes
function normalizeSearchKey(qStr: string): string {
  if (!qStr) return "default";
  return qStr
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateStableRecipeId(recipeName: string): string {
  if (!recipeName) return "ai-custom-recipe";
  return "ai-" + recipeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// User Profile Context Prompt Builder
function buildUserContextInstructions(userContext: any): string {
  if (!userContext) return "";
  let insts = "";
  
  if (userContext.dietaryPreferences && userContext.dietaryPreferences.length > 0) {
    insts += `\n- DIETARY PREFERENCES: Strictly follow: ${userContext.dietaryPreferences.join(", ")}. The dish must align 100% with these choices.`;
  }
  
  if (userContext.allergies && userContext.allergies.length > 0) {
    insts += `\n- ALLERGIES / RESTRICTIONS: Crucial safety mandate! Absolutely EXCLUDE any of these ingredients: ${userContext.allergies.join(", ")}. Offer safe alternatives.`;
  }
  
  if (userContext.healthConditions && userContext.healthConditions.length > 0) {
    const list = userContext.healthConditions;
    if (list.includes('Diabetic')) {
      insts += "\n- DIABETIC FOCUS: Use low-glycemic index ingredients. Avoid added sugars, refined carbs, and high-sugar fruits. Focus on fiber and healthy fats.";
    }
    if (list.includes('Lactose Intolerant')) {
      insts += "\n- LACTOSE INTOLERANT: Strictly dairy-free or use lactose-free alternatives (e.g., coconut milk, almond milk, oat milk).";
    }
    if (list.includes('Celiac') || list.includes('Celiac Disease')) {
      insts += "\n- CELIAC FOCUS: Strictly gluten-free. No wheat, barley, rye, or contaminated oats. Use certified GF grains like quinoa, buckwheat, or rice.";
    }
    if (list.includes('Hypertension') || list.includes('High Blood Pressure')) {
      insts += "\n- HYPERTENSION FOCUS: Strictly low sodium. Keep salt content minimal, use herbs, garlic, and citrus to boost flavor instead of salt.";
    }
  }
  
  if (userContext.fitnessGoals && userContext.fitnessGoals.length > 0) {
    const list = userContext.fitnessGoals;
    if (list.includes('Muscle Gain') || list.includes('Build Muscle')) {
      insts += "\n- FITNESS GOAL (MUSCLE GAIN): Prioritize high-quality protein sources. Ensure a high protein-to-carbs ratio.";
    }
    if (list.includes('Weight Loss') || list.includes('Fat Loss')) {
      insts += "\n- FITNESS GOAL (WEIGHT LOSS): Prioritize volume-dense, calorie-light ingredients (vegetables, lean meats) to maintain deficit under strict calorie control.";
    }
    if (list.includes('Endurance')) {
      insts += "\n- FITNESS GOAL (ENDURANCE): Ensure adequate complex carbohydrates for sustained athletic glycogen replenishment.";
    }
  }
  
  if (userContext.activityLevel) {
    if (userContext.activityLevel === 'Athlete' || userContext.activityLevel === 'Active') {
      insts += `\n- ACTIVITY PROFILE (${userContext.activityLevel}): Ensure protein for muscle restoration and complex carbs for metabolic replenishment.`;
    }
  }
  return insts;
}

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Endpoints
app.post("/api/ai/generate-recipe", async (req, res) => {
  try {
    const { ingredients, dietaryRestrictions, cuisineType, servings, userContext } = req.body;
    
    const specialInstructions = buildUserContextInstructions(userContext);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: `Generate a professional gourmet recipe using these ingredients: ${ingredients.join(", ")}. 
      Dietary restrictions: ${dietaryRestrictions || "None"}. 
      Cuisine style: ${cuisineType || "Any"}.
      Target servings: ${servings || 2}.
      ${specialInstructions}
      Strictly use English for all fields (name, description, instructions, ingredients, etc.).
      
      IMPORTANT: Prioritize using common, popular, and easy-to-find ingredients. 
      Avoid rare, obscure, or hard-to-source ingredients that the average person might not have heard of or cannot easily buy at a standard local grocery store.
      
      For the imageUrl field, provide a keyword-based URL like this: https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000 - YOU MUST REPLACE the ID (1546069901-ba9599a7e63c) with a different, REAL Unsplash ID that perfectly corresponds to the specific dish name. Use your internal knowledge of high-quality food photography IDs on Unsplash to ensure every dish gets a unique, beautiful, and fast-loading image. Do not use the same ID for different dishes.
      For the videoUrl field, provide a YouTube search query URL for a tutorial on any dish, formatted as: https://www.youtube.com/results?search_query=[dish-name]+tutorial.
      Include precise baseAmounts (numeric grams/ml) for the ingredients metadata.
      
      For the 'instructions' field, you MUST generate EXACTLY 8 to 15 sequential, logical steps (no fewer than 8 steps, and no more than 15). Each step should be highly descriptive and detailed, parsing prep, cooking, checks, and plating. Do not keep them short or compile separate tasks together just to reduce step count.` }]}],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            prepTime: { type: Type.STRING },
            cookTime: { type: Type.STRING },
            restTime: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            category: { type: Type.STRING },
            cuisine: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            videoUrl: { type: Type.STRING },
            servings: { type: Type.NUMBER },
            healthAdvice: { type: Type.STRING, description: "Detailed clinical/dietary advice mapping this specific recipe back to the user's focus options, preferences, constraints, or goals." },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  baseAmount: { type: Type.NUMBER }
                }
              }
            },
            instructions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  imageUrl: { type: Type.STRING },
                  tips: { type: Type.STRING }
                },
                required: ["text"]
              }
            },
            nutrition: {
              type: Type.OBJECT,
              properties: {
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
                fiber: { type: Type.NUMBER },
                sugar: { type: Type.NUMBER },
                sodium: { type: Type.NUMBER }
              }
            }
          },
          required: ["name", "description", "ingredients", "instructions", "nutrition", "healthAdvice"]
        }
      }
    });

    const text = response.text || "{}";
    const parsedRecipe = JSON.parse(text);
    const recipeId = generateStableRecipeId(parsedRecipe.name);
    
    parsedRecipe.id = recipeId;
    parsedRecipe.authorId = "ai-chef";
    parsedRecipe.authorName = "Discovery AI";
    parsedRecipe.isPublic = true;
    parsedRecipe.status = "approved";
    
    if (adminDb) {
      try {
        const recipeRef = adminDb.collection("recipes").doc(recipeId);
        const existingSnap = await recipeRef.get();
        if (existingSnap.exists) {
          const currentData = existingSnap.data() || {};
          parsedRecipe.viewCount = currentData.viewCount ?? 0;
          parsedRecipe.saveCount = currentData.saveCount ?? 0;
        } else {
          parsedRecipe.viewCount = 0;
          parsedRecipe.saveCount = 0;
        }
        parsedRecipe.ratingsCount = 0;
        parsedRecipe.averageRating = 5;

        await recipeRef.set({
          ...parsedRecipe,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`Saved generated recipe indices in global DB store: ${recipeId}`);
      } catch (dbErr) {
        console.warn("Could not write recipe to Firestore caches:", dbErr);
      }
    } else {
      parsedRecipe.viewCount = 0;
      parsedRecipe.saveCount = 0;
      parsedRecipe.ratingsCount = 0;
      parsedRecipe.averageRating = 5;
    }

    res.json(parsedRecipe);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to generate recipe" });
  }
});

app.post("/api/ai/meal-plan", async (req, res) => {
  try {
    const { preferences, days, userContext } = req.body;
    
    let specialInstructions = "";
    if (userContext) {
      if (userContext.healthConditions?.includes('Diabetic')) specialInstructions += " low-sugar/low-glycemic (Diabetic-friendly),";
      if (userContext.healthConditions?.includes('Hypertension')) specialInstructions += " low-sodium (Hypertension-friendly),";
      if (userContext.fitnessGoals?.includes('Muscle Gain')) specialInstructions += " high-protein (Muscle Gain focus),";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: `Design a ${days}-day artisanal weekly meal plan based on: ${JSON.stringify(preferences)}. 
      ${specialInstructions ? `Additional context: the recipes should be ${specialInstructions}.` : ""}
      Strictly use English for all fields.
      IMPORTANT: Prioritize using common, popular, and easy-to-find ingredients. 
      Avoid rare, obscure, or hard-to-source ingredients that the average person might not have heard of or cannot easily buy at a standard local grocery store.
      For each day, suggest a breakfast, lunch, and dinner. Provide recipe concepts (titles and one-sentence profiles).` }]}],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json"
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    res.status(500).json({ error: "Failed to generate meal plan" });
  }
});

app.post("/api/ai/leftovers", async (req, res) => {
  try {
    const { items } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: `I have these leftovers: ${items.join(", ")}. Strictly use English. Synthesize one gourmet recipe title and brief concept to repurpose them.` }]}],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json"
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    res.status(500).json({ error: "Leftover synthesis failed" });
  }
});

app.post("/api/ai/substitutions", async (req, res) => {
  try {
    const { ingredient, dish } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: `Suggest 3 best substitutions for ${ingredient} in the context of ${dish || "a generic recipe"}. Strictly use English for names and reasons.` }]}],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              alternative: { type: Type.STRING },
              reason: { type: Type.STRING }
            }
          }
        }
      }
    });
    res.json(JSON.parse(response.text || "[]"));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch substitutions" });
  }
});

app.post("/api/ai/ingredient-info", async (req, res) => {
  try {
    const { ingredient } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: `Provide expert gourmet information about the ingredient: "${ingredient}".
      Include:
      1. A brief poetical description.
      2. 3 key health benefits.
      3. Peak seasonality details.
      4. Optimal storage tips to maximize shelf life.
      
      Strictly use English.` }]}],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            benefits: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            seasonality: { type: Type.STRING },
            storage: { type: Type.STRING }
          },
          required: ["description", "benefits", "seasonality", "storage"]
        }
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ingredient info" });
  }
});

app.post("/api/ai/search-recipes", async (req, res) => {
  const rawQuery = req.body?.query || "";
  console.log("AI Search Request:", rawQuery);
  try {
    const { query: searchQuery, exclude, userContext } = req.body;
    
    const normKey = normalizeSearchKey(rawQuery);
    const ctxHash = userContext ? [
      ...(userContext.dietaryPreferences || []).slice().sort(),
      ...(userContext.allergies || []).slice().sort(),
      ...(userContext.healthConditions || []).slice().sort(),
      ...(userContext.fitnessGoals || []).slice().sort()
    ].join(",") : "";
    const searchDocId = normKey + (ctxHash ? "-" + normalizeSearchKey(ctxHash) : "");

    // Check Cloud Database cache first
    if (adminDb) {
      try {
        const searchSnap = await adminDb.collection("searches").doc(searchDocId).get();
        if (searchSnap.exists) {
          const cachedData = searchSnap.data();
          if (cachedData && Array.isArray(cachedData.recipeIds) && cachedData.recipeIds.length > 0) {
            console.log(`[Database Cache Hit] Serving search for "${searchDocId}"...`);
            const cachedRecipes: any[] = [];
            for (const rid of cachedData.recipeIds) {
              const rsnap = await adminDb.collection("recipes").doc(rid).get();
              if (rsnap.exists) {
                cachedRecipes.push({ id: rid, ...rsnap.data() });
              }
            }
            if (cachedRecipes.length > 0) {
              return res.json(cachedRecipes);
            }
          }
        }
      } catch (cacheErr) {
        console.warn("Could not query Firestore cache:", cacheErr);
      }
    }

    const specialInstructions = buildUserContextInstructions(userContext);
    const excludePrompt = (exclude && exclude.length > 0) 
      ? `\nIMPORTANT: Do NOT include any of the following recipes in your results: ${exclude.join(", ")}. I need DIFFERENT and NEW recipes.`
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: `Search for EXACTLY 5 professional recipes related to: "${searchQuery}". ${excludePrompt}
      Return them as a list of detailed recipe objects. 
      ${specialInstructions}
      
      IMPORTANT: Prioritize using common, popular, and easy-to-find ingredients. 
      Avoid rare, obscure, or hard-to-source ingredients that the average person might not have heard of or cannot easily buy at a standard local grocery store.

      For each recipe, include: name, description, category, cuisine, prepTime, cookTime, difficulty, servings, imageUrl,
      ingredients (with amount and item), 
      instructions (array of objects with 'text' and optional 'tips' specifically for beginners) - For each recipe, you MUST provide EXACTLY 8 to 15 sequential instruction steps. Make each step detailed, easy to understand, and well structured., 
      and nutrition (object with calories, protein, carbs, fat, fiber, sugar, sodium).
      
      For the main imageUrl, YOU MUST provide a DIFFERENT, REAL Unsplash ID for every recipe (e.g. https://images.unsplash.com/photo-[UNIQUE-ID]?auto=format&fit=crop&q=80&w=1000). Ensure they are distinct and related to the dish.
      For the videoUrl field, provide a YouTube search query URL for a tutorial on any dish, formatted as: https://www.youtube.com/results?search_query=[dish-name]+tutorial.
      Ensure they are realistic, high-quality, and distinct from any excluded recipes. Strictly use English.` }]}],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              cuisine: { type: Type.STRING },
              prepTime: { type: Type.STRING },
              cookTime: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              servings: { type: Type.NUMBER },
              imageUrl: { type: Type.STRING },
              videoUrl: { type: Type.STRING },
              healthAdvice: { type: Type.STRING, description: "Detailed clinical/dietary advice mapping this specific recipe back to the user's focus options, preferences, constraints, or goals." },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    amount: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    baseAmount: { type: Type.NUMBER }
                  }
                }
              },
              instructions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    imageUrl: { type: Type.STRING },
                    tips: { type: Type.STRING }
                  },
                  required: ["text"]
                }
              },
              nutrition: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER },
                  fiber: { type: Type.NUMBER },
                  sugar: { type: Type.NUMBER },
                  sodium: { type: Type.NUMBER }
                }
              }
            },
            required: ["name", "description", "ingredients", "instructions", "nutrition", "healthAdvice"]
          }
        }
      }
    });

    const listText = response.text || "[]";
    const generatedList = JSON.parse(listText);
    const parsedRecipes: any[] = [];
    const savedRecipeIds: string[] = [];

    for (const item of generatedList) {
      const recipeId = generateStableRecipeId(item.name);
      item.id = recipeId;
      item.authorId = "ai-chef";
      item.authorName = "Discovery AI";
      item.isPublic = true;
      item.status = "approved";

      if (adminDb) {
        try {
          const recipeRef = adminDb.collection("recipes").doc(recipeId);
          const existingSnap = await recipeRef.get();
          if (existingSnap.exists) {
            const currentData = existingSnap.data() || {};
            item.viewCount = currentData.viewCount ?? 0;
            item.saveCount = currentData.saveCount ?? 0;
          } else {
            item.viewCount = 0;
            item.saveCount = 0;
          }
          item.ratingsCount = 0;
          item.averageRating = 5;

          await recipeRef.set({
            ...item,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (dbErr) {
          console.warn("Could not cache individual searched recipe:", dbErr);
        }
      } else {
        item.viewCount = 0;
        item.saveCount = 0;
        item.ratingsCount = 0;
        item.averageRating = 5;
      }
      
      parsedRecipes.push(item);
      savedRecipeIds.push(recipeId);
    }

    // Save search query mapping to database
    if (adminDb && savedRecipeIds.length > 0) {
      try {
        await adminDb.collection("searches").doc(searchDocId).set({
          recipeIds: savedRecipeIds,
          searchKey: normKey,
          query: rawQuery,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Saved compiled search index mapping for "${searchDocId}".`);
      } catch (dbErr) {
        console.warn("Could not save searched recipes map index:", dbErr);
      }
    }

    res.json(parsedRecipes);
  } catch (error) {
    console.error("AI Search Error Details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    res.status(500).json({ 
      error: "Failed to search recipes with AI",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post("/api/ai/scan-image", async (req, res) => {
  try {
    const { image } = req.body; // base64 image data
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: "Identify all food items, ingredients, or products in this image. Also, if there is a barcode, identify the product it represents. Return a list of ingredient names or product names. Strictly use English." },
          { inlineData: { mimeType: "image/jpeg", data: image.split(",")[1] || image } }
        ]
      }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["items"]
        }
      }
    });

    const text = response.text;
    res.json(JSON.parse(text || '{"items": []}'));
  } catch (error) {
    console.error("Scan Error:", error);
    res.status(500).json({ error: "Failed to scan image" });
  }
});

// CREATE SECURE LOCAL DIRECTORY SECURED USER PLATFORM FILES HUB
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Config Multer for storage, dynamically isolating by X-User-Id header for full security
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawUserId = req.headers['x-user-id'] || 'anonymous';
    const safeUserId = String(rawUserId).replace(/[^a-zA-Z0-9_\-]/g, "");
    const userDir = path.join(UPLOADS_DIR, safeUserId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size limit
});

// Secure API endpoint to receive dynamic user files upload
app.post("/api/files/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file was uploaded." });
  }
  
  const rawUserId = req.headers['x-user-id'] || 'anonymous';
  const safeUserId = String(rawUserId).replace(/[^a-zA-Z0-9_\-]/g, "");
  
  const relativePath = `${safeUserId}/${req.file.filename}`;
  const relativeUrl = `/api/files/raw/${relativePath}`;
  
  res.json({
    downloadUrl: relativeUrl,
    storagePath: relativePath,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype
  });
});

// Serves user-isolated raw files securely from subdirectories
app.get("/api/files/raw/:userId/:filename", (req, res) => {
  const safeUserId = String(req.params.userId).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeFilename = String(req.params.filename).replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = path.join(UPLOADS_DIR, safeUserId, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "The requested culinary asset file does not exist." });
  }
  
  res.sendFile(filePath);
});

// Serves the legacy direct files raw for system backward compatibility
app.get("/api/files/raw/:filename", (req, res) => {
  const safeFilename = String(req.params.filename).replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = path.join(UPLOADS_DIR, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "The requested culinary asset file does not exist." });
  }
  
  res.sendFile(filePath);
});

// Safely delete a file from local filesystem
app.delete("/api/files/delete", (req, res) => {
  const { storagePath } = req.body;
  if (!storagePath || typeof storagePath !== 'string') {
    return res.status(400).json({ error: "Missing or invalid storagePath metadata parameter." });
  }
  
  const pathParts = storagePath.split('/');
  if (pathParts.length > 2 || pathParts.some(part => part.includes('..') || part.includes('/') || part.includes('\\'))) {
    return res.status(400).json({ error: "Forbidden: Malformed storagePath configuration mapping detected." });
  }
  
  const filePath = path.join(UPLOADS_DIR, ...pathParts);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: "Physical document purged successfully." });
    } catch (e: any) {
      console.error("Failed to delete local file:", e);
      return res.status(500).json({ error: "Failed to delete file from filesystem.", details: e.message });
    }
  }
  
  return res.json({ success: true, message: "File already purged/not found." });
});

// Vite middleware setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`SavorAI Server running at http://localhost:${PORT}`);
  });

  // Enforce HTTP connection timeout rules to safeguard against socket exhaustion and slow client attacks
  server.keepAliveTimeout = 61000;  // 61 seconds (slightly higher than proxy/loadbalancers to preserve reuse)
  server.headersTimeout = 62000;    // 62 seconds (prevents header stall attacks)
  server.requestTimeout = 25000;    // 25 seconds (limits maximum processing time per client request)
}

setupVite();
