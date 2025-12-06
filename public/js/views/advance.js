// ========================================
// Advance View - Request advance payment
// ========================================

const AdvanceView = {
    name: 'advance',
    availableBalance: 0,

    async render() {
        return `
            <div class="view-advance">
                <!-- Balance Display -->
                <div class="balance-display">
                    <div class="balance-label">ยอดเงินคงเหลือ</div>
                    <div class="balance-amount" id="balance-amount">฿0</div>
                    <div class="available-amount" id="available-text">สามารถเบิกได้ ฿0</div>
                </div>
                
                <!-- Tabs -->
                <div class="tab-container">
                    <button class="tab-btn active" onclick="AdvanceView.switchTab('request')">ขอเบิกเงิน</button>
                    <button class="tab-btn" onclick="AdvanceView.switchTab('history')">ประวัติการเบิก</button>
                </div>
                
                <!-- Request Tab -->
                <div id="tab-request" class="tab-content active">
                    <div class="card">
                        <div class="card-header">💰 แบบฟอร์มเบิกเงิน</div>
                        <div class="card-body">
                            <!-- Amount Presets -->
                            <div class="form-group">
                                <label class="form-label">เลือกจำนวนเงิน</label>
                                <div class="amount-presets">
                                    <button class="preset-btn" onclick="AdvanceView.selectPreset(100)">฿100</button>
                                    <button class="preset-btn" onclick="AdvanceView.selectPreset(200)">฿200</button>
                                    <button class="preset-btn" onclick="AdvanceView.selectPreset(300)">฿300</button>
                                    <button class="preset-btn" onclick="AdvanceView.selectPreset(500)">฿500</button>
                                    <button class="preset-btn" onclick="AdvanceView.selectPreset(1000)">฿1,000</button>
                                    <button class="preset-btn" onclick="AdvanceView.selectPreset(0)">อื่นๆ</button>
                                </div>
                            </div>
                            
                            <!-- Custom Amount -->
                            <div class="form-group">
                                <label class="form-label">จำนวนเงิน</label>
                                <div class="amount-input-wrapper">
                                    <span class="currency">฿</span>
                                    <input type="number" id="amount" class="form-control amount-input" placeholder="0" min="1">
                                </div>
                            </div>
                            
                            <!-- Reason -->
                            <div class="form-group">
                                <label class="form-label">เหตุผล</label>
                                <textarea id="reason" class="form-control" placeholder="ระบุเหตุผลการเบิก (ถ้ามี)" rows="3"></textarea>
                            </div>
                            
                            <!-- Submit Button -->
                            <button class="btn btn-primary btn-block" id="btn-submit" onclick="AdvanceView.submitAdvanceRequest()">
                                ส่งคำขอเบิกเงิน
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- History Tab -->
                <div id="tab-history" class="tab-content">
                    <div id="history-list">
                        <div class="empty-state" id="history-empty">
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
        `;
    },

    async init() {
        try {
            await this.loadBalance();
        } catch (error) {
            console.error('Advance init error:', error);
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

    async loadBalance() {
        try {
            showLoading('กำลังโหลดข้อมูล...');
            
            const response = await AdvanceAPI.getBalance();
            
            if (response.success && response.data) {
                const { balance } = response.data;
                
                this.availableBalance = balance.available;
                
                document.getElementById('balance-amount').textContent = 
                    formatCurrency(balance.remaining);
                document.getElementById('available-text').textContent = 
                    `สามารถเบิกได้ ${formatCurrency(balance.available)}`;
            }
            
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Load balance error:', error);
            showError(error.message || 'ไม่สามารถโหลดข้อมูลได้');
        }
    },

    selectPreset(amount) {
        // Update button states
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        event.target.classList.add('selected');
        
        // Set amount
        document.getElementById('amount').value = amount > 0 ? amount : '';
        
        if (amount === 0) {
            document.getElementById('amount').focus();
        }
    },

    async submitAdvanceRequest() {
        const amount = parseFloat(document.getElementById('amount').value);
        const reason = document.getElementById('reason').value.trim();
        
        if (!amount || amount <= 0) {
            showError('กรุณาระบุจำนวนเงิน');
            return;
        }
        
        if (amount > this.availableBalance) {
            showError(`ยอดเงินไม่เพียงพอ (สามารถเบิกได้ ${formatCurrency(this.availableBalance)})`);
            return;
        }
        
        try {
            const btn = document.getElementById('btn-submit');
            btn.disabled = true;
            btn.textContent = 'กำลังส่งคำขอ...';
            
            const response = await AdvanceAPI.request({
                amount,
                reason
            });
            
            if (response.success) {
                showSuccess(response.message || 'ส่งคำขอเบิกเงินสำเร็จ');
                
                // Reset form
                document.getElementById('amount').value = '';
                document.getElementById('reason').value = '';
                document.querySelectorAll('.preset-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Reload balance
                await this.loadBalance();
                
                // Show close confirmation
                this.showCloseConfirmation(amount);
            }
            
            btn.disabled = false;
            btn.textContent = 'ส่งคำขอเบิกเงิน';
            
        } catch (error) {
            console.error('Submit error:', error);
            showError(error.message || 'ไม่สามารถส่งคำขอได้');
            
            const btn = document.getElementById('btn-submit');
            btn.disabled = false;
            btn.textContent = 'ส่งคำขอเบิกเงิน';
        }
    },

    async loadHistory() {
        try {
            showLoading('กำลังโหลดประวัติ...');
            
            const response = await AdvanceAPI.getHistory();
            
            const container = document.getElementById('history-list');
            const emptyState = document.getElementById('history-empty');
            
            // Clear existing items (except empty state)
            container.querySelectorAll('.history-item').forEach(item => item.remove());
            
            if (response.success && response.data.advances.length > 0) {
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

    showCloseConfirmation(amount) {
        const modal = document.createElement('div');
        modal.className = 'close-confirmation-modal';
        modal.innerHTML = `
            <div class="close-confirmation-content">
                <div class="close-icon">💰</div>
                <div class="close-title">ส่งคำขอเบิกเงินสำเร็จ!</div>
                <div class="close-amount">${formatCurrency(amount)}</div>
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
    window.AdvanceView = AdvanceView;
}
