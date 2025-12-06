// ========================================
// LIFF Admin Pending Requests Endpoint
// GET /api/liff/admin/pending
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasAdminPrivileges } = require('../../../src/utils/roles');
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

        // Check if user is admin
        const admin = await prisma.employee.findUnique({
            where: { id: userId },
            select: { role: true, is_active: true }
        });

        if (!admin || !admin.is_active) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลผู้ใช้'
            });
        }

        if (!hasAdminPrivileges(admin.role)) {
            return res.status(403).json({
                success: false,
                error: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'
            });
        }

        // Get pending leaves with employee info
        const pendingLeaves = await prisma.leave.findMany({
            where: { status: 'PENDING' },
            include: {
                employee: {
                    select: {
                        name: true,
                        department: true
                    }
                }
            },
            orderBy: { created_at: 'asc' }
        });

        // Get pending advances with employee info
        const pendingAdvances = await prisma.advance.findMany({
            where: { status: 'PENDING' },
            include: {
                employee: {
                    select: {
                        name: true,
                        department: true
                    }
                }
            },
            orderBy: { created_at: 'asc' }
        });

        // Get pending check-ins (Yellow Zone requests)
        const pendingCheckIns = await prisma.pendingCheckIn.findMany({
            where: { status: 'PENDING' },
            include: {
                employee: {
                    select: {
                        name: true,
                        department: true
                    }
                }
            },
            orderBy: { created_at: 'asc' }
        });

        // Format leaves
        const formattedLeaves = pendingLeaves.map(leave => ({
            id: leave.id,
            formattedId: formatRequestId('LEV', leave.id, leave.created_at),
            type: 'leave',
            employeeName: leave.employee.name,
            department: leave.employee.department,
            leaveType: leave.leave_type,
            leaveTypeName: LEAVE_TYPES[leave.leave_type],
            startDate: formatDateThai(leave.start_date),
            endDate: formatDateThai(leave.end_date),
            startDateRaw: leave.start_date,
            endDateRaw: leave.end_date,
            totalDays: leave.total_days,
            reason: leave.reason || '-',
            createdAt: formatDateThai(leave.created_at),
            createdAtRaw: leave.created_at
        }));

        // Format advances
        const formattedAdvances = pendingAdvances.map(adv => ({
            id: adv.id,
            formattedId: formatRequestId('ADV', adv.id, adv.created_at),
            type: 'advance',
            employeeName: adv.employee.name,
            department: adv.employee.department,
            amount: parseFloat(adv.amount),
            reason: adv.reason || '-',
            createdAt: formatDateThai(adv.created_at),
            createdAtRaw: adv.created_at
        }));

        return res.status(200).json({
            success: true,
            data: {
                leaves: formattedLeaves,
                advances: formattedAdvances,
                totalLeaves: formattedLeaves.length,
                totalAdvances: formattedAdvances.length,
                totalCheckIns: pendingCheckIns.length,
                total: formattedLeaves.length + formattedAdvances.length + pendingCheckIns.length
            }
        });

    } catch (error) {
        console.error('[Admin Pending] Error:', error);
        
        await logger.error(
            'Admin',
            'Get-Pending-All',
            `Error fetching all pending requests: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
