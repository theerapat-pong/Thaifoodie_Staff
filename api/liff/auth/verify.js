// ========================================
// LIFF Auth Verify Endpoint
// POST /api/liff/auth/verify
// ========================================

const { verifyAccessToken, getLineProfile } = require('../../../src/services/liff-auth');
const prisma = require('../../../src/lib/prisma');
const logger = require('../../../src/services/logger');

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

module.exports = async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
            .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            .end();
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
        // Get access token from header or body
        let accessToken;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.replace('Bearer ', '');
        } else if (req.body && req.body.accessToken) {
            accessToken = req.body.accessToken;
        }

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                error: 'Access token is required'
            });
        }

        // Verify token with LINE API
        const verification = await verifyAccessToken(accessToken);
        
        if (!verification.valid) {
            return res.status(401).json({
                success: false,
                error: verification.error || 'Invalid access token'
            });
        }

        // Get user profile from LINE
        const profile = await getLineProfile(accessToken);

        // Check if user exists in database
        const employee = await prisma.employee.findUnique({
            where: { id: profile.userId },
            select: {
                id: true,
                name: true,
                role: true,
                department: true,
                is_active: true,
                daily_salary: true,
                shift_start_time: true,
                shift_end_time: true
            }
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลพนักงาน กรุณาลงทะเบียนก่อน',
                profile: {
                    userId: profile.userId,
                    displayName: profile.displayName,
                    pictureUrl: profile.pictureUrl
                }
            });
        }

        if (!employee.is_active) {
            return res.status(403).json({
                success: false,
                error: 'บัญชีของคุณถูกระงับการใช้งาน'
            });
        }

        // Return success with user data
        return res.status(200).json({
            success: true,
            message: 'Token verified successfully',
            user: {
                id: employee.id,
                name: employee.name,
                role: employee.role,
                department: employee.department,
                dailySalary: employee.daily_salary,
                shiftStart: employee.shift_start_time,
                shiftEnd: employee.shift_end_time
            },
            profile: {
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
                statusMessage: profile.statusMessage
            },
            token: {
                expiresIn: verification.expiresIn
            }
        });

    } catch (error) {
        console.error('[Auth Verify] Error:', error);
        
        await logger.error(
            'Auth',
            'Verify-Token',
            `Error verifying auth token: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};
