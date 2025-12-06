// ========================================
// Leave Module (ระบบลางาน)
// ========================================

const prisma = require('../lib/prisma');

const dayjs = require('dayjs');
const {
    formatDateThai,
    calculateDaysDifference,
    now,
} = require('../utils/datetime');
const { formatRequestId } = require('../utils/format');
const { replyMessage, pushMessage, buildApprovalCard, notifyAdmin } = require('../services/line');
const { hasAdminPrivileges } = require('../utils/roles');

// Mapping ประเภทการลา
const LEAVE_TYPES = {
    SICK: 'ลาป่วย',
    PERSONAL: 'ลากิจ',
    ANNUAL: 'ลาพักร้อน',
    OTHER: 'อื่นๆ',
};

// Mapping สถานะคำขอ
const STATUS_LABELS = {
    PENDING: '⏳ รออนุมัติ',
    APPROVED: '✅ อนุมัติแล้ว',
    REJECTED: '❌ ไม่อนุมัติ',
    CANCELLED: '🚫 ยกเลิกแล้ว',
};

/**
 * สร้าง Flex Message แจ้งเตือนวันที่ลาซ้ำ
 */
function buildOverlapWarningCard(overlappingLeave, formattedId) {
    const startDate = formatDateThai(overlappingLeave.start_date);
    const endDate = formatDateThai(overlappingLeave.end_date);
    const isSameDay = startDate === endDate;
    const dateDisplay = isSameDay ? startDate : `${startDate} - ${endDate}`;
    const statusLabel = STATUS_LABELS[overlappingLeave.status] || overlappingLeave.status;
    const leaveTypeLabel = LEAVE_TYPES[overlappingLeave.leave_type] || overlappingLeave.leave_type;

    return {
        type: 'flex',
        altText: '⚠️ พบวันที่ลาซ้ำกับคำขอที่มีอยู่แล้ว',
        contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'text',
                                text: '⚠️',
                                size: 'xl',
                                flex: 0,
                            },
                            {
                                type: 'text',
                                text: 'พบวันที่ลาซ้ำ',
                                weight: 'bold',
                                size: 'lg',
                                color: '#FF6B35',
                                margin: 'sm',
                            },
                        ],
                        alignItems: 'center',
                    },
                ],
                backgroundColor: '#FFF3E0',
                paddingAll: 'lg',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'คุณได้ทำการลางานวันดังกล่าวไว้แล้ว',
                        size: 'sm',
                        color: '#666666',
                        wrap: true,
                    },
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'เลขที่คำขอ',
                                        size: 'sm',
                                        color: '#888888',
                                        flex: 3,
                                    },
                                    {
                                        type: 'text',
                                        text: formattedId,
                                        size: 'sm',
                                        color: '#333333',
                                        weight: 'bold',
                                        flex: 5,
                                        align: 'end',
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'ประเภทการลา',
                                        size: 'sm',
                                        color: '#888888',
                                        flex: 3,
                                    },
                                    {
                                        type: 'text',
                                        text: leaveTypeLabel,
                                        size: 'sm',
                                        color: '#333333',
                                        flex: 5,
                                        align: 'end',
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'วันที่ลา',
                                        size: 'sm',
                                        color: '#888888',
                                        flex: 3,
                                    },
                                    {
                                        type: 'text',
                                        text: dateDisplay,
                                        size: 'sm',
                                        color: '#333333',
                                        flex: 5,
                                        align: 'end',
                                        wrap: true,
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'จำนวน',
                                        size: 'sm',
                                        color: '#888888',
                                        flex: 3,
                                    },
                                    {
                                        type: 'text',
                                        text: `${overlappingLeave.total_days} วัน`,
                                        size: 'sm',
                                        color: '#333333',
                                        flex: 5,
                                        align: 'end',
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'สถานะ',
                                        size: 'sm',
                                        color: '#888888',
                                        flex: 3,
                                    },
                                    {
                                        type: 'text',
                                        text: statusLabel,
                                        size: 'sm',
                                        color: overlappingLeave.status === 'APPROVED' ? '#1DB446' : '#FF6B35',
                                        weight: 'bold',
                                        flex: 5,
                                        align: 'end',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'text',
                        text: '💡 กรุณาเลือกวันที่อื่นที่ไม่ซ้ำกับคำขอที่มีอยู่',
                        size: 'xs',
                        color: '#888888',
                        margin: 'lg',
                        wrap: true,
                    },
                ],
                paddingAll: 'lg',
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'message',
                            label: '🔄 ลางานใหม่',
                            text: 'ลา',
                        },
                        style: 'primary',
                        color: '#1DB446',
                        height: 'sm',
                    },
                ],
                paddingAll: 'md',
            },
        },
    };
}

/**
 * ตรวจสอบการลาซ้ำ (ตรวจสอบว่ามีการลาที่ทับซ้อนกันหรือไม่)
 */
async function checkOverlappingLeave(userId, startDate, endDate) {
    const overlapping = await prisma.leave.findFirst({
        where: {
            user_id: userId,
            status: { in: ['PENDING', 'APPROVED'] },
            OR: [
                // คำขอใหม่เริ่มในช่วงการลาที่มีอยู่
                {
                    start_date: { lte: startDate },
                    end_date: { gte: startDate },
                },
                // คำขอใหม่สิ้นสุดในช่วงการลาที่มีอยู่
                {
                    start_date: { lte: endDate },
                    end_date: { gte: endDate },
                },
                // คำขอใหม่ครอบคลุมการลาที่มีอยู่ทั้งหมด
                {
                    start_date: { gte: startDate },
                    end_date: { lte: endDate },
                },
            ],
        },
    });

    return overlapping;
}

/**
 * เริ่ม Flow การลางาน (Interactive Mode)
 */
async function startLeaveRequest(replyToken, userId) {
    let hasReplied = false;
    try {
        // ล้าง State เก่า (ถ้ามี)
        await prisma.conversationState.deleteMany({
            where: { user_id: userId },
        });

        // สร้าง State ใหม่: รอวันเริ่มต้น
        await prisma.conversationState.create({
            data: {
                user_id: userId,
                state: 'LEAVE_WAIT_START_DATE',
                data: {},
            },
        });

        // ส่ง Flex Message ให้เลือกวันเริ่มต้น
        await replyMessage(replyToken, {
            type: 'flex',
            altText: 'กรุณาเลือกวันเริ่มต้นการลา',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '📅 ขออนุมัติลางาน',
                            weight: 'bold',
                            size: 'xl',
                            color: '#1DB446',
                        },
                        {
                            type: 'text',
                            text: 'กรุณาเลือก "วันเริ่มต้น" ที่ต้องการลา',
                            margin: 'md',
                            size: 'sm',
                            color: '#666666',
                        },
                    ],
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'datetimepicker',
                                label: 'เลือกวันเริ่มต้น',
                                data: 'action=leave_start_date',
                                mode: 'date',
                            },
                            style: 'primary',
                            color: '#1DB446',
                        },
                    ],
                },
            },
        });
        hasReplied = true;
    } catch (error) {
        console.error('[Leave] Error in startLeaveRequest:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    }
}

/**
 * จัดการการเลือกวันที่ (จาก Postback Date Picker)
 */
async function handleLeaveDateSelection(replyToken, userId, event) {
    let hasReplied = false;
    try {
        const { data, params } = event.postback;
        const selectedDate = params.date; // YYYY-MM-DD

        // ดึง State ปัจจุบัน
        let state = await prisma.conversationState.findUnique({
            where: { user_id: userId },
        });

        // ถ้าไม่มี State และกดจากเมนู (action=leave_start_date) ให้สร้าง State ใหม่
        if (!state && data === 'action=leave_start_date') {
            state = await prisma.conversationState.create({
                data: {
                    user_id: userId,
                    state: 'LEAVE_WAIT_START_DATE',
                    data: {},
                },
            });
        }

        if (!state) {
            await replyMessage(replyToken, '⚠️ หมดเวลาทำรายการ กรุณาพิมพ์ "ลา" เพื่อเริ่มใหม่');
            hasReplied = true;
            return;
        }

        // กรณีเลือกวันเริ่มต้น
        if (data === 'action=leave_start_date' && state.state === 'LEAVE_WAIT_START_DATE') {
            // อัพเดท State: เก็บวันเริ่ม -> รอวันสิ้นสุด
            await prisma.conversationState.update({
                where: { user_id: userId },
                data: {
                    state: 'LEAVE_WAIT_END_DATE',
                    data: { start_date: selectedDate },
                },
            });

            // ส่ง Flex Message ให้เลือกวันสิ้นสุด
            await replyMessage(replyToken, {
                type: 'flex',
                altText: 'กรุณาเลือกวันสิ้นสุดการลา',
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '📅 วันเริ่มต้น: ' + formatDateThai(selectedDate),
                                weight: 'bold',
                                size: 'md',
                                color: '#333333',
                            },
                            {
                                type: 'text',
                                text: 'กรุณาเลือก "วันสิ้นสุด" ที่ต้องการลา\n(หากลาวันเดียว ให้เลือกวันเดิม)',
                                margin: 'md',
                                size: 'sm',
                                color: '#666666',
                                wrap: true,
                            },
                        ],
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'datetimepicker',
                                    label: 'เลือกวันสิ้นสุด',
                                    data: 'action=leave_end_date',
                                    mode: 'date',
                                    initial: selectedDate, // เริ่มต้นที่วันเดียวกับวันเริ่ม
                                    min: selectedDate,     // ห้ามเลือกย้อนหลังกว่าวันเริ่ม
                                },
                                style: 'primary',
                                color: '#1DB446',
                            },
                        ],
                    },
                },
            });
            hasReplied = true;
        }
        // กรณีเลือกวันสิ้นสุด
        else if (data === 'action=leave_end_date' && state.state === 'LEAVE_WAIT_END_DATE') {
            const startDate = state.data.start_date;

            // อัพเดท State: เก็บวันสิ้นสุด -> รอเหตุผล
            await prisma.conversationState.update({
                where: { user_id: userId },
                data: {
                    state: 'LEAVE_WAIT_REASON',
                    data: { ...state.data, end_date: selectedDate },
                },
            });

            await replyMessage(
                replyToken,
                `📅 วันที่ลา: ${formatDateThai(startDate)} - ${formatDateThai(selectedDate)}\n\n` +
                `📝 กรุณาพิมพ์ "เหตุผล" การลาส่งมาได้เลยครับ\n` +
                `(เช่น ป่วย, ติดธุระ, พักร้อน)`
            );
            hasReplied = true;
        }
    } catch (error) {
        console.error('[Leave] Error in handleLeaveDateSelection:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    }
}

/**
 * จัดการเหตุผลการลา (ขั้นตอนสุดท้าย)
 */
async function handleLeaveReason(replyToken, userId, text) {
    let hasReplied = false;
    try {
        // ดึง State
        const state = await prisma.conversationState.findUnique({
            where: { user_id: userId },
        });

        if (!state || state.state !== 'LEAVE_WAIT_REASON') {
            return; // ไม่ควรเกิดขึ้นถ้าเรียกถูก flow
        }

        const { start_date, end_date } = state.data;
        const reason = text.trim();

        // ดึงข้อมูลพนักงาน
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
        });

        if (!employee) {
            await replyMessage(replyToken, '❌ ไม่พบข้อมูลพนักงาน');
            hasReplied = true;
            return;
        }

        // คำนวณจำนวนวัน
        const totalDays = calculateDaysDifference(start_date, end_date);

        // กำหนดประเภทการลา
        let leaveType = 'PERSONAL';
        const reasonLower = reason.toLowerCase();
        if (reasonLower.includes('ป่วย') || reasonLower.includes('sick')) {
            leaveType = 'SICK';
        } else if (reasonLower.includes('พักร้อน') || reasonLower.includes('annual')) {
            leaveType = 'ANNUAL';
        }

        // ตรวจสอบการลาซ้ำ
        const overlapping = await checkOverlappingLeave(userId, dayjs(start_date).toDate(), dayjs(end_date).toDate());
        if (overlapping) {
            const formattedId = formatRequestId('LEV', overlapping.id, overlapping.created_at);
            const overlapCard = buildOverlapWarningCard(overlapping, formattedId);
            await replyMessage(replyToken, overlapCard);
            hasReplied = true;
            // ล้าง State เพื่อให้เริ่มใหม่
            await prisma.conversationState.delete({ where: { user_id: userId } });
            return;
        }

        // ตรวจสอบโควตา
        try {
            await checkLeaveQuota(userId, leaveType, totalDays);
        } catch (quotaError) {
            await replyMessage(replyToken, `❌ ${quotaError.message}`);
            hasReplied = true;
            // ล้าง State เพื่อให้เริ่มใหม่
            await prisma.conversationState.delete({ where: { user_id: userId } });
            return;
        }

        // บันทึกคำขอลา
        const leaveRequest = await prisma.leave.create({
            data: {
                user_id: userId,
                leave_type: leaveType,
                start_date: dayjs(start_date).toDate(),
                end_date: dayjs(end_date).toDate(),
                reason: reason,
                total_days: totalDays,
                status: 'PENDING',
            },
        });

        // ล้าง State
        await prisma.conversationState.delete({
            where: { user_id: userId },
        });

        const formattedId = formatRequestId('LEV', leaveRequest.id, leaveRequest.created_at);

        // แจ้งผู้ขอ
        await replyMessage(
            replyToken,
            `✅ ส่งคำขอลางานเรียบร้อยแล้ว\n\n` +
            `🔢 เลขที่คำขอ: ${formattedId}\n` +
            `📅 ประเภท: ${LEAVE_TYPES[leaveType]}\n` +
            `📅 วันที่: ${formatDateThai(start_date)} - ${formatDateThai(end_date)}\n` +
            `📊 จำนวน: ${totalDays} วัน\n` +
            `📝 เหตุผล: ${reason}\n\n` +
            `⏳ รอ HR อนุมัติ...`
        );
        hasReplied = true;

        // แจ้ง Admin (Flex Message Only)
        try {
            const approvalCard = buildApprovalCard('leave', {
                requestId: leaveRequest.id,
                formattedId: formattedId,
                employeeName: employee.name,
                leaveType: LEAVE_TYPES[leaveType],
                startDate: formatDateThai(start_date),
                endDate: formatDateThai(end_date),
                totalDays: totalDays,
                reason: reason,
            });

            await notifyAdmin(approvalCard);
        } catch (adminError) {
            console.error('[Leave] Failed to notify admin:', adminError.message);
        }

    } catch (error) {
        console.error('[Leave] Error in handleLeaveReason:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    }
}

/**
 * ประมวลผลคำขอลา (รูปแบบ text command: "ลา [วันเริ่ม] [วันสิ้นสุด] [เหตุผล]")
 */
async function processLeaveRequest(replyToken, userId, text) {
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

        // Parse คำสั่ง
        const parts = text.trim().split(/\s+/);
        if (parts.length < 4) {
            await replyMessage(
                replyToken,
                '❌ รูปแบบไม่ถูกต้อง\n\nใช้รูปแบบ:\nลา [วันเริ่ม] [วันสิ้นสุด] [เหตุผล]\n\nตัวอย่าง:\nลา 2025-12-05 2025-12-06 ป่วย'
            );
            hasReplied = true;
            return;
        }

        const startDateStr = parts[1];
        const endDateStr = parts[2];
        const reason = parts.slice(3).join(' ');

        // ตรวจสอบรูปแบบวันที่
        const startDate = dayjs(startDateStr);
        const endDate = dayjs(endDateStr);

        if (!startDate.isValid() || !endDate.isValid()) {
            await replyMessage(replyToken, '❌ รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้ YYYY-MM-DD\nตัวอย่าง: 2025-12-05');
            hasReplied = true;
            return;
        }

        if (endDate.isBefore(startDate)) {
            await replyMessage(replyToken, '❌ วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น');
            hasReplied = true;
            return;
        }

        const totalDays = calculateDaysDifference(startDate.toDate(), endDate.toDate());

        // กำหนดประเภทการลา
        let leaveType = 'PERSONAL';
        const reasonLower = reason.toLowerCase();
        if (reasonLower.includes('ป่วย') || reasonLower.includes('sick')) {
            leaveType = 'SICK';
        } else if (reasonLower.includes('พักร้อน') || reasonLower.includes('annual')) {
            leaveType = 'ANNUAL';
        }

        // ตรวจสอบการลาซ้ำ
        const overlapping = await checkOverlappingLeave(userId, startDate.toDate(), endDate.toDate());
        if (overlapping) {
            const formattedId = formatRequestId('LEV', overlapping.id, overlapping.created_at);
            const overlapCard = buildOverlapWarningCard(overlapping, formattedId);
            await replyMessage(replyToken, overlapCard);
            hasReplied = true;
            return;
        }

        // ตรวจสอบโควตา
        try {
            await checkLeaveQuota(userId, leaveType, totalDays);
        } catch (quotaError) {
            await replyMessage(replyToken, `❌ ${quotaError.message}`);
            hasReplied = true;
            return;
        }

        // บันทึกคำขอลา
        const leaveRequest = await prisma.leave.create({
            data: {
                user_id: userId,
                leave_type: leaveType,
                start_date: startDate.toDate(),
                end_date: endDate.toDate(),
                reason: reason,
                total_days: totalDays,
                status: 'PENDING',
            },
        });

        // แจ้งผู้ขอ
        await replyMessage(
            replyToken,
            `✅ ส่งคำขอลางานเรียบร้อยแล้ว\n\n` +
            `📅 ประเภท: ${LEAVE_TYPES[leaveType]}\n` +
            `📆 วันที่: ${formatDateThai(startDate.toDate())} - ${formatDateThai(endDate.toDate())}\n` +
            `📊 จำนวน: ${totalDays} วัน\n` +
            `📝 เหตุผล: ${reason}\n\n` +
            `⏳ รอ HR อนุมัติ...`
        );
        hasReplied = true;

        // แจ้ง Admin (แยก try-catch เพื่อไม่ให้กระทบ Flow หลัก)
        try {
            // 1. พยายามส่ง Flex Message (สวยงาม)
            try {
                const formattedId = formatRequestId('LEV', leaveRequest.id, leaveRequest.created_at);
                const approvalCard = buildApprovalCard('leave', {
                    requestId: leaveRequest.id,
                    formattedId: formattedId,
                    employeeName: employee.name,
                    leaveType: LEAVE_TYPES[leaveType],
                    startDate: formatDateThai(startDate.toDate()),
                    endDate: formatDateThai(endDate.toDate()),
                    totalDays: totalDays,
                    reason: reason,
                });

                await notifyAdmin([
                    '🔔 มีคำขอลางานใหม่!',
                    approvalCard,
                ]);
            } catch (flexError) {
                console.error('[Leave] Failed to send Flex Message, falling back to text:', flexError.message);

                // 2. Fallback: ส่ง Text Message (กันเหนียว)
                await notifyAdmin(`🔔 มีคำขอลางานใหม่!\nคุณ ${employee.name} ลา ${LEAVE_TYPES[leaveType]} (${totalDays} วัน)\nเหตุผล: ${reason}`);
            }
        } catch (adminError) {
            console.error('[Leave] Failed to notify admin (All methods):', adminError.message);
            // ไม่ต้อง throw error ต่อ เพราะบันทึกข้อมูลสำเร็จแล้ว
        }

    } catch (error) {
        console.error('[Leave] Error in processLeaveRequest:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการส่งคำขอลา กรุณาลองใหม่');
        }
    }
}

/**
 * อนุมัติหรือปฏิเสธคำขอลา (จาก Postback)
 */
async function handleLeaveApproval(postbackData, adminUserId) {
    try {
        const { action, id } = postbackData;
        const leaveId = parseInt(id);

        // ตรวจสอบว่า Admin หรือไม่
        const admin = await prisma.employee.findUnique({
            where: { id: adminUserId },
        });

        if (!admin || !hasAdminPrivileges(admin.role)) {
            throw new Error('Only admin can approve requests');
        }

        const leaveRequest = await prisma.leave.findUnique({
            where: { id: leaveId },
            include: {
                employee: true,
                approver: true, // Include approver details
            },
        });

        if (!leaveRequest) {
            throw new Error('Leave request not found');
        }

        if (leaveRequest.status !== 'PENDING') {
            const formattedId = formatRequestId('LEV', leaveRequest.id, leaveRequest.created_at);
            let message = `⚠️ คำขอ ${formattedId} ถูกประมวลผลแล้ว`;

            if (leaveRequest.status === 'CANCELLED') {
                message = `⚠️ คำขอ ${formattedId} ถูกยกเลิกโดยผู้ใช้แล้ว`;
            } else if (leaveRequest.status === 'APPROVED') {
                const approverName = leaveRequest.approver?.name || 'Admin';
                message = `⚠️ คำขอ ${formattedId} ได้รับการอนุมัติแล้วโดย ${approverName}`;
            } else if (leaveRequest.status === 'REJECTED') {
                const approverName = leaveRequest.approver?.name || 'Admin';
                message = `⚠️ คำขอ ${formattedId} ถูกปฏิเสธแล้วโดย ${approverName}`;
            }

            throw new Error(message);
        }

        const isApproved = action === 'approve';
        const newStatus = isApproved ? 'APPROVED' : 'REJECTED';

        // อัพเดทสถานะ
        await prisma.leave.update({
            where: { id: leaveId },
            data: {
                status: newStatus,
                approved_by: adminUserId,
                approved_at: now().toDate(),
            },
        });

        // แจ้งผู้ขอ
        const statusText = isApproved ? '✅ อนุมัติ' : '❌ ไม่อนุมัติ';
        const statusEmoji = isApproved ? '🎉' : '😞';

        const formattedId = formatRequestId('LEV', leaveRequest.id, leaveRequest.created_at);

        await pushMessage(
            leaveRequest.user_id,
            `${statusEmoji} คำขอลางานของคุณถูก${statusText}\n\n` +
            `🔢 เลขที่: ${formattedId}\n` +
            `📅 วันที่: ${formatDateThai(leaveRequest.start_date)} - ${formatDateThai(leaveRequest.end_date)}\n` +
            `📝 เหตุผล: ${leaveRequest.reason}\n` +
            `👤 โดย: ${admin.name}`
        );

        console.log(`[Leave] Request ${leaveId} ${newStatus} by ${adminUserId}`);
        return { success: true, message: `${statusText}คำขอลางานแล้ว` };
    } catch (error) {
        if (!error.message.startsWith('⚠️')) {
            console.error('[Leave] Error in handleLeaveApproval:', error);
        }
        throw error;
    }
}

/**
 * ยกเลิกคำขอลา (โดยพนักงานเอง)
 */
async function cancelLeaveRequest(userId, leaveId) {
    try {
        const leaveRequest = await prisma.leave.findUnique({
            where: { id: leaveId },
        });

        if (!leaveRequest) {
            throw new Error('Leave request not found');
        }

        if (leaveRequest.user_id !== userId) {
            throw new Error('Unauthorized');
        }

        if (leaveRequest.status !== 'PENDING') {
            throw new Error('Cannot cancel non-pending request');
        }

        await prisma.leave.update({
            where: { id: leaveId },
            data: { status: 'CANCELLED' },
        });

        const formattedId = formatRequestId('LEV', leaveRequest.id, leaveRequest.created_at);

        // แจ้ง Admin
        const employee = await prisma.employee.findUnique({ where: { id: userId } });
        await notifyAdmin(
            `ℹ️ ${employee?.name || userId} ยกเลิกคำขอลางาน\n` +
            `🔢 เลขที่: ${formattedId}\n` +
            `📅 วันที่: ${formatDateThai(leaveRequest.start_date)} - ${formatDateThai(leaveRequest.end_date)}`
        );

        console.log(`[Leave] Request ${leaveId} cancelled by user ${userId}`);
        return {
            success: true,
            formattedId: formattedId,
            details: `${formatDateThai(leaveRequest.start_date)} - ${formatDateThai(leaveRequest.end_date)}`
        };
    } catch (error) {
        console.error('[Leave] Error in cancelLeaveRequest:', error);
        throw error;
    }
}

/**
 * ดึงรายการคำขอลาที่รออนุมัติ (สำหรับยกเลิก)
 */
async function getPendingLeaves(userId) {
    const leaves = await prisma.leave.findMany({
        where: {
            user_id: userId,
            status: 'PENDING',
        },
        orderBy: { created_at: 'desc' },
    });

    return leaves.map((leave) => ({
        id: leave.id,
        formattedId: formatRequestId('LEV', leave.id, leave.created_at),
        type: 'leave',
        leaveType: LEAVE_TYPES[leave.leave_type],
        startDate: formatDateThai(leave.start_date),
        endDate: formatDateThai(leave.end_date),
        totalDays: leave.total_days,
        reason: leave.reason,
    }));
}

/**
 * อนุมัติหรือปฏิเสธคำขอลา (จาก Postback)
 */
async function handleLeaveApproval(postbackData, adminUserId) {
    try {
        const { action, id } = postbackData;
        const leaveId = parseInt(id);

        // ตรวจสอบว่า Admin หรือไม่
        const admin = await prisma.employee.findUnique({
            where: { id: adminUserId },
        });

        if (!admin || !hasAdminPrivileges(admin.role)) {
            throw new Error('Only admin can approve requests');
        }

        const leaveRequest = await prisma.leave.findUnique({
            where: { id: leaveId },
            include: {
                employee: true,
                approver: true, // Include approver details
            },
        });

        if (!leaveRequest) {
            throw new Error('Leave request not found');
        }

        if (leaveRequest.status !== 'PENDING') {
            const formattedId = formatRequestId('LEV', leaveRequest.id, leaveRequest.created_at);
            let message = `⚠️ คำขอ ${formattedId} ถูกประมวลผลแล้ว`;

            if (leaveRequest.status === 'CANCELLED') {
                message = `⚠️ คำขอ ${formattedId} ถูกยกเลิกโดยผู้ใช้แล้ว`;
            } else if (leaveRequest.status === 'APPROVED') {
                const approverName = leaveRequest.approver?.name || 'Admin';
                message = `⚠️ คำขอ ${formattedId} ได้รับการอนุมัติแล้วโดย ${approverName}`;
            } else if (leaveRequest.status === 'REJECTED') {
                const approverName = leaveRequest.approver?.name || 'Admin';
                message = `⚠️ คำขอ ${formattedId} ถูกปฏิเสธแล้วโดย ${approverName}`;
            }

            throw new Error(message);
        }

        const isApproved = action === 'approve';
        const newStatus = isApproved ? 'APPROVED' : 'REJECTED';

        // อัพเดทสถานะ
        await prisma.leave.update({
            where: { id: leaveId },
            data: {
                status: newStatus,
                approved_by: adminUserId,
                approved_at: now().toDate(),
            },
        });

        // แจ้งผู้ขอ
        const statusText = isApproved ? '✅ อนุมัติ' : '❌ ไม่อนุมัติ';
        const statusEmoji = isApproved ? '🎉' : '😞';

        const formattedId = formatRequestId('LEV', leaveRequest.id, leaveRequest.created_at);

        try {
            await pushMessage(
                leaveRequest.user_id,
                `${statusEmoji} คำขอลางานของคุณถูก${statusText}\n\n` +
                `🔢 เลขที่: ${formattedId}\n` +
                `📅 วันที่: ${formatDateThai(leaveRequest.start_date)} - ${formatDateThai(leaveRequest.end_date)}\n` +
                `📝 เหตุผล: ${leaveRequest.reason}\n` +
                `👤 โดย: ${admin.name}`
            );
        } catch (pushError) {
            console.error('[Leave] Failed to notify employee (non-critical):', pushError.message);
        }

        console.log(`[Leave] Request ${leaveId} ${newStatus} by ${adminUserId}`);
        return { success: true, message: `${statusText}คำขอลางานแล้ว` };
    } catch (error) {
        if (!error.message.startsWith('⚠️')) {
            console.error('[Leave] Error in handleLeaveApproval:', error);
        }
        throw error;
    }
}

/**
 * ยกเลิกคำขอลา (โดยพนักงานเอง)
 */
async function cancelLeaveRequest(userId, leaveId) {
    try {
        const leaveRequest = await prisma.leave.findUnique({
            where: { id: leaveId },
        });

        if (!leaveRequest) {
            throw new Error('Leave request not found');
        }

        if (leaveRequest.user_id !== userId) {
            throw new Error('Unauthorized');
        }

        if (leaveRequest.status !== 'PENDING') {
            throw new Error('Cannot cancel non-pending request');
        }

        await prisma.leave.update({
            where: { id: leaveId },
            data: { status: 'CANCELLED' },
        });

        const formattedId = formatRequestId('LEV', leaveRequest.id, leaveRequest.created_at);

        // แจ้ง Admin
        const employee = await prisma.employee.findUnique({ where: { id: userId } });
        await notifyAdmin(
            `ℹ️ ${employee?.name || userId} ยกเลิกคำขอลางาน\n` +
            `🔢 เลขที่: ${formattedId}\n` +
            `📅 วันที่: ${formatDateThai(leaveRequest.start_date)} - ${formatDateThai(leaveRequest.end_date)}`
        );

        console.log(`[Leave] Request ${leaveId} cancelled by user ${userId}`);
        return {
            success: true,
            formattedId: formattedId,
            details: `${formatDateThai(leaveRequest.start_date)} - ${formatDateThai(leaveRequest.end_date)}`
        };
    } catch (error) {
        console.error('[Leave] Error in cancelLeaveRequest:', error);
        throw error;
    }
}

/**
 * ดึงรายการคำขอลาที่รออนุมัติ (สำหรับยกเลิก)
 */
async function getPendingLeaves(userId) {
    const leaves = await prisma.leave.findMany({
        where: {
            user_id: userId,
            status: 'PENDING',
        },
        orderBy: { created_at: 'desc' },
    });

    return leaves.map((leave) => ({
        id: leave.id,
        formattedId: formatRequestId('LEV', leave.id, leave.created_at),
        type: 'leave',
        leaveType: LEAVE_TYPES[leave.leave_type],
        startDate: formatDateThai(leave.start_date),
        endDate: formatDateThai(leave.end_date),
        totalDays: leave.total_days,
        reason: leave.reason,
    }));
}

/**
 * ตรวจสอบโควตาวันลา
 */
async function checkLeaveQuota(userId, leaveType, requestedDays) {
    // 1. ดึงข้อมูลพนักงานและโควตา
    const employee = await prisma.employee.findUnique({
        where: { id: userId },
    });

    if (!employee) {
        throw new Error('Employee not found');
    }

    // 2. กำหนดโควตาตามประเภท
    let quota = 0;
    if (leaveType === 'SICK') quota = employee.quota_sick;
    else if (leaveType === 'PERSONAL') quota = employee.quota_personal;
    else if (leaveType === 'ANNUAL') quota = employee.quota_annual;
    else return true; // ประเภทอื่นไม่จำกัด

    // 3. คำนวณวันลาที่ใช้ไปแล้วในปีนี้ (Approved + Pending)
    const startOfYear = dayjs().startOf('year').toDate();
    const endOfYear = dayjs().endOf('year').toDate();

    const usedLeaves = await prisma.leave.findMany({
        where: {
            user_id: userId,
            leave_type: leaveType,
            status: { in: ['APPROVED', 'PENDING'] }, // นับรวมที่รออนุมัติด้วย
            start_date: {
                gte: startOfYear,
                lte: endOfYear,
            },
        },
    });

    const usedDays = usedLeaves.reduce((sum, leave) => sum + leave.total_days, 0);
    const remainingDays = quota - usedDays;

    if (requestedDays > remainingDays) {
        throw new Error(`วันลาคงเหลือไม่พอ (เหลือ ${remainingDays} วัน, ขอ ${requestedDays} วัน)`);
    }

    return { remainingDays, usedDays, quota };
}

module.exports = {
    startLeaveRequest,
    processLeaveRequest,
    handleLeaveApproval,
    cancelLeaveRequest,
    getPendingLeaves,
    handleLeaveDateSelection,
    handleLeaveReason,
    checkLeaveQuota,
    getLeaveHistory,
    handleLeaveHistory,
};

/**
 * ดึงประวัติการลา 10 รายการล่าสุด
 */
async function getLeaveHistory(userId) {
    const leaves = await prisma.leave.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 10,
    });

    return leaves.map((leave) => ({
        id: leave.id,
        formattedId: formatRequestId('LEV', leave.id, leave.created_at),
        type: LEAVE_TYPES[leave.leave_type],
        startDate: formatDateThai(leave.start_date),
        endDate: formatDateThai(leave.end_date),
        totalDays: leave.total_days,
        status: leave.status,
        reason: leave.reason,
    }));
}

/**
 * จัดการขอดูประวัติการลา
 */
async function handleLeaveHistory(replyToken, userId) {
    let hasReplied = false;
    try {
        const history = await getLeaveHistory(userId);

        if (history.length === 0) {
            await replyMessage(replyToken, '❌ คุณยังไม่มีประวัติการลา');
            return;
        }

        // สร้าง Carousel
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
                            text: `${statusEmoji} ${item.formattedId}`,
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
                                        { type: 'text', text: '📅', size: 'sm', flex: 1 },
                                        { type: 'text', text: item.type, size: 'sm', color: '#111111', flex: 4, wrap: true },
                                    ],
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        { type: 'text', text: '📆', size: 'sm', flex: 1 },
                                        { type: 'text', text: `${item.startDate} - ${item.endDate}`, size: 'sm', color: '#666666', flex: 4, wrap: true },
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

        await replyMessage(replyToken, {
            type: 'flex',
            altText: 'ประวัติการลาของคุณ',
            contents: {
                type: 'carousel',
                contents: bubbles,
            },
        });
        hasReplied = true;

    } catch (error) {
        console.error('[Leave] Error in handleLeaveHistory:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการดึงข้อมูล');
        }
    }
}
