// ========================================
// LIFF Leave Pending Endpoint
// GET /api/liff/leave/pending
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { formatDateThai } = require('../../../src/utils/datetime');
const { formatRequestId } = require('../../../src/utils/format');
const logger = require('../../../src/services/logger');

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const skip = (page - 1) * limit;

        const where = {
            user_id: userId,
            status: 'PENDING'
        };

        const [leaves, total] = await Promise.all([
            prisma.leave.findMany({
                where,
                orderBy: {
                    created_at: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.leave.count({ where })
        ]);

        const formattedLeaves = leaves.map(leave => ({
            id: leave.id,
            formattedId: formatRequestId('LEV', leave.id, leave.created_at),
            leaveType: leave.leave_type,
            leaveTypeName: LEAVE_TYPES[leave.leave_type],
            startDate: formatDateThai(leave.start_date),
            endDate: formatDateThai(leave.end_date),
            startDateRaw: leave.start_date,
            endDateRaw: leave.end_date,
            totalDays: leave.total_days,
            reason: leave.reason || '-',
            createdAt: leave.created_at
        }));

        const hasMore = skip + formattedLeaves.length < total;

        return res.status(200).json({
            success: true,
            data: {
                leaves: formattedLeaves,
                total,
                page,
                limit,
                hasMore,
                nextPage: hasMore ? page + 1 : null
            }
        });

    } catch (error) {
        console.error('[Leave Pending] Error:', error);
        
        await logger.error(
            'Leave',
            'Get-Pending',
            `Error fetching pending leaves: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
