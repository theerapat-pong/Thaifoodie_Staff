// ========================================
// LIFF Admin Reject Pending Check-in Endpoint
// POST /api/liff/admin/reject-pending-checkin
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasAdminPrivileges } = require('../../../src/utils/roles');
const { formatTimeThai } = require('../../../src/utils/datetime');
const { pushMessage } = require('../../../src/services/line');

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

        const { pendingId, reason } = req.body;

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
                        name: true
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

        // Delete pending check-in record (rejected, no attendance created)
        await prisma.pendingCheckIn.delete({
            where: { id: pendingCheckIn.id }
        });

        // Send LINE notification to employee
        try {
            const notificationMessage = 
                `❌ คำขอลงเวลาเข้างานถูกปฏิเสธ\n\n` +
                `⏰ เวลาที่ขอ: ${formatTimeThai(pendingCheckIn.requested_time)}\n` +
                `📝 เหตุผล: ${reason || 'ไม่ระบุเหตุผล'}\n\n` +
                `กรุณาติดต่อ Admin หากต้องการสอบถามเพิ่มเติม`;

            await pushMessage(pendingCheckIn.user_id, {
                type: 'text',
                text: notificationMessage
            });
            
            console.log(`[Reject-Pending-CheckIn] Notification sent to ${pendingCheckIn.employee.name}`);
        } catch (notifyError) {
            console.error('[Reject-Pending-CheckIn] Failed to send notification:', notifyError);
            // Don't fail the rejection if notification fails
        }

        // Log to SystemLog
        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                category: 'ADMIN',
                action: 'rejectPendingCheckIn',
                message: `Admin ${admin.name} rejected pending check-in for ${pendingCheckIn.employee.name}`,
                details: {
                    adminId: adminId,
                    employeeId: pendingCheckIn.user_id,
                    employeeName: pendingCheckIn.employee.name,
                    requestedTime: pendingCheckIn.requested_time.toISOString(),
                    distance: parseFloat(pendingCheckIn.distance),
                    rejectionReason: reason || 'ไม่ระบุเหตุผล'
                },
                user_id: adminId
            }
        }).catch(logError => {
            console.error('[Reject-Pending-CheckIn] SystemLog error:', logError);
        });

        return res.status(200).json({
            success: true,
            message: 'ปฏิเสธคำขอลงเวลาเข้างานสำเร็จ',
            data: {
                employeeName: pendingCheckIn.employee.name,
                requestedTime: formatTimeThai(pendingCheckIn.requested_time)
            }
        });

    } catch (error) {
        console.error('[Reject-Pending-CheckIn] Error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ'
        });
    }
};
