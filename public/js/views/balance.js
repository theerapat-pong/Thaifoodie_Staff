// ========================================
// Balance View - Vanilla JS class implementation
// ========================================

window.BalanceView = class BalanceView {
    static get name() {
        return 'balance';
    }

    static async render() {
        return `
            <div class="view-balance">
                <!-- Hide-First-Show-Later: Main content hidden initially -->
                <div id="balance-content" style="display: none;">
                    <div class="balance-hero">
                        <div class="balance-label">ยอดเงินคงเหลือ</div>
                        <div class="balance-amount" id="balance-amount">฿0</div>
                        <div class="balance-subtitle" id="available-text">สามารถเบิกได้ ฿0</div>
                        <div class="balance-breakdown">
                            <div class="breakdown-item">
                                <div class="breakdown-value" id="accrued-amount">฿0</div>
                                <div class="breakdown-label">ยอดสะสม</div>
                            </div>
                            <div class="breakdown-item">
                                <div class="breakdown-value" id="advanced-amount">฿0</div>
                                <div class="breakdown-label">เบิกไปแล้ว</div>
                            </div>
                            <div class="breakdown-item">
                                <div class="breakdown-value" id="pending-amount">฿0</div>
                                <div class="breakdown-label">รออนุมัติ</div>
                            </div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="router.navigate('advance')">
                            💰 เบิกเงิน
                        </button>
                        <button class="btn btn-outline" onclick="router.navigate('history')">
                            📋 ประวัติ
                        </button>
                    </div>

                    <div class="stats-section">
                        <div class="stats-title">
                            <span>📊</span>
                            <span>สถิติเดือนนี้</span>
                        </div>
                        <div class="stats-row">
                            <span class="stats-label">จำนวนวันที่ทำงาน</span>
                            <span class="stats-value" id="this-month-days">0 วัน</span>
                        </div>
                        <div class="stats-row">
                            <span class="stats-label">รายได้เดือนนี้</span>
                            <span class="stats-value positive" id="this-month-earning">฿0</span>
                        </div>
                        <div class="stats-row">
                            <span class="stats-label">รวมวันทำงานทั้งหมด</span>
                            <span class="stats-value" id="total-days">0 วัน</span>
                        </div>
                    </div>

                    <div class="transaction-list" id="transaction-list">
                        <div class="transaction-header">รายการเบิกเงินล่าสุด</div>
                        <div class="empty-state" id="empty-transactions">
                            <div class="empty-icon">📭</div>
                            <div class="empty-title">ยังไม่มีรายการเบิกเงิน</div>
                        </div>
                    </div>

                    <button class="btn btn-outline btn-block mt-2" onclick="router.navigate('home')">
                        ← กลับหน้าหลัก
                    </button>
                </div>
                
                <!-- Loading State -->
                <div id="balance-loading" class="loading-state" style="display: flex;">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">กำลังโหลดข้อมูล...</div>
                </div>
                
                <!-- Error State -->
                <div id="balance-error" class="error-state" style="display: none;">
                    <div class="error-icon">⚠️</div>
                    <div class="error-title">เกิดข้อผิดพลาด</div>
                    <div class="error-message" id="balance-error-message">ไม่สามารถโหลดข้อมูลได้</div>
                    <button class="btn btn-primary" onclick="window.BalanceView.retry()">
                        ลองใหม่
                    </button>
                    <button class="btn btn-outline mt-1" onclick="router.navigate('home')">
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        `;
    }

    static async init() {
        try {
            // Try to render cached data first
            const hadCache = this.renderCachedBalance();
            
            // Load fresh data
            await this.loadBalanceData();
        } catch (error) {
            console.error('[BalanceView] init error:', error);
            this.showError(error?.message || 'ไม่สามารถโหลดข้อมูลได้');
        }
    }

    static destroy() {
        if (typeof abortTrackedRequests === 'function') {
            abortTrackedRequests(this);
        }
    }

    static renderCachedBalance() {
        if (typeof DataFetcher === 'undefined') {
            return false;
        }
        const cached = DataFetcher.getCachedBalance
            ? DataFetcher.getCachedBalance()
            : DataFetcher.getCached?.(['advance-balance', window.userId]);
        if (cached) {
            this.applyBalanceData(cached, true); // true = from cache
            return true;
        }
        return false;
    }

    static async loadBalanceData() {
        const hadCache = this.renderCachedBalance();
        
        try {
            const controller = typeof createAbortControllerFor === 'function'
                ? createAbortControllerFor(this)
                : null;
            const signal = controller ? controller.signal : undefined;

            const response = typeof DataFetcher !== 'undefined'
                ? await DataFetcher.getBalance({ signal })
                : await AdvanceAPI.getBalance({ signal });

            this.applyBalanceData(response, false); // false = fresh data

        } catch (error) {
            if (typeof isAbortError === 'function' && isAbortError(error)) {
                return;
            }
            console.error('[BalanceView] load error:', error);
            
            // Only show error if we don't have cache
            if (!hadCache) {
                this.showError(error?.message || 'ไม่สามารถโหลดข้อมูลได้');
            }
            return;
        }
    }

    static applyBalanceData(response, fromCache = false) {
        if (!response?.success || !response.data) {
            return;
        }

        const { balance, stats, recentAdvances } = response.data;

        // Update UI elements
        const amountEl = document.getElementById('balance-amount');
        const availableEl = document.getElementById('available-text');
        const accruedEl = document.getElementById('accrued-amount');
        const advancedEl = document.getElementById('advanced-amount');
        const pendingEl = document.getElementById('pending-amount');
        const daysEl = document.getElementById('this-month-days');
        const earningEl = document.getElementById('this-month-earning');
        const totalDaysEl = document.getElementById('total-days');

        if (amountEl) amountEl.textContent = formatCurrency(balance.remaining);
        if (availableEl) availableEl.textContent = `สามารถเบิกได้ ${formatCurrency(balance.available)}`;
        if (accruedEl) accruedEl.textContent = formatCurrency(balance.accrued);
        if (advancedEl) advancedEl.textContent = formatCurrency(balance.advanced);
        if (pendingEl) pendingEl.textContent = formatCurrency(balance.pending);
        if (daysEl) daysEl.textContent = `${stats.thisMonthDays} วัน`;
        if (earningEl) earningEl.textContent = formatCurrency(stats.thisMonthEarning);
        if (totalDaysEl) totalDaysEl.textContent = `${stats.totalDaysWorked} วัน`;

        this.updateTransactionList(recentAdvances);
        
        // Hide loading, show content with fade-in
        this.hideLoading();
        this.showContent();
    }
    
    static showContent() {
        const loadingEl = document.getElementById('balance-loading');
        const errorEl = document.getElementById('balance-error');
        const contentEl = document.getElementById('balance-content');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (contentEl) {
            contentEl.style.display = 'block';
            contentEl.classList.add('fade-in');
        }
    }
    
    static hideLoading() {
        const loadingEl = document.getElementById('balance-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
    
    static showError(message) {
        const loadingEl = document.getElementById('balance-loading');
        const contentEl = document.getElementById('balance-content');
        const errorEl = document.getElementById('balance-error');
        const errorMessageEl = document.getElementById('balance-error-message');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'none';
        if (errorEl) {
            errorEl.style.display = 'flex';
            errorEl.classList.add('fade-in');
        }
        if (errorMessageEl) errorMessageEl.textContent = message;
    }
    
    static retry() {
        // Hide error, show loading
        const errorEl = document.getElementById('balance-error');
        const loadingEl = document.getElementById('balance-loading');
        
        if (errorEl) errorEl.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'flex';
        
        // Reload data
        this.loadBalanceData();
    }

    static updateTransactionList(transactions) {
        const container = document.getElementById('transaction-list');
        const emptyState = document.getElementById('empty-transactions');
        if (!container || !emptyState) {
            return;
        }

        container.querySelectorAll('.transaction-item').forEach(item => item.remove());

        if (!transactions || transactions.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        transactions.forEach(tx => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-icon advance">💸</div>
                <div class="transaction-content">
                    <div class="transaction-title">${tx.reason || 'เบิกเงิน'}</div>
                    <div class="transaction-date">${tx.date}</div>
                </div>
                <div class="transaction-amount negative">
                    ${formatCurrency(tx.amount)}
                </div>
            `;
            container.appendChild(item);
        });
    }
};
