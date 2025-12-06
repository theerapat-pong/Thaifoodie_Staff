// ========================================
// Admin Module (ระบบจัดการสำหรับ Admin)
// ========================================

const prisma = require('../lib/prisma');
const { replyMessage, pushMessage } = require('../services/line');
const { hasAdminPrivileges } = require('../utils/roles');

/**
 * ล้างข้อมูลระบบ (ยกเว้นข้อมูลพนักงาน)
 * เฉพาะ Admin เท่านั้น
 */
async function handleResetData(replyToken, userId) {
    let hasReplied = false;
    try {
        // 1. ตรวจสอบสิทธิ์ Admin
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
        });

        if (!employee || !hasAdminPrivileges(employee.role)) {
            await replyMessage(replyToken, '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้');
            hasReplied = true;
            return;
        }

        // 2. แจ้งเตือนก่อนเริ่มทำงาน (เพื่อป้องกัน Reply Token หมดอายุ)
        await replyMessage(replyToken, '⏳ กำลังล้างข้อมูลระบบ... กรุณารอสักครู่');
        hasReplied = true;

        // 3. ลบข้อมูล (ใช้ TRUNCATE เพื่อความเร็วสูงสุดและป้องกัน Timeout)
        // TRUNCATE TABLE ... CASCADE จะลบข้อมูลในตารางที่ระบุและตารางที่มี Foreign Key มาเกาะทั้งหมด
        // ในที่นี้เรา TRUNCATE ตารางหลักๆ ที่เป็น Transaction Data

        await prisma.$executeRawUnsafe(`
            TRUNCATE TABLE 
                attendance, 
                leaves, 
                advances, 
                system_logs 
            RESTART IDENTITY CASCADE;
        `);

        console.log(`[Admin] System data reset by ${employee.name} (${userId})`);

        // 4. แจ้งผลลัพธ์ผ่าน Push Message (เพราะ Reply Token ถูกใช้ไปแล้ว)
        await pushMessage(userId, '✅ ล้างข้อมูลระบบเรียบร้อยแล้ว\n(เหลือเฉพาะข้อมูลพนักงาน)');

    } catch (error) {
        console.error('[Admin] Error in handleResetData:', error);

        if (!hasReplied) {
            // ถ้ายังไม่ได้ Reply ให้ Reply Error
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการล้างข้อมูล');
        } else {
            // ถ้า Reply ไปแล้ว (เช่น "กำลังล้าง...") ให้ Push Error ตามไป
            await pushMessage(userId, '❌ เกิดข้อผิดพลาดในการล้างข้อมูล');
        }
    }
}

module.exports = {
    handleResetData,
};
