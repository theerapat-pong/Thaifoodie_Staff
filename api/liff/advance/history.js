// ========================================
// LIFF Advance History Endpoint
// GET /api/liff/advance/history
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

// Status mapping
const STATUS_LABELS = {
    PENDING: 'รออนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ไม่อนุมัติ',
    CANCELLED: 'ยกเลิกแล้ว'
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
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;

        // Build where clause
        const where = { user_id: userId };
        if (status && STATUS_LABELS[status]) {
            where.status = status;
        }

        // Get advance history
        const advances = await prisma.advance.findMany({
            where,
            orderBy: {
                created_at: 'desc'
            },
            take: limit
        });

        const formattedAdvances = advances.map(adv => ({
            id: adv.id,
            formattedId: formatRequestId('ADV', adv.id, adv.created_at),
            amount: parseFloat(adv.amount),
            reason: adv.reason || '-',
            status: adv.status,
            statusLabel: STATUS_LABELS[adv.status],
            createdAt: formatDateThai(adv.created_at),
            createdAtRaw: adv.created_at,
            approvedAt: adv.approved_at ? formatDateThai(adv.approved_at) : null,
            approvedBy: adv.approved_by
        }));

        return res.status(200).json({
            success: true,
            data: {
                advances: formattedAdvances,
                total: formattedAdvances.length
            }
        });

    } catch (error) {
        console.error('[Advance History] Error:', error);
        
        await logger.error(
            'Advance',
            'Get-History',
            `Error fetching advance history: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
