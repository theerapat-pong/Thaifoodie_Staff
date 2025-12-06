// ========================================
// Quick Check-out View - Fast check-out from Rich Menu
// ========================================

const CheckOutView = {
    name: 'check-out',

    async render() {
        return `
            <div class="view-checkout quick-action-view">
                <div class="quick-action-card" id="main-card-container" style="display: none;">
                    <!-- Unified Smart Status Container - Hidden by default -->
                    <div class="attendance-process-status" id="checkout-process-status" style="display: none;">
                        <div class="process-icon" id="checkout-process-icon">☁️</div>
                        <div class="process-spinner" aria-hidden="true"></div>
                        <div class="process-message" id="checkout-process-text">กำลังบันทึกข้อมูล...</div>
                    </div>
                    
                    <!-- Success State -->
                    <div id="state-success" style="display: none;">
                        <div class="result-success checkout" id="result-success-box">
                            <div class="icon" id="success-icon">✓</div>
                            <div class="title" id="success-title">ลงเวลาออกงานสำเร็จ!</div>
                            <div class="time" id="checkout-time">--:--</div>
                            
                            <div class="work-summary">
                                <div class="work-summary-item">
                                    <div class="work-summary-label">ชั่วโมงทำงาน</div>
                                    <div class="work-summary-value" id="work-hours">-</div>
                                </div>
                                <div class="work-summary-item">
                                    <div class="work-summary-label">รายได้วันนี้</div>
                                    <div class="work-summary-value" id="daily-wage">฿0</div>
                                </div>
                            </div>
                            
                            <div class="early-badge warning-badge" id="early-badge" style="display: none;">
                                ⚠️ ออกก่อนเวลา <span id="early-duration">-</span>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-outline" onclick="router.navigate('home')">
                                ไปหน้าหลัก
                            </button>
                            <button class="btn btn-primary" id="close-btn" onclick="closeLiff()">
                                ปิด
                            </button>
                        </div>
                        <div class="auto-close-text">ปิดอัตโนมัติใน <span id="close-countdown">5</span> วินาที</div>
                    </div>
                    
                    <!-- Not Checked In State -->
                    <div id="state-not-checked" style="display: none;">
                        <div class="result-warning">
                            <div class="icon">⚠️</div>
                            <div class="title">ยังไม่ได้ลงเวลาเข้างาน</div>
                            <div class="message">กรุณาลงเวลาเข้างานก่อน</div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-primary" onclick="router.navigate('check-in')">
                                ลงเวลาเข้างาน
                            </button>
                            <button class="btn btn-outline" onclick="closeLiff()">
                                ปิด
                            </button>
                        </div>
                    </div>
                    
                    <!-- Already Checked Out State -->
                    <div id="state-already" style="display: none;">
                        <div class="result-already">
                            <div class="icon">ℹ️</div>
                            <div class="title">ลงเวลาออกงานแล้ว</div>
                            <div class="message" id="already-message">คุณได้ลงเวลาออกงานแล้ววันนี้</div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-outline" onclick="router.navigate('attendance')">
                                ไปหน้าลงเวลา
                            </button>
                            <button class="btn btn-primary" onclick="closeLiff()">
                                ปิด
                            </button>
                        </div>
                    </div>
                    
                    <!-- Error State -->
                    <div id="state-error" style="display: none;">
                        <div class="result-error">
                            <div class="icon">⚠️</div>
                            <div class="title">เกิดข้อผิดพลาด</div>
                            <div class="message" id="error-message">ไม่สามารถลงเวลาได้</div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-outline" onclick="CheckOutView.retry()">
                                ลองใหม่
                            </button>
                            <button class="btn btn-primary" onclick="router.navigate('home')">
                                ไปหน้าหลัก
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        // ✅ FIX: Wait for DOM to be fully attached before accessing elements
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            // ✅ Task 1: Fetch today's data first before showing modal
            await this.fetchTodayData();
            
            // Perform check-out with confirmation dialog
            await this.performCheckOut();
        } catch (error) {
            console.error('Check-out init error:', error);
            if (error.message !== 'ผู้ใช้ยกเลิก') {
                this.showError(error.message);
            }
        }
    },

    // Store today's attendance data
    todayData: null,

    /**
     * Fetch today's attendance data before showing confirmation
     */
    async fetchTodayData() {
        try {
            const response = await AttendanceAPI.getToday();
            if (response.success && response.data) {
                this.todayData = response.data;
            }
        } catch (error) {
            console.warn('Could not fetch today attendance:', error);
            this.todayData = null;
        }
    },

    // Unified UI Helper Methods (copied from attendance.js)
    showProcessStatus(icon, message) {
        // Make the parent card visible first
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) mainCard.style.display = 'block';
        
        const container = document.getElementById('checkout-process-status');
        if (!container) {
            console.warn('[CheckOut] Process status container not found in DOM');
            return;
        }
        // ✅ Task 4: Explicitly force visibility
        container.style.display = 'flex';
        this.updateProcessStatus(icon, message);
    },

    updateProcessStatus(icon, message) {
        const iconEl = document.getElementById('checkout-process-icon');
        const textEl = document.getElementById('checkout-process-text');
        
        // ✅ Safety check: Return early if elements not found
        if (!iconEl || !textEl) {
            console.warn('[CheckOut] Process status elements not found in DOM');
            return;
        }
        
        if (typeof icon === 'string') {
            iconEl.textContent = icon;
        }
        if (typeof message === 'string') {
            textEl.textContent = message;
        }
    },

    hideProcessStatus() {
        const container = document.getElementById('checkout-process-status');
        if (container) {
            container.style.display = 'none';
        }
    },

    async performCheckOut() {
        let processStatusVisible = false;
        try {
            // Log start
            if (typeof ClientLogger !== 'undefined') {
                ClientLogger.info('CHECK_OUT', 'start', 'เริ่มกระบวนการเช็คเอาท์');
            }

            // Show confirmation dialog first (container stays HIDDEN during this)
            const confirmed = await this.showCheckOutConfirmation();
            if (!confirmed) {
                // User cancelled - go back home (never showed the container)
                router.navigate('home');
                return;
            }
            
            // ✅ NOW show the status container (State B: Saving data)
            this.showProcessStatus('☁️', 'กำลังบันทึกข้อมูล...');
            processStatusVisible = true;
            
            if (typeof ClientLogger !== 'undefined') {
                ClientLogger.info('CHECK_OUT', 'submitting', 'กำลังส่งข้อมูลเช็คเอาท์');
            }
            
            // Submit check-out without GPS (send null coordinates)
            const response = await AttendanceAPI.checkOut({
                latitude: null,
                longitude: null,
                accuracy: null
            });
            
            if (response.success) {
                // State C: Success
                this.updateProcessStatus('✅', 'บันทึกเรียบร้อย');
                
                // Brief delay to show success state
                await new Promise(resolve => setTimeout(resolve, 1200));
                
                this.hideProcessStatus();
                processStatusVisible = false;
                
                this.showSuccess(response.data);
            }
            
        } catch (error) {
            console.error('Check-out error:', error);
            
            if (processStatusVisible) {
                this.hideProcessStatus();
            }
            
            // Check specific error types
            if (error.message) {
                // Not checked in
                if (error.message.includes('ยังไม่ได้ลงเวลาเข้า') || error.message.includes('not checked in') || error.message.includes('ลงเวลาเข้างานก่อน')) {
                    this.showNotCheckedIn();
                } 
                // Already checked out
                else if (error.message.includes('แล้ว') || error.message.includes('already')) {
                    this.showAlreadyCheckedOut(error.message);
                } 
                else {
                    this.showError(error.message);
                }
            } else {
                this.showError('ไม่สามารถลงเวลาออกงานได้');
            }
        }
    },

    showSuccess(data) {
        // Make the parent card visible
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) mainCard.style.display = 'block';
        
        this.hideProcessStatus();
        document.getElementById('state-success').style.display = 'block';
        
        document.getElementById('checkout-time').textContent = data.checkOutTime;
        
        // Show work hours
        if (data.totalHours) {
            const hours = Math.floor(data.totalHours);
            const minutes = Math.round((data.totalHours - hours) * 60);
            document.getElementById('work-hours').textContent = `${hours} ชม. ${minutes} นาที`;
        }
        
        // Show daily wage
        if (data.dailyWage) {
            document.getElementById('daily-wage').textContent = formatCurrency(data.dailyWage);
        }
        
        // Show early warning if applicable
        if (data.isEarly) {
            // Apply warning (red) style
            document.getElementById('result-success-box').classList.remove('checkout');
            document.getElementById('result-success-box').classList.add('warning');
            document.getElementById('success-icon').textContent = '⚠️';
            document.getElementById('success-title').textContent = 'ออกก่อนเวลา!';
            document.getElementById('early-badge').style.display = 'inline-block';
            document.getElementById('early-duration').textContent = data.earlyDisplay;
            document.getElementById('close-btn').classList.remove('btn-primary');
            document.getElementById('close-btn').classList.add('btn-danger');
        }
        
        // ✅ Task 2: Quick action auto-close after 3 seconds
        setTimeout(() => {
            if (typeof liff !== 'undefined' && liff.isInClient()) {
                liff.closeWindow();
            }
        }, 3000);
        
        // Auto close countdown
        this.startAutoClose();
    },

    showNotCheckedIn() {
        // Make the parent card visible
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) mainCard.style.display = 'block';
        
        this.hideProcessStatus();
        document.getElementById('state-not-checked').style.display = 'block';
    },

    showAlreadyCheckedOut(message) {
        // Make the parent card visible
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) mainCard.style.display = 'block';
        
        this.hideProcessStatus();
        document.getElementById('state-already').style.display = 'block';
        document.getElementById('already-message').textContent = message || 'คุณได้ลงเวลาออกงานแล้ววันนี้';
    },

    showError(message) {
        // Make the parent card visible
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) mainCard.style.display = 'block';
        
        this.hideProcessStatus();
        document.getElementById('state-error').style.display = 'block';
        document.getElementById('error-message').textContent = message || 'ไม่สามารถลงเวลาได้';
    },

    async retry() {
        // Hide all states
        document.getElementById('state-error').style.display = 'none';
        document.getElementById('state-not-checked').style.display = 'none';
        document.getElementById('state-already').style.display = 'none';
        document.getElementById('state-success').style.display = 'none';
        await this.performCheckOut();
    },

    startAutoClose() {
        let countdown = 5;
        const countdownEl = document.getElementById('close-countdown');
        
        const interval = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                closeLiff();
            }
        }, 1000);
    },

    /**
     * Show check-out confirmation dialog with today's attendance info
     * @returns {Promise<boolean>} - true if confirmed
     */
    async showCheckOutConfirmation() {
        // ✅ Task 1: Use pre-fetched data
        let checkInTime = '--:--';
        let workDuration = '';
        
        // Log for debugging
        if (typeof ClientLogger !== 'undefined') {
            ClientLogger.info('CHECKOUT_DEBUG', 'today-data', 'todayData', { 
                hasData: !!this.todayData,
                hasToday: !!(this.todayData && this.todayData.today),
                checkInTimeRaw: this.todayData?.today?.checkInTimeRaw || 'null'
            });
        }
        
        if (this.todayData && this.todayData.today) {
            checkInTime = this.todayData.today.checkInTime || checkInTime;
            
            if (this.todayData.today.checkInTimeRaw) {
                const checkIn = new Date(this.todayData.today.checkInTimeRaw);
                const now = new Date();
                const diffMs = now - checkIn;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                // Log calculation
                if (typeof ClientLogger !== 'undefined') {
                    ClientLogger.info('CHECKOUT_DEBUG', 'duration-calc', 'คำนวณเวลาทำงาน', {
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
                        ClientLogger.error('CHECKOUT_DEBUG', 'negative-duration', 'เวลาทำงานติดลบ (timezone issue)', {
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
    window.CheckOutView = CheckOutView;
}
