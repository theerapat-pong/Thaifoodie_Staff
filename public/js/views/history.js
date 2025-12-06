// ========================================
// History View - View all history
// ========================================

const HistoryView = {
    name: 'history',

    async render() {
        return `
            <div class="view-history">
                <!-- Header -->
                <div class="header">
                    <div class="header-title">📋 ประวัติ</div>
                    <div class="header-subtitle">ประวัติการทำงานและการเบิกเงิน</div>
                </div>
                
                <!-- Hide-First-Show-Later: Main content hidden initially -->
                <div id="history-content" style="display: none;">
                    <!-- Tabs -->
                    <div class="tab-container">
                        <button class="tab-btn active" onclick="HistoryView.switchTab('attendance')">เข้า-ออกงาน</button>
                        <button class="tab-btn" onclick="HistoryView.switchTab('leave')">ลางาน</button>
                        <button class="tab-btn" onclick="HistoryView.switchTab('advance')">เบิกเงิน</button>
                    </div>
                    
                    <!-- Attendance Tab -->
                    <div id="tab-attendance" class="tab-content active">
                        <div id="attendance-list">
                            <div class="empty-state" id="attendance-empty">
                                <div class="empty-icon">📭</div>
                                <div class="empty-title">ยังไม่มีประวัติการเข้างาน</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Leave Tab -->
                    <div id="tab-leave" class="tab-content">
                        <div id="leave-list">
                            <div class="empty-state" id="leave-empty">
                                <div class="empty-icon">📭</div>
                                <div class="empty-title">ยังไม่มีประวัติการลา</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Advance Tab -->
                    <div id="tab-advance" class="tab-content">
                        <div id="advance-list">
                            <div class="empty-state" id="advance-empty">
                                <div class="empty-icon">📭</div>
                                <div class="empty-title">ยังไม่มีประวัติการเบิก</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Back to Menu -->
                    <button class="btn btn-outline btn-block mt-2" onclick="router.navigate('home')">
                        ← กลับหน้าหลัก
                    </button>
                </div>
                
                <!-- Loading State -->
                <div id="history-loading" class="loading-state" style="display: flex;">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">กำลังโหลดประวัติ...</div>
                </div>
                
                <!-- Error State -->
                <div id="history-error" class="error-state" style="display: none;">
                    <div class="error-icon">⚠️</div>
                    <div class="error-title">เกิดข้อผิดพลาด</div>
                    <div class="error-message" id="history-error-message">ไม่สามารถโหลดประวัติได้</div>
                    <button class="btn btn-primary" onclick="HistoryView.retry()">
                        ลองใหม่
                    </button>
                    <button class="btn btn-outline mt-1" onclick="router.navigate('home')">
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        `;
    },

    async init() {
        try {
            await this.loadAttendanceHistory();
        } catch (error) {
            console.error('History init error:', error);
            this.showError('ไม่สามารถโหลดข้อมูลได้');
        }
    },
    
    showContent() {
        const loadingEl = document.getElementById('history-loading');
        const errorEl = document.getElementById('history-error');
        const contentEl = document.getElementById('history-content');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (contentEl) {
            contentEl.style.display = 'block';
            contentEl.classList.add('fade-in');
        }
    },
    
    hideLoading() {
        const loadingEl = document.getElementById('history-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    },
    
    showError(message) {
        const loadingEl = document.getElementById('history-loading');
        const contentEl = document.getElementById('history-content');
        const errorEl = document.getElementById('history-error');
        const errorMessageEl = document.getElementById('history-error-message');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'none';
        if (errorEl) {
            errorEl.style.display = 'flex';
            errorEl.classList.add('fade-in');
        }
        if (errorMessageEl) errorMessageEl.textContent = message;
    },
    
    retry() {
        // Hide error, show loading
        const errorEl = document.getElementById('history-error');
        const loadingEl = document.getElementById('history-loading');
        
        if (errorEl) errorEl.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'flex';
        
        // Reload current tab data
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const tabText = activeTab.textContent.trim();
            if (tabText.includes('เข้า-ออก')) {
                this.loadAttendanceHistory();
            } else if (tabText.includes('ลา')) {
                this.loadLeaveHistory();
            } else if (tabText.includes('เบิก')) {
                this.loadAdvanceHistory();
            }
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
        
        // Load data for tab
        switch (tab) {
            case 'attendance':
                this.loadAttendanceHistory();
                break;
            case 'leave':
                this.loadLeaveHistory();
                break;
            case 'advance':
                this.loadAdvanceHistory();
                break;
        }
    },

    async loadAttendanceHistory() {
        try {
            const response = await AttendanceAPI.getHistory(30);
            
            const container = document.getElementById('attendance-list');
            const emptyState = document.getElementById('attendance-empty');
            
            // Clear existing items
            container.querySelectorAll('.history-item').forEach(item => item.remove());
            
            if (response.success && response.data.attendances && response.data.attendances.length > 0) {
                emptyState.style.display = 'none';
                
                response.data.attendances.forEach(record => {
                    const item = document.createElement('div');
                    item.className = 'history-item attendance-record';
                    
                    const statusClass = record.checkOutTime ? 'completed' : 'in-progress';
                    const hours = record.totalHours ? 
                        `${Math.floor(record.totalHours)} ชม. ${Math.round((record.totalHours - Math.floor(record.totalHours)) * 60)} นาที` : 
                        '-';
                    
                    item.innerHTML = `
                        <div class="history-header">
                            <span class="history-date">${record.date}</span>
                            <span class="badge badge-${statusClass === 'completed' ? 'success' : 'pending'}">
                                ${statusClass === 'completed' ? 'เสร็จสิ้น' : 'กำลังทำงาน'}
                            </span>
                        </div>
                        <div class="attendance-times">
                            <div class="time-block">
                                <span class="time-label">เข้างาน</span>
                                <span class="time-value">${record.checkInTime || '-'}</span>
                                ${record.isLate ? `<span class="late-tag">สาย ${formatDuration(record.lateMinutes)}</span>` : ''}
                            </div>
                            <div class="time-block">
                                <span class="time-label">ออกงาน</span>
                                <span class="time-value">${record.checkOutTime || '-'}</span>
                                ${record.isEarly ? `<span class="early-tag">ก่อน ${formatDuration(record.earlyMinutes)}</span>` : ''}
                            </div>
                            <div class="time-block">
                                <span class="time-label">รวม</span>
                                <span class="time-value">${hours || '-'}</span>
                            </div>
                        </div>
                    `;
                    container.appendChild(item);
                });
            } else {
                emptyState.style.display = 'block';
            }
            
            this.hideLoading();
            this.showContent();
            
        } catch (error) {
            this.hideLoading();
            console.error('Load attendance history error:', error);
            this.showError(error?.message || 'ไม่สามารถโหลดประวัติได้');
        }
    },

    async loadLeaveHistory() {
        try {
            const response = await LeaveAPI.getHistory();
            
            const container = document.getElementById('leave-list');
            const emptyState = document.getElementById('leave-empty');
            
            // Clear existing items
            container.querySelectorAll('.history-item').forEach(item => item.remove());
            
            if (response.success && response.data.leaves && response.data.leaves.length > 0) {
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
            
        } catch (error) {
            console.error('Load leave history error:', error);
            // Show error in empty state instead of global error
            const emptyState = document.getElementById('leave-empty');
            if (emptyState) {
                emptyState.innerHTML = `
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-title">เกิดข้อผิดพลาด</div>
                    <button class="btn btn-sm btn-primary" onclick="HistoryView.loadLeaveHistory()">ลองใหม่</button>
                `;
                emptyState.style.display = 'block';
            }
        }
    },

    async loadAdvanceHistory() {
        try {
            const response = await AdvanceAPI.getHistory();
            
            const container = document.getElementById('advance-list');
            const emptyState = document.getElementById('advance-empty');
            
            // Clear existing items
            container.querySelectorAll('.history-item').forEach(item => item.remove());
            
            if (response.success && response.data.advances && response.data.advances.length > 0) {
                emptyState.style.display = 'none';
                
                response.data.advances.forEach(adv => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    
                    item.innerHTML = `
                        <div class="history-header">
                            <span class="history-amount">-${formatCurrency(adv.amount)}</span>
                            <span class="badge badge-${this.getStatusBadgeClass(adv.status)}">${adv.statusLabel}</span>
                        </div>
                        <div class="history-date">📅 ${adv.createdAt}</div>
                        <div class="history-reason">💬 ${adv.reason || '-'}</div>
                        <div class="history-id">🔖 ${adv.formattedId}</div>
                    `;
                    container.appendChild(item);
                });
            } else {
                emptyState.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Load advance history error:', error);
            // Show error in empty state instead of global error
            const emptyState = document.getElementById('advance-empty');
            if (emptyState) {
                emptyState.innerHTML = `
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-title">เกิดข้อผิดพลาด</div>
                    <button class="btn btn-sm btn-primary" onclick="HistoryView.loadAdvanceHistory()">ลองใหม่</button>
                `;
                emptyState.style.display = 'block';
            }
        }
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case 'APPROVED': return 'success';
            case 'REJECTED': return 'danger';
            case 'CANCELLED': return 'warning';
            default: return 'pending';
        }
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.HistoryView = HistoryView;
}
