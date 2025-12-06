// ========================================
// LIFF Admin Employees Endpoint
// GET/POST /api/liff/admin/employees
// ========================================

const prisma = require('../../../src/lib/prisma');
const { authenticateRequest } = require('../../../src/services/liff-auth');
const { hasAdminPrivileges } = require('../../../src/utils/roles');
const logger = require('../../../src/services/logger');

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

module.exports = async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

        // Check if user is admin
        const adminUser = await prisma.employee.findUnique({
            where: { id: auth.userId },
            select: { role: true }
        });

        if (!adminUser || !hasAdminPrivileges(adminUser.role)) {
            return res.status(403).json({
                success: false,
                error: 'เฉพาะ Admin เท่านั้นที่สามารถจัดการพนักงานได้'
            });
        }

        // Route based on method
        switch (req.method) {
            case 'GET':
                return await getEmployees(req, res);
            case 'POST':
                return await createEmployee(req, res);
            case 'PUT':
                return await updateEmployee(req, res);
            case 'DELETE':
                return await deleteEmployee(req, res);
            default:
                return res.status(405).json({ 
                    success: false, 
                    error: 'Method not allowed' 
                });
        }

    } catch (error) {
        console.error('[Admin Employees] Error:', error);
        
        await logger.error(
            'Admin',
            'Manage-Employees',
            `Error managing employees: ${error.message}`,
            {
                error: error.message,
                stack: error.stack,
                method: req.method
            }
        );
        
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ'
        });
    }
};

/**
 * GET - รายชื่อพนักงานทั้งหมด
 */
async function getEmployees(req, res) {
    const employees = await prisma.employee.findMany({
        select: {
            id: true,
            name: true,
            role: true,
            department: true,
            daily_salary: true,
            shift_start_time: true,
            shift_end_time: true,
            is_active: true,
            created_at: true
        },
        orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
        success: true,
        data: {
            employees: employees.map(emp => ({
                id: emp.id,
                idShort: emp.id.substring(0, 8) + '...',
                name: emp.name,
                role: emp.role,
                department: emp.department || '-',
                dailySalary: parseFloat(emp.daily_salary),
                shiftStart: emp.shift_start_time || '09:00',
                shiftEnd: emp.shift_end_time || '18:00',
                isActive: emp.is_active,
                createdAt: emp.created_at
            })),
            total: employees.length
        }
    });
}

/**
 * POST - เพิ่มพนักงานใหม่
 */
async function createEmployee(req, res) {
    const { 
        id,           // LINE User ID (จาก QR Code)
        name, 
        role = 'STAFF', 
        department, 
        dailySalary,
        shiftStart = '09:00',
        shiftEnd = '18:00'
    } = req.body;

    // Validate required fields
    if (!id) {
        return res.status(400).json({
            success: false,
            error: 'กรุณาระบุ LINE User ID (สแกน QR Code)'
        });
    }

    if (!name) {
        return res.status(400).json({
            success: false,
            error: 'กรุณาระบุชื่อพนักงาน'
        });
    }

    if (!dailySalary || isNaN(dailySalary) || dailySalary <= 0) {
        return res.status(400).json({
            success: false,
            error: 'กรุณาระบุรายได้ต่อวัน'
        });
    }

    // Validate LINE User ID format
    if (!id.startsWith('U') || id.length < 30) {
        return res.status(400).json({
            success: false,
            error: 'รูปแบบ LINE User ID ไม่ถูกต้อง'
        });
    }

    // Check if employee already exists
    const existing = await prisma.employee.findUnique({
        where: { id }
    });

    if (existing) {
        return res.status(409).json({
            success: false,
            error: `พนักงานนี้มีอยู่ในระบบแล้ว (${existing.name})`
        });
    }

    // Create new employee
    const normalizedRole = hasAdminPrivileges(role) ? role : 'STAFF';

    const employee = await prisma.employee.create({
        data: {
            id,
            name,
            role: normalizedRole,
            department: department || null,
            daily_salary: parseFloat(dailySalary),
            shift_start_time: shiftStart,
            shift_end_time: shiftEnd,
            is_active: true,
            quota_sick: 30,
            quota_personal: 3,
            quota_annual: 6
        }
    });

    return res.status(201).json({
        success: true,
        message: `เพิ่มพนักงาน "${name}" สำเร็จ`,
        data: {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            department: employee.department,
            dailySalary: parseFloat(employee.daily_salary)
        }
    });
}

/**
 * PUT - แก้ไขข้อมูลพนักงาน
 */
async function updateEmployee(req, res) {
    const { 
        id,
        name, 
        role, 
        department, 
        dailySalary,
        shiftStart,
        shiftEnd,
        isActive
    } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: 'กรุณาระบุ ID พนักงาน'
        });
    }

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
        where: { id }
    });

    if (!existing) {
        return res.status(404).json({
            success: false,
            error: 'ไม่พบพนักงานในระบบ'
        });
    }

    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = hasAdminPrivileges(role) ? role : 'STAFF';
    if (department !== undefined) updateData.department = department || null;
    if (dailySalary) updateData.daily_salary = parseFloat(dailySalary);
    if (shiftStart) updateData.shift_start_time = shiftStart;
    if (shiftEnd) updateData.shift_end_time = shiftEnd;
    if (typeof isActive === 'boolean') updateData.is_active = isActive;

    const employee = await prisma.employee.update({
        where: { id },
        data: updateData
    });

    return res.status(200).json({
        success: true,
        message: `อัพเดทข้อมูล "${employee.name}" สำเร็จ`,
        data: {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            isActive: employee.is_active
        }
    });
}

/**
 * DELETE - ลบพนักงาน (soft delete โดย set is_active = false)
 */
async function deleteEmployee(req, res) {
    const { id, permanent = false } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: 'กรุณาระบุ ID พนักงาน'
        });
    }

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
        where: { id }
    });

    if (!existing) {
        return res.status(404).json({
            success: false,
            error: 'ไม่พบพนักงานในระบบ'
        });
    }

    if (permanent) {
        // Hard delete - ลบจริง (ระวัง!)
        await prisma.employee.delete({
            where: { id }
        });

        return res.status(200).json({
            success: true,
            message: `ลบพนักงาน "${existing.name}" ออกจากระบบแล้ว`
        });
    } else {
        // Soft delete - แค่ปิดการใช้งาน
        await prisma.employee.update({
            where: { id },
            data: { is_active: false }
        });

        return res.status(200).json({
            success: true,
            message: `ปิดการใช้งานพนักงาน "${existing.name}" แล้ว`
        });
    }
}
