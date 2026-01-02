/**
 * ApiClient - Intelligent API Client for Creaty
 * Features:
 * - Exponential Backoff for 429 and 5xx errors
 * - Client-side Caching (GET requests)
 * - Request Deduplication (prevents identical inflight requests)
 * - Rate Limiting Queue
 */

const ApiClient = (function () {
    const cache = new Map();
    const inflightRequests = new Map();
    let isPaused = false;
    let pauseTimer = null;

    const CACHE_DURATION = 60000; // 60 seconds
    const MAX_RETRIES = 3;
    const INITIAL_BACKOFF = 1000;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Internal fetch with retry and backoff
     */
    async function fetchWithRetry(url, options = {}, retryCount = 0) {
        try {
            // Check for paused status (rate limited)
            while (isPaused) {
                await sleep(1000);
            }

            const response = await fetch(url, options);

            // Handle Rate Limiting (429)
            if (response.status === 429) {
                console.warn(`[ApiClient] 429 Too Many Requests hit for ${url}. Pausing queue.`);

                const retryAfter = parseInt(response.headers.get('Retry-After')) || (INITIAL_BACKOFF * Math.pow(2, retryCount));

                if (!isPaused) {
                    isPaused = true;
                    clearTimeout(pauseTimer);
                    pauseTimer = setTimeout(() => {
                        isPaused = false;
                        console.log('[ApiClient] Queue resumed.');
                    }, retryAfter);
                }

                if (retryCount < MAX_RETRIES) {
                    await sleep(retryAfter);
                    return fetchWithRetry(url, options, retryCount + 1);
                }
            }

            // Handle Server Errors (5xx)
            if (response.status >= 500 && retryCount < MAX_RETRIES) {
                const delay = INITIAL_BACKOFF * Math.pow(2, retryCount);
                console.warn(`[ApiClient] Server error ${response.status}. Retrying in ${delay}ms...`);
                await sleep(delay);
                return fetchWithRetry(url, options, retryCount + 1);
            }

            return response;
        } catch (error) {
            if (retryCount < MAX_RETRIES) {
                const delay = INITIAL_BACKOFF * Math.pow(2, retryCount);
                console.warn(`[ApiClient] Network error: ${error.message}. Retrying in ${delay}ms...`);
                await sleep(delay);
                return fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    return {
        /**
         * Enhanced fetch
         * @param {string} url 
         * @param {object} options 
         * @param {object} config { useCache: boolean }
         */
        async fetch(url, options = {}, config = { useCache: true }) {
            const method = options.method || 'GET';
            const cacheKey = `${method}:${url}:${JSON.stringify(options.body || '')}`;

            // 1. Check Cache
            if (method === 'GET' && config.useCache) {
                const cached = cache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                    console.log(`[ApiClient] Cache hit: ${url}`);
                    return cached.response.clone();
                }
            }

            // 2. Deduplicate inflight requests
            if (method === 'GET') {
                if (inflightRequests.has(cacheKey)) {
                    console.log(`[ApiClient] Deduplicating request: ${url}`);
                    const response = await inflightRequests.get(cacheKey);
                    return response.clone();
                }
            }

            // 3. Execute request
            const requestPromise = fetchWithRetry(url, options);
            if (method === 'GET') {
                inflightRequests.set(cacheKey, requestPromise);
            }

            try {
                const response = await requestPromise;

                // 4. Update Cache
                if (method === 'GET' && response.ok) {
                    cache.set(cacheKey, {
                        response: response.clone(),
                        timestamp: Date.now()
                    });
                }

                return response;
            } finally {
                if (method === 'GET') {
                    inflightRequests.delete(cacheKey);
                }
            }
        },

        // Shorthand for fetchWithRetry if needed directly
        fetchWithRetry
    };
})();

// Global fetchWithRetry fallback for legacy code
window.fetchWithRetry = ApiClient.fetch;
