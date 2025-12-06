// ========================================
// LIFF User Profile Endpoint
// GET /api/liff/user/profile
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
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

        // Get employee data with full details
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                role: true,
                department: true,
                daily_salary: true,
                shift_start_time: true,
                shift_end_time: true,
                is_active: true,
                quota_sick: true,
                quota_personal: true,
                quota_annual: true
            }
        });

        if (!employee || !employee.is_active) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลพนักงาน'
            });
        }

        const currentYear = new Date().getFullYear();

        const [
            attendanceSummary,
            approvedAdvanceSummary,
            pendingLeaves,
            pendingAdvances,
            usedLeaves
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
            prisma.leave.count({
                where: {
                    user_id: userId,
                    status: 'PENDING'
                }
            }),
            prisma.advance.count({
                where: {
                    user_id: userId,
                    status: 'PENDING'
                }
            }),
            prisma.leave.groupBy({
                by: ['leave_type'],
                where: {
                    user_id: userId,
                    status: 'APPROVED',
                    start_date: {
                        gte: new Date(currentYear, 0, 1)
                    }
                },
                _sum: {
                    total_days: true
                }
            })
        ]);

        const accruedSalary = toNumber(attendanceSummary._sum.daily_wage);
        const daysWorked = attendanceSummary._count?.id || 0;
        const totalAdvanced = toNumber(approvedAdvanceSummary._sum.amount);
        const balance = accruedSalary - totalAdvanced;

        // Calculate remaining quota
        const leaveUsage = {
            SICK: 0,
            PERSONAL: 0,
            ANNUAL: 0
        };

        usedLeaves.forEach((leave) => {
            leaveUsage[leave.leave_type] = leave._sum.total_days || 0;
        });

        return res.status(200).json({
            success: true,
            data: {
                employee: {
                    id: employee.id,
                    name: employee.name,
                    role: employee.role,
                    department: employee.department,
                    dailySalary: parseFloat(employee.daily_salary),
                    shiftStart: employee.shift_start_time,
                    shiftEnd: employee.shift_end_time,
                    isActive: employee.is_active
                },
                balance: {
                    accrued: accruedSalary,
                    advanced: totalAdvanced,
                    remaining: balance,
                    daysWorked
                },
                pendingRequests: {
                    leaves: pendingLeaves,
                    advances: pendingAdvances,
                    total: pendingLeaves + pendingAdvances
                },
                leaveQuota: {
                    sick: {
                        total: employee.quota_sick,
                        used: leaveUsage.SICK,
                        remaining: employee.quota_sick - leaveUsage.SICK
                    },
                    personal: {
                        total: employee.quota_personal,
                        used: leaveUsage.PERSONAL,
                        remaining: employee.quota_personal - leaveUsage.PERSONAL
                    },
                    annual: {
                        total: employee.quota_annual,
                        used: leaveUsage.ANNUAL,
                        remaining: employee.quota_annual - leaveUsage.ANNUAL
                    }
                }
            }
        });

    } catch (error) {
        console.error('[User Profile] Error:', error);
        
        await logger.error(
            'User',
            'Get-Profile',
            `Error fetching user profile: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};