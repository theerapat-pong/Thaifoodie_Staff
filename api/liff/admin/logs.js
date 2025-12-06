// ========================================
// Admin Logs API - View system logs
// GET /api/liff/admin/logs
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasAdminPrivileges } = require('../../../src/utils/roles');

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
        Object.entries(corsHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
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

        // Check admin permission
        const admin = await prisma.employee.findUnique({
            where: { id: auth.userId },
            select: { role: true }
        });

        if (!admin || !hasAdminPrivileges(admin.role)) {
            return res.status(403).json({
                success: false,
                error: 'ต้องการสิทธิ์ Admin'
            });
        }

        // Parse query parameters
        const {
            level,
            category,
            userId,
            limit = '100',
            offset = '0',
            startDate,
            endDate
        } = req.query;

        // Build where clause
        const where = {};
        
        if (level) {
            where.level = level;
        }
        
        if (category) {
            where.category = category;
        }
        
        if (userId) {
            where.user_id = userId;
        }

        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) {
                where.created_at.gte = new Date(startDate);
            }
            if (endDate) {
                where.created_at.lte = new Date(endDate);
            }
        }

        // Fetch logs
        const [logs, total] = await Promise.all([
            prisma.systemLog.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.systemLog.count({ where })
        ]);

        // Get category summary
        const categories = await prisma.systemLog.groupBy({
            by: ['category'],
            _count: { id: true }
        });

        // Get level summary (last 24 hours)
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const levelSummary = await prisma.systemLog.groupBy({
            by: ['level'],
            where: { created_at: { gte: last24h } },
            _count: { id: true }
        });

        return res.status(200).json({
            success: true,
            data: {
                logs: logs.map(log => ({
                    id: log.id,
                    level: log.level,
                    category: log.category,
                    action: log.action,
                    message: log.message,
                    details: log.details,
                    userId: log.user_id,
                    userAgent: log.user_agent,
                    createdAt: log.created_at
                })),
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + logs.length < total
                },
                summary: {
                    categories: categories.map(c => ({
                        name: c.category,
                        count: c._count.id
                    })),
                    last24h: {
                        total: levelSummary.reduce((sum, l) => sum + l._count.id, 0),
                        byLevel: levelSummary.reduce((obj, l) => {
                            obj[l.level] = l._count.id;
                            return obj;
                        }, {})
                    }
                }
            }
        });

    } catch (error) {
        console.error('[Admin Logs] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'ไม่สามารถดึงข้อมูล logs ได้'
        });
    }
};
