// ========================================
// Attendance Module (เข้า-ออกงาน)
// ========================================

const prisma = require('../lib/prisma');

const {
    now,
    formatDate,
    formatTime,
    formatDateThai,
    formatTimeThai,
    formatDateTimeThai,
    calculateTimeDifference,
    getTodayDate,
    parseDateTime,
} = require('../utils/datetime');

const { calculateDailyWage, calculateAccruedSalary, calculateBalance } = require('../utils/salary');
const { replyMessage, buildCheckInReceipt, buildCheckOutSummary } = require('../services/line');
const { checkLateArrival, checkEarlyDeparture, buildAttendanceWarning } = require('../utils/attendance-validation');
const { formatDuration } = require('../utils/time-format');

/**
 * จัดการเข้างาน (Check-in)
 */
async function handleCheckIn(replyToken, userId) {
    let hasReplied = false;
    try {
        // ดึงข้อมูลพนักงาน
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
        });

        if (!employee || !employee.is_active) {
            await replyMessage(replyToken, '❌ ไม่พบข้อมูลพนักงาน กรุณาติดต่อ HR');
            hasReplied = true;
            return;
        }

        const today = getTodayDate();
        const nowTime = now().toDate();

        // ตรวจสอบว่าเคย Check-in วันนี้หรือยัง
        const existingRecord = await prisma.attendance.findUnique({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: today,
                },
            },
        });

        if (existingRecord) {
            const checkInTimeStr = formatTimeThai(existingRecord.check_in_time);
            await replyMessage(
                replyToken,
                `⚠️ คุณลงเวลาเข้างานวันนี้แล้ว\n⏰ เวลา: ${checkInTimeStr}`
            );
            hasReplied = true;
            return;
        }

        // บันทึกเข้างาน
        await prisma.attendance.create({
            data: {
                user_id: userId,
                date: today,
                check_in_time: nowTime,
            },
        });

        // เช็คว่ามาสายหรือไม่
        const actualTime = formatTime(nowTime); // เช่น "09:15:30"
        const lateCheck = checkLateArrival(actualTime, employee.shift_start_time);

        console.log(`[Attendance] Late Check - Actual: ${actualTime}, Expected: ${employee.shift_start_time}, IsLate: ${lateCheck.isLate}, Minutes: ${lateCheck.minutesLate}`);

        // ส่งข้อความยืนยัน (รวมแจ้งเตือนสายใน Flex Message เดียว)
        const flexMessage = buildCheckInReceipt({
            name: employee.name,
            date: formatDateThai(nowTime),
            time: formatTimeThai(nowTime),
            lateMinutes: lateCheck.minutesLate,
            formattedLateTime: lateCheck.minutesLate > 0 ? formatDuration(lateCheck.minutesLate) : '',
        });

        await replyMessage(replyToken, flexMessage);
        hasReplied = true;

        console.log(`[Attendance] Check-in successful: ${userId} at ${formatDateTimeThai(nowTime)}`);

    } catch (error) {
        console.error('[Attendance] Error in handleCheckIn:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการบันทึกเวลาเข้างาน กรุณาลองใหม่');
        }
    }
}

/**
 * จัดการออกงาน (Check-out)
 */
async function handleCheckOut(replyToken, userId) {
    let hasReplied = false;
    try {
        // ดึงข้อมูลพนักงาน
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
        });

        if (!employee || !employee.is_active) {
            await replyMessage(replyToken, '❌ ไม่พบข้อมูลพนักงาน กรุณาติดต่อ HR');
            hasReplied = true;
            return;
        }

        const today = getTodayDate();
        const nowTime = now().toDate();

        // ตรวจสอบว่ามีการ Check-in วันนี้หรือไม่
        const attendanceRecord = await prisma.attendance.findUnique({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: today,
                },
            },
        });

        if (!attendanceRecord) {
            await replyMessage(
                replyToken,
                '❌ ไม่พบการลงเวลาเข้างานวันนี้\nกรุณาลงเวลาเข้างานก่อน'
            );
            hasReplied = true;
            return;
        }

        if (attendanceRecord.check_out_time) {
            const checkOutTimeStr = formatTimeThai(attendanceRecord.check_out_time);
            await replyMessage(
                replyToken,
                `⚠️ คุณลงเวลาออกงานวันนี้แล้ว\n⏰ เวลา: ${checkOutTimeStr}`
            );
            hasReplied = true;
            return;
        }

        // คำนวณเวลาทำงาน
        const checkInTime = attendanceRecord.check_in_time;
        const checkOutTime = nowTime;

        const workTime = calculateTimeDifference(checkInTime, checkOutTime);

        if (!workTime) {
            await replyMessage(
                replyToken,
                '❌ เกิดข้อผิดพลาดในการคำนวณเวลาทำงาน กรุณาติดต่อผู้จัดการ'
            );
            hasReplied = true;
            return;
        }

        // คำนวณค่าจ้างรายวัน
        const dailyWage = calculateDailyWage(employee.daily_salary, workTime.totalHours);

        // อัพเดท Check-out
        await prisma.attendance.update({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: today,
                },
            },
            data: {
                check_out_time: checkOutTime,
                total_hours: workTime.totalHours,
                daily_wage: dailyWage,
            },
        });

        // คำนวณยอดสะสมปัจจุบัน
        const allAttendance = await prisma.attendance.findMany({
            where: {
                user_id: userId,
                check_out_time: { not: null },
            },
        });

        const accruedSalary = calculateAccruedSalary(allAttendance);

        // คำนวณยอดที่เบิกไปแล้ว
        const approvedAdvances = await prisma.advance.findMany({
            where: {
                user_id: userId,
                status: 'APPROVED',
            },
        });

        const balance = calculateBalance(accruedSalary, approvedAdvances);

        // เช็คว่าออกงานก่อนเวลาหรือไม่
        const actualCheckOutTime = formatTime(checkOutTime);
        const earlyCheck = checkEarlyDeparture(actualCheckOutTime, employee.shift_end_time);

        console.log(`[Attendance] Early Check - Actual: ${actualCheckOutTime}, Expected: ${employee.shift_end_time}, IsEarly: ${earlyCheck.isEarly}, Minutes: ${earlyCheck.minutesEarly}`);

        // ส่งข้อความสรุป
        const flexMessage = buildCheckOutSummary({
            name: employee.name,
            date: formatDateThai(checkOutTime),
            checkInTime: formatTimeThai(checkInTime),
            checkOutTime: formatTimeThai(checkOutTime),
            workTime: workTime.displayText,
            dailyWage: dailyWage.toFixed(2),
            balance: balance.toFixed(2),
            earlyMinutes: earlyCheck.minutesEarly,
            formattedEarlyTime: earlyCheck.minutesEarly > 0 ? formatDuration(earlyCheck.minutesEarly) : '',
        });

        await replyMessage(replyToken, flexMessage);
        hasReplied = true;

        console.log(`[Attendance] Check-out successful: ${userId} at ${formatDateTimeThai(checkOutTime)}`);

    } catch (error) {
        console.error('[Attendance] Error in handleCheckOut:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการบันทึกเวลาออกงาน กรุณาลองใหม่');
        }
    }
}

module.exports = {
    handleCheckIn,
    handleCheckOut,
};
