// ========================================
// Cron Job: Forgot Check-out Notifier
// ทำงานทุกวัน เวลา 07:00 น. (Bangkok Time)
// (Vercel Cron Schedule: "0 0 * * *" = 00:00 UTC)
// ========================================

require('dotenv').config();
const prisma = require('../src/lib/prisma');
const logger = require('../src/services/logger');

const { pushMessage } = require('../src/services/line');
const { formatDateThai, formatTimeThai } = require('../src/utils/datetime');

/**
 * Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
    // ตรวจสอบ Cron Secret (ถ้ามี)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const headerSecret = req.headers['x-cron-secret'] || req.headers['X-Cron-Secret'];
        const querySecret = req.query?.secret || req.query?.cronSecret;
        const bodySecret = req.body?.secret;
        const providedSecret = headerSecret || querySecret || bodySecret;

        if (providedSecret !== cronSecret) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
    }

    try {
        console.log('[Cron] Running forgot check-out notifier...');

        // ค้นหา Attendance Records ที่:
        // - มี check_in_time แล้ว
        // - ยังไม่มี check_out_time
        // - date เป็นวันก่อนหน้านี้ (ไม่ใช่วันนี้)
        // - ยังไม่เคยแจ้งเตือน (is_notified = false)
        const forgotCheckouts = await prisma.attendance.findMany({
            where: {
                check_out_time: null,
                date: {
                    lt: new Date(new Date().setHours(0, 0, 0, 0)), // วันก่อนวันนี้
                },
                is_notified: false, // ป้องกัน Spam
            },
            include: {
                employee: true,
            },
        });

        console.log(`[Cron] Found ${forgotCheckouts.length} forgot check-out records (not yet notified)`);

        // ส่งข้อความแจ้งเตือนแต่ละคน
        let successCount = 0;
        for (const record of forgotCheckouts) {
            try {
                const message =
                    '⚠️ แจ้งเตือน: คุณลืม Check-out\n\n' +
                    `📅 วันที่: ${formatDateThai(record.date)}\n` +
                    `⏰ เวลาเข้างาน: ${formatTimeThai(record.check_in_time)}\n` +
                    `🏁 เวลาออกงาน: ยังไม่ได้ลง\n\n` +
                    `กรุณาติดต่อ HR เพื่อแก้ไข`;

                await pushMessage(record.user_id, message);

                // อัพเดทสถานะว่าแจ้งเตือนแล้ว
                await prisma.attendance.update({
                    where: { id: record.id },
                    data: { is_notified: true },
                });

                console.log(`[Cron] Notified user: ${record.employee?.name || record.user_id}`);
                successCount++;
            } catch (error) {
                console.error(`[Cron] Error notifying user ${record.user_id}:`, error);
            }
        }

        return res.status(200).json({
            success: true,
            found: forgotCheckouts.length,
            notified: successCount,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Cron] Error in forgot check-out notifier:', error);
        
        await logger.error(
            'Cron',
            'Forgot-Checkout-Notifier',
            `Error in cron job: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        await prisma.$disconnect();
    }
};
