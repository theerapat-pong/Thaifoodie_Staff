// ========================================
// Main Webhook Handler (Vercel Serverless Function)
// Minimal Version - All features moved to LIFF
// Bot does NOT reply to general messages
// ========================================

require('dotenv').config();
const { verifyLineSignature } = require('../src/middleware/lineSignature');
const { replyMessage } = require('../src/services/line');
const { handleLeaveApproval } = require('../src/modules/leave');
const { handleAdvanceApproval } = require('../src/modules/advance');
const { hasAdminPrivileges, hasDevPrivileges } = require('../src/utils/roles');
const logger = require('../src/services/logger');

const prisma = require('../src/lib/prisma');

// LIFF IDs
const LIFF_ID_MAIN = process.env.LIFF_ID || '2008633012-xKvPGV8v'; // Main app

/**
 * Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
    // Health Check (GET)
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', version: '3.0-liff-only' });
    }

    // ตรวจสอบว่าเป็น POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // ตรวจสอบ LINE Signature
        verifyLineSignature(req);

        const { events } = req.body;

        // ประมวลผล events ทั้งหมด
        await Promise.all(events.map(handleEvent));

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Webhook] Error:', error);

        await logger.error(
            'Webhook',
            'Main-Handler',
            `Webhook error: ${error.message}`,
            {
                error: error.message,
                stack: error.stack
            }
        );

        if (error.message === 'Invalid LINE signature') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * จัดการแต่ละ Event
 */
async function handleEvent(event) {
    const { type, replyToken, source } = event;
    const userId = source.userId;
    const groupId = source.groupId;

    try {
        // Handle only postback events (from push notification buttons)
        if (type === 'postback') {
            await handlePostback(replyToken, userId, event);
        }
        // Handle only specific admin commands
        else if (type === 'message' && event.message.type === 'text') {
            await handleAdminCommands(replyToken, userId, groupId, event.message.text);
        }
        // Ignore all other messages - DO NOT REPLY
    } catch (error) {
        console.error('[Webhook] Error handling event:', error);
    }
}

/**
 * จัดการคำสั่ง Admin เท่านั้น (ไม่ตอบกลับ user ทั่วไป)
 */
async function handleAdminCommands(replyToken, userId, groupId, text) {
    const textLower = text.trim().toLowerCase();

    // =====================================
    // Commands in GROUP: Only respond to 'groupid'
    // =====================================
    if (groupId) {
        // In group - only respond to 'groupid' command
        if (textLower === 'groupid') {
            await replyMessage(replyToken, `📋 Group ID:\n${groupId}`);
        }
        // Ignore all other commands in group
        return;
    }

    // =====================================
    // Commands in 1-on-1 chat only
    // =====================================

    // =====================================
    // คำสั่ง Debug (Admin Only)
    // =====================================

    // ดู User ID พร้อม QR Code (สำหรับให้ Admin สแกนเพิ่มพนักงาน)
    if (textLower === 'id') {
        // สร้าง QR Code Flex Message ที่มี User ID
        const qrCodeMessage = buildUserIdQRCode(userId);
        await replyMessage(replyToken, qrCodeMessage);
        return;
    }

    // =====================================
    // ไม่ตอบกลับข้อความอื่นๆ ทั้งหมด
    // =====================================
    // DO NOT REPLY - Let the message pass silently
}

/**
 * จัดการ Postback (กดปุ่มจาก Push Notification)
 */
async function handlePostback(replyToken, userId, event) {
    const data = event.postback.data;
    const params = new URLSearchParams(data);
    const action = params.get('action');
    const type = params.get('type');
    const id = params.get('id');

    try {
        // อนุมัติหรือปฏิเสธ (สำหรับ Push Notification buttons เท่านั้น)
        if (action === 'approve' || action === 'reject') {
            if (type === 'leave') {
                const result = await handleLeaveApproval({ action, id }, userId);
                await replyMessage(replyToken, `✅ ${result.message}`);
            } else if (type === 'advance') {
                const result = await handleAdvanceApproval({ action, id }, userId);
                await replyMessage(replyToken, `✅ ${result.message}`);
            }
            return;
        }

        // ไม่ตอบกลับ postback อื่นๆ

    } catch (error) {
        console.error('[Postback] Error:', error);

        await logger.error(
            'Webhook',
            'Handle-Postback',
            `Postback error: ${error.message}`,
            {
                error: error.message,
                stack: error.stack,
                userId: source?.userId
            },
            source?.userId
        );

        if (error.message === 'Only admin can approve requests') {
            await replyMessage(replyToken, '❌ เฉพาะ Admin เท่านั้นที่สามารถอนุมัติได้');
        } else if (error.message.startsWith('⚠️')) {
            await replyMessage(replyToken, error.message);
        } else {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    }
}

/**
 * สร้าง Flex Message แสดง User ID พร้อม QR Code
 * สำหรับให้ Admin สแกนเพิ่มพนักงานใหม่
 */
function buildUserIdQRCode(userId) {
    // ใช้ Google Charts API สร้าง QR Code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(userId)}`;
    
    return {
        type: 'flex',
        altText: '🆔 Your LINE User ID (สำหรับลงทะเบียนพนักงาน)',
        contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🆔 LINE User ID',
                        weight: 'bold',
                        size: 'lg',
                        color: '#00B900'
                    },
                    {
                        type: 'text',
                        text: 'สำหรับลงทะเบียนเป็นพนักงาน',
                        size: 'xs',
                        color: '#888888',
                        margin: 'sm'
                    }
                ],
                backgroundColor: '#F5F5F5',
                paddingAll: '16px'
            },
            hero: {
                type: 'image',
                url: qrCodeUrl,
                size: 'full',
                aspectRatio: '1:1',
                aspectMode: 'fit',
                backgroundColor: '#FFFFFF'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'User ID ของคุณ:',
                        size: 'xs',
                        color: '#888888'
                    },
                    {
                        type: 'text',
                        text: userId.substring(0, 16) + '...',
                        size: 'sm',
                        weight: 'bold',
                        color: '#333333',
                        margin: 'xs',
                        wrap: true
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        contents: [
                            {
                                type: 'text',
                                text: '📌 วิธีใช้งาน',
                                size: 'sm',
                                weight: 'bold',
                                color: '#00B900'
                            },
                            {
                                type: 'text',
                                text: '1. แสดง QR Code นี้ให้ Admin',
                                size: 'xs',
                                color: '#666666',
                                margin: 'sm'
                            },
                            {
                                type: 'text',
                                text: '2. Admin สแกนเพื่อเพิ่มคุณเข้าระบบ',
                                size: 'xs',
                                color: '#666666',
                                margin: 'xs'
                            },
                            {
                                type: 'text',
                                text: '3. เริ่มใช้งาน Thaifoodie ได้เลย!',
                                size: 'xs',
                                color: '#666666',
                                margin: 'xs'
                            }
                        ]
                    }
                ],
                paddingAll: '16px'
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🍜 Thaifoodie Staff Management',
                        size: 'xs',
                        color: '#AAAAAA',
                        align: 'center'
                    }
                ],
                paddingAll: '12px'
            },
            styles: {
                hero: {
                    backgroundColor: '#FFFFFF'
                }
            }
        }
    };
}
