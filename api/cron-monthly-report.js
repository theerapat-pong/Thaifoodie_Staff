// ========================================
// Cron Job: Monthly Report Generator
// ทำงานทุกวันที่ 1 ของเดือน เวลา 09:00 (Bangkok Time)
// ========================================

require('dotenv').config();
const prisma = require('../src/lib/prisma');
const logger = require('../src/services/logger');

const { notifyAdmin } = require('../src/services/line');
const { formatDateThai } = require('../src/utils/datetime');
const dayjs = require('dayjs');

/**
 * Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
    // ตรวจสอบ Cron Secret (ถ้ามี)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('[Cron] Running monthly report generator...');

        // คำนวณเดือนที่ผ่านมา
        const lastMonth = dayjs().subtract(1, 'month');
        const startOfMonth = lastMonth.startOf('month').toDate();
        const endOfMonth = lastMonth.endOf('month').toDate();

        const monthName = lastMonth.format('MMMM YYYY');

        // ดึงข้อมูลพนักงานทั้งหมด
        const employees = await prisma.employee.findMany({
            where: { is_active: true },
        });

        let reportMessage = `📊 รายงานสรุปประจำเดือน ${monthName}\n\n`;

        for (const emp of employees) {
            // นับจำนวนวันทำงาน
            const attendanceRecords = await prisma.attendance.findMany({
                where: {
                    user_id: emp.id,
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                    check_out_time: { not: null }, // นับแค่ Check-out แล้ว
                },
            });

            const totalDays = attendanceRecords.length;
            const totalHours = attendanceRecords.reduce((sum, rec) => {
                return sum + (parseFloat(rec.total_hours) || 0);
            }, 0);

            const totalWages = attendanceRecords.reduce((sum, rec) => {
                return sum + (parseFloat(rec.daily_wage) || 0);
            }, 0);

            // นับจำนวนเงินที่เบิก
            const advances = await prisma.advance.findMany({
                where: {
                    user_id: emp.id,
                    status: 'APPROVED',
                    created_at: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const totalAdvanced = advances.reduce((sum, adv) => {
                return sum + parseFloat(adv.amount);
            }, 0);

            const netSalary = totalWages - totalAdvanced;

            reportMessage += `👤 ${emp.name}\n`;
            reportMessage += `   📊 ทำงาน: ${totalDays} วัน (${totalHours.toFixed(2)} ชม.)\n`;
            reportMessage += `   💰 ค่าจ้าง: ${totalWages.toFixed(2)} บาท\n`;
            reportMessage += `   💸 เบิกไป: ${totalAdvanced.toFixed(2)} บาท\n`;
            reportMessage += `   ✅ คงเหลือ: ${netSalary.toFixed(2)} บาท\n\n`;
        }

        reportMessage += `📅 รายงานสิ้นสุด: ${formatDateThai(new Date())}`;

        // ส่งรายงานไปหา Admin Group
        await notifyAdmin(reportMessage);

        console.log('[Cron] Monthly report sent successfully');

        return res.status(200).json({
            success: true,
            month: monthName,
            employeeCount: employees.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Cron] Error in monthly report generator:', error);
        
        await logger.error(
            'Cron',
            'Monthly-Report-Generator',
            `Error in cron job: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        await prisma.$disconnect();
    }
};
