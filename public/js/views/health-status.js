// ========================================
// Health Status View - System Health Monitor
// ========================================

const HealthStatusView = {
    name: 'health-status',

    async render() {
        return `
            <div class="view-health-status">
                <div class="view-header">
                    <button class="btn-back" onclick="router.navigate('home')">
                        <span class="back-icon">←</span>
                    </button>
                    <h1 class="view-title">🏥 สถานะระบบ</h1>
                </div>

                <!-- Status Overview -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h3>ภาพรวมระบบ</h3>
                    </div>
                    <div class="card-body" id="status-overview">
                        <div class="loading-spinner">กำลังโหลด...</div>
                    </div>
                </div>

                <!-- Database Status -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h3>📊 ฐานข้อมูล</h3>
                    </div>
                    <div class="card-body" id="database-status">
                        <div class="loading-spinner">กำลังโหลด...</div>
                    </div>
                </div>

                <!-- API Health -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h3>🔌 API Endpoints</h3>
                    </div>
                    <div class="card-body" id="api-health">
                        <div class="loading-spinner">กำลังโหลด...</div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h3>📈 กิจกรรมล่าสุด (24 ชม.)</h3>
                    </div>
                    <div class="card-body" id="recent-activity">
                        <div class="loading-spinner">กำลังโหลด...</div>
                    </div>
                </div>

                <!-- Refresh Button -->
                <div class="text-center mb-3">
                    <button class="btn btn-outline" onclick="HealthStatusView.loadHealthData()">
                        🔄 รีเฟรชข้อมูล
                    </button>
                </div>
            </div>
        `;
    },

    async init() {
        console.log('[HealthStatus] Loading health status...');
        await this.loadHealthData();
    },

    async loadHealthData() {
        try {
            const response = await fetch('/api/health', {
                headers: {
                    'Authorization': `Bearer ${liff.getAccessToken()}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.renderStatusOverview(data.data);
                this.renderDatabaseStatus(data.data);
                this.renderAPIHealth(data.data);
                this.renderRecentActivity(data.data);
            } else {
                throw new Error(data.message || 'ไม่สามารถโหลดข้อมูลได้');
            }
        } catch (error) {
            console.error('[HealthStatus] Load error:', error);
            showError('ไม่สามารถโหลดสถานะระบบได้');
        }
    },

    renderStatusOverview(data) {
        const container = document.getElementById('status-overview');
        const { status, uptime, timestamp } = data;

        const statusClass = status === 'healthy' ? 'success' : 'danger';
        const statusIcon = status === 'healthy' ? '✅' : '⚠️';
        const statusText = status === 'healthy' ? 'ระบบทำงานปกติ' : 'ระบบมีปัญหา';

        container.innerHTML = `
            <div class="status-card status-${statusClass}">
                <div class="status-icon">${statusIcon}</div>
                <div class="status-info">
                    <div class="status-label">สถานะระบบ</div>
                    <div class="status-value">${statusText}</div>
                </div>
            </div>
            <div class="info-grid mt-3">
                <div class="info-item">
                    <div class="info-label">Uptime</div>
                    <div class="info-value">${this.formatUptime(uptime)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">อัพเดทล่าสุด</div>
                    <div class="info-value">${this.formatTime(timestamp)}</div>
                </div>
            </div>
        `;
    },

    renderDatabaseStatus(data) {
        const container = document.getElementById('database-status');
        const { database } = data;

        if (!database) {
            container.innerHTML = '<p class="text-muted">ไม่มีข้อมูล</p>';
            return;
        }

        const statusIcon = database.connected ? '✅' : '❌';
        const statusText = database.connected ? 'เชื่อมต่อแล้ว' : 'ไม่สามารถเชื่อมต่อ';

        container.innerHTML = `
            <div class="db-status mb-3">
                <span class="status-badge ${database.connected ? 'badge-success' : 'badge-danger'}">
                    ${statusIcon} ${statusText}
                </span>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">👥 พนักงาน</div>
                    <div class="info-value">${database.employees || 0} คน</div>
                </div>
                <div class="info-item">
                    <div class="info-label">⏰ บันทึกเวลา</div>
                    <div class="info-value">${database.attendances || 0} รายการ</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 ลางาน</div>
                    <div class="info-value">${database.leaves || 0} รายการ</div>
                </div>
                <div class="info-item">
                    <div class="info-label">💰 เบิกเงิน</div>
                    <div class="info-value">${database.advances || 0} รายการ</div>
                </div>
            </div>
        `;
    },

    renderAPIHealth(data) {
        const container = document.getElementById('api-health');
        const { apis } = data;

        if (!apis || apis.length === 0) {
            container.innerHTML = '<p class="text-muted">ไม่มีข้อมูล</p>';
            return;
        }

        const html = apis.map(api => {
            const statusIcon = api.status === 'ok' ? '✅' : '❌';
            const statusClass = api.status === 'ok' ? 'success' : 'danger';
            
            return `
                <div class="api-item">
                    <div class="api-name">
                        <span class="status-dot status-${statusClass}"></span>
                        ${api.name}
                    </div>
                    <div class="api-status">
                        ${statusIcon} ${api.status === 'ok' ? 'ทำงานปกติ' : 'มีปัญหา'}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    renderRecentActivity(data) {
        const container = document.getElementById('recent-activity');
        const { recentActivity } = data;

        if (!recentActivity) {
            container.innerHTML = '<p class="text-muted">ไม่มีข้อมูล</p>';
            return;
        }

        container.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">✅ Check-in</div>
                    <div class="info-value">${recentActivity.checkIns || 0} ครั้ง</div>
                </div>
                <div class="info-item">
                    <div class="info-label">🏁 Check-out</div>
                    <div class="info-value">${recentActivity.checkOuts || 0} ครั้ง</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 ขอลางาน</div>
                    <div class="info-value">${recentActivity.leaveRequests || 0} รายการ</div>
                </div>
                <div class="info-item">
                    <div class="info-label">💰 เบิกเงิน</div>
                    <div class="info-value">${recentActivity.advanceRequests || 0} รายการ</div>
                </div>
            </div>
        `;
    },

    formatUptime(seconds) {
        if (!seconds) return '-';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days} วัน ${hours} ชม.`;
        if (hours > 0) return `${hours} ชม. ${minutes} นาที`;
        return `${minutes} นาที`;
    },

    formatTime(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    destroy() {
        // Cleanup if needed
    }
};

// Register globally
if (typeof window !== 'undefined') {
    window.HealthStatusView = HealthStatusView;
}
