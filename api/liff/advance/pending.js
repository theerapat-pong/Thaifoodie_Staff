// ========================================
// LIFF Advance Pending Endpoint
// GET /api/liff/advance/pending
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

        const [advances, total] = await Promise.all([
            prisma.advance.findMany({
                where,
                orderBy: {
                    created_at: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.advance.count({ where })
        ]);

        const formattedAdvances = advances.map(adv => ({
            id: adv.id,
            formattedId: formatRequestId('ADV', adv.id, adv.created_at),
            amount: parseFloat(adv.amount),
            reason: adv.reason || '-',
            createdAt: formatDateThai(adv.created_at),
            createdAtRaw: adv.created_at
        }));

        const hasMore = skip + formattedAdvances.length < total;

        return res.status(200).json({
            success: true,
            data: {
                advances: formattedAdvances,
                total,
                page,
                limit,
                hasMore,
                nextPage: hasMore ? page + 1 : null
            }
        });

    } catch (error) {
        console.error('[Advance Pending] Error:', error);
        
        await logger.error(
            'Advance',
            'Get-Pending',
            `Error fetching pending advances: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
