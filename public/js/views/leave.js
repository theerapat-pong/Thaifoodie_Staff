// ========================================
// Leave View - Request leave & history
// ========================================

const LeaveView = {
    name: 'leave',
    selectedLeaveType: 'SICK',
    quotaData: null,

    async render() {
        const today = new Date().toISOString().split('T')[0];
        
        return `
            <div class="view-leave">
                <!-- Header -->
                <div class="header">
                    <div class="header-title">📅 ลางาน</div>
                    <div class="header-subtitle">ขอลางานและดูประวัติ</div>
                </div>
                
                <!-- Tabs -->
                <div class="tab-container">
                    <button class="tab-btn active" onclick="LeaveView.switchTab('request')">ขอลางาน</button>
                    <button class="tab-btn" onclick="LeaveView.switchTab('history')">ประวัติการลา</button>
                </div>
                
                <!-- Request Tab -->
                <div id="tab-request" class="tab-content active">
                    <!-- Quota Display -->
                    <div class="quota-grid" id="quota-grid">
                        <div class="quota-item">
                            <div class="quota-icon">🏥</div>
                            <div class="quota-value" id="quota-sick">-</div>
                            <div class="quota-label">ลาป่วย</div>
                            <div class="quota-total" id="quota-sick-total">/ - วัน</div>
                        </div>
                        <div class="quota-item">
                            <div class="quota-icon">📝</div>
                            <div class="quota-value" id="quota-personal">-</div>
                            <div class="quota-label">ลากิจ</div>
                            <div class="quota-total" id="quota-personal-total">/ - วัน</div>
                        </div>
                        <div class="quota-item">
                            <div class="quota-icon">🏖️</div>
                            <div class="quota-value" id="quota-annual">-</div>
                            <div class="quota-label">ลาพักร้อน</div>
                            <div class="quota-total" id="quota-annual-total">/ - วัน</div>
                        </div>
                    </div>
                    
                    <!-- Leave Request Form -->
                    <div class="card">
                        <div class="card-header">📝 แบบฟอร์มขอลา</div>
                        <div class="card-body">
                            <!-- Leave Type Selection -->
                            <div class="form-group">
                                <label class="form-label">ประเภทการลา</label>
                                <div class="leave-type-grid">
                                    <div class="leave-type-btn selected" data-type="SICK" onclick="LeaveView.selectLeaveType('SICK')">
                                        <div class="leave-type-icon">🏥</div>
                                        <div class="leave-type-name">ลาป่วย</div>
                                    </div>
                                    <div class="leave-type-btn" data-type="PERSONAL" onclick="LeaveView.selectLeaveType('PERSONAL')">
                                        <div class="leave-type-icon">📝</div>
                                        <div class="leave-type-name">ลากิจ</div>
                                    </div>
                                    <div class="leave-type-btn" data-type="ANNUAL" onclick="LeaveView.selectLeaveType('ANNUAL')">
                                        <div class="leave-type-icon">🏖️</div>
                                        <div class="leave-type-name">ลาพักร้อน</div>
                                    </div>
                                    <div class="leave-type-btn" data-type="OTHER" onclick="LeaveView.selectLeaveType('OTHER')">
                                        <div class="leave-type-icon">📋</div>
                                        <div class="leave-type-name">อื่นๆ</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Date Selection -->
                            <div class="date-inputs">
                                <div class="form-group">
                                    <label class="form-label">วันที่เริ่มต้น</label>
                                    <input type="date" id="start-date" class="form-control" min="${today}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">วันที่สิ้นสุด</label>
                                    <input type="date" id="end-date" class="form-control" min="${today}">
                                </div>
                            </div>
                            
                            <!-- Reason -->
                            <div class="form-group">
                                <label class="form-label">เหตุผล</label>
                                <textarea id="reason" class="form-control" placeholder="ระบุเหตุผลการลา (ถ้ามี)" rows="3"></textarea>
                            </div>
                            
                            <!-- Submit Button -->
                            <button class="btn btn-primary btn-block" id="btn-submit" onclick="LeaveView.submitLeaveRequest()">
                                ส่งคำขอลา
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- History Tab -->
                <div id="tab-history" class="tab-content">
                    <div id="history-list">
                        <div class="empty-state" id="history-empty">
                            <div class="empty-icon">📭</div>
                            <div class="empty-title">ยังไม่มีประวัติการลา</div>
                        </div>
                    </div>
                </div>
                
                <!-- Back to Menu -->
                <button class="btn btn-outline btn-block mt-2" onclick="router.navigate('home')">
                    ← กลับหน้าหลัก
                </button>
            </div>
        `;
    },

    async init() {
        try {
            await this.loadQuota();
        } catch (error) {
            console.error('Leave init error:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tab}`).classList.add('active');
        
        // Load history if switching to history tab
        if (tab === 'history') {
            this.loadHistory();
        }
    },

    async loadQuota() {
        try {
            showLoading('กำลังโหลดข้อมูล...');
            
            const response = await LeaveAPI.getQuota();
            
            if (response.success && response.data) {
                this.quotaData = response.data.quota;
                
                // Update UI
                document.getElementById('quota-sick').textContent = this.quotaData.sick.remaining;
                document.getElementById('quota-sick-total').textContent = `/ ${this.quotaData.sick.total} วัน`;
                
                document.getElementById('quota-personal').textContent = this.quotaData.personal.remaining;
                document.getElementById('quota-personal-total').textContent = `/ ${this.quotaData.personal.total} วัน`;
                
                document.getElementById('quota-annual').textContent = this.quotaData.annual.remaining;
                document.getElementById('quota-annual-total').textContent = `/ ${this.quotaData.annual.total} วัน`;
            }
            
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Load quota error:', error);
            showError(error.message || 'ไม่สามารถโหลดข้อมูลได้');
        }
    },

    selectLeaveType(type) {
        this.selectedLeaveType = type;
        
        document.querySelectorAll('.leave-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    },

    async submitLeaveRequest() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value || startDate;
        const reason = document.getElementById('reason').value.trim();
        
        if (!startDate) {
            showError('กรุณาเลือกวันที่เริ่มต้น');
            return;
        }
        
        try {
            const btn = document.getElementById('btn-submit');
            btn.disabled = true;
            btn.textContent = 'กำลังส่งคำขอ...';
            
            const response = await LeaveAPI.request({
                leaveType: this.selectedLeaveType,
                startDate,
                endDate,
                reason
            });
            
            if (response.success) {
                showSuccess(response.message || 'ส่งคำขอลางานสำเร็จ');
                
                // Reset form
                document.getElementById('reason').value = '';
                
                // Reload quota
                await this.loadQuota();
                
                // Show close confirmation
                this.showCloseConfirmation();
            }
            
            btn.disabled = false;
            btn.textContent = 'ส่งคำขอลา';
            
        } catch (error) {
            console.error('Submit error:', error);
            showError(error.message || 'ไม่สามารถส่งคำขอได้');
            
            const btn = document.getElementById('btn-submit');
            btn.disabled = false;
            btn.textContent = 'ส่งคำขอลา';
        }
    },

    async loadHistory() {
        try {
            showLoading('กำลังโหลดประวัติ...');
            
            const response = await LeaveAPI.getHistory();
            
            const container = document.getElementById('history-list');
            const emptyState = document.getElementById('history-empty');
            
            // Clear existing items (except empty state)
            container.querySelectorAll('.history-item').forEach(item => item.remove());
            
            if (response.success && response.data.leaves.length > 0) {
                emptyState.style.display = 'none';
                
                response.data.leaves.forEach(leave => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    
                    const isSameDay = leave.startDate === leave.endDate;
                    const dateDisplay = isSameDay ? leave.startDate : `${leave.startDate} - ${leave.endDate}`;
                    
                    item.innerHTML = `
                        <div class="history-header">
                            <span class="history-type">${leave.leaveTypeName}</span>
                            <span class="badge badge-${this.getStatusBadgeClass(leave.status)}">${leave.statusLabel}</span>
                        </div>
                        <div class="history-dates">📅 ${dateDisplay} (${leave.totalDays} วัน)</div>
                        <div class="history-reason">💬 ${leave.reason || '-'}</div>
                        <div class="history-id">🔖 ${leave.formattedId}</div>
                    `;
                    container.appendChild(item);
                });
            } else {
                emptyState.style.display = 'block';
            }
            
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Load history error:', error);
            showError(error.message || 'ไม่สามารถโหลดประวัติได้');
        }
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case 'APPROVED': return 'success';
            case 'REJECTED': return 'danger';
            case 'CANCELLED': return 'warning';
            default: return 'pending';
        }
    },

    showCloseConfirmation() {
        const modal = document.createElement('div');
        modal.className = 'close-confirmation-modal';
        modal.innerHTML = `
            <div class="close-confirmation-content">
                <div class="close-icon">📅</div>
                <div class="close-title">ส่งคำขอลาสำเร็จ!</div>
                <div class="close-message">รอการอนุมัติจากผู้ดูแลระบบ</div>
                <div class="close-buttons">
                    <button class="btn btn-outline" onclick="this.closest('.close-confirmation-modal').remove()">
                        ดำเนินการต่อ
                    </button>
                    <button class="btn btn-primary" onclick="closeLiff()">
                        ปิด
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.LeaveView = LeaveView;
}
