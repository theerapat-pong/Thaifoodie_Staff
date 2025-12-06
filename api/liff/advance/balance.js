// ========================================
// LIFF Advance Balance Endpoint
// GET /api/liff/advance/balance
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { formatDateThai } = require('../../../src/utils/datetime');
const logger = require('../../../src/services/logger');

const toNumber = (value) => parseFloat(value ?? '0');

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

        // Get employee data
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                daily_salary: true,
                is_active: true
            }
        });

        if (!employee || !employee.is_active) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลพนักงาน'
            });
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            attendanceSummary,
            approvedAdvanceSummary,
            pendingAdvanceSummary,
            recentApprovedAdvances,
            monthAttendanceSummary
        ] = await Promise.all([
            prisma.attendance.aggregate({
                where: {
                    user_id: userId,
                    check_out_time: { not: null }
                },
                _sum: { daily_wage: true },
                _count: { id: true }
            }),
            prisma.advance.aggregate({
                where: {
                    user_id: userId,
                    status: 'APPROVED'
                },
                _sum: { amount: true }
            }),
            prisma.advance.aggregate({
                where: {
                    user_id: userId,
                    status: 'PENDING'
                },
                _sum: { amount: true }
            }),
            prisma.advance.findMany({
                where: {
                    user_id: userId,
                    status: 'APPROVED'
                },
                orderBy: {
                    approved_at: 'desc'
                },
                take: 10
            }),
            prisma.attendance.aggregate({
                where: {
                    user_id: userId,
                    check_out_time: { not: null },
                    date: { gte: startOfMonth }
                },
                _sum: { daily_wage: true },
                _count: { id: true }
            })
        ]);

        const accruedSalary = toNumber(attendanceSummary._sum.daily_wage);
        const totalDaysWorked = attendanceSummary._count?.id || 0;
        const totalAdvanced = toNumber(approvedAdvanceSummary._sum.amount);
        const pendingTotal = toNumber(pendingAdvanceSummary._sum.amount);
        const balance = accruedSalary - totalAdvanced;
        const availableBalance = balance - pendingTotal;

        const thisMonthDays = monthAttendanceSummary._count?.id || 0;
        const thisMonthSalary = toNumber(monthAttendanceSummary._sum.daily_wage);

        const recentAdvances = recentApprovedAdvances.map((adv) => ({
            id: adv.id,
            type: 'advance',
            amount: -parseFloat(adv.amount),
            reason: adv.reason,
            date: formatDateThai(adv.approved_at),
            dateRaw: adv.approved_at
        }));

        return res.status(200).json({
            success: true,
            data: {
                employee: {
                    name: employee.name,
                    dailySalary: parseFloat(employee.daily_salary)
                },
                balance: {
                    accrued: accruedSalary,
                    advanced: totalAdvanced,
                    pending: pendingTotal,
                    remaining: balance,
                    available: availableBalance
                },
                stats: {
                    totalDaysWorked,
                    thisMonthDays,
                    thisMonthEarning: thisMonthSalary
                },
                recentAdvances
            }
        });

    } catch (error) {
        console.error('[Balance] Error:', error);
        
        await logger.error(
            'Advance',
            'Get-Balance',
            `Error fetching balance: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
