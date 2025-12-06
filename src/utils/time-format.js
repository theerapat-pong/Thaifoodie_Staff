// ========================================
// Time Format Utilities
// ========================================

/**
 * แปลงนาทีเป็นข้อความแสดงผล
 * - ถ้า < 60 นาที: แสดง "X นาที"
 * - ถ้า >= 60 นาที: แสดง "X ชม." หรือ "X ชม. Y นาที"
 * @param {number} totalMinutes - จำนวนนาทีทั้งหมด
 * @returns {string} ข้อความที่จัดรูปแบบแล้ว
 */
function formatDuration(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0) return '0 นาที';

    // ถ้าน้อยกว่า 60 นาที ให้แสดงเป็นนาที
    if (totalMinutes < 60) {
        return `${totalMinutes} นาที`;
    }

    // ถ้ามากกว่าหรือเท่ากับ 60 นาที ให้แยกเป็นชั่วโมงและนาที
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
        return `${hours} ชม.`;
    }

    return `${hours} ชม. ${minutes} นาที`;
}

module.exports = {
    formatDuration,
};
