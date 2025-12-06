// ========================================
// Attendance Validation Utilities
// ========================================

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { formatDuration } = require('./time-format');
dayjs.extend(customParseFormat);

/**
 * เช็คว่าเข้างานสายหรือไม่
 * @param {string} actualCheckIn - เวลาเข้างานจริง (HH:mm:ss)
 * @param {string} shiftStartTime - เวลาเข้างานที่กำหนด (HH:mm)
 * @returns {Object} { isLate: boolean, minutesLate: number }
 */
function checkLateArrival(actualCheckIn, shiftStartTime) {
    if (!shiftStartTime) {
        return { isLate: false, minutesLate: 0 };
    }

    const actual = dayjs(actualCheckIn, 'HH:mm:ss');
    const expected = dayjs(shiftStartTime, 'HH:mm');

    if (actual.isAfter(expected)) {
        const minutesLate = actual.diff(expected, 'minute');
        return { isLate: true, minutesLate };
    }

    return { isLate: false, minutesLate: 0 };
}

/**
 * เช็คว่าออกงานก่อนเวลาหรือไม่
 * @param {string} actualCheckOut - เวลาออกงานจริง (HH:mm:ss)
 * @param {string} shiftEndTime - เวลาออกงานที่กำหนด (HH:mm)
 * @returns {Object} { isEarly: boolean, minutesEarly: number }
 */
function checkEarlyDeparture(actualCheckOut, shiftEndTime) {
    if (!shiftEndTime) {
        return { isEarly: false, minutesEarly: 0 };
    }

    const actual = dayjs(actualCheckOut, 'HH:mm:ss');
    const expected = dayjs(shiftEndTime, 'HH:mm');

    if (actual.isBefore(expected)) {
        const minutesEarly = expected.diff(actual, 'minute');
        return { isEarly: true, minutesEarly };
    }

    return { isEarly: false, minutesEarly: 0 };
}

/**
 * สร้างข้อความแจ้งเตือนถ้ามาสายหรือกลับก่อน
 * @param {boolean} isLate
 * @param {number} minutesLate
 * @param {boolean} isEarly
 * @param {number} minutesEarly
 * @returns {string}
 */
function buildAttendanceWarning(isLate, minutesLate, isEarly, minutesEarly) {
    let warnings = [];

    if (isLate) {
        warnings.push(`⚠️ มาสาย ${formatDuration(minutesLate)}`);
    }

    if (isEarly) {
        warnings.push(`⚠️ กลับก่อนเวลา ${formatDuration(minutesEarly)}`);
    }

    return warnings.length > 0 ? '\n' + warnings.join('\n') : '';
}

module.exports = {
    checkLateArrival,
    checkEarlyDeparture,
    buildAttendanceWarning,
};
