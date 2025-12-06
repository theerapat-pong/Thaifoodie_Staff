// ========================================
// Client Log API - Receives logs from frontend
// POST /api/liff/log
// OPTIMIZED: Only saves ERROR + important events
// ========================================

const prisma = require('../../src/lib/prisma');

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
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
    'LEAVE_REQUEST',
    'ADMIN_ACTION'
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

module.exports = async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        Object.entries(corsHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        return res.status(200).end();
    }

    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { level, category, action, message, details, userId } = req.body;

        // Validate required fields
        if (!category || !action || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: category, action, message'
            });
        }

        // Check if this log should be saved
        if (!shouldSaveToDb(level || 'INFO', category, action)) {
            // Skip non-important logs but return success
            return res.status(200).json({
                success: true,
                message: 'Log skipped (not important)',
                saved: false
            });
        }

        // Get client info
        const userAgent = req.headers['user-agent'] || null;
        const ipAddress = req.headers['x-forwarded-for'] || 
                         req.headers['x-real-ip'] || 
                         req.connection?.remoteAddress || null;

        // Save to database
        await prisma.systemLog.create({
            data: {
                level: level || 'INFO',
                category,
                action,
                message,
                details: details ? JSON.parse(JSON.stringify(details)) : null,
                user_id: userId || null,
                user_agent: userAgent,
                ip_address: ipAddress
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Log saved',
            saved: true
        });

    } catch (error) {
        console.error('[Log API] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save log'
        });
    }
};
