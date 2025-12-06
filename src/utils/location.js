// ========================================
// Location Utilities - GPS Distance Calculation
// ========================================

const prisma = require('../lib/prisma');

/**
 * แปลงองศาเป็นเรเดียน
 * @param {number} deg - องศา
 * @returns {number} - เรเดียน
 */
function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * คำนวณระยะห่างระหว่างสองพิกัด (เมตร) ด้วย Haversine Formula
 * @param {number} lat1 - ละติจูดจุดที่ 1
 * @param {number} lon1 - ลองจิจูดจุดที่ 1
 * @param {number} lat2 - ละติจูดจุดที่ 2
 * @param {number} lon2 - ลองจิจูดจุดที่ 2
 * @returns {number} - ระยะทางเป็นเมตร
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // รัศมีโลก (เมตร)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * ดึงข้อมูลตำแหน่งร้านที่ใช้งานอยู่
 * @returns {Promise<Object|null>} - ข้อมูลตำแหน่งร้าน หรือ null ถ้าไม่มี
 */
async function getActiveWorkLocation() {
    const location = await prisma.workLocation.findFirst({
        where: { is_active: true },
        orderBy: { created_at: 'desc' }
    });
    return location;
}

/**
 * ตรวจสอบระยะทางและคืนค่าสถานะ Location
 * @param {number} userLat - ละติจูดของผู้ใช้
 * @param {number} userLon - ลองจิจูดของผู้ใช้
 * @param {Object} workLocation - ข้อมูลตำแหน่งร้าน
 * @returns {Object} - { distance, status, allowed, message }
 */
function checkLocationStatus(userLat, userLon, workLocation) {
    const distance = calculateDistance(
        userLat, 
        userLon, 
        parseFloat(workLocation.latitude), 
        parseFloat(workLocation.longitude)
    );

    // ใช้ค่าจาก Admin เท่านั้น ไม่มี fallback default
    const allowedRadius = workLocation.allowed_radius;
    const warningRadius = workLocation.warning_radius;

    let status, allowed, message;

    if (distance <= allowedRadius) {
        // ✅ อยู่ในระยะ - อนุมัติอัตโนมัติ
        status = 'VERIFIED';
        allowed = true;
        message = 'ลงเวลาสำเร็จ';
    } else if (distance <= warningRadius) {
        // ⚠️ อยู่นอกระยะเล็กน้อย - รอ Admin อนุมัติ
        status = 'PENDING';
        allowed = true;
        message = `ยื่นคำขอลงเวลาเข้างานสำเร็จ (รอ Admin อนุมัติ - ระยะห่าง ${Math.round(distance)} เมตร)`;
    } else {
        // ❌ อยู่นอกระยะมาก - ไม่อนุญาต
        status = 'REJECTED';
        allowed = false;
        message = `ไม่สามารถลงเวลาได้ คุณอยู่ห่างจากร้าน ${Math.round(distance)} เมตร (อนุญาตไม่เกิน ${warningRadius} เมตร)`;
    }

    return {
        distance: Math.round(distance * 100) / 100, // ปัดเศษ 2 ตำแหน่ง
        status,
        allowed,
        message,
        allowedRadius,
        warningRadius
    };
}

/**
 * Validate GPS data จาก request body
 * @param {Object} body - request body
 * @returns {Object} - { valid, latitude, longitude, accuracy, error }
 */
function validateGPSData(body) {
    const { latitude, longitude, accuracy } = body || {};

    // ตรวจสอบว่ามีข้อมูล GPS หรือไม่
    if (latitude === undefined || longitude === undefined) {
        return {
            valid: false,
            error: 'กรุณาเปิดใช้งาน GPS และลองใหม่อีกครั้ง'
        };
    }

    // ตรวจสอบค่า latitude
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
        return {
            valid: false,
            error: 'ข้อมูล GPS ไม่ถูกต้อง (latitude)'
        };
    }

    // ตรวจสอบค่า longitude
    const lon = parseFloat(longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
        return {
            valid: false,
            error: 'ข้อมูล GPS ไม่ถูกต้อง (longitude)'
        };
    }

    // Accuracy อาจเป็น null ได้
    const acc = accuracy !== undefined ? parseFloat(accuracy) : null;

    return {
        valid: true,
        latitude: lat,
        longitude: lon,
        accuracy: acc
    };
}

/**
 * Format ข้อความแสดงผลระยะทาง
 * @param {number} distance - ระยะทางเป็นเมตร
 * @returns {string} - ข้อความ
 */
function formatDistance(distance) {
    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(2)} กม.`;
    }
    return `${Math.round(distance)} เมตร`;
}

module.exports = {
    calculateDistance,
    getActiveWorkLocation,
    checkLocationStatus,
    validateGPSData,
    formatDistance,
    toRad
};
