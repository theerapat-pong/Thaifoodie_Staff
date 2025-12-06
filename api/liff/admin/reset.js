// ========================================
// LIFF Admin Reset System Data Endpoint
// POST /api/liff/admin/reset
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { isDevRole } = require('../../../src/utils/roles');
const logger = require('../../../src/services/logger');

const TARGET_HANDLERS = {
    attendance: async (tx) => {
        await tx.attendance.deleteMany();
        await tx.$executeRawUnsafe('ALTER SEQUENCE IF EXISTS attendance_id_seq RESTART WITH 1;');
    },
    leaves: async (tx) => {
        await tx.leave.deleteMany();
        await tx.$executeRawUnsafe('ALTER SEQUENCE IF EXISTS leaves_id_seq RESTART WITH 1;');
    },
    advances: async (tx) => {
        await tx.advance.deleteMany();
        await tx.$executeRawUnsafe('ALTER SEQUENCE IF EXISTS advances_id_seq RESTART WITH 1;');
    },
    logs: async (tx) => {
        await tx.$executeRawUnsafe('TRUNCATE TABLE system_logs RESTART IDENTITY CASCADE;');
    },
};

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

    console.log('Reset Payload:', req.body);

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

        // Check if user is admin
        const admin = await prisma.employee.findUnique({
            where: { id: userId },
            select: { name: true, role: true, is_active: true }
        });

        if (!admin || !admin.is_active) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลผู้ใช้'
            });
        }

        if (!isDevRole(admin.role)) {
            return res.status(403).json({
                success: false,
                error: 'ฟังก์ชันนี้เปิดให้เฉพาะ DEV เท่านั้น'
            });
        }

        // Get confirmation from request
        const { targets } = req.body || {};

        if (!Array.isArray(targets) || targets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาเลือกประเภทข้อมูลที่ต้องการล้าง'
            });
        }

        const normalizedTargets = Array.from(new Set(
            targets
                .map(target => typeof target === 'string' ? target.trim().toLowerCase() : '')
                .filter(Boolean)
        ));

        const invalidTargets = normalizedTargets.filter(target => !TARGET_HANDLERS[target]);
        if (invalidTargets.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'รูปแบบเป้าหมายไม่ถูกต้อง',
                invalidTargets
            });
        }

        await prisma.$transaction(async (tx) => {
            for (const target of normalizedTargets) {
                await TARGET_HANDLERS[target](tx);
            }
        });

        console.log(`[Admin] System reset (${normalizedTargets.join(', ')}) by ${admin.name} (${userId}) via LIFF`);

        return res.status(200).json({
            success: true,
            message: 'ล้างข้อมูลที่เลือกเรียบร้อยแล้ว',
            cleared: normalizedTargets
        });

    } catch (error) {
        console.error('[Admin Reset] Error:', error);
        
        await logger.error(
            'Admin',
            'Reset-System',
            `Error resetting system data: ${error.message}`,
            {
                error: error.message,
                stack: error.stack,
                targets: req.body?.targets,
                userId: req.body?.userId
            },
            req.body?.userId
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการล้างข้อมูล'
        });
    }
};
