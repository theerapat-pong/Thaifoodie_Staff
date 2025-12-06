// ========================================
// SPA Router for LIFF App
// Hash-based routing to prevent multiple tabs in LINE browser
// ========================================

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.currentView = null;
        this.container = null;
        this.beforeRouteChange = null;
        this.afterRouteChange = null;
        this.handleLinkClick = this.handleLinkClick.bind(this);
    }

    /**
     * Initialize router with container element
     * @param {string} containerId - ID of the container element
     */
    init(containerId) {
        console.log('[Router] Initializing with container:', containerId);
        
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('[Router] Container not found:', containerId);
            // แสดง error บนหน้าจอ
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center; color: red;">
                    <h2>Error: Container "${containerId}" not found</h2>
                </div>
            `;
            return;
        }

        console.log('[Router] Container found, setting up listeners...');

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRouteChange());
        document.addEventListener('click', this.handleLinkClick);
        
        // Handle initial route
        console.log('[Router] Handling initial route...');
        this.handleRouteChange();
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., 'home', 'check-in')
     * @param {Object} view - View object with render() method
     */
    register(path, view) {
        this.routes.set(path, view);
    }

    /**
     * Navigate to a route
     * @param {string} path - Route path
     * @param {Object} params - Optional parameters
     */
    navigate(path, params = {}) {
        // Build hash with params
        let hash = `#${path}`;
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            hash += `?${queryString}`;
        }
        const base = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', `${base}${hash}`);
        this.handleRouteChange();
    }

    /**
     * Go back to previous route or home
     */
    back() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigate('home');
        }
    }

    /**
     * Get current route info
     */
    getCurrentRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        const [path, queryString] = hash.split('?');
        const params = {};
        
        if (queryString) {
            new URLSearchParams(queryString).forEach((value, key) => {
                params[key] = value;
            });
        }

        return { path, params };
    }

    /**
     * Handle route change
     */
    async handleRouteChange() {
        const { path, params } = this.getCurrentRoute();
        
        console.log('[Router] Route change:', path, params);

        // Call before hook
        if (this.beforeRouteChange) {
            const shouldContinue = await this.beforeRouteChange(path, params);
            if (shouldContinue === false) return;
        }

        // Find matching route
        let view = this.routes.get(path);
        
        // Fallback to home if route not found
        if (!view) {
            console.warn('[Router] Route not found:', path, '- redirecting to home');
            view = this.routes.get('home');
            if (!view) {
                console.error('[Router] Home route not defined');
                return;
            }
        }

        // Cleanup previous view
        if (this.currentView) {
            if (typeof this.currentView.destroy === 'function') {
                this.currentView.destroy();
            }
            if (typeof abortTrackedRequests === 'function') {
                abortTrackedRequests(this.currentView);
            }
        }

        // Update state
        this.currentRoute = path;
        this.currentView = view;

        // Render new view
        try {
            this.container.innerHTML = '<div class="view-loading"><div class="loading-spinner"></div></div>';
            
            const html = await view.render(params);
            
            // Wrap rendered view in animation container
            this.container.innerHTML = `<div class="view-enter">${html}</div>`;

            // Initialize view if it has init method
            if (typeof view.init === 'function') {
                await view.init(params);
            }

            // Scroll to top
            window.scrollTo(0, 0);

            // Call after hook
            if (this.afterRouteChange) {
                this.afterRouteChange(path, params);
            }

        } catch (error) {
            console.error('[Router] Error rendering view:', error);
            this.container.innerHTML = `
                <div class="error-view">
                    <div class="error-icon">⚠️</div>
                    <div class="error-title">เกิดข้อผิดพลาด</div>
                    <div class="error-message">${error.message}</div>
                    <button class="btn btn-primary" onclick="router.navigate('home')">กลับหน้าหลัก</button>
                </div>
            `;
        }
    }

    /**
     * Parse legacy URL path and redirect to hash route
     * Call this to handle old MPA URLs
     */
    handleLegacyUrl() {
        const path = window.location.pathname;
        
        // Map old paths to new hash routes
        const pathMap = {
            '/': 'home',
            '/index.html': 'home',
            '/liff.html': 'home',
            '/check-in.html': 'check-in',
            '/check-out.html': 'check-out',
            '/attendance.html': 'attendance',
            '/leave.html': 'leave',
            '/advance.html': 'advance',
            '/balance.html': 'balance',
            '/cancel.html': 'cancel',
            '/admin.html': 'admin',
            '/status.html': 'status',
            '/history.html': 'history'
        };

        const newRoute = pathMap[path];
        if (newRoute && !window.location.hash) {
            // Redirect to hash-based route
            window.location.replace(`/${window.location.hash || '#' + newRoute}`);
            return true;
        }

        return false;
    }

        handleLinkClick(event) {
            const anchor = event.target.closest('a[href^="#"]');
            if (!anchor) return;
            const href = anchor.getAttribute('href');
            if (!href || href === '#') return;

            event.preventDefault();

            const hash = href.startsWith('#') ? href.slice(1) : href;
            if (!hash) return;

            const [path, queryString] = hash.split('?');
            const params = {};
            if (queryString) {
                new URLSearchParams(queryString).forEach((value, key) => {
                    params[key] = value;
                });
            }

            this.navigate(path || 'home', params);
        }
}

// Create global router instance
const router = new Router();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Router, router };
}
