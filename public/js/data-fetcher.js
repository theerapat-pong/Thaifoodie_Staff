// ========================================
// Data Fetcher powered by TanStack Query Core
// Provides SWR-like caching for LIFF SPA
// ========================================

(function attachDataFetcher(global) {
    const queryLib = global.TanStackQueryCore;
    if (!queryLib) {
        console.warn('[DataFetcher] TanStack Query Core not found. Caching disabled.');
        return;
    }

    const { QueryClient } = queryLib;

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                gcTime: 5 * 60 * 1000,
                retry: 1,
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
                refetchOnMount: false
            }
        }
    });

    const profileKey = () => ['user-profile', global.userId || 'anonymous'];
    const balanceKey = () => ['advance-balance', global.userId || 'anonymous'];
    const todayKey = () => ['attendance-today', global.userId || 'anonymous'];

    const DataFetcher = {
        queryClient,
        getCached(queryKey) {
            return queryClient.getQueryData(queryKey);
        },
        invalidate(queryKey) {
            return queryClient.invalidateQueries({ queryKey, exact: true });
        },
        clear() {
            queryClient.clear();
        },
        getUserProfile(options = {}) {
            return queryClient.ensureQueryData({
                queryKey: profileKey(),
                queryFn: ({ signal }) => UserAPI.getProfile({ signal }),
                staleTime: 2 * 60 * 1000,
                gcTime: 10 * 60 * 1000,
                ...options
            });
        },
        getBalance(options = {}) {
            return queryClient.ensureQueryData({
                queryKey: balanceKey(),
                queryFn: ({ signal }) => AdvanceAPI.getBalance({ signal }),
                staleTime: 90 * 1000,
                gcTime: 10 * 60 * 1000,
                ...options
            });
        },
        getTodaySummary(options = {}) {
            return queryClient.ensureQueryData({
                queryKey: todayKey(),
                queryFn: ({ signal }) => AttendanceAPI.getToday({ signal }),
                staleTime: 30 * 1000,
                gcTime: 5 * 60 * 1000,
                ...options
            });
        },
        getCachedProfile() {
            return queryClient.getQueryData(profileKey());
        },
        getCachedBalance() {
            return queryClient.getQueryData(balanceKey());
        },
        getCachedToday() {
            return queryClient.getQueryData(todayKey());
        }
    };

    global.DataFetcher = DataFetcher;
})(window);
