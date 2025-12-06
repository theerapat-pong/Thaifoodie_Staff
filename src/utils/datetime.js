// ========================================
// Date/Time Utilities
// ========================================

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
require('dayjs/locale/th');

// เปิดใช้ Plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale('th');

const TIMEZONE = 'Asia/Bangkok';

/**
 * รับวันที่และเวลาปัจจุบันใน Bangkok Timezone
 * @returns {dayjs.Dayjs}
 */
function now() {
    return dayjs().tz(TIMEZONE);
}

/**
 * แปลงวันที่เป็น String รูปแบบ YYYY-MM-DD
 * @param {Date|dayjs.Dayjs|string} date
 * @returns {string}
 */
function formatDate(date) {
    return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD');
}

/**
 * แปลงเวลาเป็น String รูปแบบ HH:mm:ss
 * @param {Date|dayjs.Dayjs|string} time
 * @returns {string}
 */
function formatTime(time) {
    return dayjs(time).tz(TIMEZONE).format('HH:mm:ss');
}

/**
 * แปลงวันที่และเวลาเป็น String รูปแบบไทย
 * @param {Date|dayjs.Dayjs|string} date
 * @returns {string} เช่น "3 ธ.ค. 2568"
 */
function formatDateThai(date) {
    const d = dayjs(date).tz(TIMEZONE);
    const thaiYear = d.year() + 543;
    return `${d.date()} ${d.format('MMM')} ${thaiYear}`;
}

/**
 * แปลงเวลาเป็น String รูปแบบไทย
 * @param {Date|dayjs.Dayjs|string} time
 * @returns {string} เช่น "09:30:00 น."
 */
function formatTimeThai(time) {
    return dayjs(time).tz(TIMEZONE).format('HH:mm:ss') + ' น.';
}

/**
 * แปลงวันที่และเวลาเป็น String รูปแบบไทยแบบเต็ม
 * @param {Date|dayjs.Dayjs|string} datetime
 * @returns {string} เช่น "3 ธ.ค. 2568 เวลา 09:30:00 น."
 */
function formatDateTimeThai(datetime) {
    return `${formatDateThai(datetime)} เวลา ${formatTimeThai(datetime)}`;
}

/**
 * คำนวณจำนวนชั่วโมงระหว่าง 2 เวลา
 * @param {Date|dayjs.Dayjs|string} startTime
 * @param {Date|dayjs.Dayjs|string} endTime
 * @returns {Object} { totalHours: number, displayText: string }
 */
function calculateTimeDifference(startTime, endTime) {
    const start = dayjs(startTime).tz(TIMEZONE);
    const end = dayjs(endTime).tz(TIMEZONE);

    const diffMs = end.diff(start);
    if (diffMs < 0) {
        return null; // เวลาไม่ถูกต้อง
    }

    const totalMinutes = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const totalHours = (totalMinutes / 60).toFixed(2);
    const displayText = `${hours} ชม. ${minutes} นาที`;

    return {
        totalHours: parseFloat(totalHours),
        displayText,
    };
}

/**
 * คำนวณจำนวนวันระหว่าง 2 วันที่ (รวมทั้ง start และ end)
 * @param {Date|dayjs.Dayjs|string} startDate
 * @param {Date|dayjs.Dayjs|string} endDate
 * @returns {number}
 */
function calculateDaysDifference(startDate, endDate) {
    const start = dayjs(startDate).tz(TIMEZONE).startOf('day');
    const end = dayjs(endDate).tz(TIMEZONE).startOf('day');

    const diffDays = end.diff(start, 'day');
    return diffDays + 1; // +1 เพื่อนับรวมวันแรก
}

/**
 * รับวันนี้เป็น Date Object
 * @returns {Date}
 */
function getTodayDate() {
    return dayjs().tz(TIMEZONE).startOf('day').toDate();
}

/**
 * ตรวจสอบว่าวันที่เป็นวันนี้หรือไม่
 * @param {Date|dayjs.Dayjs|string} date
 * @returns {boolean}
 */
function isToday(date) {
    const today = dayjs().tz(TIMEZONE).startOf('day');
    const checkDate = dayjs(date).tz(TIMEZONE).startOf('day');
    return today.isSame(checkDate);
}

/**
 * ตรวจสอบว่าวันที่เป็นอดีตหรือไม่ (ไม่รวมวันนี้)
 * @param {Date|dayjs.Dayjs|string} date
 * @returns {boolean}
 */
function isPast(date) {
    const today = dayjs().tz(TIMEZONE).startOf('day');
    const checkDate = dayjs(date).tz(TIMEZONE).startOf('day');
    return checkDate.isBefore(today);
}

/**
 * แปลง String เวลา (HH:mm:ss) ร่วมกับวันที่เป็น DateTime
 * @param {string} dateString YYYY-MM-DD
 * @param {string} timeString HH:mm:ss
 * @returns {dayjs.Dayjs}
 */
function parseDateTime(dateString, timeString) {
    return dayjs.tz(`${dateString} ${timeString}`, 'YYYY-MM-DD HH:mm:ss', TIMEZONE);
}

module.exports = {
    now,
    formatDate,
    formatTime,
    formatDateThai,
    formatTimeThai,
    formatDateTimeThai,
    calculateTimeDifference,
    calculateDaysDifference,
    getTodayDate,
    isToday,
    isPast,
    parseDateTime,
    TIMEZONE,
};
