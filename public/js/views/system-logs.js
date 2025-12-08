// ========================================
// System Logs View - Developer Logs Viewer
// ========================================

const SystemLogsView = {
    name: 'system-logs',
    currentPage: 1,
    logsPerPage: 20,
    selectedCategory: 'all',

    async render() {
        return `
            <div class="view-system-logs">
                <div class="view-header">
                    <button class="btn-back" onclick="router.navigate('home')">
                        <span class="back-icon">←</span>
                    </button>
                    <h1 class="view-title">🔧 System Logs</h1>
                </div>

                <!-- Access Control Check -->
                <div id="access-denied" style="display: none;">
                    <div class="card">
                        <div class="card-body text-center">
                            <div class="text-danger mb-2" style="font-size: 48px;">🚫</div>
                            <h3>ไม่สามารถเข้าถึงได้</h3>
                            <p class="text-muted">คุณไม่มีสิทธิ์เข้าถึง System Logs<br>เฉพาะ Developer เท่านั้น</p>
                            <button class="btn btn-primary mt-3" onclick="router.navigate('home')">
                                กลับหน้าหลัก
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Logs Content -->
                <div id="logs-content" style="display: none;">
                    <!-- Filter Tabs -->
                    <div class="filter-tabs mb-3">
                        <button class="tab-btn active" data-category="all" onclick="SystemLogsView.filterByCategory('all')">
                            ทั้งหมด
                        </button>
                        <button class="tab-btn" data-category="GPS" onclick="SystemLogsView.filterByCategory('GPS')">
                            📍 GPS
                        </button>
                        <button class="tab-btn" data-category="CHECK_IN" onclick="SystemLogsView.filterByCategory('CHECK_IN')">
                            ✅ Check-in
                        </button>
                        <button class="tab-btn" data-category="CHECK_OUT" onclick="SystemLogsView.filterByCategory('CHECK_OUT')">
                            🏁 Check-out
                        </button>
                        <button class="tab-btn" data-category="ERROR" onclick="SystemLogsView.filterByCategory('ERROR')">
                            ❌ Error
                        </button>
                    </div>

                    <!-- Logs List -->
                    <div class="card">
                        <div class="card-header">
                            <h3>📋 ระบบ Logs</h3>
                            <button class="btn btn-sm btn-outline" onclick="SystemLogsView.loadLogs()">
                                🔄 รีเฟรช
                            </button>
                        </div>
                        <div class="card-body p-0">
                            <div id="logs-list">
                                <div class="loading-spinner">กำลังโหลด...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div class="pagination-container" id="pagination" style="display: none;">
                        <button class="btn btn-sm btn-outline" onclick="SystemLogsView.prevPage()">
                            ← ก่อนหน้า
                        </button>
                        <span id="page-info">หน้า 1</span>
                        <button class="btn btn-sm btn-outline" onclick="SystemLogsView.nextPage()">
                            ถัดไป →
                        </button>
                    </div>

                    <!-- Clear Logs (Dev only) -->
                    <div class="text-center mt-3">
                        <button class="btn btn-outline btn-sm text-danger" onclick="SystemLogsView.clearLogs()">
                            🗑️ ล้าง Logs ทั้งหมด
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        console.log('[SystemLogs] Initializing...');
        
        // Check access permission
        const hasAccess = await this.checkAccess();
        
        if (!hasAccess) {
            document.getElementById('access-denied').style.display = 'block';
            document.getElementById('logs-content').style.display = 'none';
            return;
        }

        document.getElementById('access-denied').style.display = 'none';
        document.getElementById('logs-content').style.display = 'block';
        
        await this.loadLogs();
    },

    async checkAccess() {
        try {
            // Get user profile to check role
            const response = await UserAPI.getProfile();
            if (response.success && response.data) {
                const userRole = response.data.employee.role;
                return userRole === 'DEV';
            }
            return false;
        } catch (error) {
            console.error('[SystemLogs] Access check error:', error);
            return false;
        }
    },

    async loadLogs() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.logsPerPage,
                category: this.selectedCategory === 'all' ? '' : this.selectedCategory
            });

            const response = await fetch(`/api/liff/admin/system-logs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${liff.getAccessToken()}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.renderLogs(data.data.logs);
                this.updatePagination(data.data.total);
            } else {
                throw new Error(data.message || 'ไม่สามารถโหลด logs ได้');
            }
        } catch (error) {
            console.error('[SystemLogs] Load error:', error);
            showError('ไม่สามารถโหลด logs ได้');
        }
    },

    renderLogs(logs) {
        const container = document.getElementById('logs-list');
        
        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">ไม่พบ logs</p>
                </div>
            `;
            return;
        }

        const html = logs.map(log => {
            const categoryIcon = this.getCategoryIcon(log.category);
            const levelClass = this.getLevelClass(log.level);
            const timestamp = new Date(log.timestamp).toLocaleString('th-TH', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            return `
                <div class="log-item" onclick="SystemLogsView.toggleLogDetails(this)">
                    <div class="log-header">
                        <span class="log-category">${categoryIcon} ${log.category}</span>
                        <span class="log-level badge-${levelClass}">${log.level}</span>
                    </div>
                    <div class="log-message">${this.escapeHtml(log.message)}</div>
                    <div class="log-meta">
                        <span class="log-user">${log.employee_name || 'System'}</span>
                        <span class="log-time">${timestamp}</span>
                    </div>
                    ${log.metadata ? `
                        <div class="log-details" style="display: none;">
                            <pre>${JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    toggleLogDetails(element) {
        const details = element.querySelector('.log-details');
        if (details) {
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
        }
    },

    getCategoryIcon(category) {
        const icons = {
            'GPS': '📍',
            'CHECK_IN': '✅',
            'CHECK_OUT': '🏁',
            'LEAVE': '📅',
            'ADVANCE': '💰',
            'ERROR': '❌',
            'AUTH': '🔐',
            'SYSTEM': '⚙️'
        };
        return icons[category] || '📋';
    },

    getLevelClass(level) {
        const classes = {
            'INFO': 'info',
            'WARNING': 'warning',
            'ERROR': 'danger',
            'DEBUG': 'secondary'
        };
        return classes[level] || 'secondary';
    },

    updatePagination(total) {
        const totalPages = Math.ceil(total / this.logsPerPage);
        const pagination = document.getElementById('pagination');
        const pageInfo = document.getElementById('page-info');

        if (totalPages > 1) {
            pagination.style.display = 'flex';
            pageInfo.textContent = `หน้า ${this.currentPage} / ${totalPages}`;
        } else {
            pagination.style.display = 'none';
        }
    },

    async filterByCategory(category) {
        this.selectedCategory = category;
        this.currentPage = 1;

        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        await this.loadLogs();
    },

    async prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadLogs();
        }
    },

    async nextPage() {
        this.currentPage++;
        await this.loadLogs();
    },

    async clearLogs() {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการล้าง logs ทั้งหมด?\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            return;
        }

        try {
            const response = await fetch('/api/liff/admin/logs', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${liff.getAccessToken()}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                showSuccess('ล้าง logs สำเร็จ');
                this.currentPage = 1;
                await this.loadLogs();
            } else {
                throw new Error(data.message || 'ไม่สามารถล้าง logs ได้');
            }
        } catch (error) {
            console.error('[SystemLogs] Clear error:', error);
            showError('ไม่สามารถล้าง logs ได้');
        }
    },

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    destroy() {
        // Cleanup if needed
    }
};

// Register globally
if (typeof window !== 'undefined') {
    window.SystemLogsView = SystemLogsView;
}
