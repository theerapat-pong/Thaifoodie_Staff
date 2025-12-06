// ========================================
// System Logs API - DEV Role Only
// ========================================

const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasDevPrivileges } = require('../../../src/utils/roles');
const prisma = require('../../../src/lib/prisma');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        // 1. Authenticate request
        const auth = await authenticateRequest(req);
        if (!auth.valid) {
            return res.status(401).json({ 
                success: false, 
                error: auth.error || 'Authentication required' 
            });
        }

        const { userId } = auth;

        // 2. Get employee from database
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
            select: { id: true, name: true, role: true }
        });

        if (!employee) {
            return res.status(404).json({ 
                success: false, 
                error: 'Employee not found' 
            });
        }

        // 3. Check DEV role
        if (!hasDevPrivileges(employee.role)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied. DEV role required.' 
            });
        }

        // 4. Parse query parameters
        const url = new URL(req.url, `http://${req.headers.host}`);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200); // Max 200
        const level = url.searchParams.get('level'); // INFO, WARN, ERROR
        const category = url.searchParams.get('category'); // GPS, CHECK_IN, etc.
        const userId_filter = url.searchParams.get('userId');

        // 5. Build query filter
        const where = {};
        if (level) where.level = level;
        if (category) where.category = category;
        if (userId_filter) where.user_id = userId_filter;

        // 6. Get total count and logs
        const [total, logs] = await Promise.all([
            prisma.systemLog.count({ where }),
            prisma.systemLog.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    level: true,
                    category: true,
                    action: true,
                    message: true,
                    details: true,
                    user_id: true,
                    user_agent: true,
                    ip_address: true,
                    duration_ms: true,
                    created_at: true
                }
            })
        ]);

        // 7. Calculate pagination
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('[System Logs API] Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};
