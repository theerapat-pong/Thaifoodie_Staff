// ========================================
// Main App - SPA Entry Point
// ========================================

/**
 * Initialize the SPA application
 */
async function initializeApp() {
    console.log('[App] Initializing SPA...');
    
    try {
        // Register all routes
        console.log('[App] Registering routes...');
        router.register('home', HomeView);
        router.register('attendance', AttendanceView);
        router.register('check-in', CheckInView);
        router.register('check-out', CheckOutView);
        router.register('leave', LeaveView);
        router.register('advance', AdvanceView);
        router.register('balance', BalanceView);
        router.register('cancel', CancelView);
        router.register('admin', AdminView);
        router.register('settings', SettingsView);
        router.register('history', HistoryView);
        router.register('employees', EmployeesView);  // Admin - จัดการพนักงาน
        router.register('work-location', WorkLocationView);  // Admin - ตั้งค่าตำแหน่งร้าน
        router.register('health-status', HealthStatusView);  // System Monitor - Health Status
        router.register('system-logs', SystemLogsView);  // System Monitor - Logs (DEV only)
        console.log('[App] Routes registered:', router.routes.size);
        
        // Handle legacy URLs (redirect old MPA paths to hash routes)
        handleLegacyUrls();
        
        // Initialize router
        console.log('[App] Initializing router...');
        router.init('app-container');
        
        console.log('[App] SPA initialized successfully');
    } catch (error) {
        console.error('[App] Initialization error:', error);
        throw error;
    }
}

/**
 * Handle legacy MPA URLs and redirect to hash routes
 */
function handleLegacyUrls() {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // If already has hash, do nothing
    if (hash && hash.length > 1) return;
    
    // Map old paths to new hash routes
    const pathMap = {
        '/check-in.html': '#check-in',
        '/check-out.html': '#check-out',
        '/attendance.html': '#attendance',
        '/leave.html': '#leave',
        '/advance.html': '#advance',
        '/balance.html': '#balance',
        '/cancel.html': '#cancel',
        '/admin.html': '#admin',
        '/status.html': '#attendance',
        '/history.html': '#history',
        '/liff.html': '#home',
        '/index.html': '#home'
    };

    const newHash = pathMap[path];
    if (newHash) {
        console.log('[App] Redirecting legacy URL:', path, '->', newHash);
        // Replace current URL without adding to history
        window.history.replaceState(null, '', '/' + newHash);
    }
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeApp, handleLegacyUrls };
}
