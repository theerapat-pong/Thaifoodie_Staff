// ========================================
// LIFF Advance Request Endpoint
// POST /api/liff/advance/request
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { formatRequestId } = require('../../../src/utils/format');
const { notifyAdmin } = require('../../../src/services/line');
const logger = require('../../../src/services/logger');

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
        const { amount, reason } = req.body;

        // Validate amount
        const requestAmount = parseFloat(amount);
        if (!requestAmount || requestAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุจำนวนเงินที่ถูกต้อง'
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

        let transactionResult;
        try {
            transactionResult = await prisma.$transaction(async (tx) => {
                const [attendanceSummary, approvedAdvanceSummary, pendingAdvanceSummary] = await Promise.all([
                    tx.attendance.aggregate({
                        where: {
                            user_id: userId,
                            check_out_time: { not: null }
                        },
                        _sum: { daily_wage: true }
                    }),
                    tx.advance.aggregate({
                        where: {
                            user_id: userId,
                            status: 'APPROVED'
                        },
                        _sum: { amount: true }
                    }),
                    tx.advance.aggregate({
                        where: {
                            user_id: userId,
                            status: 'PENDING'
                        },
                        _sum: { amount: true }
                    })
                ]);

                const accruedSalary = toNumber(attendanceSummary._sum.daily_wage);
                const approvedTotal = toNumber(approvedAdvanceSummary._sum.amount);
                const pendingTotal = toNumber(pendingAdvanceSummary._sum.amount);
                const balance = accruedSalary - approvedTotal;
                const availableBalance = balance - pendingTotal;

                if (requestAmount > availableBalance) {
                    const error = new Error('ยอดเงินไม่เพียงพอ');
                    error.code = 'INSUFFICIENT_BALANCE';
                    error.meta = {
                        requested: requestAmount,
                        available: availableBalance,
                        balance,
                        pending: pendingTotal
                    };
                    throw error;
                }

                const advance = await tx.advance.create({
                    data: {
                        user_id: userId,
                        amount: requestAmount,
                        reason: reason || '',
                        status: 'PENDING'
                    }
                });

                return {
                    advance,
                    availableBalance,
                    pendingTotal,
                    balance
                };
            });
        } catch (transactionError) {
            if (transactionError.code === 'INSUFFICIENT_BALANCE') {
                return res.status(400).json({
                    success: false,
                    error: transactionError.message,
                    data: transactionError.meta
                });
            }
            throw transactionError;
        }

        const { advance, availableBalance } = transactionResult;

        const formattedId = formatRequestId('ADV', advance.id, advance.created_at);

        // Notify admin
        try {
            const adminMessage = {
                type: 'text',
                text: `💰 คำขอเบิกเงินใหม่\n\n👤 ${employee.name}\n💵 ${requestAmount.toLocaleString()} บาท\n💬 ${reason || '-'}\n\n🔖 เลขที่: ${formattedId}`
            };
            await notifyAdmin(adminMessage);
        } catch (notifyError) {
            console.error('[Advance] Failed to notify admin:', notifyError);
        }

        return res.status(200).json({
            success: true,
            message: 'ส่งคำขอเบิกเงินสำเร็จ',
            data: {
                id: advance.id,
                formattedId,
                amount: requestAmount,
                reason: reason || '-',
                status: 'PENDING',
                newAvailableBalance: availableBalance - requestAmount
            }
        });

    } catch (error) {
        console.error('[Advance Request] Error:', error);
        
        await logger.error(
            'Advance',
            'Request-Advance',
            `Error requesting advance: ${error.message}`,
            {
                error: error.message,
                stack: error.stack,
                amount: req.body?.amount,
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
