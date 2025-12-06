// ========================================
// LINE API Service
// ========================================

const { client, ADMIN_GROUP_ID } = require('../config/line');

/**
 * ส่งข้อความตอบกลับ (Reply Message)
 * @param {string} replyToken
 * @param {string|Object|Array} messages - ข้อความ หรือ Array ของ messages
 */
async function replyMessage(replyToken, messages) {
    if (!replyToken) {
        console.log('[LINE] No reply token (testing mode)');
        return;
    }

    try {
        // แปลง string เป็น message object
        const messageArray = Array.isArray(messages) ? messages : [messages];
        const formattedMessages = messageArray.map((msg) => {
            if (typeof msg === 'string') {
                return { type: 'text', text: msg };
            }
            return msg;
        });

        await client.replyMessage(replyToken, formattedMessages);
        console.log('[LINE] Reply sent successfully');
    } catch (error) {
        // ⚠️ CRITICAL FIX: Suppress error to prevent "Error Loop"
        // ถ้า Reply ไม่ผ่าน (เช่น Token หมดอายุ) ให้แค่ Log แต่ห้าม Throw Error
        // เพราะถ้า Throw จะไปเข้า catch ของฟังก์ชันหลัก ซึ่งจะพยายาม Reply Error ซ้ำอีก
        // ทำให้เกิด HTTP 400 รัวๆ ไม่หยุด
        console.error('[LINE] Error replying message (Suppressed):', error.message);
        // throw error; // <--- Commented out to stop the loop
    }
}

/**
 * ส่งข้อความแบบ Push (Push Message)
 * @param {string} to - User ID หรือ Group ID
 * @param {string|Object|Array} messages
 */
async function pushMessage(to, messages) {
    if (!to) {
        console.error('[LINE] No recipient specified');
        return;
    }

    console.log(`[LINE] Pushing message to: ${to}`);

    try {
        const messageArray = Array.isArray(messages) ? messages : [messages];
        const formattedMessages = messageArray.map((msg) => {
            if (typeof msg === 'string') {
                return { type: 'text', text: msg };
            }
            return msg;
        });

        await client.pushMessage(to, formattedMessages);
        console.log(`[LINE] Push message sent to ${to}`);
    } catch (error) {
        console.error('[LINE] Error pushing message:', error.message);
        throw error;
    }
}

/**
 * ส่งข้อความไปหา Admin Group
 * @param {string|Object|Array} messages
 */
async function notifyAdmin(messages) {
    return pushMessage(ADMIN_GROUP_ID, messages);
}

// ========================================
// Flex Message Builders
// ========================================

/**
 * สร้าง Flex Message สำหรับเมนูหลัก
 * @returns {Object}
 */
function buildMainMenu() {
    return {
        type: 'flex',
        altText: 'เมนูหลัก (กรุณาเปิดบนมือถือ)',
        contents: {
            type: 'bubble',
            hero: {
                type: 'image',
                url: 'https://img2.pic.in.th/pic/7e9fe945d6a5a886e183b9eb5f76afe6.jpg',
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: [
                    {
                        type: 'text',
                        text: 'เมนูพนักงาน',
                        weight: 'bold',
                        size: 'xl',
                        align: 'center',
                    },
                    {
                        type: 'separator',
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            {
                                type: 'button',
                                style: 'primary',
                                color: '#00B900',
                                action: {
                                    type: 'message',
                                    label: '⏰ เข้างาน',
                                    text: 'เข้างาน',
                                },
                            },
                            {
                                type: 'button',
                                style: 'primary',
                                color: '#FF334B',
                                action: {
                                    type: 'message',
                                    label: '🏁 ออกงาน',
                                    text: 'ออกงาน',
                                },
                            },
                        ],
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            {
                                type: 'button',
                                style: 'secondary',
                                action: {
                                    type: 'datetimepicker',
                                    label: '📅 ลางาน',
                                    data: 'action=leave_start_date',
                                    mode: 'date',
                                },
                            },
                            {
                                type: 'button',
                                style: 'secondary',
                                action: {
                                    type: 'message',
                                    label: '💰 เบิกเงิน',
                                    text: 'เบิกเงิน',
                                },
                            },
                        ],
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            {
                                type: 'button',
                                style: 'secondary',
                                action: {
                                    type: 'message',
                                    label: '💵 ยอดเงิน',
                                    text: 'ยอดคงเหลือ',
                                },
                            },
                            {
                                type: 'button',
                                style: 'secondary',
                                action: {
                                    type: 'message',
                                    label: '📋 ประวัติเบิก',
                                    text: 'ประวัติเบิกเงิน',
                                },
                            },
                        ],
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            {
                                type: 'button',
                                style: 'secondary',
                                action: {
                                    type: 'postback',
                                    label: '📜 ประวัติลา',
                                    data: 'action=leave_history',
                                    displayText: 'ดูประวัติการลา',
                                },
                            },
                            {
                                type: 'button',
                                style: 'secondary',
                                action: {
                                    type: 'postback',
                                    label: '❌ ยกเลิกคำขอ',
                                    data: 'action=cancel_request',
                                    displayText: 'ยกเลิกคำขอ',
                                },
                            },
                        ],
                    },
                ],
            },
        },
    };
}

/**
 * สร้าง Flex Message สำหรับแสดงผลการ Check-in
 */
function buildCheckInReceipt(data) {
    const { name, date, time, lateMinutes, formattedLateTime, isApproved } = data;

    const bodyContents = [
        {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            contents: [
                {
                    type: 'text',
                    text: '👤',
                    size: 'sm',
                    flex: 0,
                },
                {
                    type: 'text',
                    text: name,
                    size: 'md',
                    flex: 5,
                    wrap: true,
                },
            ],
        },
        {
            type: 'separator',
            margin: 'md',
        },
        {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
                {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '📅 วันที่:',
                            color: '#999999',
                            size: 'sm',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: date,
                            wrap: true,
                            size: 'sm',
                            flex: 5,
                            align: 'end',
                        },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '⏰ เวลา:',
                            color: '#999999',
                            size: 'sm',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: time,
                            wrap: true,
                            size: 'sm',
                            flex: 5,
                            align: 'end',
                            color: '#00B900',
                            weight: 'bold',
                        },
                    ],
                },
            ],
        },
    ];

    // เพิ่มแจ้งเตือนสาย
    if (lateMinutes > 0) {
        bodyContents.push(
            {
                type: 'separator',
                margin: 'md',
            },
            {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                spacing: 'sm',
                backgroundColor: '#FFF3CD',
                cornerRadius: 'md',
                paddingAll: 'md',
                contents: [
                    {
                        type: 'text',
                        text: '⚠️',
                        size: 'sm',
                        flex: 1,
                        align: 'center',
                    },
                    {
                        type: 'text',
                        text: `มาสาย ${formattedLateTime}`,
                        size: 'sm',
                        color: '#856404',
                        flex: 5,
                        wrap: true,
                    },
                ],
            }
        );
    }

    // เพิ่มข้อความแจ้งเตือนถ้าเป็นการอนุมัติจาก Admin
    if (isApproved) {
        bodyContents.push(
            {
                type: 'separator',
                margin: 'md',
            },
            {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                spacing: 'sm',
                backgroundColor: '#D1ECF1',
                cornerRadius: 'md',
                paddingAll: 'md',
                contents: [
                    {
                        type: 'text',
                        text: '✓',
                        size: 'sm',
                        flex: 1,
                        align: 'left',
                        color: '#0C5460',
                        weight: 'bold',
                    },
                    {
                        type: 'text',
                        text: 'Admin อนุมัติคำขอลงเวลาเข้างานแล้ว',
                        size: 'sm',
                        color: '#0C5460',
                        flex: 5,
                        wrap: true,
                    },
                ],
            }
        );
    }

    return {
        type: 'flex',
        altText: isApproved ? '✅ คำขอลงเวลาเข้างานได้รับการอนุมัติ' : '✅ บันทึกเวลาเข้างานสำเร็จ',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: isApproved ? '✅ คำขอได้รับอนุมัติ' : '✅ เข้างานสำเร็จ',
                        weight: 'bold',
                        size: 'xl',
                        color: '#FFFFFF',
                        align: 'center',
                    },
                ],
                backgroundColor: '#00B900',
                paddingAll: '15px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: bodyContents,
            },
        },
    };
}

/**
 * สร้าง Flex Message สำหรับแสดงผลการ Check-out
 */
function buildCheckOutSummary(data) {
    const { name, date, checkInTime, checkOutTime, workTime, dailyWage, balance, earlyMinutes, formattedEarlyTime } = data;

    const bodyContents = [
        {
            type: 'text',
            text: '👤 ' + name,
            size: 'md',
            margin: 'md',
        },
        {
            type: 'separator',
            margin: 'md',
        },
        {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
                {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '📅 วันที่:',
                            color: '#999999',
                            size: 'sm',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: date,
                            wrap: true,
                            size: 'sm',
                            flex: 5,
                            align: 'end',
                        },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '⏰ เข้า:',
                            color: '#999999',
                            size: 'sm',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: checkInTime,
                            wrap: true,
                            size: 'sm',
                            flex: 5,
                            align: 'end',
                        },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '🏁 ออก:',
                            color: '#999999',
                            size: 'sm',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: checkOutTime,
                            wrap: true,
                            size: 'sm',
                            flex: 5,
                            align: 'end',
                        },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '⏱️ ทำงาน:',
                            color: '#999999',
                            size: 'sm',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: workTime,
                            wrap: true,
                            size: 'sm',
                            flex: 5,
                            align: 'end',
                            weight: 'bold',
                        },
                    ],
                },
                {
                    type: 'separator',
                    margin: 'md',
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    margin: 'md',
                    contents: [
                        {
                            type: 'text',
                            text: '💰 ค่าจ้างวันนี้:',
                            color: '#999999',
                            size: 'sm',
                            flex: 3,
                        },
                        {
                            type: 'text',
                            text: dailyWage + ' บาท',
                            wrap: true,
                            size: 'md',
                            flex: 4,
                            align: 'end',
                            color: '#FF6B00',
                            weight: 'bold',
                        },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '💵 ยอดสะสม:',
                            color: '#999999',
                            size: 'sm',
                            flex: 3,
                        },
                        {
                            type: 'text',
                            text: balance + ' บาท',
                            wrap: true,
                            size: 'sm',
                            flex: 4,
                            align: 'end',
                        },
                    ],
                },
            ],
        },
    ];

    // เพิ่มแจ้งเตือนออกงานก่อนเวลา
    if (earlyMinutes && earlyMinutes > 0) {
        bodyContents.push(
            {
                type: 'separator',
                margin: 'md',
            },
            {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                spacing: 'sm',
                backgroundColor: '#FFE5E5',
                cornerRadius: 'md',
                paddingAll: 'md',
                contents: [
                    {
                        type: 'text',
                        text: '⚠️',
                        size: 'sm',
                        flex: 1,
                        align: 'center',
                    },
                    {
                        type: 'text',
                        text: `ออกงานก่อนเวลา ${formattedEarlyTime}`,
                        size: 'sm',
                        color: '#C41E3A',
                        flex: 5,
                        wrap: true,
                    },
                ],
            }
        );
    }

    return {
        type: 'flex',
        altText: '🏁 บันทึกเวลาออกงานสำเร็จ',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🏁 ออกงานสำเร็จ',
                        weight: 'bold',
                        size: 'xl',
                        color: '#FFFFFF',
                        align: 'center',
                    },
                ],
                backgroundColor: '#FF334B',
                paddingAll: '15px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: bodyContents,
            },
        },
    };
}

/**
 * สร้าง Flex Message สำหรับคำขออนุมัติ (Leave/Advance)
 * แสดงให้ Admin พร้อมปุ่ม Approve/Reject
 */
function buildApprovalCard(type, data) {
    const isLeave = type === 'leave';
    const title = isLeave ? '📅 คำขอลางาน' : '💰 คำขอเบิกเงิน';
    const color = isLeave ? '#4267B2' : '#FF6B00';
    const altText = isLeave ? '🔔 มีคำขอลางานใหม่!' : '🔔 มีคำขอเบิกเงินใหม่!';

    // Ensure data is string
    const safeString = (val) => (val ? String(val) : '-');

    const bodyContents = [
        {
            type: 'text',
            text: '👤 ' + safeString(data.employeeName),
            size: 'md',
            weight: 'bold',
            wrap: true
        },
        {
            type: 'separator',
            margin: 'md',
        },
    ];

    if (isLeave) {
        bodyContents.push({
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'ประเภท:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.leaveType), size: 'sm', flex: 4, align: 'end', wrap: true },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'เริ่ม:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.startDate), size: 'sm', flex: 4, align: 'end', wrap: true },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'สิ้นสุด:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.endDate), size: 'sm', flex: 4, align: 'end', wrap: true },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'จำนวน:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.totalDays) + ' วัน', size: 'sm', flex: 4, align: 'end', weight: 'bold' },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'เหตุผล:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.reason), size: 'sm', flex: 4, align: 'end', wrap: true },
                    ],
                },
            ],
        });
    } else {
        // Advance
        bodyContents.push({
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'จำนวน:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.amount) + ' บาท', size: 'md', flex: 4, align: 'end', weight: 'bold', color: '#FF6B00' },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'เหตุผล:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.reason), size: 'sm', flex: 4, align: 'end', wrap: true },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'ยอดสะสม:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.currentBalance) + ' บาท', size: 'sm', flex: 4, align: 'end' },
                    ],
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        { type: 'text', text: 'คงเหลือ:', color: '#999999', size: 'sm', flex: 2 },
                        { type: 'text', text: safeString(data.remainingBalance) + ' บาท', size: 'sm', flex: 4, align: 'end', color: '#00B900' },
                    ],
                },
            ],
        });
    }

    const flexMessage = {
        type: 'flex',
        altText: title,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: title,
                        weight: 'bold',
                        size: 'xl',
                        color: '#FFFFFF',
                        align: 'center',
                    },
                    {
                        type: 'text',
                        text: safeString(data.formattedId), // แสดง Request ID
                        weight: 'bold',
                        size: 'sm',
                        color: '#FFFFFF',
                        align: 'center',
                        margin: 'sm',
                    },
                ],
                backgroundColor: color,
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    ...bodyContents,
                    {
                        type: 'separator',
                        margin: 'md',
                    },
                    {
                        type: 'box',
                        layout: 'baseline',
                        margin: 'md',
                        contents: [
                            { type: 'text', text: 'สถานะ:', color: '#999999', size: 'sm', flex: 2 },
                            { type: 'text', text: 'รออนุมัติ ⏳', size: 'sm', flex: 4, align: 'end', color: '#FFC107', weight: 'bold' },
                        ],
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                spacing: 'md',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#00B900',
                        action: {
                            type: 'postback',
                            label: '✅ อนุมัติ',
                            data: `action=approve&type=${type}&id=${data.requestId}`,
                            displayText: `อนุมัติคำขอ ${data.formattedId || data.requestId}`,
                        },
                    },
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#DC3545', // สีแดง (Danger)
                        action: {
                            type: 'postback',
                            label: '❌ ปฏิเสธ',
                            data: `action=reject&type=${type}&id=${data.requestId}`,
                            displayText: `ปฏิเสธคำขอ ${data.formattedId || data.requestId}`,
                        },
                    },
                ],
            },
        },
    };

    // Debug Payload
    console.log('[LINE] Generated Flex Message:', JSON.stringify(flexMessage));
    return flexMessage;
}

/**
 * สร้าง Flex Message สำหรับรายการยกเลิกคำขอ
 */
function buildCancellationList(requests) {
    const bubbleContents = requests.map((req) => {
        const isLeave = req.type === 'leave';
        const color = isLeave ? '#4267B2' : '#FF6B00';
        const icon = isLeave ? '📅' : '💰';
        const title = isLeave ? 'ลางาน' : 'เบิกเงิน';

        let details = '';
        if (isLeave) {
            details = `${req.startDate} - ${req.endDate} (${req.totalDays} วัน)`;
        } else {
            details = `${req.amount} บาท`;
        }

        return {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: `${icon} ${title}`,
                        weight: 'bold',
                        color: '#FFFFFF',
                    },
                    {
                        type: 'text',
                        text: req.formattedId || `${req.id}`,
                        weight: 'bold',
                        size: 'xs',
                        color: '#FFFFFF',
                        align: 'end',
                        margin: 'sm',
                    },
                ],
                backgroundColor: color,
                paddingAll: '10px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: details,
                        size: 'sm',
                        wrap: true,
                    },
                    {
                        type: 'text',
                        text: `เหตุผล: ${req.reason}`,
                        size: 'xs',
                        color: '#999999',
                        wrap: true,
                        margin: 'sm',
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#DC3545',
                        action: {
                            type: 'postback',
                            label: '❌ ยกเลิก',
                            data: `action=cancel&type=${req.type}&id=${req.id}`,
                            displayText: `ยกเลิกคำขอ ${req.formattedId || req.id}`,
                        },
                    },
                ],
            },
        };
    });

    return {
        type: 'flex',
        altText: 'รายการคำขอที่รออนุมัติ',
        contents: {
            type: 'carousel',
            contents: bubbleContents,
        },
    };
}

/**
 * สร้าง Flex Message สำหรับแสดงประวัติการเบิกเงิน (Carousel)
 */
function buildAdvanceHistoryCarousel(history) {
    const bubbles = history.map((item) => {
        let statusColor = '#999999';
        let statusEmoji = '⏳';
        let statusText = 'รออนุมัติ';

        if (item.status === 'APPROVED') {
            statusColor = '#00B900';
            statusEmoji = '✅';
            statusText = 'อนุมัติแล้ว';
        } else if (item.status === 'REJECTED') {
            statusColor = '#FF0000';
            statusEmoji = '❌';
            statusText = 'ไม่อนุมัติ';
        } else if (item.status === 'CANCELLED') {
            statusColor = '#666666';
            statusEmoji = '🚫';
            statusText = 'ยกเลิกแล้ว';
        }

        return {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: `${statusEmoji} ${item.id}`,
                        weight: 'bold',
                        size: 'lg',
                        color: statusColor,
                    },
                    {
                        type: 'separator',
                        margin: 'md',
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'md',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'box',
                                layout: 'baseline',
                                contents: [
                                    { type: 'text', text: '💰', size: 'sm', flex: 1 },
                                    { type: 'text', text: `${item.amount} บาท`, size: 'sm', color: '#111111', flex: 4, wrap: true },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                contents: [
                                    { type: 'text', text: '📅', size: 'sm', flex: 1 },
                                    { type: 'text', text: item.date, size: 'sm', color: '#666666', flex: 4, wrap: true },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                contents: [
                                    { type: 'text', text: '📊', size: 'sm', flex: 1 },
                                    { type: 'text', text: statusText, size: 'sm', color: statusColor, flex: 4, weight: 'bold' },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
    });

    return {
        type: 'flex',
        altText: `📋 ประวัติการเบิกเงิน (${history.length} รายการ)`,
        contents: {
            type: 'carousel',
            contents: bubbles,
        },
    };
}

// ========================================
// LIFF Quick Reply Builder
// ========================================

const LIFF_URL = `https://liff.line.me/${process.env.LIFF_ID || '2008633012-xKvPGV8v'}`;

/**
 * สร้าง Quick Reply พร้อมลิงก์ไป LIFF
 * @returns {Object} - Message object with quick reply
 */
function buildQuickReplyLIFF() {
    return {
        type: 'text',
        text: '📱 กดปุ่มด้านล่างเพื่อเปิดเมนู\n\nหรือพิมพ์:\n• "เข้างาน" - ลงเวลาเข้างาน\n• "ออกงาน" - ลงเวลาออกงาน',
        quickReply: {
            items: [
                {
                    type: 'action',
                    action: {
                        type: 'uri',
                        label: '📱 เปิดเมนู',
                        uri: `${LIFF_URL}/liff.html`
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: '⏰ เข้างาน',
                        text: 'เข้างาน'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: '🏁 ออกงาน',
                        text: 'ออกงาน'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'uri',
                        label: '💰 เบิกเงิน',
                        uri: `${LIFF_URL}/advance.html`
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'uri',
                        label: '📅 ลางาน',
                        uri: `${LIFF_URL}/leave.html`
                    }
                }
            ]
        }
    };
}

module.exports = {
    replyMessage,
    pushMessage,
    notifyAdmin,
    buildMainMenu,
    buildCheckInReceipt,
    buildCheckOutSummary,
    buildApprovalCard,
    buildCancellationList,
    buildAdvanceHistoryCarousel,
    buildQuickReplyLIFF,
};
