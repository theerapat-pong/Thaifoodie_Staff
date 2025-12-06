// ========================================
// LIFF Leave Request Endpoint
// POST /api/liff/leave/request
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { formatDateThai, calculateDaysDifference, now } = require('../../../src/utils/datetime');
const { formatRequestId } = require('../../../src/utils/format');
const { pushMessage, notifyAdmin } = require('../../../src/services/line');
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

// Quota field mapping
const QUOTA_FIELDS = {
    SICK: 'quota_sick',
    PERSONAL: 'quota_personal',
    ANNUAL: 'quota_annual'
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
        const { leaveType, startDate, endDate, reason } = req.body;

        // Validate required fields
        if (!leaveType || !startDate) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุประเภทการลาและวันที่'
            });
        }

        // Validate leave type
        if (!LEAVE_TYPES[leaveType]) {
            return res.status(400).json({
                success: false,
                error: 'ประเภทการลาไม่ถูกต้อง'
            });
        }

        // Get employee data
        const employee = await prisma.employee.findUnique({
            where: { id: userId }
        });

        if (!employee || !employee.is_active) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลพนักงาน'
            });
        }

        // Parse dates
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : start;

        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'วันที่ไม่ถูกต้อง'
            });
        }

        if (end < start) {
            return res.status(400).json({
                success: false,
                error: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น'
            });
        }

        // Calculate total days
        const totalDays = calculateDaysDifference(start, end);

        // Check for overlapping leaves
        const overlapping = await prisma.leave.findFirst({
            where: {
                user_id: userId,
                status: { in: ['PENDING', 'APPROVED'] },
                OR: [
                    {
                        start_date: { lte: end },
                        end_date: { gte: start }
                    }
                ]
            }
        });

        if (overlapping) {
            return res.status(400).json({
                success: false,
                error: 'วันที่ขอลาซ้อนทับกับคำขอที่มีอยู่แล้ว',
                data: {
                    overlappingId: formatRequestId('LEV', overlapping.id, overlapping.created_at),
                    overlappingType: LEAVE_TYPES[overlapping.leave_type],
                    overlappingDate: `${formatDateThai(overlapping.start_date)} - ${formatDateThai(overlapping.end_date)}`
                }
            });
        }

        // Check quota (except for OTHER type)
        if (leaveType !== 'OTHER' && QUOTA_FIELDS[leaveType]) {
            const quotaField = QUOTA_FIELDS[leaveType];
            const totalQuota = employee[quotaField];

            // Get used days this year
            const currentYear = new Date().getFullYear();
            const usedLeaves = await prisma.leave.aggregate({
                where: {
                    user_id: userId,
                    leave_type: leaveType,
                    status: 'APPROVED',
                    start_date: {
                        gte: new Date(currentYear, 0, 1)
                    }
                },
                _sum: {
                    total_days: true
                }
            });

            const usedDays = usedLeaves._sum.total_days || 0;
            const remainingQuota = totalQuota - usedDays;

            if (totalDays > remainingQuota) {
                return res.status(400).json({
                    success: false,
                    error: `โควต้า${LEAVE_TYPES[leaveType]}ไม่เพียงพอ`,
                    data: {
                        requested: totalDays,
                        remaining: remainingQuota,
                        total: totalQuota,
                        used: usedDays
                    }
                });
            }
        }

        // Create leave request
        const leave = await prisma.leave.create({
            data: {
                user_id: userId,
                leave_type: leaveType,
                start_date: start,
                end_date: end,
                reason: reason || '',
                total_days: totalDays,
                status: 'PENDING'
            }
        });

        const formattedId = formatRequestId('LEV', leave.id, leave.created_at);

        // Notify admin
        try {
            const adminMessage = {
                type: 'text',
                text: `📋 คำขอลางานใหม่\n\n👤 ${employee.name}\n📝 ${LEAVE_TYPES[leaveType]}\n📅 ${formatDateThai(start)}${start.getTime() !== end.getTime() ? ` - ${formatDateThai(end)}` : ''}\n⏱ ${totalDays} วัน\n💬 ${reason || '-'}\n\n🔖 เลขที่: ${formattedId}`
            };
            await notifyAdmin(adminMessage);
        } catch (notifyError) {
            console.error('[Leave] Failed to notify admin:', notifyError);
        }

        return res.status(200).json({
            success: true,
            message: 'ส่งคำขอลางานสำเร็จ',
            data: {
                id: leave.id,
                formattedId,
                leaveType: leaveType,
                leaveTypeName: LEAVE_TYPES[leaveType],
                startDate: formatDateThai(start),
                endDate: formatDateThai(end),
                totalDays,
                reason: reason || '-',
                status: 'PENDING'
            }
        });

    } catch (error) {
        console.error('[Leave Request] Error:', error);
        
        await logger.error(
            'Leave',
            'Request-Leave',
            `Error requesting leave: ${error.message}`,
            {
                error: error.message,
                stack: error.stack,
                leaveType: req.body?.leaveType,
                userId: req.body?.userId
            },
            req.body?.userId
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการส่งคำขอ'
        });
    }
};
