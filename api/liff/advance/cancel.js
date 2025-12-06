// ========================================
// LIFF Advance Cancel Endpoint
// POST /api/liff/advance/cancel
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { formatRequestId } = require('../../../src/utils/format');
const logger = require('../../../src/services/logger');

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
        const { advanceId } = req.body;

        if (!advanceId) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุรหัสคำขอ'
            });
        }

        // Get advance request
        const advance = await prisma.advance.findUnique({
            where: { id: parseInt(advanceId) }
        });

        if (!advance) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบคำขอเบิกเงิน'
            });
        }

        // Verify ownership
        if (advance.user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'คุณไม่มีสิทธิ์ยกเลิกคำขอนี้'
            });
        }

        // Check if can be cancelled (only PENDING)
        if (advance.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                error: 'ไม่สามารถยกเลิกคำขอที่ดำเนินการแล้วได้'
            });
        }

        // Update status to CANCELLED
        await prisma.advance.update({
            where: { id: parseInt(advanceId) },
            data: { status: 'CANCELLED' }
        });

        return res.status(200).json({
            success: true,
            message: 'ยกเลิกคำขอเบิกเงินสำเร็จ',
            data: {
                id: advance.id,
                formattedId: formatRequestId('ADV', advance.id, advance.created_at)
            }
        });

    } catch (error) {
        console.error('[Advance Cancel] Error:', error);
        
        await logger.error(
            'Advance',
            'Cancel-Advance',
            `Error canceling advance: ${error.message}`,
            { error: error.message, stack: error.stack, advanceId: req.body?.id },
            req.body?.userId
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการยกเลิกคำขอ'
        });
    }
};
