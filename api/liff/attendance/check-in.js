// ========================================
// LIFF Attendance Check-in Endpoint
// POST /api/liff/attendance/check-in
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { 
    now, 
    getTodayDate, 
    formatTime, 
    formatTimeThai, 
    formatDateThai 
} = require('../../../src/utils/datetime');
const { checkLateArrival } = require('../../../src/utils/attendance-validation');
const { formatDuration } = require('../../../src/utils/time-format');
const { 
    getActiveWorkLocation, 
    checkLocationStatus, 
    validateGPSData,
    formatDistance 
} = require('../../../src/utils/location');
const { notifyAdmin } = require('../../../src/services/line');

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
                shift_start_time: true,
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

        // Validate GPS data
        const gpsData = validateGPSData(req.body);
        if (!gpsData.valid) {
            return res.status(400).json({
                success: false,
                error: gpsData.error,
                requiresGPS: true
            });
        }

        // Get work location settings
        const workLocation = await getActiveWorkLocation();
        if (!workLocation) {
            return res.status(500).json({
                success: false,
                error: 'ไม่พบการตั้งค่าตำแหน่งร้าน กรุณาติดต่อ Admin'
            });
        }

        // Get zone radii from admin settings (no default fallback)
        const allowedRadius = workLocation.allowed_radius; // Green zone
        const warningRadius = workLocation.warning_radius; // Yellow zone

        // Check location status
        const locationCheck = checkLocationStatus(
            gpsData.latitude, 
            gpsData.longitude, 
            workLocation
        );

        const distance = locationCheck.distance;

        // STRICT 3-ZONE RULE
        if (distance > warningRadius) {
            // 🔴 ZONE 3 (RED): Too far - Reject (DO NOT SAVE)
            return res.status(403).json({
                success: false,
                error: `อยู่นอกพื้นที่ที่กำหนด (ระยะห่าง ${Math.round(distance)} เมตร)`,
                data: {
                    distance: distance,
                    distanceDisplay: formatDistance(distance),
                    maxAllowed: warningRadius,
                    locationStatus: 'REJECTED'
                }
            });
        }

        const today = getTodayDate();
        const nowTime = now().toDate();

        // Check if already checked in today
        const existingAttendance = await prisma.attendance.findUnique({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: today
                }
            }
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                error: 'คุณลงเวลาเข้างานวันนี้แล้ว',
                data: {
                    checkInTime: formatTimeThai(existingAttendance.check_in_time)
                }
            });
        }

        // Check if already has pending request today
        const existingPending = await prisma.pendingCheckIn.findFirst({
            where: {
                user_id: userId,
                requested_date: today,
                status: 'PENDING'
            }
        });

        if (existingPending) {
            return res.status(400).json({
                success: false,
                error: 'คุณมีคำขอลงเวลาเข้างานที่รออนุมัติอยู่แล้ว',
                data: {
                    requestedTime: formatTimeThai(existingPending.requested_time)
                }
            });
        }

        // Check if late
        const actualTime = formatTime(nowTime);
        const lateCheck = checkLateArrival(actualTime, employee.shift_start_time);

        // 🟢 GREEN ZONE: Auto-approve and create attendance immediately
        if (distance <= allowedRadius) {
            const attendance = await prisma.attendance.create({
                data: {
                    user_id: userId,
                    date: today,
                    check_in_time: nowTime,
                    // GPS Data
                    check_in_latitude: gpsData.latitude,
                    check_in_longitude: gpsData.longitude,
                    check_in_accuracy: gpsData.accuracy,
                    check_in_distance: distance,
                    check_in_status: 'VERIFIED',
                    // Audit trail
                    approval_type: 'AUTO'
                }
            });

            // Build response message
            let message = lateCheck.isLate 
                ? `ลงเวลาเข้างานสำเร็จ (มาสาย ${formatDuration(lateCheck.minutesLate)})`
                : 'ลงเวลาเข้างานสำเร็จ';

            console.log(`[Check-in] GREEN ZONE - User: ${userId}, Time: ${actualTime}, Late: ${lateCheck.isLate}, Distance: ${distance}m`);

            // Note: Success check-in is NOT logged to SystemLog (data saved in Attendance table)
            // Only log failures, pending, or errors

            return res.status(200).json({
                success: true,
                message: message,
                data: {
                    date: today,
                    dateDisplay: formatDateThai(nowTime),
                    checkInTime: formatTimeThai(nowTime),
                    checkInTimeRaw: nowTime,
                    isLate: lateCheck.isLate,
                    lateMinutes: lateCheck.minutesLate,
                    lateDisplay: lateCheck.isLate ? formatDuration(lateCheck.minutesLate) : null,
                    shiftStart: employee.shift_start_time,
                    // GPS Data
                    location: {
                        latitude: gpsData.latitude,
                        longitude: gpsData.longitude,
                        accuracy: gpsData.accuracy,
                        distance: distance,
                        distanceDisplay: formatDistance(distance),
                        status: 'VERIFIED',
                        isPending: false
                    }
                }
            });
        }

        // 🟡 YELLOW ZONE: Create pending request, wait for admin approval
        // Create pending check-in request
        const pendingCheckIn = await prisma.pendingCheckIn.create({
            data: {
                user_id: userId,
                requested_date: today,
                requested_time: nowTime,
                latitude: gpsData.latitude,
                longitude: gpsData.longitude,
                accuracy: gpsData.accuracy,
                distance: distance,
                status: 'PENDING'
            }
        });

        // Send LINE notification to Admin/HR
        try {
            const notificationMessage = `🟡 คำขอลงเวลาเข้างาน (รออนุมัติ)\n\n` +
                `👤 ชื่อ: ${employee.name}\n` +
                `⏰ เวลา: ${formatTimeThai(nowTime)}\n` +
                `📍 สถานะ: รออนุมัติ (อยู่นอกระยะเล็กน้อย)\n` +
                `📏 ระยะห่าง: ${formatDistance(distance)}\n` +
                `✅ ระยะที่อนุญาต: ${allowedRadius} เมตร\n` +
                `⚠️ ระยะคำเตือน: ${warningRadius} เมตร` +
                (lateCheck.isLate ? `\n⏱️ มาสาย: ${formatDuration(lateCheck.minutesLate)}` : '');
            
            await notifyAdmin(notificationMessage);
            console.log(`[Check-in] YELLOW ZONE - Admin notified for pending approval: ${employee.name}`);
        } catch (notifyError) {
            console.error('[Check-in] Failed to notify admin:', notifyError);
        }

        // Log pending check-in to SystemLog
        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                category: 'CHECK_IN',
                action: 'checkInPending',
                message: `User ${employee.name} submitted pending check-in request (YELLOW ZONE)`,
                details: {
                    userId: userId,
                    requestedTime: nowTime.toISOString(),
                    distance: distance,
                    status: 'PENDING',
                    isLate: lateCheck.isLate,
                    lateMinutes: lateCheck.minutesLate
                },
                user_id: userId
            }
        }).catch(logError => {
            console.error('[Check-in] SystemLog error:', logError);
        });

        return res.status(200).json({
            success: true,
            message: 'ยื่นคำขอลงเวลาเข้างานแล้ว ⚠️ รอ Admin อนุมัติตำแหน่ง',
            data: {
                date: today,
                dateDisplay: formatDateThai(nowTime),
                requestedTime: formatTimeThai(nowTime),
                requestedTimeRaw: nowTime,
                isLate: lateCheck.isLate,
                lateMinutes: lateCheck.minutesLate,
                lateDisplay: lateCheck.isLate ? formatDuration(lateCheck.minutesLate) : null,
                shiftStart: employee.shift_start_time,
                // GPS Data
                location: {
                    latitude: gpsData.latitude,
                    longitude: gpsData.longitude,
                    accuracy: gpsData.accuracy,
                    distance: distance,
                    distanceDisplay: formatDistance(distance),
                    status: 'PENDING',
                    isPending: true
                }
            }
        });

    } catch (error) {
        console.error('[Check-in] Error:', error);
        
        // Log error to SystemLog
        try {
            await prisma.systemLog.create({
                data: {
                    level: 'ERROR',
                    category: 'CHECK_IN',
                    action: 'checkIn',
                    message: `Check-in failed: ${error.message}`,
                    details: {
                        error: error.message,
                        stack: error.stack,
                        userId: req.body?.userId || 'unknown'
                    },
                    user_id: req.body?.userId || null
                }
            });
        } catch (logError) {
            console.error('[Check-in] SystemLog error:', logError);
        }
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการบันทึกเวลาเข้างาน'
        });
    }
};
