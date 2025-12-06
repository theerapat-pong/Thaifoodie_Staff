// ========================================
// Salary Calculation Utilities
// ========================================

/**
 * คำนวณค่าจ้างรายวัน
 * @param {number} dailySalary - ค่าจ้างรายวันพื้นฐาน
 * @param {number} totalHours - จำนวนชั่วโมงทำงาน
 * @returns {number}
 */
function calculateDailyWage(dailySalary, totalHours) {
    // สำหรับระบบนี้ ค่าจ้างรายวัน = ค่าจ้างพื้นฐาน (ไม่คำนึงถึงชั่วโมง)
    // แต่ถ้าต้องการคำนวณตามชั่วโมงสามารถปรับได้ที่นี่
    return parseFloat(dailySalary) || 0;
}

/**
 * คำนวณยอดเงินสะสม (Accrued Salary)
 * @param {Array} attendanceRecords - รายการ attendance ทั้งหมดของพนักงาน
 * @returns {number}
 */
function calculateAccruedSalary(attendanceRecords) {
    if (!attendanceRecords || attendanceRecords.length === 0) {
        return 0;
    }

    const total = attendanceRecords.reduce((sum, record) => {
        const wage = parseFloat(record.daily_wage) || 0;
        return sum + wage;
    }, 0);

    return total;
}

/**
 * คำนวณยอดคงเหลือหลังหักเบิก
 * @param {number} accruedSalary - ยอดเงินสะสม
 * @param {Array} advanceRecords - รายการเบิกเงินที่อนุมัติแล้ว
 * @returns {number}
 */
function calculateBalance(accruedSalary, advanceRecords) {
    if (!advanceRecords || advanceRecords.length === 0) {
        return accruedSalary;
    }

    const totalAdvanced = advanceRecords.reduce((sum, record) => {
        const amount = parseFloat(record.amount) || 0;
        return sum + amount;
    }, 0);

    return accruedSalary - totalAdvanced;
}

module.exports = {
    calculateDailyWage,
    calculateAccruedSalary,
    calculateBalance,
};
