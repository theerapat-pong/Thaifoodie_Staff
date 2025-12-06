// ========================================
// LIFF Attendance Today Endpoint
// GET /api/liff/attendance/today
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest, errorResponse, successResponse } = require('../../../src/services/liff-auth');
const { getTodayDate, formatTimeThai, formatDateThai, formatTime } = require('../../../src/utils/datetime');
const toNumber = (value) => parseFloat(value ?? '0');
const { checkLateArrival, checkEarlyDeparture } = require('../../../src/utils/attendance-validation');
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

        const userId = auth.userId || req.query.userId;

        // Get employee data
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                role: true,
                daily_salary: true,
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

        const today = getTodayDate();

        // Get today's attendance
        const attendance = await prisma.attendance.findUnique({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: today
                }
            }
        });

        // Determine status
        let status = 'NOT_CHECKED_IN';
        let checkInTime = null;
        let checkOutTime = null;
        let totalHours = null;
        let dailyWage = null;
        let isLate = false;
        let lateMinutes = 0;
        let lateDisplay = null;
        let isEarly = false;
        let earlyMinutes = 0;
        let earlyDisplay = null;

        if (attendance) {
            checkInTime = attendance.check_in_time;
            checkOutTime = attendance.check_out_time;
            totalHours = attendance.total_hours;
            dailyWage = attendance.daily_wage;

            if (checkOutTime) {
                status = 'CHECKED_OUT';
            } else {
                status = 'CHECKED_IN';
            }

            // Check if late
            if (checkInTime && employee.shift_start_time) {
                const actualTime = formatTime(checkInTime);
                const lateCheck = checkLateArrival(actualTime, employee.shift_start_time);
                isLate = lateCheck.isLate;
                lateMinutes = lateCheck.minutesLate;
                lateDisplay = isLate ? formatDuration(lateMinutes) : null;
            }

            // Check if left early
            if (checkOutTime && employee.shift_end_time) {
                const actualOutTime = formatTime(checkOutTime);
                const earlyCheck = checkEarlyDeparture(actualOutTime, employee.shift_end_time);
                isEarly = earlyCheck.isEarly;
                earlyMinutes = earlyCheck.minutesEarly;
                earlyDisplay = isEarly ? formatDuration(earlyMinutes) : null;
            }
        }

        // Calculate balance for today's display (aggregate to avoid large payloads)
        const [attendanceSummary, approvedAdvanceSummary] = await Promise.all([
            prisma.attendance.aggregate({
                where: {
                    user_id: userId,
                    check_out_time: { not: null }
                },
                _sum: { daily_wage: true }
            }),
            prisma.advance.aggregate({
                where: {
                    user_id: userId,
                    status: 'APPROVED'
                },
                _sum: { amount: true }
            })
        ]);

        const accruedSalary = toNumber(attendanceSummary._sum.daily_wage);
        const totalAdvanced = toNumber(approvedAdvanceSummary._sum.amount);
        const balance = accruedSalary - totalAdvanced;

        return res.status(200).json({
            success: true,
            data: {
                employee: {
                    name: employee.name,
                    role: employee.role,
                    dailySalary: parseFloat(employee.daily_salary),
                    shiftStart: employee.shift_start_time,
                    shiftEnd: employee.shift_end_time
                },
                today: {
                    date: today,
                    dateDisplay: formatDateThai(new Date()),
                    status,
                    checkInTime: checkInTime ? formatTimeThai(checkInTime) : null,
                    checkOutTime: checkOutTime ? formatTimeThai(checkOutTime) : null,
                    checkInTimeRaw: checkInTime,
                    checkOutTimeRaw: checkOutTime,
                    totalHours: totalHours ? parseFloat(totalHours) : null,
                    dailyWage: dailyWage ? parseFloat(dailyWage) : null,
                    isLate,
                    lateMinutes,
                    lateDisplay,
                    isEarly,
                    earlyMinutes,
                    earlyDisplay
                },
                balance: {
                    accrued: accruedSalary,
                    balance: balance
                }
            }
        });

    } catch (error) {
        console.error('[Attendance Today] Error:', error);
        
        await logger.error(
            'Attendance',
            'Get-Today',
            `Error fetching today attendance: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
