// ========================================
// LIFF Attendance Check-out Endpoint
// POST /api/liff/attendance/check-out
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { 
    now, 
    getTodayDate, 
    formatTime, 
    formatTimeThai, 
    formatDateThai,
    calculateTimeDifference 
} = require('../../../src/utils/datetime');
const { checkEarlyDeparture } = require('../../../src/utils/attendance-validation');
const { calculateDailyWage } = require('../../../src/utils/salary');
const { formatDuration } = require('../../../src/utils/time-format');
const { 
    getActiveWorkLocation, 
    checkLocationStatus, 
    validateGPSData,
    formatDistance 
} = require('../../../src/utils/location');

const toNumber = (value) => parseFloat(value ?? '0');

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

module.exports = async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
        // Authenticate request
        const auth = await authenticateRequest(req);
        if (!auth.valid) {
            return res.status(401).json({
                success: false,
                error: auth.error || 'กรุณาเข้าสู่ระบบ'
            });
        }

        const userId = auth.userId || req.body?.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'ไม่พบข้อมูลผู้ใช้'
            });
        }

        // Get employee data
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                daily_salary: true,
                shift_end_time: true,
                is_active: true
            }
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อ HR'
            });
        }

        if (!employee.is_active) {
            return res.status(403).json({
                success: false,
                error: 'บัญชีของคุณถูกระงับการใช้งาน'
            });
        }

        // GPS data is optional for check-out (NO distance restrictions)
        const { latitude, longitude, accuracy } = req.body || {};
        const hasGPS = latitude !== null && latitude !== undefined && 
                       longitude !== null && longitude !== undefined;

        let locationCheck = null;
        let gpsData = { latitude: null, longitude: null, accuracy: null };
        let checkOutStatus = 'NO_GPS'; // Default status

        if (hasGPS) {
            // Validate GPS data if provided
            const validatedGPS = validateGPSData(req.body);
            if (validatedGPS.valid) {
                gpsData = validatedGPS;
                
                // Get work location settings for distance calculation (info only)
                const workLocation = await getActiveWorkLocation();
                if (workLocation) {
                    locationCheck = checkLocationStatus(
                        gpsData.latitude, 
                        gpsData.longitude, 
                        workLocation
                    );
                    // Save the status but don't enforce it (check-out allowed anywhere)
                    checkOutStatus = locationCheck.status;
                }
            }
        }

        const today = getTodayDate();
        const nowTime = now().toDate();

        // Check if checked in today
        const attendanceRecord = await prisma.attendance.findUnique({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: today
                }
            }
        });

        if (!attendanceRecord) {
            return res.status(400).json({
                success: false,
                error: 'ไม่พบการลงเวลาเข้างานวันนี้ กรุณาลงเวลาเข้างานก่อน'
            });
        }

        if (attendanceRecord.check_out_time) {
            return res.status(400).json({
                success: false,
                error: 'คุณลงเวลาออกงานวันนี้แล้ว',
                data: {
                    checkOutTime: formatTimeThai(attendanceRecord.check_out_time)
                }
            });
        }

        // Calculate work time
        const checkInTime = attendanceRecord.check_in_time;
        const checkOutTime = nowTime;
        const workTime = calculateTimeDifference(checkInTime, checkOutTime);

        if (!workTime) {
            return res.status(400).json({
                success: false,
                error: 'เกิดข้อผิดพลาดในการคำนวณเวลาทำงาน'
            });
        }

        // Calculate daily wage
        const dailyWage = calculateDailyWage(employee.daily_salary, workTime.totalHours);

        // Update attendance record (with optional GPS data)
        // IMPORTANT: Check-out ALWAYS succeeds regardless of location
        await prisma.attendance.update({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: today
                }
            },
            data: {
                check_out_time: checkOutTime,
                total_hours: workTime.totalHours,
                daily_wage: dailyWage,
                // GPS Data (optional - can be null)
                check_out_latitude: gpsData.latitude,
                check_out_longitude: gpsData.longitude,
                check_out_accuracy: gpsData.accuracy,
                check_out_distance: locationCheck?.distance || null,
                check_out_status: checkOutStatus
            }
        });

        // Note: Success check-out is NOT logged to SystemLog (data saved in Attendance table)
        // Only log failures or errors

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

        // Check if leaving early
        const actualCheckOutTime = formatTime(checkOutTime);
        const earlyCheck = checkEarlyDeparture(actualCheckOutTime, employee.shift_end_time);

        // Build response message
        let message = earlyCheck.isEarly 
            ? `ลงเวลาออกงานสำเร็จ (ออกก่อนเวลา ${formatDuration(earlyCheck.minutesEarly)})`
            : 'ลงเวลาออกงานสำเร็จ';

        console.log(`[Check-out] User: ${userId}, Time: ${actualCheckOutTime}, Early: ${earlyCheck.isEarly}, GPS: ${hasGPS ? 'Yes' : 'No'}`);

        // Build location data for response (only if GPS was provided)
        const locationData = hasGPS && locationCheck ? {
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            accuracy: gpsData.accuracy,
            distance: locationCheck.distance,
            distanceDisplay: formatDistance(locationCheck.distance),
            status: locationCheck.status,
            isPending: locationCheck.status === 'PENDING'
        } : null;

        return res.status(200).json({
            success: true,
            message: message,
            data: {
                date: today,
                dateDisplay: formatDateThai(checkOutTime),
                checkInTime: formatTimeThai(checkInTime),
                checkOutTime: formatTimeThai(checkOutTime),
                checkInTimeRaw: checkInTime,
                checkOutTimeRaw: checkOutTime,
                workTime: workTime.displayText,
                totalHours: workTime.totalHours,
                dailyWage: dailyWage,
                dailyWageDisplay: dailyWage.toFixed(2),
                isEarly: earlyCheck.isEarly,
                earlyMinutes: earlyCheck.minutesEarly,
                earlyDisplay: earlyCheck.isEarly ? formatDuration(earlyCheck.minutesEarly) : null,
                shiftEnd: employee.shift_end_time,
                balance: {
                    accrued: accruedSalary,
                    balance: balance,
                    balanceDisplay: balance.toFixed(2)
                },
                // GPS Data (optional - can be null)
                location: locationData
            }
        });

    } catch (error) {
        console.error('[Check-out] Error:', error);
        
        // Log error to SystemLog
        try {
            await prisma.systemLog.create({
                data: {
                    level: 'ERROR',
                    category: 'CHECK_OUT',
                    action: 'checkOut',
                    message: `Check-out failed: ${error.message}`,
                    details: {
                        error: error.message,
                        stack: error.stack,
                        userId: req.body?.userId || 'unknown'
                    },
                    user_id: req.body?.userId || null
                }
            });
        } catch (logError) {
            console.error('[Check-out] SystemLog error:', logError);
        }
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการบันทึกเวลาออกงาน'
        });
    }
};
