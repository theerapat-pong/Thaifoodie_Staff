// ========================================
// LINE Signature Validation Middleware
// ========================================

const crypto = require('crypto');
const { config } = require('../config/line');

/**
 * ตรวจสอบ LINE Signature
 * @param {string} body - Request body as string
 * @param {string} signature - x-line-signature header
 * @returns {boolean}
 */
function validateSignature(body, signature) {
    if (!signature) {
        return false;
    }

    const channelSecret = config.channelSecret;
    const hash = crypto
        .createHmac('SHA256', channelSecret)
        .update(body)
        .digest('base64');

    return hash === signature;
}

/**
 * Middleware สำหรับตรวจสอบ LINE Signature
 * (ใช้ใน Vercel Serverless Function)
 */
function verifyLineSignature(req) {
    const signature = req.headers['x-line-signature'];

    // อ่าน body เป็น string
    let body;
    if (typeof req.body === 'string') {
        body = req.body;
    } else {
        body = JSON.stringify(req.body);
    }

    const isValid = validateSignature(body, signature);

    if (!isValid) {
        throw new Error('Invalid LINE signature');
    }

    return true;
}

module.exports = {
    validateSignature,
    verifyLineSignature,
};
