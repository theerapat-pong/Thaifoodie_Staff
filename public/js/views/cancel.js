// ========================================
// Cancel View - Cancel pending requests
// ========================================

const CancelView = {
    name: 'cancel',
    pendingLeaves: [],
    pendingAdvances: [],
    cancelTarget: null,
    leavePage: 1,
    advancePage: 1,
    pageSize: 10,
    leaveHasMore: false,
    advanceHasMore: false,
    leaveTotal: 0,
    advanceTotal: 0,
    loadingLeaves: false,
    loadingAdvances: false,

    async render() {
        return `
            <div class="view-cancel">
                <!-- Header -->
                <div class="header">
                    <div class="header-title">❌ ยกเลิกคำขอ</div>
                    <div class="header-subtitle">ยกเลิกคำขอที่รออนุมัติ</div>
                </div>
                
                <!-- Leave Requests Section -->
                <div id="leave-section" style="display: none;">
                    <div class="section-title">
                        <span>📅 คำขอลางาน</span>
                        <span class="count" id="leave-count">0</span>
                    </div>
                    <div id="leave-list"></div>
                    <div class="load-more-wrapper" id="leave-load-more" style="display: none;">
                        <button class="btn btn-outline btn-block" type="button" onclick="CancelView.loadMoreLeaves()">
                            โหลดเพิ่มเติม
                        </button>
                    </div>
                </div>
                
                <!-- Advance Requests Section -->
                <div id="advance-section" style="display: none;">
                    <div class="section-title">
                        <span>💰 คำขอเบิกเงิน</span>
                        <span class="count" id="advance-count">0</span>
                    </div>
                    <div id="advance-list"></div>
                    <div class="load-more-wrapper" id="advance-load-more" style="display: none;">
                        <button class="btn btn-outline btn-block" type="button" onclick="CancelView.loadMoreAdvances()">
                            โหลดเพิ่มเติม
                        </button>
                    </div>
                </div>
                
                <!-- No Requests -->
                <div id="no-requests" class="no-requests" style="display: none;">
                    <div class="no-requests-icon">✓</div>
                    <div class="no-requests-title">ไม่มีคำขอที่รออนุมัติ</div>
                    <div class="no-requests-subtitle">คุณไม่มีคำขอที่สามารถยกเลิกได้</div>
                </div>
                
                <!-- Back to Menu -->
                <button class="btn btn-outline btn-block mt-2" onclick="router.navigate('home')">
                    ← กลับหน้าหลัก
                </button>
                
                <!-- Confirm Modal -->
                <div class="confirm-modal" id="confirm-modal">
                    <div class="confirm-content">
                        <div class="confirm-icon">⚠️</div>
                        <div class="confirm-title">ยืนยันการยกเลิก?</div>
                        <div class="confirm-message" id="confirm-message">คุณต้องการยกเลิกคำขอนี้หรือไม่?</div>
                        <div class="confirm-buttons">
                            <button class="btn btn-outline" onclick="CancelView.hideConfirmModal()">
                                ไม่ใช่
                            </button>
                            <button class="btn btn-danger" id="btn-confirm-cancel" onclick="CancelView.confirmCancel()">
                                ยกเลิก
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
        } catch (error) {
            console.error('Cancel init error:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    async loadPendingRequests() {
        try {
            showLoading('กำลังโหลดคำขอ...');
            
            await Promise.all([
                this.loadLeaves({ reset: true }),
                this.loadAdvances({ reset: true })
            ]);

            this.toggleEmptyState();
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Load pending error:', error);
        }
    },

    renderLists() {
        this.renderLeaveList();
        this.renderAdvanceList();
        this.toggleEmptyState();
    },

    async loadLeaves({ reset = false } = {}) {
        if (this.loadingLeaves) return;
        this.loadingLeaves = true;

        const page = reset ? 1 : this.leavePage + 1;
        if (!reset) {
            this.setLoadMoreState('leave', true);
        }

        try {
            const response = await LeaveAPI.getPending({ page, limit: this.pageSize });
            if (response.success) {
                const items = response.data.leaves || [];
                this.leavePage = page;
                this.leaveHasMore = Boolean(response.data.hasMore);
                this.leaveTotal = response.data.total ?? items.length;
                this.pendingLeaves = reset ? items : [...this.pendingLeaves, ...items];
                this.renderLeaveList();
            } else if (reset) {
                this.pendingLeaves = [];
                this.leaveHasMore = false;
                this.renderLeaveList();
            }
        } catch (error) {
            console.error('Load pending leaves error:', error);
            showError(error.message || 'ไม่สามารถโหลดคำขอลางานได้');
            throw error;
        } finally {
            this.loadingLeaves = false;
            this.setLoadMoreState('leave', false);
            this.toggleEmptyState();
        }
    },

    async loadAdvances({ reset = false } = {}) {
        if (this.loadingAdvances) return;
        this.loadingAdvances = true;

        const page = reset ? 1 : this.advancePage + 1;
        if (!reset) {
            this.setLoadMoreState('advance', true);
        }

        try {
            const response = await AdvanceAPI.getPending({ page, limit: this.pageSize });
            if (response.success) {
                const items = response.data.advances || [];
                this.advancePage = page;
                this.advanceHasMore = Boolean(response.data.hasMore);
                this.advanceTotal = response.data.total ?? items.length;
                this.pendingAdvances = reset ? items : [...this.pendingAdvances, ...items];
                this.renderAdvanceList();
            } else if (reset) {
                this.pendingAdvances = [];
                this.advanceHasMore = false;
                this.renderAdvanceList();
            }
        } catch (error) {
            console.error('Load pending advances error:', error);
            showError(error.message || 'ไม่สามารถโหลดคำขอเบิกเงินได้');
            throw error;
        } finally {
            this.loadingAdvances = false;
            this.setLoadMoreState('advance', false);
            this.toggleEmptyState();
        }
    },

    loadMoreLeaves() {
        this.loadLeaves().catch(() => {});
    },

    loadMoreAdvances() {
        this.loadAdvances().catch(() => {});
    },

    renderLeaveList() {
        const leaveSection = document.getElementById('leave-section');
        if (!leaveSection) return;

        if (this.pendingLeaves.length > 0) {
            leaveSection.style.display = 'block';
            document.getElementById('leave-count').textContent = this.leaveTotal || this.pendingLeaves.length;

            const leaveList = document.getElementById('leave-list');
            leaveList.innerHTML = this.pendingLeaves.map(leave => `
                <div class="request-card leave">
                    <div class="request-header">
                        <div class="request-type">
                            <span class="request-type-icon">📅</span>
                            <span class="request-type-label">${leave.leaveTypeName}</span>
                        </div>
                        <span class="badge badge-pending">รออนุมัติ</span>
                    </div>
                    <div class="request-details">
                        <div class="request-detail-row">
                            <span class="icon">📆</span>
                            <span>${leave.startDate}${leave.startDate !== leave.endDate ? ' - ' + leave.endDate : ''}</span>
                        </div>
                        <div class="request-detail-row">
                            <span class="icon">📝</span>
                            <span>${leave.reason || 'ไม่ระบุเหตุผล'}</span>
                        </div>
                        <div class="request-detail-row">
                            <span class="icon">🔖</span>
                            <span>${leave.formattedId}</span>
                        </div>
                    </div>
                    <button class="cancel-btn" onclick="CancelView.showConfirmModal('leave', '${leave.id}', '${leave.leaveTypeName}')">
                        ❌ ยกเลิกคำขอนี้
                    </button>
                </div>
            `).join('');

            const loadMoreWrapper = document.getElementById('leave-load-more');
            if (loadMoreWrapper) {
                loadMoreWrapper.style.display = this.leaveHasMore ? 'block' : 'none';
            }
        } else {
            leaveSection.style.display = 'none';
        }
    },

    renderAdvanceList() {
        const advanceSection = document.getElementById('advance-section');
        if (!advanceSection) return;

        if (this.pendingAdvances.length > 0) {
            advanceSection.style.display = 'block';
            document.getElementById('advance-count').textContent = this.advanceTotal || this.pendingAdvances.length;

            const advanceList = document.getElementById('advance-list');
            advanceList.innerHTML = this.pendingAdvances.map(adv => `
                <div class="request-card advance">
                    <div class="request-header">
                        <div class="request-type">
                            <span class="request-type-icon">💰</span>
                            <span class="request-type-label">เบิกเงิน ${formatCurrency(adv.amount)}</span>
                        </div>
                        <span class="badge badge-pending">รออนุมัติ</span>
                    </div>
                    <div class="request-details">
                        <div class="request-detail-row">
                            <span class="icon">📆</span>
                            <span>${adv.createdAt}</span>
                        </div>
                        <div class="request-detail-row">
                            <span class="icon">📝</span>
                            <span>${adv.reason || 'ไม่ระบุเหตุผล'}</span>
                        </div>
                        <div class="request-detail-row">
                            <span class="icon">🔖</span>
                            <span>${adv.formattedId}</span>
                        </div>
                    </div>
                    <button class="cancel-btn" onclick="CancelView.showConfirmModal('advance', '${adv.id}', '${formatCurrency(adv.amount)}')">
                        ❌ ยกเลิกคำขอนี้
                    </button>
                </div>
            `).join('');

            const loadMoreWrapper = document.getElementById('advance-load-more');
            if (loadMoreWrapper) {
                loadMoreWrapper.style.display = this.advanceHasMore ? 'block' : 'none';
            }
        } else {
            advanceSection.style.display = 'none';
        }
    },

    toggleEmptyState() {
        const noRequests = document.getElementById('no-requests');
        if (!noRequests) return;
        if (this.pendingLeaves.length === 0 && this.pendingAdvances.length === 0) {
            noRequests.style.display = 'block';
        } else {
            noRequests.style.display = 'none';
        }
    },

    setLoadMoreState(type, isLoading) {
        const wrapper = document.getElementById(`${type}-load-more`);
        if (!wrapper || wrapper.style.display === 'none') return;
        const btn = wrapper.querySelector('button');
        if (!btn) return;
        btn.disabled = isLoading;
        btn.textContent = isLoading ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม';
    },

    showConfirmModal(type, id, name) {
        this.cancelTarget = { type, id, name };
        
        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-message');
        
        if (type === 'leave') {
            message.textContent = `คุณต้องการยกเลิกคำขอลา "${name}" หรือไม่?`;
        } else {
            message.textContent = `คุณต้องการยกเลิกคำขอเบิกเงิน ${name} หรือไม่?`;
        }
        
        modal.classList.add('show');
    },

    hideConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        modal.classList.remove('show');
        this.cancelTarget = null;
    },

    async confirmCancel() {
        if (!this.cancelTarget) return;
        
        const { type, id } = this.cancelTarget;
        
        try {
            const btn = document.getElementById('btn-confirm-cancel');
            btn.disabled = true;
            btn.textContent = 'กำลังยกเลิก...';
            
            let response;
            if (type === 'leave') {
                response = await LeaveAPI.cancel(id);
            } else {
                response = await AdvanceAPI.cancel(id);
            }
            
            if (response.success) {
                showSuccess(response.message || 'ยกเลิกคำขอสำเร็จ');
                this.hideConfirmModal();
                
                // Reload list
                await this.loadPendingRequests();
            }
            
            btn.disabled = false;
            btn.textContent = 'ยกเลิก';
            
        } catch (error) {
            console.error('Cancel error:', error);
            showError(error.message || 'ไม่สามารถยกเลิกคำขอได้');
            
            const btn = document.getElementById('btn-confirm-cancel');
            btn.disabled = false;
            btn.textContent = 'ยกเลิก';
        }
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.CancelView = CancelView;
}
