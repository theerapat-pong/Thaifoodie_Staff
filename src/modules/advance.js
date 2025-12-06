// ========================================
// Advance Module (ระบบเบิกเงินล่วงหน้า)
// ========================================

const prisma = require('../lib/prisma');

const { now, formatDateThai } = require('../utils/datetime');
const { formatRequestId } = require('../utils/format');
const { calculateAccruedSalary, calculateBalance } = require('../utils/salary');
const { replyMessage, pushMessage, buildApprovalCard, notifyAdmin, buildAdvanceHistoryCarousel } = require('../services/line');
const { hasAdminPrivileges } = require('../utils/roles');

/**
 * เริ่ม Flow การเบิกเงิน (Step 1: เช็คยอดและถามจำนวน)
 */
async function startAdvanceRequest(replyToken, userId) {
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

        // คำนวณยอดคงเหลือ
        const allAttendance = await prisma.attendance.findMany({
            where: {
                user_id: userId,
                check_out_time: { not: null },
            },
        });

        const approvedAdvances = await prisma.advance.findMany({
            where: {
                user_id: userId,
                status: 'APPROVED',
            },
        });

        const accruedSalary = calculateAccruedSalary(allAttendance);
        const currentBalance = calculateBalance(accruedSalary, approvedAdvances);

        if (currentBalance <= 0) {
            await replyMessage(replyToken, '❌ คุณไม่มียอดเงินให้เบิกได้ในขณะนี้');
            hasReplied = true;
            return;
        }

        // บันทึก State
        await prisma.conversationState.upsert({
            where: { user_id: userId },
            update: {
                state: 'ADVANCE_WAIT_AMOUNT',
                data: { max_balance: currentBalance },
                updated_at: new Date(),
            },
            create: {
                user_id: userId,
                state: 'ADVANCE_WAIT_AMOUNT',
                data: { max_balance: currentBalance },
            },
        });

        await replyMessage(
            replyToken,
            `💰 คุณมียอดเบิกได้: ${currentBalance.toFixed(2)} บาท\n\n` +
            `พิมพ์จำนวนเงินที่ต้องการเบิกมาได้เลยครับ\n` +
            `(พิมพ์เฉพาะตัวเลข เช่น 500)`
        );
        hasReplied = true;

    } catch (error) {
        console.error('[Advance] Error in startAdvanceRequest:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    }
}

/**
 * จัดการ Input จำนวนเงิน (Step 2: ตรวจสอบและขอ Confirm)
 */
async function handleAdvanceAmountInput(replyToken, userId, text) {
    let hasReplied = false;
    try {
        const amount = parseFloat(text.trim());

        if (isNaN(amount) || amount <= 0) {
            await replyMessage(replyToken, '❌ กรุณาพิมพ์เฉพาะตัวเลขจำนวนเงินที่ถูกต้อง (เช่น 500)');
            hasReplied = true;
            return;
        }

        // ดึง State เพื่อเช็คยอดเงินสูงสุด
        const state = await prisma.conversationState.findUnique({
            where: { user_id: userId },
        });

        if (!state || state.state !== 'ADVANCE_WAIT_AMOUNT') {
            return;
        }

        const maxBalance = state.data.max_balance || 0;

        if (amount > maxBalance) {
            await replyMessage(
                replyToken,
                `❌ ยอดเงินเกินกำหนด\n\n` +
                `คุณเบิกได้สูงสุด: ${maxBalance.toFixed(2)} บาท\n` +
                `กรุณาพิมพ์จำนวนเงินใหม่`
            );
            hasReplied = true;
            return;
        }

        // สร้าง Flex Message ยืนยัน
        const confirmFlex = {
            type: 'flex',
            altText: 'ยืนยันการเบิกเงิน',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'ยืนยันการเบิกเงิน',
                            weight: 'bold',
                            size: 'xl',
                            align: 'center',
                        },
                        {
                            type: 'separator',
                            margin: 'md',
                        },
                        {
                            type: 'text',
                            text: `จำนวน: ${amount.toFixed(2)} บาท`,
                            size: 'lg',
                            align: 'center',
                            margin: 'md',
                        },
                    ],
                },
                footer: {
                    type: 'box',
                    layout: 'horizontal',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'button',
                            style: 'primary',
                            action: {
                                type: 'postback',
                                label: 'ยืนยัน',
                                data: `action=confirm_advance&amount=${amount}`,
                                displayText: `ยืนยันการเบิกเงิน ${amount.toFixed(2)} บาท`,
                            },
                        },
                        {
                            type: 'button',
                            style: 'secondary',
                            action: {
                                type: 'postback',
                                label: 'ยกเลิก',
                                data: 'action=cancel_advance_flow',
                                displayText: 'ยกเลิกการเบิกเงิน',
                            },
                        },
                    ],
                },
            },
        };

        // ลบ State
        await prisma.conversationState.delete({
            where: { user_id: userId },
        });

        await replyMessage(replyToken, confirmFlex);
        hasReplied = true;

    } catch (error) {
        console.error('[Advance] Error in handleAdvanceAmountInput:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาด');
        }
    }
}

/**
 * ยืนยันการเบิกเงิน (Step 3: บันทึกและแจ้ง Admin) - เรียกจาก Postback
 */
async function confirmAdvanceRequest(replyToken, userId, amount) {
    let hasReplied = false;
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
        });

        const reason = 'เบิกผ่านระบบอัตโนมัติ';

        // Re-calculate balance to be safe
        const allAttendance = await prisma.attendance.findMany({
            where: { user_id: userId, check_out_time: { not: null } },
        });
        const approvedAdvances = await prisma.advance.findMany({
            where: { user_id: userId, status: 'APPROVED' },
        });
        const accruedSalary = calculateAccruedSalary(allAttendance);
        const currentBalance = calculateBalance(accruedSalary, approvedAdvances);

        if (amount > currentBalance) {
            await replyMessage(replyToken, '❌ ยอดเงินไม่เพียงพอ (อาจมีการเปลี่ยนแปลงข้อมูลล่าสุด)');
            hasReplied = true;
            return;
        }

        // บันทึก
        const advanceRequest = await prisma.advance.create({
            data: {
                user_id: userId,
                amount: amount,
                reason: reason,
                status: 'PENDING',
            },
        });

        const formattedId = formatRequestId('ADV', advanceRequest.id, advanceRequest.created_at);

        // แจ้งผู้ขอ
        await replyMessage(
            replyToken,
            `✅ ส่งคำขอเบิกเงินเรียบร้อยแล้ว\n\n` +
            `🔢 เลขที่: ${formattedId}\n` +
            `💰 จำนวน: ${amount.toFixed(2)} บาท\n` +
            `⏳ กรุณารอการอนุมัติจากผู้จัดการ`
        );
        hasReplied = true;

        // แจ้ง Admin
        try {
            const approvalCard = buildApprovalCard('advance', {
                requestId: advanceRequest.id,
                formattedId: formattedId,
                employeeName: employee.name,
                amount: amount.toFixed(2),
                reason: reason,
                currentBalance: currentBalance.toFixed(2),
                remainingBalance: (currentBalance - amount).toFixed(2),
            });

            await notifyAdmin(approvalCard);
        } catch (adminError) {
            console.error('[Advance] Failed to notify admin (non-critical):', adminError.message);
        }

    } catch (error) {
        console.error('[Advance] Error in confirmAdvanceRequest:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    }
}

/**
 * ประมวลผลคำขอเบิกเงิน (แบบเก่า - Text Command)
 */
async function processAdvanceRequest(replyToken, userId, text) {
    // Redirect to new flow if user types just "เบิกเงิน"
    if (text.trim() === 'เบิกเงิน') {
        return startAdvanceRequest(replyToken, userId);
    }

    // ... (Old logic for "เบิกเงิน 500 เหตุผล" if needed, but let's encourage the new flow)
    await replyMessage(replyToken, '⚠️ กรุณาพิมพ์ "เบิกเงิน" เพื่อเริ่มทำรายการ');
}

/**
 * อนุมัติหรือปฏิเสธคำขอเบิกเงิน (จาก Postback)
 */
async function handleAdvanceApproval(postbackData, adminUserId) {
    try {
        const { action, id } = postbackData;
        const advanceId = parseInt(id);

        // ตรวจสอบว่า Admin หรือไม่
        const admin = await prisma.employee.findUnique({
            where: { id: adminUserId },
        });

        if (!admin || !hasAdminPrivileges(admin.role)) {
            throw new Error('Only admin can approve requests');
        }

        const advanceRequest = await prisma.advance.findUnique({
            where: { id: advanceId },
            include: {
                employee: true,
                approver: true, // Include approver details
            },
        });

        if (!advanceRequest) {
            throw new Error('Advance request not found');
        }

        if (advanceRequest.status !== 'PENDING') {
            const formattedId = formatRequestId('ADV', advanceRequest.id, advanceRequest.created_at);
            let message = `⚠️ คำขอ ${formattedId} ถูกประมวลผลแล้ว`;

            if (advanceRequest.status === 'CANCELLED') {
                message = `⚠️ คำขอ ${formattedId} ถูกยกเลิกโดยผู้ใช้แล้ว`;
            } else if (advanceRequest.status === 'APPROVED') {
                const approverName = advanceRequest.approver?.name || 'Admin';
                message = `⚠️ คำขอ ${formattedId} ได้รับการอนุมัติแล้วโดย ${approverName}`;
            } else if (advanceRequest.status === 'REJECTED') {
                const approverName = advanceRequest.approver?.name || 'Admin';
                message = `⚠️ คำขอ ${formattedId} ถูกปฏิเสธแล้วโดย ${approverName}`;
            }

            throw new Error(message);
        }

        const isApproved = action === 'approve';
        const newStatus = isApproved ? 'APPROVED' : 'REJECTED';

        // อัพเดทสถานะ
        await prisma.advance.update({
            where: { id: advanceId },
            data: {
                status: newStatus,
                approved_by: adminUserId,
                approved_at: now().toDate(),
            },
        });

        // แจ้งผู้ขอ
        const statusText = isApproved ? '✅ อนุมัติ' : '❌ ไม่อนุมัติ';
        const statusEmoji = isApproved ? '🎉' : '😞';

        const formattedId = formatRequestId('ADV', advanceRequest.id, advanceRequest.created_at);

        try {
            await pushMessage(
                advanceRequest.user_id,
                `${statusEmoji} คำขอเบิกเงินของคุณถูก${statusText}\n\n` +
                `🔢 เลขที่: ${formattedId}\n` +
                `💰 จำนวน: ${parseFloat(advanceRequest.amount).toFixed(2)} บาท\n` +
                `📝 เหตุผล: ${advanceRequest.reason}\n` +
                `👤 โดย: ${admin.name}`
            );
        } catch (pushError) {
            console.error('[Advance] Failed to notify employee (non-critical):', pushError.message);
        }

        console.log(`[Advance] Request ${advanceId} ${newStatus} by ${adminUserId}`);
        return { success: true, message: `${statusText}คำขอเบิกเงินแล้ว` };
    } catch (error) {
        if (!error.message.startsWith('⚠️')) {
            console.error('[Advance] Error in handleAdvanceApproval:', error);
        }
        throw error;
    }
}

/**
 * ยกเลิกคำขอเบิกเงิน (โดยพนักงานเอง)
 */
async function cancelAdvanceRequest(userId, advanceId) {
    try {
        const advanceRequest = await prisma.advance.findUnique({
            where: { id: advanceId },
        });

        if (!advanceRequest) {
            throw new Error('Advance request not found');
        }

        if (advanceRequest.user_id !== userId) {
            throw new Error('Unauthorized');
        }

        if (advanceRequest.status !== 'PENDING') {
            throw new Error('Cannot cancel non-pending request');
        }

        await prisma.advance.update({
            where: { id: advanceId },
            data: { status: 'CANCELLED' },
        });

        const formattedId = formatRequestId('ADV', advanceRequest.id, advanceRequest.created_at);

        // แจ้ง Admin
        const employee = await prisma.employee.findUnique({ where: { id: userId } });
        await notifyAdmin(
            `ℹ️ ${employee?.name || userId} ยกเลิกคำขอเบิกเงิน\n` +
            `🔢 เลขที่: ${formattedId}\n` +
            `💰 จำนวน: ${parseFloat(advanceRequest.amount).toFixed(2)} บาท`
        );

        console.log(`[Advance] Request ${advanceId} cancelled by user ${userId}`);
        return {
            success: true,
            formattedId: formattedId,
            details: `${parseFloat(advanceRequest.amount).toFixed(2)} บาท`
        };
    } catch (error) {
        console.error('[Advance] Error in cancelAdvanceRequest:', error);
        throw error;
    }
}

/**
 * ดึงรายการคำขอเบิกเงินที่รออนุมัติ (สำหรับยกเลิก)
 */
async function getPendingAdvances(userId) {
    const advances = await prisma.advance.findMany({
        where: {
            user_id: userId,
            status: 'PENDING',
        },
        orderBy: { created_at: 'desc' },
    });

    return advances.map((adv) => ({
        id: adv.id,
        formattedId: formatRequestId('ADV', adv.id, adv.created_at),
        type: 'advance',
        amount: parseFloat(adv.amount).toFixed(2),
        reason: adv.reason,
    }));
}

/**
 * ตรวจสอบยอดเงินคงเหลือ
 */
async function checkBalance(replyToken, userId) {
    let hasReplied = false;
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: userId },
        });

        if (!employee || !employee.is_active) {
            await replyMessage(replyToken, '❌ ไม่พบข้อมูลพนักงาน');
            hasReplied = true;
            return;
        }

        // คำนวณยอดสะสม
        const allAttendance = await prisma.attendance.findMany({
            where: {
                user_id: userId,
                check_out_time: { not: null },
            },
        });

        const approvedAdvances = await prisma.advance.findMany({
            where: {
                user_id: userId,
                status: 'APPROVED',
            },
        });

        const accruedSalary = calculateAccruedSalary(allAttendance);
        const totalAdvanced = approvedAdvances.reduce((sum, adv) => sum + parseFloat(adv.amount), 0);
        const balance = accruedSalary - totalAdvanced;

        await replyMessage(
            replyToken,
            `💵 ยอดเงินของคุณ\n\n` +
            `👤 ชื่อ: ${employee.name}\n` +
            `💰 ค่าจ้างรายวัน: ${parseFloat(employee.daily_salary).toFixed(2)} บาท\n` +
            `📊 จำนวนวันทำงาน: ${allAttendance.length} วัน\n` +
            `💵 เงินสะสมทั้งหมด: ${accruedSalary.toFixed(2)} บาท\n` +
            `💸 เบิกไปแล้ว: ${totalAdvanced.toFixed(2)} บาท\n` +
            `✅ ยอดคงเหลือ: ${balance.toFixed(2)} บาท`
        );
        hasReplied = true;
        hasReplied = true;

    } catch (error) {
        console.error('[Advance] Error in checkBalance:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการตรวจสอบยอดเงิน');
        }
    }
}

/**
 * ตรวจสอบประวัติการเบิกเงิน (แสดงเป็น Carousel)
 */
async function checkAdvanceHistory(replyToken, userId) {
    let hasReplied = false;
    try {
        const history = await prisma.advance.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 5,
        });

        if (history.length === 0) {
            await replyMessage(replyToken, '📋 คุณยังไม่มีประวัติการเบิกเงิน');
            hasReplied = true;
            return;
        }

        const formattedHistory = history.map(item => ({
            id: formatRequestId('ADV', item.id, item.created_at),
            date: formatDateThai(item.created_at),
            amount: parseFloat(item.amount).toFixed(2),
            status: item.status,
        }));

        const carousel = buildAdvanceHistoryCarousel(formattedHistory);
        await replyMessage(replyToken, carousel);
        hasReplied = true;

    } catch (error) {
        console.error('[Advance] Error in checkAdvanceHistory:', error);
        if (!hasReplied) {
            await replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการดึงข้อมูล');
        }
    }
}

module.exports = {
    startAdvanceRequest,
    handleAdvanceAmountInput,
    confirmAdvanceRequest,
    processAdvanceRequest,
    handleAdvanceApproval,
    cancelAdvanceRequest,
    checkAdvanceHistory,
    checkBalance,
    getPendingAdvances
};
