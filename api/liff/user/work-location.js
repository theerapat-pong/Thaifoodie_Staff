// ========================================
// LIFF User Work Location Endpoint
// GET /api/liff/user/work-location
// Public endpoint for all authenticated users
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
        // Authenticate request (any user can access)
        const auth = await authenticateRequest(req);
        if (!auth.valid) {
            return res.status(401).json({
                success: false,
                error: auth.error || 'กรุณาเข้าสู่ระบบ'
            });
        }

        // Get active work location
        const location = await prisma.workLocation.findFirst({
            where: { is_active: true },
            orderBy: { created_at: 'desc' }
        });

        if (!location) {
            return res.status(200).json({
                success: true,
                data: null,
                message: 'ยังไม่มีการตั้งค่าตำแหน่งร้าน'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                id: location.id,
                name: location.name,
                latitude: parseFloat(location.latitude),
                longitude: parseFloat(location.longitude),
                allowedRadius: location.allowed_radius,
                warningRadius: location.warning_radius
            }
        });

    } catch (error) {
        console.error('[User Work Location] Error:', error);
        
        await logger.error(
            'User',
            'Get-Work-Location',
            `Error fetching work location: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่งร้าน'
        });
    }
};
