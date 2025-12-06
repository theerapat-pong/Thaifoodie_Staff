// ========================================
// Format Utilities
// ========================================

const dayjs = require('dayjs');
const buddhistEra = require('dayjs/plugin/buddhistEra');
dayjs.extend(buddhistEra);

/**
 * สร้าง Request ID ในรูปแบบที่อ่านง่าย
 * Format: [TYPE]-[YEAR]-[MONTH]-[ID]
 * Example: LEV-2567-12-001
 * 
 * @param {string} type - 'LEV' (Leave) or 'ADV' (Advance)
 * @param {number} id - Database ID (Auto-increment)
 * @param {Date} date - Created Date (optional, default now)
 * @returns {string} Formatted Request ID
 */
function formatRequestId(type, id, date = new Date()) {
    const d = dayjs(date);
    const year = d.format('BBBB'); // Buddhist Year (e.g., 2567)
    const month = d.format('MM');  // Month (e.g., 12)
    const paddedId = String(id).padStart(3, '0'); // 001

    return `${type}-${year}-${month}-${paddedId}`;
}

module.exports = {
    formatRequestId,
};
