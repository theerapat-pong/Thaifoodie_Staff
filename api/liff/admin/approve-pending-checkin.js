// ========================================
// LIFF Admin Approve Pending Check-in Endpoint
// POST /api/liff/admin/approve-pending-checkin
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasAdminPrivileges } = require('../../../src/utils/roles');
const { 
    formatTimeThai, 
    formatDateThai,
    getTodayDate 
} = require('../../../src/utils/datetime');
const { pushMessage } = require('../../../src/services/line');
const { buildCheckInReceipt } = require('../../../src/services/line');
const { checkLateArrival } = require('../../../src/utils/attendance-validation');
const { formatDuration } = require('../../../src/utils/time-format');

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

        const { pendingId } = req.body;

        if (!pendingId) {
            return res.status(400).json({
                success: false,
                error: 'ไม่พบข้อมูลคำขอ'
            });
        }

        // Get pending check-in request
        const pendingCheckIn = await prisma.pendingCheckIn.findUnique({
            where: { id: parseInt(pendingId) },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        shift_start_time: true
                    }
                }
            }
        });

        if (!pendingCheckIn) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบคำขอลงเวลา'
            });
        }

        if (pendingCheckIn.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                error: `คำขอนี้ถูก${pendingCheckIn.status === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'}ไปแล้ว`
            });
        }

        // Check if attendance already exists for this date
        const existingAttendance = await prisma.attendance.findUnique({
            where: {
                user_id_date: {
                    user_id: pendingCheckIn.user_id,
                    date: pendingCheckIn.requested_date
                }
            }
        });

        if (existingAttendance) {
            // Update pending status to rejected
            await prisma.pendingCheckIn.update({
                where: { id: pendingCheckIn.id },
                data: {
                    status: 'REJECTED',
                    approved_by: adminId,
                    approved_at: new Date(),
                    rejection_reason: 'มีการลงเวลาเข้างานวันนี้แล้ว'
                }
            });

            return res.status(400).json({
                success: false,
                error: 'พนักงานลงเวลาเข้างานวันนี้แล้ว'
            });
        }

        // Create attendance record from pending request
        const distanceInMeters = parseFloat(pendingCheckIn.distance);
        const attendance = await prisma.attendance.create({
            data: {
                user_id: pendingCheckIn.user_id,
                date: pendingCheckIn.requested_date,
                check_in_time: pendingCheckIn.requested_time,
                // GPS Data
                check_in_latitude: pendingCheckIn.latitude,
                check_in_longitude: pendingCheckIn.longitude,
                check_in_accuracy: pendingCheckIn.accuracy,
                check_in_distance: pendingCheckIn.distance,
                check_in_status: 'APPROVED',
                // Approval info
                location_approved_by: adminId,
                location_approved_at: new Date(),
                // Audit trail
                approval_type: 'MANUAL',
                approval_note: `อนุมัติจาก Yellow zone (ระยะ ${distanceInMeters.toFixed(0)} เมตร)`
            }
        });

        // Delete pending check-in record (no longer needed, data moved to Attendance)
        await prisma.pendingCheckIn.delete({
            where: { id: pendingCheckIn.id }
        });

        // Check if employee was late
        const actualTime = pendingCheckIn.requested_time.toTimeString().slice(0, 8);
        const lateCheck = checkLateArrival(actualTime, pendingCheckIn.employee.shift_start_time);

        // Send LINE notification to employee
        try {
            const flexMessage = buildCheckInReceipt({
                name: pendingCheckIn.employee.name,
                date: formatDateThai(pendingCheckIn.requested_time),
                time: formatTimeThai(pendingCheckIn.requested_time),
                lateMinutes: lateCheck.minutesLate,
                formattedLateTime: lateCheck.minutesLate > 0 ? formatDuration(lateCheck.minutesLate) : '',
                isApproved: true
            });

            await pushMessage(pendingCheckIn.user_id, flexMessage);
            
            console.log(`[Approve-Pending-CheckIn] Notification sent to ${pendingCheckIn.employee.name}`);
        } catch (notifyError) {
            console.error('[Approve-Pending-CheckIn] Failed to send notification:', notifyError);
            // Don't fail the approval if notification fails
        }

        // Log to SystemLog
        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                category: 'ADMIN',
                action: 'approvePendingCheckIn',
                message: `Admin ${admin.name} approved pending check-in for ${pendingCheckIn.employee.name}`,
                details: {
                    adminId: adminId,
                    employeeId: pendingCheckIn.user_id,
                    employeeName: pendingCheckIn.employee.name,
                    requestedTime: pendingCheckIn.requested_time.toISOString(),
                    distance: parseFloat(pendingCheckIn.distance),
                    attendanceId: attendance.id
                },
                user_id: adminId
            }
        }).catch(logError => {
            console.error('[Approve-Pending-CheckIn] SystemLog error:', logError);
        });

        return res.status(200).json({
            success: true,
            message: 'อนุมัติคำขอลงเวลาเข้างานสำเร็จ',
            data: {
                employeeName: pendingCheckIn.employee.name,
                requestedTime: formatTimeThai(pendingCheckIn.requested_time),
                attendanceId: attendance.id
            }
        });

    } catch (error) {
        console.error('[Approve-Pending-CheckIn] Error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการอนุมัติคำขอ'
        });
    }
};
