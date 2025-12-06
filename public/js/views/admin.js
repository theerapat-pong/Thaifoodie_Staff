// ========================================
// Admin View - Manage pending requests
// ========================================

const AdminView = {
    name: 'admin',
    pendingLeaves: [],
    pendingAdvances: [],
    pendingCheckIns: [],
    actionTarget: null,

    async render() {
        return `
            <div class="view-admin">
                <!-- Header -->
                <div class="header admin-header">
                    <div class="header-title">📋 จัดการคำขอ</div>
                    <div class="header-subtitle">อนุมัติคำขอของพนักงาน</div>
                </div>
                
                <!-- Stats -->
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-value" id="leave-count">0</div>
                        <div class="stat-label">คำขอลา</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="advance-count">0</div>
                        <div class="stat-label">คำขอเบิกเงิน</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="checkin-count">0</div>
                        <div class="stat-label">ลงเวลาเข้างาน</div>
                    </div>
                </div>
                
                <!-- Tabs -->
                <div class="tab-container">
                    <button class="tab-btn active" onclick="AdminView.switchTab('leave', event)">
                        📅 ลางาน
                        <span class="badge badge-danger" id="leave-badge" style="display: none;">0</span>
                    </button>
                    <button class="tab-btn" onclick="AdminView.switchTab('advance', event)">
                        💰 เบิกเงิน
                        <span class="badge badge-danger" id="advance-badge" style="display: none;">0</span>
                    </button>
                    <button class="tab-btn" onclick="AdminView.switchTab('checkin', event)">
                        ⏰ ลงเวลา
                        <span class="badge badge-danger" id="checkin-badge" style="display: none;">0</span>
                    </button>
                </div>
                
                <!-- Leave Tab -->
                <div id="tab-leave" class="tab-content active">
                    <div id="leave-list">
                        <div class="empty-state" id="leave-empty">
                            <div class="empty-icon">✓</div>
                            <div class="empty-title">ไม่มีคำขอลางานที่รออนุมัติ</div>
                        </div>
                    </div>
                </div>
                
                <!-- Advance Tab -->
                <div id="tab-advance" class="tab-content">
                    <div id="advance-list">
                        <div class="empty-state" id="advance-empty">
                            <div class="empty-icon">✓</div>
                            <div class="empty-title">ไม่มีคำขอเบิกเงินที่รออนุมัติ</div>
                        </div>
                    </div>
                </div>
                
                <!-- Check-in Tab -->
                <div id="tab-checkin" class="tab-content">
                    <div id="checkin-list">
                        <div class="empty-state" id="checkin-empty">
                            <div class="empty-icon">✓</div>
                            <div class="empty-title">ไม่มีคำขอลงเวลาเข้างานที่รออนุมัติ</div>
                        </div>
                    </div>
                </div>
                
                <!-- Back to Menu -->
                <button class="btn btn-outline btn-block mt-2" onclick="router.navigate('home')">
                    ← กลับหน้าหลัก
                </button>
                
                <!-- Action Modal -->
                <div class="confirm-modal" id="action-modal">
                    <div class="confirm-content">
                        <div class="confirm-icon" id="action-icon">✓</div>
                        <div class="confirm-title" id="action-title">ยืนยันการอนุมัติ?</div>
                        <div class="confirm-message" id="action-message">-</div>
                        
                        <!-- Reject reason input (hidden by default) -->
                        <div class="form-group" id="reject-reason-group" style="display: none;">
                            <label class="form-label">เหตุผลที่ไม่อนุมัติ</label>
                            <textarea id="reject-reason" class="form-control" placeholder="ระบุเหตุผล (ถ้ามี)" rows="2"></textarea>
                        </div>
                        
                        <div class="confirm-buttons">
                            <button class="btn btn-outline" onclick="AdminView.hideActionModal()">
                                ยกเลิก
                            </button>
                            <button class="btn" id="btn-confirm-action" onclick="AdminView.confirmAction()">
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        try {
            await this.loadPendingRequests();
            await this.loadPendingCheckIns();
        } catch (error) {
            console.error('Admin init error:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    switchTab(tab, event) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find the button element (in case click is on badge)
        const targetBtn = event?.target?.closest('.tab-btn') || 
                         document.querySelector(`.tab-btn[onclick*="'${tab}'"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tab}`).classList.add('active');
    },

    async loadPendingRequests() {
        try {
            showLoading('กำลังโหลดคำขอ...');
            
            const response = await AdminAPI.getPending();
            
            if (response.success && response.data) {
                this.pendingLeaves = response.data.leaves || [];
                this.pendingAdvances = response.data.advances || [];
                
                // Update counts
                document.getElementById('leave-count').textContent = this.pendingLeaves.length;
                document.getElementById('advance-count').textContent = this.pendingAdvances.length;
                
                // Update leave badge
                const leaveBadge = document.getElementById('leave-badge');
                if (this.pendingLeaves.length > 0) {
                    leaveBadge.textContent = this.pendingLeaves.length;
                    leaveBadge.style.display = 'inline';
                } else {
                    leaveBadge.style.display = 'none';
                }
                
                // Update advance badge
                const advanceBadge = document.getElementById('advance-badge');
                if (this.pendingAdvances.length > 0) {
                    advanceBadge.textContent = this.pendingAdvances.length;
                    advanceBadge.style.display = 'inline';
                } else {
                    advanceBadge.style.display = 'none';
                }
                
                this.renderLists();
            }
            
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Load pending error:', error);
            showError(error.message || 'ไม่สามารถโหลดข้อมูลได้');
        }
    },

    renderLists() {
        // Render leave requests
        const leaveList = document.getElementById('leave-list');
        const leaveEmpty = document.getElementById('leave-empty');
        
        // Always clear existing cards first
        leaveList.querySelectorAll('.request-card').forEach(el => el.remove());
        
        if (this.pendingLeaves.length > 0) {
            leaveEmpty.style.display = 'none';
            
            this.pendingLeaves.forEach(leave => {
                const card = document.createElement('div');
                card.className = 'request-card leave';
                card.innerHTML = `
                    <div class="request-header">
                        <div class="request-top">
                            <span class="request-employee">${leave.employeeName}</span>
                            <span class="request-type-badge leave">📅 ${leave.leaveTypeName}</span>
                        </div>
                        <div class="request-id">${leave.formattedId}</div>
                    </div>
                    <div class="request-body">
                        <div class="request-detail">
                            <span class="icon">📆</span>
                            <span class="label">วันที่:</span>
                            <span class="value">${leave.startDate}${leave.startDate !== leave.endDate ? ' - ' + leave.endDate : ''} (${leave.totalDays} วัน)</span>
                        </div>
                        <div class="request-detail">
                            <span class="icon">📝</span>
                            <span class="label">เหตุผล:</span>
                            <span class="value">${leave.reason || '-'}</span>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-approve" onclick="AdminView.showActionModal('approve', 'leave', '${leave.id}', '${leave.employeeName}')">
                            ✓ อนุมัติ
                        </button>
                        <button class="btn btn-reject" onclick="AdminView.showActionModal('reject', 'leave', '${leave.id}', '${leave.employeeName}')">
                            ✗ ไม่อนุมัติ
                        </button>
                    </div>
                `;
                leaveList.appendChild(card);
            });
        } else {
            leaveEmpty.style.display = 'block';
        }
        
        // Render advance requests
        const advanceList = document.getElementById('advance-list');
        const advanceEmpty = document.getElementById('advance-empty');
        
        // Always clear existing cards first
        advanceList.querySelectorAll('.request-card').forEach(el => el.remove());
        
        if (this.pendingAdvances.length > 0) {
            advanceEmpty.style.display = 'none';
            
            this.pendingAdvances.forEach(adv => {
                const card = document.createElement('div');
                card.className = 'request-card advance';
                card.innerHTML = `
                    <div class="request-header">
                        <div class="request-top">
                            <span class="request-employee">${adv.employeeName}</span>
                            <span class="request-type-badge advance">💰 ${formatCurrency(adv.amount)}</span>
                        </div>
                        <div class="request-id">${adv.formattedId}</div>
                    </div>
                    <div class="request-body">
                        <div class="request-detail">
                            <span class="icon">📆</span>
                            <span class="label">วันที่:</span>
                            <span class="value">${adv.createdAt}</span>
                        </div>
                        <div class="request-detail">
                            <span class="icon">📝</span>
                            <span class="label">เหตุผล:</span>
                            <span class="value">${adv.reason || '-'}</span>
                        </div>
                        <div class="request-detail">
                            <span class="icon">💵</span>
                            <span class="label">ยอดคงเหลือ:</span>
                            <span class="value">${formatCurrency(adv.balance || 0)}</span>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-approve" onclick="AdminView.showActionModal('approve', 'advance', '${adv.id}', '${adv.employeeName}')">
                            ✓ อนุมัติ
                        </button>
                        <button class="btn btn-reject" onclick="AdminView.showActionModal('reject', 'advance', '${adv.id}', '${adv.employeeName}')">
                            ✗ ไม่อนุมัติ
                        </button>
                    </div>
                `;
                advanceList.appendChild(card);
            });
        } else {
            advanceEmpty.style.display = 'block';
        }
    },

    async loadPendingCheckIns() {
        try {
            const response = await AdminAPI.getPendingCheckIns();
            
            if (response.success && response.data) {
                this.pendingCheckIns = response.data || [];
                
                // Update count
                document.getElementById('checkin-count').textContent = this.pendingCheckIns.length;
                
                // Update badge
                const checkinBadge = document.getElementById('checkin-badge');
                if (this.pendingCheckIns.length > 0) {
                    checkinBadge.textContent = this.pendingCheckIns.length;
                    checkinBadge.style.display = 'inline';
                } else {
                    checkinBadge.style.display = 'none';
                }
                
                this.renderCheckInList();
            }
            
        } catch (error) {
            console.error('Load pending check-ins error:', error);
            showError(error.message || 'ไม่สามารถโหลดข้อมูลลงเวลาได้');
        }
    },

    renderCheckInList() {
        const checkinList = document.getElementById('checkin-list');
        const checkinEmpty = document.getElementById('checkin-empty');
        
        // Clear existing cards
        checkinList.querySelectorAll('.request-card').forEach(el => el.remove());
        
        if (this.pendingCheckIns.length > 0) {
            checkinEmpty.style.display = 'none';
            
            this.pendingCheckIns.forEach(checkin => {
                const card = document.createElement('div');
                card.className = 'request-card checkin';
                card.innerHTML = `
                    <div class="request-header">
                        <div class="request-top">
                            <span class="request-employee">${checkin.employeeName}</span>
                            <span class="request-type-badge ${checkin.isLate ? 'late' : 'ontime'}">
                                ${checkin.isLate ? '⏰ มาสาย' : '✓ ตรงเวลา'}
                            </span>
                        </div>
                    </div>
                    <div class="request-body">
                        <div class="request-detail">
                            <span class="icon">📆</span>
                            <span class="label">วันที่:</span>
                            <span class="value">${checkin.requestedDate}</span>
                        </div>
                        <div class="request-detail">
                            <span class="icon">⏰</span>
                            <span class="label">เวลา:</span>
                            <span class="value">${checkin.requestedTime}${checkin.isLate ? ` (สาย ${formatDuration(checkin.minutesLate)})` : ''}</span>
                        </div>
                        <div class="request-detail">
                            <span class="icon">📍</span>
                            <span class="label">ระยะห่าง:</span>
                            <span class="value" style="color: var(--warning);">${checkin.distanceDisplay}</span>
                        </div>
                        ${checkin.accuracy ? `
                        <div class="request-detail">
                            <span class="icon">🎯</span>
                            <span class="label">ความแม่นยำ:</span>
                            <span class="value">${Math.round(checkin.accuracy)} เมตร</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-approve" onclick="AdminView.showActionModal('approve', 'checkin', '${checkin.id}', '${checkin.employeeName}')">
                            ✓ อนุมัติ
                        </button>
                        <button class="btn btn-reject" onclick="AdminView.showActionModal('reject', 'checkin', '${checkin.id}', '${checkin.employeeName}')">
                            ✗ ปฏิเสธ
                        </button>
                    </div>
                `;
                checkinList.appendChild(card);
            });
        } else {
            checkinEmpty.style.display = 'block';
        }
    },

    showActionModal(action, type, id, employeeName) {
        this.actionTarget = { action, type, id, employeeName };
        
        const modal = document.getElementById('action-modal');
        const icon = document.getElementById('action-icon');
        const title = document.getElementById('action-title');
        const message = document.getElementById('action-message');
        const btn = document.getElementById('btn-confirm-action');
        const reasonGroup = document.getElementById('reject-reason-group');
        
        if (action === 'approve') {
            icon.textContent = '✓';
            icon.style.color = 'var(--primary)';
            title.textContent = 'ยืนยันการอนุมัติ?';
            message.textContent = `คุณต้องการอนุมัติคำขอของ ${employeeName} หรือไม่?`;
            btn.className = 'btn btn-primary';
            btn.textContent = 'อนุมัติ';
            reasonGroup.style.display = 'none';
        } else {
            icon.textContent = '✗';
            icon.style.color = 'var(--danger)';
            title.textContent = 'ยืนยันการปฏิเสธ?';
            message.textContent = `คุณต้องการปฏิเสธคำขอของ ${employeeName} หรือไม่?`;
            btn.className = 'btn btn-danger';
            btn.textContent = 'ไม่อนุมัติ';
            reasonGroup.style.display = 'block';
            document.getElementById('reject-reason').value = '';
        }
        
        modal.classList.add('show');
    },

    hideActionModal() {
        const modal = document.getElementById('action-modal');
        modal.classList.remove('show');
        this.actionTarget = null;
    },

    async confirmAction() {
        if (!this.actionTarget) return;
        
        const { action, type, id } = this.actionTarget;
        const rejectReason = document.getElementById('reject-reason').value.trim();
        
        try {
            const btn = document.getElementById('btn-confirm-action');
            btn.disabled = true;
            btn.textContent = 'กำลังดำเนินการ...';
            
            let response;
            if (action === 'approve') {
                response = await AdminAPI.approve({ type, id });
            } else {
                response = await AdminAPI.reject({ type, id, reason: rejectReason });
            }
            
            if (response.success) {
                showSuccess(response.message || (action === 'approve' ? 'อนุมัติสำเร็จ' : 'ปฏิเสธสำเร็จ'));
                this.hideActionModal();
                
                // Reload appropriate list
                if (type === 'checkin') {
                    await this.loadPendingCheckIns();
                } else {
                    await this.loadPendingRequests();
                }
            }
            
            btn.disabled = false;
            btn.textContent = action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ';
            
        } catch (error) {
            console.error('Action error:', error);
            showError(error.message || 'ไม่สามารถดำเนินการได้');
            
            const btn = document.getElementById('btn-confirm-action');
            btn.disabled = false;
            btn.textContent = this.actionTarget?.action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ';
        }
    },

};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.AdminView = AdminView;
}
