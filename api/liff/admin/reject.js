// ========================================
// LIFF Admin Reject Endpoint
// POST /api/liff/admin/reject
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasAdminPrivileges } = require('../../../src/utils/roles');
const { formatRequestId } = require('../../../src/utils/format');
const { pushMessage } = require('../../../src/services/line');
const logger = require('../../../src/services/logger');

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

// Leave type mapping
const LEAVE_TYPES = {
    SICK: 'ลาป่วย',
    PERSONAL: 'ลากิจ',
    ANNUAL: 'ลาพักร้อน',
    OTHER: 'อื่นๆ'
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

        const adminId = auth.userId || req.body?.userId;
        const { type, id, reason } = req.body;

        // Validate input
        if (!type || !id) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุประเภทและรหัสคำขอ'
            });
        }

        if (!['leave', 'advance'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'ประเภทคำขอไม่ถูกต้อง'
            });
        }

        // Check if user is admin
        const admin = await prisma.employee.findUnique({
            where: { id: adminId },
            select: { role: true, name: true, is_active: true }
        });

        if (!admin || !admin.is_active || !hasAdminPrivileges(admin.role)) {
            return res.status(403).json({
                success: false,
                error: 'คุณไม่มีสิทธิ์ดำเนินการนี้'
            });
        }

        const now = new Date();
        let result;
        let notifyUserId;
        let notifyMessage;

        if (type === 'leave') {
            // Get leave request
            const leave = await prisma.leave.findUnique({
                where: { id: parseInt(id) },
                include: {
                    employee: { select: { name: true } }
                }
            });

            if (!leave) {
                return res.status(404).json({
                    success: false,
                    error: 'ไม่พบคำขอลางาน'
                });
            }

            if (leave.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'คำขอนี้ได้รับการดำเนินการแล้ว'
                });
            }

            // Reject leave
            result = await prisma.leave.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'REJECTED',
                    approved_by: adminId,
                    approved_at: now
                }
            });

            notifyUserId = leave.user_id;
            notifyMessage = `❌ คำขอลางานไม่ได้รับการอนุมัติ\n\n📋 ${LEAVE_TYPES[leave.leave_type]}\n🔖 ${formatRequestId('LEV', leave.id, leave.created_at)}\n👤 โดย: ${admin.name}${reason ? `\n💬 เหตุผล: ${reason}` : ''}`;

        } else {
            // Get advance request
            const advance = await prisma.advance.findUnique({
                where: { id: parseInt(id) },
                include: {
                    employee: { select: { name: true } }
                }
            });

            if (!advance) {
                return res.status(404).json({
                    success: false,
                    error: 'ไม่พบคำขอเบิกเงิน'
                });
            }

            if (advance.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'คำขอนี้ได้รับการดำเนินการแล้ว'
                });
            }

            // Reject advance
            result = await prisma.advance.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'REJECTED',
                    approved_by: adminId,
                    approved_at: now
                }
            });

            notifyUserId = advance.user_id;
            notifyMessage = `❌ คำขอเบิกเงินไม่ได้รับการอนุมัติ\n\n💰 ${parseFloat(advance.amount).toLocaleString()} บาท\n🔖 ${formatRequestId('ADV', advance.id, advance.created_at)}\n👤 โดย: ${admin.name}${reason ? `\n💬 เหตุผล: ${reason}` : ''}`;
        }

        // Notify user
        try {
            await pushMessage(notifyUserId, { type: 'text', text: notifyMessage });
        } catch (notifyError) {
            console.error('[Admin Reject] Failed to notify user:', notifyError);
        }

        return res.status(200).json({
            success: true,
            message: 'ปฏิเสธคำขอสำเร็จ',
            data: {
                id: result.id,
                formattedId: formatRequestId(type === 'leave' ? 'LEV' : 'ADV', result.id, result.created_at),
                type,
                status: 'REJECTED'
            }
        });

    } catch (error) {
        console.error('[Admin Reject] Error:', error);
        
        await logger.error(
            'Admin',
            'Reject-Request',
            `Error rejecting ${req.body?.type} request: ${error.message}`,
            {
                error: error.message,
                stack: error.stack,
                requestType: req.body?.type,
                requestId: req.body?.id
            },
            req.body?.userId
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการปฏิเสธ'
        });
    }
};
