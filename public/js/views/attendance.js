// ========================================
// Attendance View - Check-in / Check-out
// ========================================

const AttendanceView = {
    name: 'attendance',
    clockInterval: null,
    currentStatus: 'NOT_CHECKED_IN',
    todayData: null,

    async render() {
        return `
            <div class="view-attendance">
                <!-- Header -->
                <div class="header">
                    <div class="header-profile" id="header-profile" style="display: none;">
                        <img class="header-avatar" id="user-avatar" src="" alt="Profile">
                        <div class="header-info">
                            <div class="header-name" id="user-name">-</div>
                            <div class="header-role" id="user-role">พนักงาน</div>
                        </div>
                    </div>
                    <div class="header-title">เข้า-ออกงาน</div>
                    <div class="header-subtitle" id="today-date">-</div>
                </div>
                
                <!-- Status Card -->
                <div class="card">
                    <div class="card-body status-card">
                        <div id="status-badge" class="status-badge status-not-checked">
                            <span>⏳</span>
                            <span>ยังไม่ได้ลงเวลา</span>
                        </div>
                        
                        <div class="time-display-large" id="current-time">--:--</div>
                        
                        <div class="shift-info">
                            <div class="shift-item">
                                <div class="text-muted">เข้างาน</div>
                                <div class="shift-time" id="shift-start">-</div>
                            </div>
                            <div class="shift-item">
                                <div class="text-muted">ออกงาน</div>
                                <div class="shift-time" id="shift-end">-</div>
                            </div>
                            <div class="shift-item" id="work-duration-item" style="display: none;">
                                <div class="text-muted">รวม</div>
                                <div class="shift-time" id="work-duration-display">-</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Time Details -->
                <div class="card" id="time-details" style="display: none;">
                    <div class="card-body">
                        <div class="time-info-row">
                            <span class="time-label">เวลาเข้างาน</span>
                            <span class="time-value" id="check-in-time">-</span>
                        </div>
                        <div class="time-info-row" id="checkout-info" style="display: none;">
                            <span class="time-label">เวลาออกงาน</span>
                            <span class="time-value" id="check-out-time">-</span>
                        </div>
                        <div class="time-info-row" id="workhours-info" style="display: none;">
                            <span class="time-label">ชั่วโมงทำงาน</span>
                            <span class="time-value" id="work-hours">-</span>
                        </div>
                        <div class="time-info-row" id="wage-info" style="display: none;">
                            <span class="time-label">รายได้วันนี้</span>
                            <span class="time-value text-primary" id="daily-wage">-</span>
                        </div>
                    </div>
                </div>
                
                <!-- Late/Early Warning -->
                <div class="late-warning" id="late-warning" style="display: none;">
                    <span>⚠️</span>
                    <span id="warning-text">-</span>
                </div>
                
                <!-- Unified Process Status -->
                <div class="attendance-process-status" id="attendance-process-status" style="display: none;">
                    <div class="process-icon" id="attendance-process-icon">📍</div>
                    <div class="process-spinner" aria-hidden="true"></div>
                    <div class="process-message" id="attendance-process-text">กำลังระบุตำแหน่ง...</div>
                </div>
                
                <!-- Location Pending Warning -->
                <div class="location-pending-warning" id="location-pending" style="display: none;">
                    <span>⏳</span>
                    <span>รอ Admin อนุมัติตำแหน่ง</span>
                </div>
                
                <!-- Action Buttons -->
                <button class="btn btn-primary btn-block btn-lg action-btn" id="btn-check-in" onclick="AttendanceView.handleCheckIn()">
                    ✓ ลงเวลาเข้างาน
                </button>
                
                <button class="btn btn-danger btn-block btn-lg action-btn" id="btn-check-out" onclick="AttendanceView.handleCheckOut()" style="display: none;">
                    ✓ ลงเวลาออกงาน
                </button>
                
                <!-- Balance Summary -->
                <div class="summary-card mt-2" id="balance-card" style="display: none;">
                    <div class="label">ยอดเงินคงเหลือ</div>
                    <div class="value" id="balance-amount">฿0</div>
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
            // Start clock
            this.updateClock();
            this.clockInterval = setInterval(() => this.updateClock(), 1000);
            
            // Update header with user info
            const profile = getUserProfile();
            if (profile) {
                document.getElementById('user-avatar').src = profile.pictureUrl || '';
                document.getElementById('user-name').textContent = profile.displayName;
                document.getElementById('header-profile').style.display = 'flex';
            }
            
            // Set today's date
            const today = new Date();
            document.getElementById('today-date').textContent = formatDate(today);
            
            this.renderCachedToday();

            // Load today's status
            await this.loadTodayStatus();
            
        } catch (error) {
            console.error('Attendance init error:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    destroy() {
        // Clear clock interval
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        abortTrackedRequests(this);
    },

    showProcessStatus(icon, message) {
        const container = document.getElementById('attendance-process-status');
        if (!container) return;
        container.style.display = 'flex';
        this.updateProcessStatus(icon, message);
    },

    updateProcessStatus(icon, message) {
        const iconEl = document.getElementById('attendance-process-icon');
        const textEl = document.getElementById('attendance-process-text');
        if (iconEl && typeof icon === 'string') {
            iconEl.textContent = icon;
        }
        if (textEl && typeof message === 'string') {
            textEl.textContent = message;
        }
    },

    hideProcessStatus() {
        const container = document.getElementById('attendance-process-status');
        if (container) {
            container.style.display = 'none';
        }
    },

    updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        const el = document.getElementById('current-time');
        if (el) el.textContent = timeStr;
    },

    renderCachedToday() {
        if (typeof DataFetcher === 'undefined') return;
        const cached = DataFetcher.getCachedToday ? DataFetcher.getCachedToday() : DataFetcher.getCached(['attendance-today', window.userId]);
        if (cached) {
            this.applyTodayData(cached);
        }
    },

    async loadTodayStatus() {
        const hadCache = Boolean(this.todayData);
        let loadingShown = false;
        try {
            if (!hadCache) {
                showLoading('กำลังโหลดข้อมูล...');
                loadingShown = true;
            }

            const controller = createAbortControllerFor(this);
            const signal = controller ? controller.signal : undefined;
            const response = typeof DataFetcher !== 'undefined'
                ? await DataFetcher.getTodaySummary({ signal })
                : await AttendanceAPI.getToday({ signal });

            this.applyTodayData(response);

        } catch (error) {
            if (loadingShown) {
                hideLoading();
                loadingShown = false;
            }
            if (isAbortError(error)) return;
            console.error('Load status error:', error);
            showError(error.message || 'ไม่สามารถโหลดข้อมูลได้');
            return;
        }

        if (loadingShown) {
            hideLoading();
        }
    },

    applyTodayData(response) {
        if (!response?.success || !response.data) return;
        this.todayData = response.data;

        if (this.todayData.employee) {
            document.getElementById('shift-start').textContent = this.todayData.employee.shiftStart || '-';
            document.getElementById('shift-end').textContent = this.todayData.employee.shiftEnd || '-';
        }

        if (this.todayData.balance) {
            document.getElementById('balance-amount').textContent = 
                formatCurrency(this.todayData.balance.balance);
            document.getElementById('balance-card').style.display = 'block';
        } else {
            document.getElementById('balance-card').style.display = 'none';
        }

        this.currentStatus = this.todayData.today?.status || 'NOT_CHECKED_IN';
        this.updateStatusUI();
    },

    updateStatusUI() {
        if (!this.todayData || !this.todayData.today) {
            return;
        }
        const statusBadge = document.getElementById('status-badge');
        const btnCheckIn = document.getElementById('btn-check-in');
        const btnCheckOut = document.getElementById('btn-check-out');
        const timeDetails = document.getElementById('time-details');
        const today = this.todayData.today;
        
        switch (this.currentStatus) {
            case 'NOT_CHECKED_IN':
                statusBadge.className = 'status-badge status-not-checked';
                statusBadge.innerHTML = '<span>⏳</span><span>ยังไม่ได้ลงเวลา</span>';
                btnCheckIn.style.display = 'block';
                btnCheckIn.disabled = false;
                btnCheckOut.style.display = 'none';
                timeDetails.style.display = 'none';
                break;
                
            case 'CHECKED_IN':
                statusBadge.className = 'status-badge status-checked-in';
                statusBadge.innerHTML = '<span>✓</span><span>ลงเวลาเข้างานแล้ว</span>';
                btnCheckIn.style.display = 'none';
                btnCheckOut.style.display = 'block';
                btnCheckOut.disabled = false;
                
                // Show check-in time
                timeDetails.style.display = 'block';
                document.getElementById('check-in-time').textContent = today.checkInTime;
                document.getElementById('checkout-info').style.display = 'none';
                document.getElementById('workhours-info').style.display = 'none';
                document.getElementById('wage-info').style.display = 'none';
                
                // Show late warning if applicable
                if (today.isLate) {
                    const warning = document.getElementById('late-warning');
                    document.getElementById('warning-text').textContent = 
                        `มาสาย ${today.lateDisplay}`;
                    warning.style.display = 'flex';
                }
                break;
                
            case 'CHECKED_OUT':
                statusBadge.className = 'status-badge status-checked-out';
                statusBadge.innerHTML = '<span>✓</span><span>ลงเวลาออกงานแล้ว</span>';
                btnCheckIn.style.display = 'none';
                btnCheckOut.style.display = 'block';
                btnCheckOut.disabled = true;
                btnCheckOut.textContent = '✓ ลงเวลาเรียบร้อย';
                
                // Show all details
                timeDetails.style.display = 'block';
                document.getElementById('check-in-time').textContent = today.checkInTime;
                document.getElementById('checkout-info').style.display = 'flex';
                document.getElementById('check-out-time').textContent = today.checkOutTime;
                
                if (today.totalHours) {
                    // แสดงชั่วโมงทำงานในช่อง "รวม" ด้านบน
                    const hours = Math.floor(today.totalHours);
                    const minutes = Math.round((today.totalHours - hours) * 60);
                    const workDurationItem = document.getElementById('work-duration-item');
                    const workDurationDisplay = document.getElementById('work-duration-display');
                    if (workDurationItem && workDurationDisplay) {
                        workDurationDisplay.textContent = `${hours} ชม. ${minutes} นาที`;
                        workDurationItem.style.display = 'flex';
                    }
                    
                    // เก็บการแสดงผลแบบเก่าไว้ด้วย (ใน Time Details)
                    document.getElementById('workhours-info').style.display = 'flex';
                    document.getElementById('work-hours').textContent = `${hours} ชม. ${minutes} นาที`;
                }
                
                if (today.dailyWage) {
                    document.getElementById('wage-info').style.display = 'flex';
                    document.getElementById('daily-wage').textContent = 
                        formatCurrency(today.dailyWage);
                }
                
                // Show late warning if applicable (even after checkout)
                if (today.isLate) {
                    const warning = document.getElementById('late-warning');
                    document.getElementById('warning-text').textContent = 
                        `มาสาย ${today.lateDisplay}`;
                    warning.style.display = 'flex';
                }
                
                // Show early departure warning if applicable
                if (today.isEarly) {
                    const warning = document.getElementById('late-warning');
                    const currentText = document.getElementById('warning-text').textContent;
                    if (today.isLate) {
                        // Both late and early - append
                        document.getElementById('warning-text').textContent = 
                            `มาสาย ${today.lateDisplay} / ออกก่อนเวลา ${today.earlyDisplay}`;
                    } else {
                        document.getElementById('warning-text').textContent = 
                            `ออกก่อนเวลา ${today.earlyDisplay}`;
                    }
                    warning.style.display = 'flex';
                }
                break;
        }
    },

    async handleCheckIn() {
        const btn = document.getElementById('btn-check-in');
        let processStatusVisible = false;
        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'กำลังระบุตำแหน่ง...';
            }

            // State A: Getting GPS
            this.showProcessStatus('📍', 'กำลังระบุตำแหน่ง...');
            processStatusVisible = true;
            
            // Step 1: Get GPS location
            let locationData;
            try {
                locationData = await getCurrentPositionWithDialog({
                    showDialog: true,
                    showLoading: true
                });
            } catch (gpsError) {
                if (gpsError.message === 'ผู้ใช้ยกเลิก') {
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = '✓ ลงเวลาเข้างาน';
                    }
                    return;
                }
                throw gpsError;
            }

            // Step 2: Show map confirmation popup
            this.hideProcessStatus();
            processStatusVisible = false;
            
            const confirmed = await this.showLocationConfirmPopup(locationData);
            if (!confirmed) {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '✓ ลงเวลาเข้างาน';
                }
                return;
            }
            
            // State B: Saving data
            this.showProcessStatus('☁️', 'กำลังบันทึกข้อมูล...');
            processStatusVisible = true;
            if (btn) {
                btn.textContent = 'กำลังบันทึก...';
            }
            
            const response = await AttendanceAPI.checkIn(locationData);
            
            // Check if PENDING status (Yellow zone)
            const isPending = response.data.location?.isPending || response.data.location?.status === 'PENDING';
            
            if (isPending) {
                // State D: Pending/Yellow
                this.updateProcessStatus('⚠️', 'ส่งคำขอแล้ว (รออนุมัติ)');
            } else {
                // State C: Success
                this.updateProcessStatus('✅', 'บันทึกเรียบร้อย');
            }
            
            // Brief delay to show success/pending state
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // Update UI
            this.currentStatus = 'CHECKED_IN';
            this.todayData.today.checkInTime = response.data.checkInTime;
            this.todayData.today.status = 'CHECKED_IN';
            
            this.updateStatusUI();
            
            // Show late warning if applicable
            if (response.data.isLate) {
                const warning = document.getElementById('late-warning');
                document.getElementById('warning-text').textContent = 
                    `มาสาย ${response.data.lateDisplay}`;
                warning.style.display = 'flex';
            }
            
            // Show location pending if applicable
            if (isPending) {
                document.getElementById('location-pending').style.display = 'flex';
            }
            
            showSuccess(response.message || 'ลงเวลาเข้างานสำเร็จ');
            if (typeof DataFetcher !== 'undefined') {
                DataFetcher.invalidate(['attendance-today', window.userId]);
                DataFetcher.invalidate(['advance-balance', window.userId]);
            }
            
            // Auto close after success with confirmation
            this.showCloseConfirmation('เช็คอินสำเร็จ!', response.data.checkInTime, {
                isWarning: response.data.isLate || isPending,
                warningText: response.data.isLate ? `มาสาย ${response.data.lateDisplay}` : null,
                locationPending: isPending
            });
            
        } catch (error) {
            console.error('Check-in error:', error);
            
            // Show specific GPS errors
            if (error.message && (error.message.includes('GPS') || error.message.includes('ตำแหน่ง'))) {
                showError(error.message);
            } else if (error.message && (error.message.includes('ไกล') || error.message.includes('นอกพื้นที่'))) {
                showError(error.message);
            } else {
                showError(error.message || 'ไม่สามารถลงเวลาได้');
            }
            
            // Reset button
            if (btn) {
                btn.disabled = false;
                btn.textContent = '✓ ลงเวลาเข้างาน';
            }
        } finally {
            if (processStatusVisible) {
                setTimeout(() => this.hideProcessStatus(), 100);
            }
        }
    },

    async handleCheckOut() {
        const btn = document.getElementById('btn-check-out');
        let processStatusVisible = false;
        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'กำลังยืนยัน...';
            }

            const confirmed = await this.showCheckOutConfirmPopup();
            if (!confirmed) {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '✓ ลงเวลาออกงาน';
                }
                return;
            }

            // State B: Saving data
            this.showProcessStatus('☁️', 'กำลังบันทึกข้อมูล...');
            processStatusVisible = true;

            if (btn) {
                btn.textContent = 'กำลังบันทึก...';
            }

            const response = await AttendanceAPI.checkOut({
                latitude: null,
                longitude: null,
                accuracy: null
            });

            // State C: Success
            this.updateProcessStatus('✅', 'บันทึกเรียบร้อย');
            
            // Brief delay to show success state
            await new Promise(resolve => setTimeout(resolve, 1200));

            if (!this.todayData) {
                this.todayData = { today: {} };
            } else if (!this.todayData.today) {
                this.todayData.today = {};
            }

            this.currentStatus = 'CHECKED_OUT';
            this.todayData.today.checkOutTime = response.data.checkOutTime;
            this.todayData.today.totalHours = response.data.totalHours;
            this.todayData.today.dailyWage = response.data.dailyWage;
            this.todayData.today.status = 'CHECKED_OUT';
            this.todayData.balance = response.data.balance;

            this.updateStatusUI();

            if (response.data.balance) {
                document.getElementById('balance-amount').textContent = 
                    formatCurrency(response.data.balance.balance);
                document.getElementById('balance-card').style.display = 'block';
            }

            if (response.data.isEarly) {
                const warning = document.getElementById('late-warning');
                document.getElementById('warning-text').textContent = 
                    `ออกก่อนเวลา ${response.data.earlyDisplay}`;
                warning.style.display = 'flex';
            }

            showSuccess(response.message || 'ลงเวลาออกงานสำเร็จ');
            if (typeof DataFetcher !== 'undefined') {
                DataFetcher.invalidate(['attendance-today', window.userId]);
                DataFetcher.invalidate(['advance-balance', window.userId]);
            }

            this.showCloseConfirmation('เช็คเอาท์สำเร็จ!', response.data.checkOutTime, {
                isWarning: response.data.isEarly,
                warningText: response.data.isEarly ? `ออกก่อนเวลา ${response.data.earlyDisplay}` : null,
                locationPending: false
            });

        } catch (error) {
            console.error('Check-out error:', error);
            showError(error?.message || 'ไม่สามารถลงเวลาออกงานได้');
        } finally {
            if (processStatusVisible) {
                setTimeout(() => this.hideProcessStatus(), 100);
            }
            if (btn) {
                const isComplete = this.currentStatus === 'CHECKED_OUT';
                btn.disabled = isComplete;
                btn.textContent = isComplete ? '✓ ลงเวลาเรียบร้อย' : '✓ ลงเวลาออกงาน';
            }
        }
    },

    showCloseConfirmation(title, time, options = {}) {
        const { isWarning = false, warningText = '', locationPending = false } = options;
        const warningClass = isWarning ? 'warning' : '';

        const modal = document.createElement('div');
        modal.className = 'close-confirmation-modal';
        modal.innerHTML = `
            <div class="close-confirmation-content ${warningClass}">
                <div class="close-icon ${warningClass}">${isWarning ? '⚠️' : '✓'}</div>
                <div class="close-title">${title}</div>
                <div class="close-time ${warningClass}">${time}</div>
                ${isWarning && warningText ? `<div class="close-warning-badge">⚠️ ${warningText}</div>` : ''}
                ${locationPending ? `<div class="close-pending-badge">⏳ รอ Admin อนุมัติตำแหน่ง</div>` : ''}
                <div class="close-message">ต้องการปิดหน้าต่างนี้หรือไม่?</div>
                <div class="close-buttons">
                    <button class="btn btn-outline" data-close="stay">อยู่ในหน้านี้</button>
                    <button class="btn ${isWarning ? 'btn-danger' : 'btn-primary'}" data-close="exit">ปิด</button>
                </div>
                <div class="close-auto-text">ปิดอัตโนมัติใน <span class="close-countdown">5</span> วินาที</div>
            </div>
        `;
        document.body.appendChild(modal);

        // ✅ Task 2: Home view - removed auto-close to keep app open
        let countdown = 5;
        const countdownEl = modal.querySelector('.close-countdown');
        const timer = setInterval(() => {
            countdown -= 1;
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }
            if (countdown <= 0) {
                clearInterval(timer);
                modal.remove();
                // Removed closeLiff() - stay open in home view
            }
        }, 1000);

        const stayBtn = modal.querySelector('[data-close="stay"]');
        const exitBtn = modal.querySelector('[data-close="exit"]');

        const cleanup = () => {
            clearInterval(timer);
            modal.remove();
        };

        if (stayBtn) {
            stayBtn.addEventListener('click', () => {
                cleanup();
            });
        }

        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                cleanup();
                // ✅ Task 2: Removed closeLiff() - stay open in home view
            });
        }
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Show location confirmation popup with Leaflet map for check-in
     */
    async showLocationConfirmPopup(locationData) {
        // Default shop location
        let shopLat = 13.756331;
        let shopLng = 100.501762;
        let shopName = 'ร้าน';

        // Try to get shop location from API (use user endpoint, not admin)
        try {
            const response = await fetch('/api/liff/user/work-location', {
                headers: {
                    'Authorization': `Bearer ${window.accessToken || ''}`
                }
            });
            const data = await response.json();
            console.log('[Attendance] Work location response:', data);
            if (data.success && data.data) {
                shopLat = parseFloat(data.data.latitude);
                shopLng = parseFloat(data.data.longitude);
                shopName = data.data.name || shopName;
                console.log('[Attendance] Using shop location:', shopName, shopLat, shopLng);
            } else {
                console.warn('[Attendance] No work location configured, using default');
            }
        } catch (e) {
            console.error('[Attendance] Could not fetch shop location:', e);
        }

        // Calculate distance
        const distance = this.calculateDistance(
            locationData.latitude, 
            locationData.longitude, 
            shopLat, 
            shopLng
        );
        const distanceDisplay = distance < 1000 
            ? `${Math.round(distance)} เมตร` 
            : `${(distance / 1000).toFixed(2)} กม.`;
        
        const isNearby = distance <= 500;
        const distanceStatusIcon = isNearby ? '✅' : '⚠️';
        const distanceStatusClass = isNearby ? 'distance-ok' : 'distance-warning';

        const mapId = 'attendance-checkin-map-' + Date.now();

        const result = await Swal.fire({
            title: '📍 ยืนยันตำแหน่ง',
            html: `
                <div class="location-confirm-popup">
                    <div id="${mapId}" class="popup-map-container"></div>
                    <div class="location-info">
                        <div class="location-info-row">
                            <span class="location-info-label">📍 ตำแหน่งของคุณ:</span>
                            <span class="location-info-value">${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}</span>
                        </div>
                        <div class="location-info-row">
                            <span class="location-info-label">🎯 ความแม่นยำ:</span>
                            <span class="location-info-value">${Math.round(locationData.accuracy || 0)} เมตร</span>
                        </div>
                        <div class="location-info-row ${distanceStatusClass}">
                            <span class="location-info-label">🏪 ระยะห่างจากที่ทำงาน:</span>
                            <span class="location-info-value">${distanceDisplay} ${distanceStatusIcon}</span>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '✅ ยืนยันเช็คอิน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#00B900',
            cancelButtonColor: '#6c757d',
            reverseButtons: true,
            allowOutsideClick: false,
            width: '95%',
            customClass: {
                popup: 'location-confirm-swal',
                htmlContainer: 'location-confirm-html'
            },
            didOpen: () => {
                setTimeout(() => {
                    try {
                        const mapContainer = document.getElementById(mapId);
                        if (!mapContainer) {
                            console.error('Map container not found:', mapId);
                            return;
                        }

                        const map = L.map(mapId, {
                            zoomControl: false,
                            attributionControl: false
                        }).setView([locationData.latitude, locationData.longitude], 16);

                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            maxZoom: 19
                        }).addTo(map);

                        // User marker (blue)
                        const userIcon = L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="marker-pin user-marker">👤</div>`,
                            iconSize: [30, 42],
                            iconAnchor: [15, 42]
                        });
                        L.marker([locationData.latitude, locationData.longitude], { icon: userIcon })
                            .addTo(map)
                            .bindPopup('ตำแหน่งของคุณ');

                        // Shop marker (red)
                        const shopIcon = L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="marker-pin shop-marker">🏪</div>`,
                            iconSize: [30, 42],
                            iconAnchor: [15, 42]
                        });
                        L.marker([shopLat, shopLng], { icon: shopIcon })
                            .addTo(map)
                            .bindPopup(shopName);

                        // Fit bounds to show both markers
                        const bounds = L.latLngBounds(
                            [locationData.latitude, locationData.longitude],
                            [shopLat, shopLng]
                        );
                        map.fitBounds(bounds, { padding: [30, 30] });

                        // Force map to recalculate size after popup is fully rendered
                        setTimeout(() => {
                            map.invalidateSize();
                        }, 200);

                        // Add accuracy circle
                        if (locationData.accuracy) {
                            L.circle([locationData.latitude, locationData.longitude], {
                                radius: locationData.accuracy,
                                color: '#3388ff',
                                fillColor: '#3388ff',
                                fillOpacity: 0.15,
                                weight: 1
                            }).addTo(map);
                        }
                    } catch (mapError) {
                        console.error('Map initialization error:', mapError);
                    }
                }, 100);
            }
        });

        return result.isConfirmed;
    },

    /**
     * Show check-out confirmation popup (no GPS)
     */
    async showCheckOutConfirmPopup() {
        // Get today's check-in time
        let checkInTime = '--:--';
        let workDuration = '';
        
        // Log for debugging
        if (typeof ClientLogger !== 'undefined') {
            ClientLogger.info('ATTENDANCE_DEBUG', 'today-data', 'todayData', { 
                hasData: !!this.todayData,
                hasToday: !!(this.todayData && this.todayData.today),
                checkInTimeRaw: this.todayData?.today?.checkInTimeRaw || 'null'
            });
        }
        
        if (this.todayData && this.todayData.today) {
            checkInTime = this.todayData.today.checkInTime || checkInTime;
            
            // Calculate work duration
            if (this.todayData.today.checkInTimeRaw) {
                const checkIn = new Date(this.todayData.today.checkInTimeRaw);
                const now = new Date();
                const diffMs = now - checkIn;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                // Log calculation
                if (typeof ClientLogger !== 'undefined') {
                    ClientLogger.info('ATTENDANCE_DEBUG', 'duration-calc', 'คำนวณเวลาทำงาน', {
                        checkInRaw: this.todayData.today.checkInTimeRaw,
                        checkInParsed: checkIn.toISOString(),
                        now: now.toISOString(),
                        diffMs,
                        diffHours,
                        diffMinutes,
                        isNegative: diffMs < 0
                    });
                }
                
                // Only show if duration is positive
                if (diffMs >= 0) {
                    workDuration = `${diffHours} ชั่วโมง ${diffMinutes} นาที`;
                } else {
                    // Log negative duration error
                    if (typeof ClientLogger !== 'undefined') {
                        ClientLogger.error('ATTENDANCE_DEBUG', 'negative-duration', 'เวลาทำงานติดลบ (timezone issue)', {
                            diffMs,
                            checkIn: checkIn.toISOString(),
                            now: now.toISOString()
                        });
                    }
                }
            }
        }

        const result = await Swal.fire({
            title: '🏠 ยืนยันเช็คเอาท์',
            html: `
                <div class="checkout-confirm-popup">
                    <div class="checkout-info">
                        <div class="checkout-info-row">
                            <span class="checkout-info-label">⏰ เช็คอินเมื่อ:</span>
                            <span class="checkout-info-value">${checkInTime}</span>
                        </div>
                        ${workDuration ? `
                        <div class="checkout-info-row">
                            <span class="checkout-info-label">⏱️ เวลาทำงาน:</span>
                            <span class="checkout-info-value">${workDuration}</span>
                        </div>
                        ` : ''}
                    </div>
                    <p class="checkout-confirm-text">คุณต้องการลงเวลาออกงานหรือไม่?</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '🏠 ยืนยันเช็คเอาท์',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#539d96',
            cancelButtonColor: '#6c757d',
            reverseButtons: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'checkout-confirm-swal'
            }
        });

        return result.isConfirmed;
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.AttendanceView = AttendanceView;
}
