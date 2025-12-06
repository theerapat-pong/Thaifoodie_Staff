// ========================================
// Quick Check-in View - Fast check-in from Rich Menu
// ========================================

const CheckInView = {
    name: 'check-in',

    async render() {
        return `
            <div class="view-checkin quick-action-view">
                <div class="quick-action-card" id="main-card-container" style="display: none;">
                    <!-- Unified Smart Status Container - Hidden by default -->
                    <div class="attendance-process-status" id="checkin-process-status" style="display: none;">
                        <div class="process-icon" id="checkin-process-icon">📍</div>
                        <div class="process-spinner" aria-hidden="true"></div>
                        <div class="process-message" id="checkin-process-text">กำลังระบุตำแหน่ง...</div>
                    </div>
                    
                    <!-- Success State -->
                    <div id="state-success" style="display: none;">
                        <div class="result-success" id="result-success-box">
                            <div class="icon" id="success-icon">✓</div>
                            <div class="title" id="success-title">ลงเวลาเข้างานสำเร็จ!</div>
                            <div class="time" id="checkin-time">--:--</div>
                            <div class="location-badge success-badge" id="location-badge" style="display: none;">
                                📍 <span id="location-distance">-</span>
                            </div>
                            <div class="late-badge warning-badge" id="late-badge" style="display: none;">
                                ⚠️ มาสาย <span id="late-duration">-</span>
                            </div>
                            <div class="pending-badge warning-badge" id="pending-badge" style="display: none;">
                                ⏳ รอ Admin อนุมัติตำแหน่ง
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
                    
                    <!-- Already Checked In State -->
                    <div id="state-already" style="display: none;">
                        <div class="result-already">
                            <div class="icon">ℹ️</div>
                            <div class="title">ลงเวลาเข้างานแล้ว</div>
                            <div class="message" id="already-message">คุณได้ลงเวลาเข้างานแล้ววันนี้</div>
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
                            <div class="icon" id="error-icon">⚠️</div>
                            <div class="title" id="error-title">เกิดข้อผิดพลาด</div>
                            <div class="message" id="error-message">ไม่สามารถลงเวลาได้</div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-outline" onclick="CheckInView.retry()">
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
            // Perform check-in with GPS dialog
            await this.performCheckIn();
        } catch (error) {
            console.error('Check-in init error:', error);
            if (error.message !== 'ผู้ใช้ยกเลิก') {
                this.showError(error.message);
            }
        }
    },

    // Shop location (will be fetched from API)
    shopLocation: null,

    // Unified UI Helper Methods (copied from attendance.js)
    showProcessStatus(icon, message) {
        // Make the parent card visible first
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) mainCard.style.display = 'block';
        
        const container = document.getElementById('checkin-process-status');
        if (!container) {
            console.warn('[CheckIn] Process status container not found in DOM');
            return;
        }
        // ✅ Task 4: Explicitly force visibility
        container.style.display = 'flex';
        this.updateProcessStatus(icon, message);
    },

    updateProcessStatus(icon, message) {
        const iconEl = document.getElementById('checkin-process-icon');
        const textEl = document.getElementById('checkin-process-text');
        
        // ✅ Safety check: Return early if elements not found
        if (!iconEl || !textEl) {
            console.warn('[CheckIn] Process status elements not found in DOM');
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
        const container = document.getElementById('checkin-process-status');
        if (container) {
            container.style.display = 'none';
        }
    },

    async performCheckIn() {
        let processStatusVisible = false;
        try {
            // Log start
            if (typeof ClientLogger !== 'undefined') {
                ClientLogger.info('CHECK_IN', 'start', 'เริ่มกระบวนการเช็คอิน');
            }
            
            // Step 1: Get GPS with dialog (container stays HIDDEN during this)
            let locationData;
            try {
                locationData = await getCurrentPositionWithDialog({
                    showDialog: true,
                    showLoading: true
                });
            } catch (gpsError) {
                if (gpsError.message === 'ผู้ใช้ยกเลิก') {
                    // User cancelled - go back home
                    router.navigate('home');
                    return;
                }
                // Show error (no need to hide - it was never shown)
                this.showError(gpsError.message);
                return;
            }

            // Step 2: Show map popup for user to confirm location
            const confirmed = await this.showLocationConfirmPopup(locationData);
            
            if (!confirmed) {
                // User cancelled - go back home
                router.navigate('home');
                return;
            }
            
            // ✅ NOW show the status container (State B: Saving data)
            this.showProcessStatus('☁️', 'กำลังบันทึกข้อมูล...');
            processStatusVisible = true;
            
            if (typeof ClientLogger !== 'undefined') {
                ClientLogger.info('CHECK_IN', 'submitting', 'กำลังส่งข้อมูลเช็คอิน', locationData);
            }
            
            const response = await AttendanceAPI.checkIn(locationData);
            
            if (response.success) {
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
                
                this.hideProcessStatus();
                processStatusVisible = false;
                
                // Show success
                this.showSuccess(response.data);
            }
            
        } catch (error) {
            console.error('Check-in error:', error);
            
            if (processStatusVisible) {
                this.hideProcessStatus();
            }
            
            // Check error types
            if (error.message) {
                // GPS permission denied
                if (error.message.includes('GPS') || error.message.includes('ตำแหน่ง') || error.message.includes('geolocation')) {
                    this.showError(error.message);
                }
                // Location too far (Red zone)
                else if (error.message.includes('ไกล') || error.message.includes('นอกพื้นที่') || error.message.includes('ห่างจากร้าน')) {
                    this.showError(error.message);
                }
                // Already checked in or has pending request
                else if (error.message.includes('แล้ว') || error.message.includes('already') || error.message.includes('รออนุมัติ')) {
                    this.showAlreadyCheckedIn(error.message);
                } 
                else {
                    this.showError(error.message);
                }
            } else {
                this.showError('ไม่สามารถลงเวลาได้');
            }
        }
    },

    showSuccess(data) {
        // Make the parent card visible with fade-in animation
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) {
            mainCard.style.display = 'block';
            mainCard.classList.add('fade-in');
        }
        
        this.hideProcessStatus();
        const successState = document.getElementById('state-success');
        successState.style.display = 'block';
        successState.classList.add('fade-in');
        
        // Handle pending check-in (Yellow Zone)
        const isPending = data.location && data.location.isPending;
        
        if (isPending) {
            // Show requested time instead of check-in time
            document.getElementById('checkin-time').textContent = data.requestedTime || data.checkInTime;
            document.getElementById('success-icon').textContent = '⏳';
            document.getElementById('success-title').textContent = 'ส่งคำขอสำเร็จ';
            document.getElementById('pending-badge').style.display = 'inline-block';
            document.getElementById('result-success-box').classList.add('pending-state');
        } else {
            // Normal check-in (Green Zone)
            document.getElementById('checkin-time').textContent = data.checkInTime;
        }
        
        // Show location info
        if (data.location) {
            document.getElementById('location-badge').style.display = 'inline-block';
            document.getElementById('location-distance').textContent = data.location.distanceDisplay;
        }
        
        if (data.isLate && !isPending) {
            // Apply warning (red) style only for approved check-ins
            document.getElementById('result-success-box').classList.add('warning');
            document.getElementById('success-icon').textContent = '⚠️';
            document.getElementById('success-title').textContent = 'มาสาย!';
            document.getElementById('late-badge').style.display = 'inline-block';
            document.getElementById('late-duration').textContent = data.lateDisplay;
            document.getElementById('close-btn').classList.remove('btn-primary');
            document.getElementById('close-btn').classList.add('btn-danger');
        } else if (data.isLate && isPending) {
            // Show late info but keep pending style
            document.getElementById('late-badge').style.display = 'inline-block';
            document.getElementById('late-duration').textContent = data.lateDisplay;
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



    showAlreadyCheckedIn(message) {
        // Make the parent card visible with fade-in animation
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) {
            mainCard.style.display = 'block';
            mainCard.classList.add('fade-in');
        }
        
        this.hideProcessStatus();
        const alreadyState = document.getElementById('state-already');
        alreadyState.style.display = 'block';
        alreadyState.classList.add('fade-in');
        document.getElementById('already-message').textContent = message || 'คุณได้ลงเวลาเข้างานแล้ววันนี้';
    },

    showError(message) {
        // Make the parent card visible with fade-in animation
        const mainCard = document.getElementById('main-card-container');
        if (mainCard) {
            mainCard.style.display = 'block';
            mainCard.classList.add('fade-in');
        }
        
        this.hideProcessStatus();
        const errorState = document.getElementById('state-error');
        errorState.style.display = 'block';
        errorState.classList.add('fade-in');
        document.getElementById('error-icon').textContent = message && (message.includes('นอกพื้นที่') || message.includes('ไกล')) ? '🚫' : '⚠️';
        document.getElementById('error-title').textContent = message && (message.includes('นอกพื้นที่') || message.includes('ไกล')) ? 'อยู่นอกพื้นที่' : 'เกิดข้อผิดพลาด';
        document.getElementById('error-message').textContent = message || 'ไม่สามารถลงเวลาได้';
    },

    async retry() {
        // Hide all states
        document.getElementById('state-error').style.display = 'none';
        document.getElementById('state-already').style.display = 'none';
        document.getElementById('state-success').style.display = 'none';
        await this.performCheckIn();
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
     * Calculate distance between two coordinates using Haversine formula
     */
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
     * Show location confirmation popup with Leaflet map
     * @param {Object} locationData - { latitude, longitude, accuracy }
     * @returns {Promise<boolean>} - true if confirmed, false if cancelled
     */
    async showLocationConfirmPopup(locationData) {
        // Default shop location (will be updated from API if available)
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
            console.log('[CheckIn] Work location response:', data);
            if (data.success && data.data) {
                shopLat = parseFloat(data.data.latitude);
                shopLng = parseFloat(data.data.longitude);
                shopName = data.data.name || shopName;
                console.log('[CheckIn] Using shop location:', shopName, shopLat, shopLng);
            } else {
                console.warn('[CheckIn] No work location configured, using default');
            }
        } catch (e) {
            console.error('[CheckIn] Could not fetch shop location:', e);
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
        
        // Determine distance status
        const isNearby = distance <= 500; // Warning radius default
        const distanceStatusIcon = isNearby ? '✅' : '⚠️';
        const distanceStatusClass = isNearby ? 'distance-ok' : 'distance-warning';

        // Create unique map container ID
        const mapId = 'checkin-confirm-map-' + Date.now();

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
                // Initialize Leaflet map after popup opens
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
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.CheckInView = CheckInView;
}
