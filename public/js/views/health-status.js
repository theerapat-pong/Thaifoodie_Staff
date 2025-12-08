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
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <div class="loading-text">กำลังโหลดข้อมูล...</div>
                        </div>
                    </div>
                </div>

                <!-- Database Status (ADMIN/DEV only) -->
                <div class="card mb-3" id="database-section" style="display: none;">
                    <div class="card-header">
                        <h3>📊 ฐานข้อมูล</h3>
                    </div>
                    <div class="card-body" id="database-status">
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <div class="loading-text">กำลังโหลดข้อมูล...</div>
                        </div>
                    </div>
                </div>

                <!-- API Health -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h3>🔌 API Endpoints</h3>
                    </div>
                    <div class="card-body" id="api-health">
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <div class="loading-text">กำลังโหลดข้อมูล...</div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity (ADMIN/DEV only) -->
                <div class="card mb-3" id="recent-activity-section" style="display: none;">
                    <div class="card-header">
                        <h3>📈 กิจกรรมล่าสุด (24 ชม.)</h3>
                    </div>
                    <div class="card-body" id="recent-activity">
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <div class="loading-text">กำลังโหลดข้อมูล...</div>
                        </div>
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
        
        // Get user role for permission check
        const userRole = await this.getUserRole();
        
        if (!userRole) {
            this.showAccessDenied();
            return;
        }
        
        // Show/hide sections based on role
        this.configureSectionsByRole(userRole);
        
        await this.loadHealthData();
    },

    async getUserRole() {
        try {
            const response = await UserAPI.getProfile();
            if (response.success && response.data) {
                return response.data.employee.role;
            }
            return null;
        } catch (error) {
            console.error('[HealthStatus] Access check error:', error);
            return null;
        }
    },

    configureSectionsByRole(role) {
        // ADMIN and DEV see all sections
        if (['ADMIN', 'DEV'].includes(role)) {
            const databaseSection = document.getElementById('database-section');
            const recentActivitySection = document.getElementById('recent-activity-section');
            
            if (databaseSection) databaseSection.style.display = 'block';
            if (recentActivitySection) recentActivitySection.style.display = 'block';
        }
        // STAFF sees only overview and API health (database and recent activity hidden)
    },

    showAccessDenied() {
        const container = document.querySelector('.view-health-status');
        if (container) {
            container.innerHTML = `
                <div class="view-header">
                    <button class="btn-back" onclick="router.navigate('home')">
                        <span class="back-icon">←</span>
                    </button>
                    <h1 class="view-title">🏥 สถานะระบบ</h1>
                </div>
                <div class="card">
                    <div class="card-body text-center">
                        <div class="text-danger mb-2" style="font-size: 48px;">🚫</div>
                        <h3>ไม่สามารถเข้าถึงได้</h3>
                        <p class="text-muted">คุณไม่มีสิทธิ์เข้าถึงสถานะระบบ<br>เฉพาะผู้ดูแลระบบเท่านั้น</p>
                        <button class="btn btn-primary mt-3" onclick="router.navigate('home')">
                            กลับหน้าหลัก
                        </button>
                    </div>
                </div>
            `;
        }
    },

    async loadHealthData() {
        try {
            const response = await fetch('/api/health', {
                headers: {
                    'Authorization': `Bearer ${liff.getAccessToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // API returns direct status object, not wrapped in success/data
            if (data && data.status) {
                this.renderStatusOverview(data);
                this.renderDatabaseStatus(data);
                this.renderAPIHealth(data);
                this.renderRecentActivity(data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('[HealthStatus] Load error:', error);
            showError('ไม่สามารถโหลดสถานะระบบได้');
            
            // Show error in UI
            document.getElementById('status-overview').innerHTML = 
                '<p class="text-danger">ไม่สามารถโหลดข้อมูลได้</p>';
        }
    },

    renderStatusOverview(data) {
        const container = document.getElementById('status-overview');
        const { status, timestamp, response_time, components } = data;

        const statusClass = status === 'operational' ? 'success' : 'danger';
        const statusIcon = status === 'operational' ? '✅' : '⚠️';
        const statusText = status === 'operational' ? 'ระบบทำงานปกติ' : 
                          status === 'degraded' ? 'ระบบมีปัญหาบางส่วน' : 'ระบบมีปัญหา';

        const uptime = components?.server?.uptime || 0;

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
                    <div class="info-label">Response Time</div>
                    <div class="info-value">${response_time || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">อัพเดทล่าสุด</div>
                    <div class="info-value">${this.formatTime(timestamp)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Status</div>
                    <div class="info-value">${status.toUpperCase()}</div>
                </div>
            </div>
        `;
    },

    renderDatabaseStatus(data) {
        const container = document.getElementById('database-status');
        const { components } = data;
        
        if (!components || !components.database) {
            container.innerHTML = '<p class="text-muted">ไม่มีข้อมูล</p>';
            return;
        }

        const db = components.database;
        const statusIcon = db.status === 'operational' ? '✅' : '❌';
        const statusText = db.status === 'operational' ? 'เชื่อมต่อแล้ว' : 'ไม่สามารถเชื่อมต่อ';
        const statusClass = db.status === 'operational' ? 'success' : 'danger';

        // Extract counts from components
        const attendance = components.attendance_system;
        const leave = components.leave_system;
        const advance = components.advance_system;

        container.innerHTML = `
            <div class="db-status mb-3">
                <span class="status-badge badge-${statusClass}">
                    ${statusIcon} ${statusText}
                </span>
                ${db.message ? `<p class="text-muted mt-2" style="font-size: 13px;">${db.message}</p>` : ''}
                ${db.latency ? `<p class="text-muted" style="font-size: 12px;">Latency: ${db.latency}</p>` : ''}
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">⏰ บันทึกเวลา</div>
                    <div class="info-value">${attendance?.message || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 ลางาน</div>
                    <div class="info-value">${leave?.message || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">💰 เบิกเงิน</div>
                    <div class="info-value">${advance?.message || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">🔌 Database</div>
                    <div class="info-value">${db.status}</div>
                </div>
            </div>
        `;
    },

    renderAPIHealth(data) {
        const container = document.getElementById('api-health');
        const { components } = data;

        if (!components) {
            container.innerHTML = '<p class="text-muted">ไม่มีข้อมูล</p>';
            return;
        }

        // Build API list from components
        const apis = [
            { name: 'Database', status: components.database?.status, component: components.database },
            { name: 'LINE API', status: components.line_api?.status, component: components.line_api },
            { name: 'Attendance System', status: components.attendance_system?.status, component: components.attendance_system },
            { name: 'Leave System', status: components.leave_system?.status, component: components.leave_system },
            { name: 'Advance System', status: components.advance_system?.status, component: components.advance_system },
            { name: 'Cron Jobs', status: components.cron_job?.status, component: components.cron_job },
            { name: 'Server', status: components.server?.status, component: components.server }
        ];

        const html = apis.map(api => {
            const statusIcon = api.status === 'operational' ? '✅' : 
                             api.status === 'issue' ? '⚠️' : '❌';
            const statusClass = api.status === 'operational' ? 'success' : 
                              api.status === 'issue' ? 'warning' : 'danger';
            const statusTextMap = {
                'operational': 'ทำงานปกติ',
                'issue': 'มีปัญหาบางส่วน',
                'outage': 'มีปัญหา',
                'checking': 'กำลังตรวจสอบ'
            };
            
            return `
                <div class="api-item">
                    <div class="api-name">
                        <span class="status-dot status-${statusClass}"></span>
                        ${api.name}
                    </div>
                    <div class="api-status">
                        ${statusIcon} ${statusTextMap[api.status] || api.status}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    renderRecentActivity(data) {
        const container = document.getElementById('recent-activity');
        
        // Health API doesn't provide activity data, show placeholder
        container.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">📊 System Status</div>
                    <div class="info-value">${data.status.toUpperCase()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">⚡ Response</div>
                    <div class="info-value">${data.response_time || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">🔌 Components</div>
                    <div class="info-value">${Object.keys(data.components || {}).length}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">✅ Operational</div>
                    <div class="info-value">${this.countOperational(data.components)}</div>
                </div>
            </div>
        `;
    },

    countOperational(components) {
        if (!components) return 0;
        return Object.values(components).filter(c => c.status === 'operational').length;
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
