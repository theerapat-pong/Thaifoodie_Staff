// ========================================
// LIFF Admin Work Location Endpoint
// GET/PUT /api/liff/admin/work-location
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasAdminPrivileges } = require('../../../src/utils/roles');
const logger = require('../../../src/services/logger');

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

module.exports = async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    try {
        // Authenticate request
        const auth = await authenticateRequest(req);
        if (!auth.valid) {
            return res.status(401).json({
                success: false,
                error: auth.error || 'กรุณาเข้าสู่ระบบ'
            });
        }

        const userId = auth.userId;

        // Check if user is admin
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
            select: { id: true, name: true, role: true }
        });

        if (!employee || !hasAdminPrivileges(employee.role)) {
            return res.status(403).json({
                success: false,
                error: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'
            });
        }

        // Handle different methods
        if (req.method === 'GET') {
            return handleGet(req, res);
        } else if (req.method === 'PUT') {
            return handlePut(req, res, employee);
        } else {
            return res.status(405).json({
                success: false,
                error: 'Method not allowed'
            });
        }

    } catch (error) {
        console.error('[Work Location] Error:', error);
        
        await logger.error(
            'Admin',
            'Manage-Work-Location',
            `Error managing work location: ${error.message}`,
            { error: error.message, stack: error.stack, method: req.method }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการดำเนินการ'
        });
    }
};

/**
 * GET - ดึงข้อมูลตำแหน่งร้านปัจจุบัน
 */
async function handleGet(req, res) {
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
            warningRadius: location.warning_radius,
            isActive: location.is_active,
            createdAt: location.created_at,
            updatedAt: location.updated_at
        }
    });
}

/**
 * PUT - อัพเดทตำแหน่งร้าน
 */
async function handlePut(req, res, admin) {
    const { name, latitude, longitude, allowedRadius, warningRadius } = req.body;

    // Validate required fields
    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            success: false,
            error: 'กรุณาระบุพิกัด latitude และ longitude'
        });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    // Validate latitude
    if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
            success: false,
            error: 'ค่า latitude ไม่ถูกต้อง (ต้องอยู่ระหว่าง -90 ถึง 90)'
        });
    }

    // Validate longitude
    if (isNaN(lon) || lon < -180 || lon > 180) {
        return res.status(400).json({
            success: false,
            error: 'ค่า longitude ไม่ถูกต้อง (ต้องอยู่ระหว่าง -180 ถึง 180)'
        });
    }

    // Validate radius values
    const allowedRad = allowedRadius ? parseInt(allowedRadius) : 100;
    const warningRad = warningRadius ? parseInt(warningRadius) : 500;

    if (allowedRad < 10 || allowedRad > 1000) {
        return res.status(400).json({
            success: false,
            error: 'ระยะอนุญาตต้องอยู่ระหว่าง 10-1000 เมตร'
        });
    }

    if (warningRad < allowedRad || warningRad > 5000) {
        return res.status(400).json({
            success: false,
            error: 'ระยะเตือนต้องมากกว่าระยะอนุญาต และไม่เกิน 5000 เมตร'
        });
    }

    // Check if there's an existing active location
    const existingLocation = await prisma.workLocation.findFirst({
        where: { is_active: true }
    });

    let savedLocation;

    if (existingLocation) {
        // Update existing location (upsert - จำกัดตำแหน่งเดียว)
        savedLocation = await prisma.workLocation.update({
            where: { id: existingLocation.id },
            data: {
                name: name || 'ร้านหลัก',
                latitude: lat,
                longitude: lon,
                allowed_radius: allowedRad,
                warning_radius: warningRad
            }
        });
        console.log(`[Work Location] Updated by ${admin.name} (${admin.id}): ${lat}, ${lon}`);
    } else {
        // Create new location if none exists
        savedLocation = await prisma.workLocation.create({
            data: {
                name: name || 'ร้านหลัก',
                latitude: lat,
                longitude: lon,
                allowed_radius: allowedRad,
                warning_radius: warningRad,
                is_active: true
            }
        });
        console.log(`[Work Location] Created by ${admin.name} (${admin.id}): ${lat}, ${lon}`);
    }

    return res.status(200).json({
        success: true,
        message: 'บันทึกตำแหน่งร้านสำเร็จ',
        data: {
            id: savedLocation.id,
            name: savedLocation.name,
            latitude: parseFloat(savedLocation.latitude),
            longitude: parseFloat(savedLocation.longitude),
            allowedRadius: savedLocation.allowed_radius,
            warningRadius: savedLocation.warning_radius,
            isActive: savedLocation.is_active,
            createdAt: savedLocation.created_at,
            updatedAt: savedLocation.updated_at
        }
    });
}
