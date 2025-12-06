// ========================================
// LIFF Leave Quota Endpoint
// GET /api/liff/leave/quota
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
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

        // Get employee data
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
            select: {
                quota_sick: true,
                quota_personal: true,
                quota_annual: true
            }
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลพนักงาน'
            });
        }

        // Get used leaves this year
        const currentYear = new Date().getFullYear();
        const usedLeaves = await prisma.leave.groupBy({
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
        });

        // Calculate remaining quota
        const usage = {
            SICK: 0,
            PERSONAL: 0,
            ANNUAL: 0
        };

        usedLeaves.forEach(leave => {
            usage[leave.leave_type] = leave._sum.total_days || 0;
        });

        return res.status(200).json({
            success: true,
            data: {
                year: currentYear,
                quota: {
                    sick: {
                        name: 'ลาป่วย',
                        total: employee.quota_sick,
                        used: usage.SICK,
                        remaining: employee.quota_sick - usage.SICK
                    },
                    personal: {
                        name: 'ลากิจ',
                        total: employee.quota_personal,
                        used: usage.PERSONAL,
                        remaining: employee.quota_personal - usage.PERSONAL
                    },
                    annual: {
                        name: 'ลาพักร้อน',
                        total: employee.quota_annual,
                        used: usage.ANNUAL,
                        remaining: employee.quota_annual - usage.ANNUAL
                    }
                }
            }
        });

    } catch (error) {
        console.error('[Leave Quota] Error:', error);
        
        await logger.error(
            'Leave',
            'Get-Quota',
            `Error fetching leave quota: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
