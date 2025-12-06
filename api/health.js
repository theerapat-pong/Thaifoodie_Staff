require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client with error handling
let prisma;
try {
    prisma = new PrismaClient();
} catch (e) {
    console.error('Failed to initialize Prisma Client:', e);
}

module.exports = async function handler(req, res) {
    // Set headers to prevent caching
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const startTime = Date.now();

    // Default status structure matching frontend expectations
    const status = {
        status: 'operational',
        timestamp: new Date().toISOString(),
        components: {
            database: { status: 'checking' },
            line_api: { status: 'checking' },
            attendance_system: { status: 'checking' },
            leave_system: { status: 'checking' },
            advance_system: { status: 'checking' },
            cron_job: { status: 'checking' },
            server: { status: 'operational', uptime: process.uptime() }
        }
    };

    try {
        if (!prisma) {
            throw new Error('Prisma Client not initialized');
        }

        // 1. Check Database & Core Tables
        const dbStart = Date.now();

        // Use Promise.allSettled to prevent one failure from crashing everything
        const results = await Promise.allSettled([
            prisma.employee.count(),
            prisma.attendance.count(),
            prisma.leave.count(),
            prisma.advance.count()
        ]);

        const dbLatency = Date.now() - dbStart;

        // Database Status (Based on Employee table check)
        if (results[0].status === 'fulfilled') {
            status.components.database = {
                status: 'operational',
                latency: dbLatency + 'ms',
                message: `Connected (Employees: ${results[0].value})`
            };
        } else {
            throw new Error('Database connection failed: ' + results[0].reason.message);
        }

        // Attendance Status
        if (results[1].status === 'fulfilled') {
            status.components.attendance_system = {
                status: 'operational',
                message: `Active (Records: ${results[1].value})`
            };
        } else {
            status.components.attendance_system = { status: 'issue', message: 'Error reading records' };
        }

        // Leave Status
        if (results[2].status === 'fulfilled') {
            status.components.leave_system = {
                status: 'operational',
                message: `Active (Requests: ${results[2].value})`
            };
        } else {
            status.components.leave_system = { status: 'issue', message: 'Error reading records' };
        }

        // Advance Status
        if (results[3].status === 'fulfilled') {
            status.components.advance_system = {
                status: 'operational',
                message: `Active (Requests: ${results[3].value})`
            };
        } else {
            status.components.advance_system = { status: 'issue', message: 'Error reading records' };
        }

    } catch (error) {
        console.error('Health Check Error:', error);
        status.status = 'degraded';

        // Update DB status to outage
        status.components.database = {
            status: 'outage',
            message: 'Connection failed',
            error: error.message
        };

        // If DB is down, mark others as outage too
        const dbErrorMsg = 'Database unavailable';
        if (status.components.attendance_system.status === 'checking') status.components.attendance_system = { status: 'outage', message: dbErrorMsg };
        if (status.components.leave_system.status === 'checking') status.components.leave_system = { status: 'outage', message: dbErrorMsg };
        if (status.components.advance_system.status === 'checking') status.components.advance_system = { status: 'outage', message: dbErrorMsg };
    }

    // 2. Check Configuration
    const requiredEnv = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET', 'DATABASE_URL'];
    const missingEnv = requiredEnv.filter(key => !process.env[key]);

    if (missingEnv.length === 0) {
        status.components.line_api = {
            status: 'operational',
            message: 'Configuration loaded'
        };
    } else {
        status.status = 'degraded';
        status.components.line_api = {
            status: 'issue',
            message: 'Missing configuration',
            details: missingEnv
        };
    }

    // 3. Check Cron Configuration
    if (process.env.CRON_SECRET) {
        status.components.cron_job = {
            status: 'operational',
            message: 'Secret configured'
        };
    } else {
        status.components.cron_job = {
            status: 'issue',
            message: 'Missing CRON_SECRET'
        };
    }

    // Final response
    const totalTime = Date.now() - startTime;
    res.status(200).json({ ...status, response_time: totalTime + 'ms' });
};
