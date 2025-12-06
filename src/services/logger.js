// ========================================
// Centralized Logger Service
// Stores logs in database for debugging
// OPTIMIZED: Only saves ERROR + important events
// ========================================

const prisma = require('../lib/prisma');

const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR'
};

// Important events that should always be logged to DB
// Note: GPS success & CHECK_IN/OUT success are NOT logged (saved in Attendance table)
const IMPORTANT_EVENTS = [
    'CHECK_IN_PENDING',    // Only pending (Yellow Zone)
    'CHECK_IN_FAILED',     // Only failures
    'CHECK_OUT_FAILED',    // Only failures
    'GPS_DENIED',
    'GPS_ERROR',
    'LOCATION_TOO_FAR',
    'AUTH_FAILED',
    'ADVANCE_REQUEST',
    'ADVANCE_APPROVED',
    'ADVANCE_REJECTED',
    'LEAVE_REQUEST',
    'LEAVE_APPROVED',
    'LEAVE_REJECTED',
    'ADMIN_ACTION',
    'CRON',
    'WEBHOOK'
];

/**
 * Check if this log should be saved to database
 */
function shouldSaveToDb(level, category, action) {
    // Always save errors and warnings
    if (level === 'ERROR' || level === 'WARNING') return true;
    
    // Check if it's an important event
    const fullAction = `${category}_${action}`.toUpperCase();
    return IMPORTANT_EVENTS.some(event => 
        fullAction.includes(event) || 
        category.toUpperCase().includes(event)
    );
}

/**
 * Log to database
 * @param {Object} params
 * @param {string} params.level - DEBUG, INFO, WARNING, ERROR
 * @param {string} params.category - GPS, CHECK_IN, AUTH, API, etc.
 * @param {string} params.action - Function/action name
 * @param {string} params.message - Log message
 * @param {Object} params.details - Additional JSON data
 * @param {string} params.userId - LINE User ID
 * @param {string} params.userAgent - Browser/Device info
 * @param {string} params.ipAddress - Client IP
 * @param {number} params.durationMs - Action duration in milliseconds
 */
async function log({
    level = 'INFO',
    category,
    action,
    message,
    details = null,
    userId = null,
    userAgent = null,
    ipAddress = null,
    durationMs = null
}) {
    try {
        // Always console.log for Vercel logs (free)
        const logLine = `[${level}] [${category}] ${action}: ${message}`;
        if (level === 'ERROR') {
            console.error(logLine, details || '');
        } else if (level === 'WARNING') {
            console.warn(logLine, details || '');
        } else {
            console.log(logLine, details || '');
        }

        // Only save important logs to database
        if (!shouldSaveToDb(level, category, action)) {
            return; // Skip non-important logs
        }

        // Save to database (non-blocking)
        await prisma.systemLog.create({
            data: {
                level,
                category,
                action,
                message,
                details: details ? JSON.parse(JSON.stringify(details)) : null,
                user_id: userId,
                user_agent: userAgent,
                ip_address: ipAddress,
                duration_ms: durationMs
            }
        });
    } catch (err) {
        // Fallback to console if DB fails
        console.error('[Logger] Failed to save log:', err.message);
    }
}

// Convenience methods
const logger = {
    debug: (category, action, message, details = null, userId = null) =>
        log({ level: 'DEBUG', category, action, message, details, userId }),
    
    info: (category, action, message, details = null, userId = null) =>
        log({ level: 'INFO', category, action, message, details, userId }),
    
    warn: (category, action, message, details = null, userId = null) =>
        log({ level: 'WARNING', category, action, message, details, userId }),
    
    error: (category, action, message, details = null, userId = null) =>
        log({ level: 'ERROR', category, action, message, details, userId }),

    // Full log with all options
    log
};

module.exports = logger;
module.exports.LogLevel = LogLevel;
