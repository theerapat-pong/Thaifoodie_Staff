// ========================================
// LIFF Attendance History Endpoint
// GET /api/liff/attendance/history
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const {
    formatDateThai,
    formatDate,
    formatTimeThai,
    formatTime
} = require('../../../src/utils/datetime');
const {
    checkLateArrival,
    checkEarlyDeparture
} = require('../../../src/utils/attendance-validation');
const { formatDuration } = require('../../../src/utils/time-format');
const logger = require('../../../src/services/logger');

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
        Object.entries(corsHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        return res.status(200).end();
    }

    // Set CORS headers for all responses
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

        const userId = auth.userId || req.query.userId;
        const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

        // Get employee info for shift reference
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
            select: {
                shift_start_time: true,
                shift_end_time: true,
                is_active: true
            }
        });

        if (!employee || !employee.is_active) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลพนักงาน'
            });
        }

        // Fetch attendance records
        const attendanceRecords = await prisma.attendance.findMany({
            where: { user_id: userId },
            orderBy: { date: 'desc' },
            take: limit
        });

        const formattedRecords = attendanceRecords.map((record) => {
            const checkInTime = record.check_in_time ? formatTimeThai(record.check_in_time) : null;
            const checkOutTime = record.check_out_time ? formatTimeThai(record.check_out_time) : null;

            const actualCheckIn = record.check_in_time ? formatTime(record.check_in_time) : null;
            const actualCheckOut = record.check_out_time ? formatTime(record.check_out_time) : null;

            const lateCheck = actualCheckIn
                ? checkLateArrival(actualCheckIn, employee.shift_start_time)
                : { isLate: false, minutesLate: 0 };

            const earlyCheck = actualCheckOut
                ? checkEarlyDeparture(actualCheckOut, employee.shift_end_time)
                : { isEarly: false, minutesEarly: 0 };

            const totalHours = record.total_hours ? parseFloat(record.total_hours) : null;
            const totalMinutes = totalHours ? Math.round(totalHours * 60) : 0;

            return {
                id: record.id,
                date: formatDateThai(record.date),
                dateRaw: formatDate(record.date),
                checkInTime,
                checkOutTime,
                checkInTimeRaw: record.check_in_time,
                checkOutTimeRaw: record.check_out_time,
                totalHours,
                totalMinutes,
                workDurationDisplay: totalMinutes ? formatDuration(totalMinutes) : null,
                isLate: lateCheck.isLate,
                lateMinutes: lateCheck.minutesLate,
                lateDisplay: lateCheck.isLate ? formatDuration(lateCheck.minutesLate) : null,
                isEarly: earlyCheck.isEarly,
                earlyMinutes: earlyCheck.minutesEarly,
                earlyDisplay: earlyCheck.isEarly ? formatDuration(earlyCheck.minutesEarly) : null,
                hasCheckedOut: Boolean(record.check_out_time)
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                attendances: formattedRecords,
                total: formattedRecords.length
            }
        });
    } catch (error) {
        console.error('[Attendance History] Error:', error);
        
        await logger.error(
            'Attendance',
            'Get-History',
            `Error fetching attendance history: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
