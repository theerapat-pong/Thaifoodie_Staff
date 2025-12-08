// ========================================
// Home View - Main Menu
// ========================================

const HomeView = {
    name: 'home',

    async render() {
        return `
            <div class="view-home">
                <!-- Hero Section -->
                <div class="hero-section">
                    <img class="hero-avatar" id="user-avatar" src="https://via.placeholder.com/80" alt="Profile">
                    <div class="hero-name" id="user-name">กำลังโหลด...</div>
                    <div class="hero-role" id="user-role">พนักงาน</div>
                    
                    <div class="today-status" id="today-status">
                        <div class="today-label">สถานะวันนี้</div>
                        <div class="today-value" id="today-value">-</div>
                    </div>
                </div>
                
                <!-- Balance Card -->
                <div class="balance-card">
                    <div class="balance-info">
                        <div class="balance-label">ยอดเงินคงเหลือ</div>
                        <div class="balance-value" id="balance-value">฿0</div>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="router.navigate('balance')">ดูรายละเอียด</button>
                </div>
                
                <!-- Main Menu -->
                <div class="menu-section-title">เมนูหลัก</div>
                <div class="menu-grid">
                    <a href="#attendance" class="menu-item">
                        <div class="menu-icon">⏰</div>
                        <div class="menu-label">เข้า-ออกงาน</div>
                    </a>
                    <a href="#leave" class="menu-item">
                        <div class="menu-icon">📅</div>
                        <div class="menu-label">ลางาน</div>
                    </a>
                    <a href="#advance" class="menu-item">
                        <div class="menu-icon">💰</div>
                        <div class="menu-label">เบิกเงิน</div>
                    </a>
                    <a href="#balance" class="menu-item">
                        <div class="menu-icon">📊</div>
                        <div class="menu-label">ดูยอดเงิน</div>
                    </a>
                    <a href="#history" class="menu-item">
                        <div class="menu-icon">📋</div>
                        <div class="menu-label">ประวัติ</div>
                    </a>
                    <a href="#cancel" class="menu-item" id="menu-cancel">
                        <div class="menu-icon">❌</div>
                        <div class="menu-label">ยกเลิกคำขอ</div>
                        <span class="pending-badge" id="pending-badge" style="display: none;">0</span>
                    </a>
                </div>
                
                <!-- Admin Section (hidden by default) -->
                <div class="admin-section" id="admin-section" style="display: none;">
                    <div class="menu-section-title">สำหรับผู้ดูแลระบบ</div>
                    <div class="menu-grid">
                        <a href="#admin" class="menu-item">
                            <div class="menu-icon">📋</div>
                            <div class="menu-label">จัดการคำขอ</div>
                            <span class="pending-badge" id="admin-pending-badge" style="display: none;">0</span>
                        </a>
                        <a href="#health-status" class="menu-item">
                            <div class="menu-icon">🏥</div>
                            <div class="menu-label">สถานะระบบ</div>
                        </a>
                        <a href="#system-logs" class="menu-item" id="menu-system-logs" style="display: none;">
                            <div class="menu-icon">🔧</div>
                            <div class="menu-label">System Logs</div>
                            <span class="badge-dev">DEV</span>
                        </a>
                        <a href="#settings" class="menu-item">
                            <div class="menu-icon">⚙️</div>
                            <div class="menu-label">ตั้งค่า</div>
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="text-center text-muted text-sm mt-3">
                    <p>&copy; 2025 Thaifoodie Staff Management. สงวนลิขสิทธิ์ทั้งหมด.</p>
                </div>
            </div>
        `;
    },

    async init() {
        try {
            // Update profile info
            const profile = getUserProfile();
            if (profile) {
                document.getElementById('user-avatar').src = profile.pictureUrl || 'https://via.placeholder.com/80';
                document.getElementById('user-name').textContent = profile.displayName;
            }
            
            this.renderCachedData();

            // Load user data
            await this.loadUserData();
            
        } catch (error) {
            console.error('Home init error:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    destroy() {
        abortTrackedRequests(this);
    },

    renderCachedData() {
        if (typeof DataFetcher === 'undefined') return;
        const cachedProfile = DataFetcher.getCachedProfile ? DataFetcher.getCachedProfile() : DataFetcher.getCached(['user-profile', window.userId]);
        if (cachedProfile) {
            this.applyProfileData(cachedProfile);
        }
        const cachedToday = DataFetcher.getCachedToday ? DataFetcher.getCachedToday() : DataFetcher.getCached(['attendance-today', window.userId]);
        if (cachedToday) {
            this.applyTodayData(cachedToday);
        }
    },

    async loadUserData() {
        try {
            const controller = createAbortControllerFor(this);
            const signal = controller ? controller.signal : undefined;
            const profilePromise = typeof DataFetcher !== 'undefined'
                ? DataFetcher.getUserProfile({ signal })
                : UserAPI.getProfile({ signal });
            const todayPromise = typeof DataFetcher !== 'undefined'
                ? DataFetcher.getTodaySummary({ signal })
                : AttendanceAPI.getToday({ signal });

            const [profileData, todayData] = await Promise.all([profilePromise, todayPromise]);

            this.applyProfileData(profileData);
            this.applyTodayData(todayData);

        } catch (error) {
            if (isAbortError(error)) return;
            console.error('Load user data error:', error);
            document.getElementById('today-value').textContent = 'ไม่สามารถโหลดข้อมูลได้';
        }
    },

    applyProfileData(profileData) {
        if (!profileData?.success || !profileData.data) return;
        const { employee, balance, pendingRequests } = profileData.data;

        const isAdminRole = ['ADMIN', 'DEV'].includes(employee.role);
        const isDevRole = employee.role === 'DEV';
        const roleText = isAdminRole ? 'ผู้ดูแลระบบ' : 'พนักงาน';
        document.getElementById('user-role').textContent = 
            employee.department ? `${roleText} • ${employee.department}` : roleText;

        document.getElementById('balance-value').textContent = 
            formatCurrency(balance.remaining);

        const pendingBadge = document.getElementById('pending-badge');
        if (pendingRequests.total > 0) {
            pendingBadge.textContent = pendingRequests.total;
            pendingBadge.style.display = 'flex';
        } else {
            pendingBadge.style.display = 'none';
        }

        if (isAdminRole) {
            document.getElementById('admin-section').style.display = 'block';
            
            // Show System Logs menu only for DEV role
            if (isDevRole) {
                const systemLogsMenu = document.getElementById('menu-system-logs');
                if (systemLogsMenu) {
                    systemLogsMenu.style.display = 'block';
                }
            }
            
            this.loadAdminPendingCount();
        }
    },

    applyTodayData(todayData) {
        if (!todayData?.success || !todayData.data) return;
        const { today } = todayData.data;
        let statusText = 'ยังไม่ได้ลงเวลา';

        switch (today.status) {
            case 'CHECKED_IN':
                statusText = `✓ เข้างานแล้ว ${today.checkInTime}`;
                break;
            case 'CHECKED_OUT':
                statusText = `✓ เลิกงานแล้ว ${today.checkOutTime}`;
                break;
            case 'NOT_CHECKED_IN':
            default:
                statusText = '⏳ ยังไม่ได้ลงเวลา';
                break;
        }

        const todayValueEl = document.getElementById('today-value');
        if (todayValueEl) {
            todayValueEl.textContent = statusText;
        }
    },

    async loadAdminPendingCount() {
        try {
            const response = await AdminAPI.getPending();
            const badge = document.getElementById('admin-pending-badge');
            
            if (response.success && response.data && response.data.total > 0) {
                badge.textContent = response.data.total;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } catch (error) {
            if (isAbortError(error)) return;
            console.error('Load admin pending count error:', error);
        }
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.HomeView = HomeView;
}
