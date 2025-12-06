// ========================================
// Client-side Logger
// Sends logs to server for persistent storage
// OPTIMIZED: Only logs ERROR + important events
// ========================================

const ClientLogger = {
    // Queue for batching logs
    _queue: [],
    _flushTimeout: null,
    _flushInterval: 5000, // Flush every 5 seconds (reduced frequency)
    _maxQueueSize: 5,     // Or when queue reaches 5 items
    
    // Important events that should be logged (whitelist)
    // Note: GPS success & CHECK_IN/OUT success are NOT logged (saved in Attendance table)
    _importantEvents: [
        'CHECK_IN_PENDING',    // Only pending (Yellow Zone)
        'CHECK_IN_FAILED',     // Only failures
        'CHECK_OUT_FAILED',    // Only failures
        'GPS_DENIED',
        'GPS_ERROR',
        'LOCATION_TOO_FAR',
        'AUTH_FAILED',
        'ADVANCE_REQUEST',
        'LEAVE_REQUEST',
        'ADMIN_ACTION',
        'CHECKOUT_DEBUG',      // Debug checkout duration
        'ATTENDANCE_DEBUG'     // Debug attendance duration
    ],
    
    /**
     * Check if this log should be saved to database
     */
    _shouldSaveToDb(level, category, action) {
        // Always save errors
        if (level === 'ERROR') return true;
        
        // Always save warnings
        if (level === 'WARNING') return true;
        
        // Check if it's an important event
        const fullAction = `${category}_${action}`.toUpperCase();
        const isImportant = this._importantEvents.some(event => 
            fullAction.includes(event) || 
            category.toUpperCase().includes(event)
        );
        
        return isImportant;
    },
    
    /**
     * Initialize logger
     */
    init() {
        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this._flush(true);
        });
        
        // Capture global errors
        window.addEventListener('error', (event) => {
            this.error('GLOBAL', 'uncaughtError', event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('GLOBAL', 'unhandledRejection', 
                event.reason?.message || String(event.reason), {
                    stack: event.reason?.stack
                });
        });
        
        console.log('[ClientLogger] Initialized (optimized mode)');
    },
    
    /**
     * Add log to queue (only if important)
     */
    _addToQueue(level, category, action, message, details = null) {
        // Always log to console for debugging
        const consoleMethod = level === 'ERROR' ? 'error' : 
                             level === 'WARNING' ? 'warn' : 'log';
        console[consoleMethod](`[${category}] ${action}:`, message, details || '');
        
        // Only save important logs to database
        if (!this._shouldSaveToDb(level, category, action)) {
            return; // Skip non-important logs
        }
        
        const logEntry = {
            level,
            category,
            action,
            message,
            details,
            userId: window.userId || null,
            timestamp: new Date().toISOString()
        };
        
        this._queue.push(logEntry);
        
        // Flush if queue is full
        if (this._queue.length >= this._maxQueueSize) {
            this._flush();
        } else {
            // Schedule flush
            this._scheduleFlush();
        }
    },
    
    /**
     * Schedule a flush
     */
    _scheduleFlush() {
        if (this._flushTimeout) return;
        
        this._flushTimeout = setTimeout(() => {
            this._flush();
        }, this._flushInterval);
    },
    
    /**
     * Flush queue to server
     */
    async _flush(sync = false) {
        if (this._flushTimeout) {
            clearTimeout(this._flushTimeout);
            this._flushTimeout = null;
        }
        
        if (this._queue.length === 0) return;
        
        const logs = [...this._queue];
        this._queue = [];
        
        // Send logs to server
        for (const log of logs) {
            try {
                const sendLog = async () => {
                    await fetch('/api/liff/log', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${window.accessToken || ''}`
                        },
                        body: JSON.stringify(log)
                    });
                };
                
                if (sync) {
                    // Use sendBeacon for sync (page unload)
                    navigator.sendBeacon('/api/liff/log', JSON.stringify(log));
                } else {
                    sendLog().catch(err => {
                        console.error('[ClientLogger] Failed to send log:', err);
                    });
                }
            } catch (err) {
                console.error('[ClientLogger] Failed to send log:', err);
            }
        }
    },
    
    // Convenience methods
    debug(category, action, message, details = null) {
        this._addToQueue('DEBUG', category, action, message, details);
    },
    
    info(category, action, message, details = null) {
        this._addToQueue('INFO', category, action, message, details);
    },
    
    warn(category, action, message, details = null) {
        this._addToQueue('WARNING', category, action, message, details);
    },
    
    error(category, action, message, details = null) {
        this._addToQueue('ERROR', category, action, message, details);
    },
    
    // GPS specific logging (only log important events)
    gps: {
        requestStart() {
            // Don't save to DB - just console log
            console.log('[GPS] requestStart: กำลังขอตำแหน่ง GPS');
        },
        
        permissionPrompt() {
            // Don't save to DB - just console log
            console.log('[GPS] permissionPrompt: รอผู้ใช้อนุญาต GPS');
        },
        
        success(coords) {
            // Don't save to DB - just console log (GPS success is not critical)
            console.log('[GPS] success: ได้รับตำแหน่ง GPS สำเร็จ', {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy
            });
        },
        
        error(code, message) {
            // SAVE: GPS errors are important
            ClientLogger.error('GPS', 'GPS_ERROR', message, { errorCode: code });
        },
        
        denied() {
            // SAVE: GPS denied is important
            ClientLogger.warn('GPS', 'GPS_DENIED', 'ผู้ใช้ไม่อนุญาต GPS');
        },
        
        timeout() {
            // SAVE: GPS timeout is important
            ClientLogger.warn('GPS', 'GPS_ERROR', 'หมดเวลาขอตำแหน่ง GPS', { errorCode: 'TIMEOUT' });
        },
        
        unavailable() {
            // SAVE: GPS unavailable is important
            ClientLogger.warn('GPS', 'GPS_ERROR', 'ไม่สามารถระบุตำแหน่งได้', { errorCode: 'UNAVAILABLE' });
        },
        
        tooFar(distance, maxDistance) {
            // SAVE: Location too far is important
            ClientLogger.warn('GPS', 'LOCATION_TOO_FAR', `อยู่ห่างจากร้าน ${distance}m (max: ${maxDistance}m)`, {
                distance,
                maxDistance
            });
        }
    },

    // Check-in/Check-out logging (only errors)
    attendance: {
        checkInSuccess(data) {
            // Don't save to DB - data already in Attendance table
            console.log('[ATTENDANCE] checkInSuccess: เช็คอินสำเร็จ', data);
        },
        
        checkInFailed(error) {
            ClientLogger.error('ATTENDANCE', 'CHECK_IN_FAILED', error.message || 'เช็คอินล้มเหลว', {
                error: error.message,
                stack: error.stack
            });
        },
        
        checkOutSuccess(data) {
            // Don't save to DB - data already in Attendance table
            console.log('[ATTENDANCE] checkOutSuccess: เช็คเอาท์สำเร็จ', data);
        },
        
        checkOutFailed(error) {
            ClientLogger.error('ATTENDANCE', 'CHECK_OUT_FAILED', error.message || 'เช็คเอาท์ล้มเหลว', {
                error: error.message,
                stack: error.stack
            });
        }
    },

    // Auth logging (important)
    auth: {
        success(userId) {
            // Don't save every successful auth - too frequent
            console.log('[AUTH] success: เข้าสู่ระบบสำเร็จ', { userId });
        },
        
        failed(error) {
            ClientLogger.error('AUTH', 'AUTH_FAILED', error.message || 'เข้าสู่ระบบล้มเหลว', {
                error: error.message
            });
        }
    }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    ClientLogger.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientLogger;
}
