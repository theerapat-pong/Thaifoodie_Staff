// ========================================
// LIFF Admin Get Pending Check-ins Endpoint
// GET /api/liff/admin/pending-checkins
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasAdminPrivileges } = require('../../../src/utils/roles');
const logger = require('../../../src/services/logger');
const { 
    formatTimeThai, 
    formatDateThai,
    formatTime
} = require('../../../src/utils/datetime');
const { checkLateArrival } = require('../../../src/utils/attendance-validation');
const { formatDistance } = require('../../../src/utils/location');

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

module.exports = async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        // Authenticate request
        const auth = await authenticateRequest(req);
        if (!auth.valid) {
            return res.status(401).json({
                success: false,
                error: auth.error || 'กรุณาเข้าสู่ระบบ'
            });
        }

        const adminId = auth.userId;

        // Check if user is admin
        const admin = await prisma.employee.findUnique({
            where: { id: adminId }
        });

        if (!admin || !hasAdminPrivileges(admin.role)) {
            return res.status(403).json({
                success: false,
                error: 'ไม่มีสิทธิ์เข้าถึง'
            });
        }

        // Get all pending check-in requests
        const pendingCheckIns = await prisma.pendingCheckIn.findMany({
            where: {
                status: 'PENDING'
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        shift_start_time: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Format the data
        const formattedData = pendingCheckIns.map(pending => {
            // Check if late using standard function (timezone-aware)
            const actualTime = formatTime(pending.requested_time);
            const lateCheck = checkLateArrival(actualTime, pending.employee.shift_start_time);

            return {
                id: pending.id,
                userId: pending.user_id,
                employeeName: pending.employee.name,
                requestedDate: formatDateThai(pending.requested_date),
                requestedTime: formatTimeThai(pending.requested_time),
                requestedTimeRaw: pending.requested_time,
                distance: parseFloat(pending.distance),
                distanceDisplay: formatDistance(parseFloat(pending.distance)),
                accuracy: pending.accuracy ? parseFloat(pending.accuracy) : null,
                isLate: lateCheck.isLate,
                minutesLate: lateCheck.minutesLate,
                shiftStart: pending.employee.shift_start_time,
                createdAt: pending.created_at,
                // GPS coordinates for map display
                latitude: parseFloat(pending.latitude),
                longitude: parseFloat(pending.longitude)
            };
        });

        return res.status(200).json({
            success: true,
            data: formattedData,
            total: formattedData.length
        });

    } catch (error) {
        console.error('[Get-Pending-CheckIns] Error:', error);
        
        // Log error to SystemLog
        await logger.error(
            'Admin',
            'Get-Pending-CheckIns',
            `Error fetching pending check-ins: ${error.message}`,
            {
                error: error.message,
                stack: error.stack,
                adminId: auth?.userId || 'unknown'
            },
            auth?.userId
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};
