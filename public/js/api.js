// ========================================
// API Helper Functions for LIFF
// ========================================

const API_BASE = '/api/liff';

// ========================================
// Request Lifecycle Helpers
// ========================================

function createAbortControllerFor(owner) {
    const controller = new AbortController();
    if (!owner) {
        return controller;
    }

    if (!owner.__abortControllers) {
        Object.defineProperty(owner, '__abortControllers', {
            value: new Set(),
            enumerable: false,
            configurable: true,
            writable: true
        });
    }

    owner.__abortControllers.add(controller);
    controller.signal.addEventListener('abort', () => {
        if (owner.__abortControllers) {
            owner.__abortControllers.delete(controller);
        }
    }, { once: true });

    return controller;
}

function abortTrackedRequests(owner) {
    if (!owner || !owner.__abortControllers) return;
    owner.__abortControllers.forEach(controller => controller.abort());
    owner.__abortControllers.clear();
}

function isAbortError(error) {
    if (!error) return false;
    if (error.name === 'AbortError') return true;
    const message = (error.message || '').toLowerCase();
    return message.includes('aborted') || message.includes('component unmounted');
}

// ========================================
// GPS Location Utilities
// ========================================

/**
 * Get current GPS position with beautiful dialog UX
 * @param {Object} options - Options
 * @param {boolean} options.showDialog - Show permission dialog first (default: true)
 * @param {boolean} options.showLoading - Show loading indicator (default: true)
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, timestamp: number}>}
 */
async function getCurrentPositionWithDialog(options = {}) {
    const { showDialog = true, showLoading = true } = options;
    
    // Log start
    if (typeof ClientLogger !== 'undefined') {
        ClientLogger.gps.requestStart();
    }
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        if (typeof ClientLogger !== 'undefined') {
            ClientLogger.error('GPS', 'notSupported', 'เบราว์เซอร์ไม่รองรับ Geolocation API');
        }
        if (typeof GPSDialog !== 'undefined') {
            await GPSDialog.showError('unknown', 'เบราว์เซอร์ไม่รองรับ GPS');
        }
        throw new Error('เบราว์เซอร์ไม่รองรับ GPS');
    }
    
    // Show permission dialog first
    if (showDialog && typeof GPSDialog !== 'undefined') {
        const allowed = await GPSDialog.showPermissionRequest();
        if (!allowed) {
            if (typeof ClientLogger !== 'undefined') {
                ClientLogger.info('GPS', 'userCancelled', 'ผู้ใช้ยกเลิกการขอ GPS');
            }
            throw new Error('ผู้ใช้ยกเลิก');
        }
    }
    
    // Show loading
    if (showLoading && typeof GPSDialog !== 'undefined') {
        GPSDialog.showLoading();
    }
    
    // Log permission prompt
    if (typeof ClientLogger !== 'undefined') {
        ClientLogger.gps.permissionPrompt();
    }
    
    // Get position
    return new Promise((resolve, reject) => {
        const gpsOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                
                // Log success
                if (typeof ClientLogger !== 'undefined') {
                    ClientLogger.gps.success(coords);
                }
                
                // Close loading dialog
                if (typeof GPSDialog !== 'undefined') {
                    GPSDialog.close();
                }
                
                resolve(coords);
            },
            async (error) => {
                let errorType, message;
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorType = 'denied';
                        message = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง GPS';
                        if (typeof ClientLogger !== 'undefined') {
                            ClientLogger.gps.denied();
                        }
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorType = 'unavailable';
                        message = 'ไม่สามารถระบุตำแหน่งได้';
                        if (typeof ClientLogger !== 'undefined') {
                            ClientLogger.gps.unavailable();
                        }
                        break;
                    case error.TIMEOUT:
                        errorType = 'timeout';
                        message = 'หมดเวลาในการระบุตำแหน่ง';
                        if (typeof ClientLogger !== 'undefined') {
                            ClientLogger.gps.timeout();
                        }
                        break;
                    default:
                        errorType = 'unknown';
                        message = 'เกิดข้อผิดพลาดในการระบุตำแหน่ง';
                        if (typeof ClientLogger !== 'undefined') {
                            ClientLogger.gps.error(error.code, error.message);
                        }
                }
                
                // Show error dialog with retry option
                if (typeof GPSDialog !== 'undefined') {
                    const retry = await GPSDialog.showError(errorType, message);
                    if (retry) {
                        // Retry
                        try {
                            const result = await getCurrentPositionWithDialog({ 
                                showDialog: false, 
                                showLoading: true 
                            });
                            resolve(result);
                            return;
                        } catch (retryError) {
                            reject(retryError);
                            return;
                        }
                    }
                }
                
                reject(new Error(message));
            },
            gpsOptions
        );
    });
}

/**
 * Get current GPS position (simple version without dialog)
 * @param {Object} options - Geolocation options
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
async function getCurrentPosition(options = {}) {
    // Use dialog version by default
    return getCurrentPositionWithDialog({ showDialog: false, showLoading: false, ...options });
}

/**
 * Check if GPS is available and permitted
 * @returns {Promise<boolean>}
 */
async function checkGPSPermission() {
    try {
        if (!navigator.permissions) {
            // Fallback for browsers without Permissions API
            return navigator.geolocation !== undefined;
        }
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state === 'granted' || result.state === 'prompt';
    } catch (e) {
        return navigator.geolocation !== undefined;
    }
}

/**
 * Make API call with authentication
 * @param {string} endpoint - API endpoint (e.g., '/attendance/today')
 * @param {string} method - HTTP method
 * @param {Object} body - Request body (for POST/PUT)
 * @returns {Promise<Object>} - API response
 */
async function apiCall(endpoint, method = 'GET', body = null, config = {}) {
    // Ensure LIFF is initialized
    if (!window.accessToken) {
        throw new Error('กรุณาเข้าสู่ระบบก่อน');
    }

    const url = `${API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.accessToken}`
        },
        signal: config.signal
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
        // Always include userId in body
        options.body = JSON.stringify({
            ...body,
            userId: window.userId
        });
    }

    console.log(`[API] ${method} ${url}`, body ? body : '');

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            console.error('[API] Error response:', data);
            throw new Error(data.message || data.error || 'เกิดข้อผิดพลาด');
        }

        console.log('[API] Success:', data);
        return data;

    } catch (error) {
        console.error('[API] Request failed:', error);
        
        if (isAbortError(error)) {
            error.isAborted = true;
            throw error;
        }

        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
        
        throw error;
    }
}

/**
 * GET request helper
 * @param {string} endpoint
 * @param {Object} params - Query parameters
 */
async function apiGet(endpoint, params = {}, options = {}) {
    // Add userId to params
    params.userId = window.userId;
    
    // Build query string
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return apiCall(url, 'GET', null, options);
}

/**
 * POST request helper
 * @param {string} endpoint
 * @param {Object} body
 */
async function apiPost(endpoint, body = {}, options = {}) {
    return apiCall(endpoint, 'POST', body, options);
}

// ========================================
// Attendance API
// ========================================

const AttendanceAPI = {
    /**
     * Get today's attendance status
     */
    async getToday(options = {}) {
        return apiGet('/attendance/today', {}, options);
    },

    /**
     * Check in with GPS location
     * @param {Object} locationData - { latitude, longitude, accuracy }
     */
    async checkIn(locationData = null) {
        // If no location data provided, try to get it
        if (!locationData) {
            try {
                locationData = await getCurrentPosition();
            } catch (error) {
                console.error('[GPS] Failed to get location:', error);
                throw new Error(error.message || 'กรุณาเปิดใช้งาน GPS และลองใหม่อีกครั้ง');
            }
        }
        
        return apiPost('/attendance/check-in', {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy
        });
    },

    /**
     * Check out with GPS location
     * @param {Object} locationData - { latitude, longitude, accuracy }
     */
    async checkOut(locationData = null) {
        // If no location data provided, try to get it
        if (!locationData) {
            try {
                locationData = await getCurrentPosition();
            } catch (error) {
                console.error('[GPS] Failed to get location:', error);
                throw new Error(error.message || 'กรุณาเปิดใช้งาน GPS และลองใหม่อีกครั้ง');
            }
        }
        
        return apiPost('/attendance/check-out', {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy
        });
    },

    /**
     * Get attendance history
     * @param {number} limit - Number of records
     */
    async getHistory(limit = 30) {
        return apiGet('/attendance/history', { limit });
    }
};

// ========================================
// Leave API
// ========================================

const LeaveAPI = {
    /**
     * Request leave
     * @param {Object} data - { leaveType, startDate, endDate, reason }
     */
    async request(data) {
        return apiPost('/leave/request', data);
    },

    /**
     * Get pending leave requests
     */
    async getPending(params = {}) {
        return apiGet('/leave/pending', params);
    },

    /**
     * Get leave history
     */
    async getHistory() {
        return apiGet('/leave/history');
    },

    /**
     * Get leave quota
     */
    async getQuota() {
        return apiGet('/leave/quota');
    },

    /**
     * Cancel leave request
     * @param {string} leaveId
     */
    async cancel(leaveId) {
        return apiPost('/leave/cancel', { leaveId });
    }
};

// ========================================
// Advance (เบิกเงิน) API
// ========================================

const AdvanceAPI = {
    /**
     * Request advance
     * @param {Object} data - { amount, reason }
     */
    async request(data) {
        return apiPost('/advance/request', data);
    },

    /**
     * Get balance
     */
    async getBalance(options = {}) {
        return apiGet('/advance/balance', {}, options);
    },

    /**
     * Get pending requests
     */
    async getPending(params = {}) {
        return apiGet('/advance/pending', params);
    },

    /**
     * Get history
     */
    async getHistory() {
        return apiGet('/advance/history');
    },

    /**
     * Cancel request
     * @param {string} advanceId
     */
    async cancel(advanceId) {
        return apiPost('/advance/cancel', { advanceId });
    }
};

// ========================================
// User API
// ========================================

const UserAPI = {
    /**
     * Get user profile
     */
    async getProfile(options = {}) {
        return apiGet('/user/profile', {}, options);
    }
};

// ========================================
// Admin API
// ========================================

const AdminAPI = {
    /**
     * Get all pending requests
     */
    async getPending() {
        return apiGet('/admin/pending');
    },

    /**
     * Approve request
     * @param {Object} data - { type: 'leave'|'advance'|'checkin', id }
     */
    async approve(data) {
        if (data.type === 'checkin') {
            return this.approvePendingCheckIn({ pendingId: data.id });
        }
        return apiPost('/admin/approve', data);
    },

    /**
     * Reject request
     * @param {Object} data - { type: 'leave'|'advance'|'checkin', id, reason }
     */
    async reject(data) {
        if (data.type === 'checkin') {
            return this.rejectPendingCheckIn({ pendingId: data.id, reason: data.reason });
        }
        return apiPost('/admin/reject', data);
    },

    /**
     * Reset system data (Admin only)
     * @param {string} confirmCode - Must be 'RESET' to confirm
     */
    async resetSystem(confirmCode) {
        return apiPost('/admin/reset', { confirmCode });
    },

    // ========================================
    // Employee Management
    // ========================================

    /**
     * Get all employees
     */
    async getEmployees() {
        return apiGet('/admin/employees');
    },

    /**
     * Create new employee
     * @param {Object} data - { id, name, role, department, dailySalary, shiftStart, shiftEnd }
     */
    async createEmployee(data) {
        return apiPost('/admin/employees', data);
    },

    /**
     * Update employee
     * @param {Object} data - { id, name, role, department, dailySalary, shiftStart, shiftEnd, isActive }
     */
    async updateEmployee(data) {
        return apiCall('/admin/employees', 'PUT', data);
    },

    /**
     * Delete employee
     * @param {string} id - Employee ID
     * @param {boolean} permanent - Whether to permanently delete
     */
    async deleteEmployee(id, permanent = false) {
        return apiCall('/admin/employees', 'DELETE', { id, permanent });
    },

    // ========================================
    // Work Location Management
    // ========================================

    /**
     * Get current work location settings
     */
    async getWorkLocation() {
        return apiGet('/admin/work-location');
    },

    /**
     * Update work location settings
     * @param {Object} data - { name, latitude, longitude, allowedRadius, warningRadius }
     */
    async updateWorkLocation(data) {
        return apiCall('/admin/work-location', 'PUT', data);
    },

    // ========================================
    // Pending Check-In Management
    // ========================================

    /**
     * Get pending check-in requests (Yellow Zone)
     */
    async getPendingCheckIns() {
        return apiGet('/admin/pending-checkins');
    },

    /**
     * Approve a pending check-in request
     * @param {Object} data - { pendingId }
     */
    async approvePendingCheckIn(data) {
        return apiPost('/admin/approve-pending-checkin', data);
    },

    /**
     * Reject a pending check-in request
     * @param {Object} data - { pendingId, reason }
     */
    async rejectPendingCheckIn(data) {
        return apiPost('/admin/reject-pending-checkin', data);
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiCall,
        apiGet,
        apiPost,
        AttendanceAPI,
        LeaveAPI,
        AdvanceAPI,
        UserAPI,
        AdminAPI
    };
}
