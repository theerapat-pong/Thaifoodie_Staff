// ========================================
// Data Fetcher - Vanilla JS Caching Layer
// Provides simple in-memory caching for LIFF SPA
// ========================================

(function attachDataFetcher(global) {
    console.log('[DataFetcher] Initializing Vanilla JS cache...');

    // Simple in-memory cache store
    const cache = new Map();
    const timestamps = new Map();

    // Cache configuration
    const CACHE_CONFIG = {
        'user-profile': { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 },
        'advance-balance': { staleTime: 90 * 1000, gcTime: 10 * 60 * 1000 },
        'attendance-today': { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 }
    };

    // Generate cache keys
    const profileKey = () => `user-profile:${global.userId || 'anonymous'}`;
    const balanceKey = () => `advance-balance:${global.userId || 'anonymous'}`;
    const todayKey = () => `attendance-today:${global.userId || 'anonymous'}`;

    // Check if cached data is still fresh
    function isFresh(key, staleTime) {
        const timestamp = timestamps.get(key);
        if (!timestamp) return false;
        return Date.now() - timestamp < staleTime;
    }

    // Garbage collection - remove old entries
    function garbageCollect() {
        const now = Date.now();
        for (const [key, timestamp] of timestamps.entries()) {
            const cacheType = key.split(':')[0];
            const config = CACHE_CONFIG[cacheType];
            if (config && now - timestamp > config.gcTime) {
                cache.delete(key);
                timestamps.delete(key);
                console.log(`[DataFetcher] GC: Removed stale cache entry: ${key}`);
            }
        }
    }

    // Run GC every 5 minutes
    setInterval(garbageCollect, 5 * 60 * 1000);

    const DataFetcher = {
        // Get cached data
        getCached(key) {
            return cache.get(key);
        },

        // Set cached data
        setCache(key, data) {
            cache.set(key, data);
            timestamps.set(key, Date.now());
        },

        // Invalidate cache entry
        invalidate(key) {
            cache.delete(key);
            timestamps.delete(key);
            console.log(`[DataFetcher] Invalidated: ${key}`);
        },

        // Clear all cache
        clear() {
            cache.clear();
            timestamps.clear();
            console.log('[DataFetcher] All cache cleared');
        },

        // Fetch user profile with caching
        async getUserProfile(options = {}) {
            const key = profileKey();
            const config = CACHE_CONFIG['user-profile'];
            
            if (!options.forceRefresh && isFresh(key, config.staleTime)) {
                const cached = cache.get(key);
                if (cached) {
                    console.log('[DataFetcher] Using cached profile');
                    return cached;
                }
            }

            console.log('[DataFetcher] Fetching fresh profile');
            const data = await UserAPI.getProfile();
            this.setCache(key, data);
            return data;
        },

        // Fetch balance with caching
        async getBalance(options = {}) {
            const key = balanceKey();
            const config = CACHE_CONFIG['advance-balance'];
            
            if (!options.forceRefresh && isFresh(key, config.staleTime)) {
                const cached = cache.get(key);
                if (cached) {
                    console.log('[DataFetcher] Using cached balance');
                    return cached;
                }
            }

            console.log('[DataFetcher] Fetching fresh balance');
            const data = await AdvanceAPI.getBalance();
            this.setCache(key, data);
            return data;
        },

        // Fetch today's attendance with caching
        async getTodaySummary(options = {}) {
            const key = todayKey();
            const config = CACHE_CONFIG['attendance-today'];
            
            if (!options.forceRefresh && isFresh(key, config.staleTime)) {
                const cached = cache.get(key);
                if (cached) {
                    console.log('[DataFetcher] Using cached today summary');
                    return cached;
                }
            }

            console.log('[DataFetcher] Fetching fresh today summary');
            const data = await AttendanceAPI.getToday();
            this.setCache(key, data);
            return data;
        },

        // Get cached profile (sync)
        getCachedProfile() {
            return cache.get(profileKey());
        },

        // Get cached balance (sync)
        getCachedBalance() {
            return cache.get(balanceKey());
        },

        // Get cached today summary (sync)
        getCachedToday() {
            return cache.get(todayKey());
        }
    };

    global.DataFetcher = DataFetcher;
    console.log('[DataFetcher] Initialized successfully');
})(window);
