// ========================================
// Work Location Settings View - Admin only
// With Leaflet.js Map Integration
// ========================================

const WorkLocationView = {
    name: 'work-location',
    currentLocation: null,
    map: null,
    marker: null,
    radiusCircle: null,
    warningCircle: null,
    isGettingGPS: false,

    async render() {
        return `
            <div class="view-work-location">
                <!-- Header -->
                <div class="header admin-header">
                    <div class="header-title">📍 ตั้งค่าตำแหน่งร้าน</div>
                    <div class="header-subtitle">กำหนดพิกัดและระยะทางสำหรับลงเวลา</div>
                </div>
                
                <!-- Map Card -->
                <div class="card">
                    <div class="card-header">
                        <span>🗺️ แผนที่</span>
                        <span class="card-hint">คลิกบนแผนที่เพื่อเลือกตำแหน่ง</span>
                    </div>
                    <div class="card-body p-0">
                        <div id="location-map" style="height: 280px; width: 100%; border-radius: 0 0 12px 12px;"></div>
                    </div>
                </div>
                
                <!-- Current Location Card -->
                <div class="card">
                    <div class="card-header">
                        <span>📍 ตำแหน่งที่ตั้งปัจจุบัน</span>
                    </div>
                    <div class="card-body">
                        <div id="location-display">
                            <div class="location-loading">
                                <div class="loading-spinner"></div>
                                <div>กำลังโหลด...</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Edit Form -->
                <div class="card">
                    <div class="card-header">
                        <span>✏️ แก้ไขตำแหน่ง</span>
                    </div>
                    <div class="card-body">
                        <form id="location-form" onsubmit="WorkLocationView.handleSubmit(event)">
                            <!-- Name -->
                            <div class="form-group">
                                <label class="form-label">ชื่อสถานที่</label>
                                <input type="text" id="location-name" class="form-control" 
                                    placeholder="โปรดระบุชื่อตำแหน่งที่คุณต้องการ" maxlength="100">
                            </div>
                            
                            <!-- Get Current GPS Button -->
                            <button type="button" class="btn btn-success btn-block mb-2" 
                                onclick="WorkLocationView.getCurrentGPS()" id="btn-get-gps">
                                <span id="gps-btn-text">📍 ใช้ตำแหน่งปัจจุบันของฉัน</span>
                                <span id="gps-loading" style="display: none;">
                                    ⏳ กำลังระบุตำแหน่ง...
                                </span>
                            </button>
                            
                            <!-- Coordinates -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Latitude</label>
                                    <input type="number" id="location-lat" class="form-control" 
                                        step="0.00000001" min="-90" max="90" 
                                        placeholder="13.7563" required
                                        onchange="WorkLocationView.onCoordsChange()">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Longitude</label>
                                    <input type="number" id="location-lng" class="form-control" 
                                        step="0.00000001" min="-180" max="180"
                                        placeholder="100.5018" required
                                        onchange="WorkLocationView.onCoordsChange()">
                                </div>
                            </div>
                            
                            <!-- Radius Settings -->
                            <div class="form-section-title">⚙️ ตั้งค่าระยะทาง</div>
                            
                            <div class="form-group">
                                <label class="form-label">
                                    ระยะอนุญาต (เมตร)
                                    <span class="form-hint">✅ ลงเวลาได้ทันที</span>
                                </label>
                                <input type="number" id="allowed-radius" class="form-control" 
                                    min="10" max="1000" value="100" required
                                    onchange="WorkLocationView.updateRadiusPreview()">
                                <div class="form-text">แนะนำ: 50-200 เมตร</div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">
                                    ระยะเตือน (เมตร)
                                    <span class="form-hint">⚠️ รอ Admin อนุมัติ</span>
                                </label>
                                <input type="number" id="warning-radius" class="form-control" 
                                    min="50" max="5000" value="500" required
                                    onchange="WorkLocationView.updateRadiusPreview()">
                                <div class="form-text">แนะนำ: 300-1000 เมตร</div>
                            </div>
                            
                            <!-- Radius Explanation -->
                            <div class="radius-explanation">
                                <div class="radius-item allowed">
                                    <span class="radius-icon">✅</span>
                                    <span class="radius-text">0 - <span id="preview-allowed">100</span> ม. = ลงเวลาได้ทันที</span>
                                </div>
                                <div class="radius-item warning">
                                    <span class="radius-icon">⚠️</span>
                                    <span class="radius-text"><span id="preview-allowed2">100</span> - <span id="preview-warning">500</span> ม. = รอ Admin อนุมัติ</span>
                                </div>
                                <div class="radius-item rejected">
                                    <span class="radius-icon">❌</span>
                                    <span class="radius-text">มากกว่า <span id="preview-warning2">500</span> ม. = ไม่อนุญาต</span>
                                </div>
                            </div>
                            
                            <!-- Submit Button -->
                            <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-submit">
                                💾 บันทึกการตั้งค่า
                            </button>
                        </form>
                    </div>
                </div>
                
                <!-- Back Button -->
                <button class="btn btn-outline btn-block mt-2" onclick="router.navigate('settings')">
                    ← กลับหน้าตั้งค่า
                </button>
            </div>
        `;
    },

    async init() {
        try {
            // Initialize map first
            this.initMap();
            
            // Load current location settings
            await this.loadCurrentLocation();
            
        } catch (error) {
            console.error('Work Location init error:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    // ========================================
    // Map Functions
    // ========================================

    initMap() {
        // Default center: Bangkok
        const defaultLat = 13.7563;
        const defaultLng = 100.5018;
        
        // Create map
        this.map = L.map('location-map', {
            center: [defaultLat, defaultLng],
            zoom: 13,
            zoomControl: true,
            attributionControl: false
        });
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(this.map);
        
        // Add click handler to map
        this.map.on('click', (e) => {
            this.setMapLocation(e.latlng.lat, e.latlng.lng);
            document.getElementById('location-lat').value = e.latlng.lat.toFixed(8);
            document.getElementById('location-lng').value = e.latlng.lng.toFixed(8);
            showSuccess('เลือกตำแหน่งแล้ว');
        });
    },

    setMapLocation(lat, lng, showRadius = true) {
        if (!this.map) return;
        
        // Remove existing marker and circles
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }
        if (this.radiusCircle) {
            this.map.removeLayer(this.radiusCircle);
        }
        if (this.warningCircle) {
            this.map.removeLayer(this.warningCircle);
        }
        
        // Create custom red icon
        const redIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #e74c3c; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        // Add marker
        this.marker = L.marker([lat, lng], { icon: redIcon })
            .addTo(this.map)
            .bindPopup(`<b>📍 ตำแหน่งร้าน</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`)
            .openPopup();
        
        // Add radius circles if enabled
        if (showRadius) {
            const allowedRadius = parseInt(document.getElementById('allowed-radius')?.value) || 100;
            const warningRadius = parseInt(document.getElementById('warning-radius')?.value) || 500;
            
            // Warning radius (outer - yellow/orange)
            this.warningCircle = L.circle([lat, lng], {
                color: '#f39c12',
                fillColor: '#f39c12',
                fillOpacity: 0.1,
                radius: warningRadius,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(this.map);
            
            // Allowed radius (inner - green)
            this.radiusCircle = L.circle([lat, lng], {
                color: '#27ae60',
                fillColor: '#27ae60',
                fillOpacity: 0.2,
                radius: allowedRadius,
                weight: 2
            }).addTo(this.map);
        }
        
        // Center map on location
        this.map.setView([lat, lng], 16);
    },

    onCoordsChange() {
        const lat = parseFloat(document.getElementById('location-lat').value);
        const lng = parseFloat(document.getElementById('location-lng').value);
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            this.setMapLocation(lat, lng);
        }
    },

    updateRadiusPreview() {
        const allowed = document.getElementById('allowed-radius').value || 100;
        const warning = document.getElementById('warning-radius').value || 500;
        
        document.getElementById('preview-allowed').textContent = allowed;
        document.getElementById('preview-allowed2').textContent = allowed;
        document.getElementById('preview-warning').textContent = warning;
        document.getElementById('preview-warning2').textContent = warning;
        
        // Update circles on map if marker exists
        if (this.marker) {
            const lat = parseFloat(document.getElementById('location-lat').value);
            const lng = parseFloat(document.getElementById('location-lng').value);
            if (!isNaN(lat) && !isNaN(lng)) {
                this.setMapLocation(lat, lng);
            }
        }
    },

    // ========================================
    // Location Functions
    // ========================================

    async loadCurrentLocation() {
        try {
            const response = await AdminAPI.getWorkLocation();
            
            const displayEl = document.getElementById('location-display');
            
            if (response.data) {
                this.currentLocation = response.data;
                
                // Format date
                const updatedDate = new Date(response.data.updatedAt);
                const formattedDate = updatedDate.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                displayEl.innerHTML = `
                    <div class="location-info">
                        <div class="location-name">${response.data.name || 'ร้านหลัก'}</div>
                        <div class="location-coords">
                            <span>📍 ${response.data.latitude.toFixed(6)}, ${response.data.longitude.toFixed(6)}</span>
                        </div>
                        <div class="location-radius">
                            <span class="radius-badge allowed">✅ ${response.data.allowedRadius} ม.</span>
                            <span class="radius-badge warning">⚠️ ${response.data.warningRadius} ม.</span>
                        </div>
                        <div class="location-updated">
                            อัพเดทล่าสุด: ${formattedDate}
                        </div>
                    </div>
                `;
                
                // Fill form with current values
                document.getElementById('location-name').value = response.data.name || '';
                document.getElementById('location-lat').value = response.data.latitude;
                document.getElementById('location-lng').value = response.data.longitude;
                document.getElementById('allowed-radius').value = response.data.allowedRadius;
                document.getElementById('warning-radius').value = response.data.warningRadius;
                
                // Update preview
                this.updateRadiusPreview();
                
                // Show on map
                this.setMapLocation(response.data.latitude, response.data.longitude);
                
            } else {
                displayEl.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📍</div>
                        <div class="empty-text">ยังไม่มีการตั้งค่าตำแหน่ง</div>
                        <div class="empty-hint">กดปุ่ม "ใช้ตำแหน่งปัจจุบัน" หรือคลิกบนแผนที่</div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Load location error:', error);
            document.getElementById('location-display').innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">ไม่สามารถโหลดข้อมูลได้</div>
                </div>
            `;
        }
    },

    async getCurrentGPS() {
        const btn = document.getElementById('btn-get-gps');
        const btnText = document.getElementById('gps-btn-text');
        const loadingText = document.getElementById('gps-loading');
        
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            showError('เบราว์เซอร์ไม่รองรับ GPS');
            return;
        }
        
        try {
            this.isGettingGPS = true;
            btn.disabled = true;
            btnText.style.display = 'none';
            loadingText.style.display = 'inline';
            
            // Get position with high accuracy
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 0
                    }
                );
            });
            
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            // Update form fields
            document.getElementById('location-lat').value = lat.toFixed(8);
            document.getElementById('location-lng').value = lng.toFixed(8);
            
            // Update map
            this.setMapLocation(lat, lng);
            
            showSuccess(`ได้รับพิกัดแล้ว (ความแม่นยำ ${Math.round(accuracy)} เมตร)`);
            
        } catch (error) {
            console.error('GPS error:', error);
            
            let errorMessage = 'ไม่สามารถระบุตำแหน่งได้';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'กรุณาอนุญาตการเข้าถึง GPS ในการตั้งค่าเบราว์เซอร์';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'หมดเวลาในการระบุตำแหน่ง กรุณาลองใหม่';
                    break;
            }
            
            showError(errorMessage);
            
        } finally {
            this.isGettingGPS = false;
            btn.disabled = false;
            btnText.style.display = 'inline';
            loadingText.style.display = 'none';
        }
    },

    async handleSubmit(event) {
        event.preventDefault();
        
        const btn = document.getElementById('btn-submit');
        
        try {
            // Validate inputs
            const name = document.getElementById('location-name').value.trim();
            const latitude = parseFloat(document.getElementById('location-lat').value);
            const longitude = parseFloat(document.getElementById('location-lng').value);
            const allowedRadius = parseInt(document.getElementById('allowed-radius').value);
            const warningRadius = parseInt(document.getElementById('warning-radius').value);
            
            // Validation
            if (isNaN(latitude) || latitude < -90 || latitude > 90) {
                showError('ค่า Latitude ไม่ถูกต้อง');
                return;
            }
            
            if (isNaN(longitude) || longitude < -180 || longitude > 180) {
                showError('ค่า Longitude ไม่ถูกต้อง');
                return;
            }
            
            if (allowedRadius < 10 || allowedRadius > 1000) {
                showError('ระยะอนุญาตต้องอยู่ระหว่าง 10-1000 เมตร');
                return;
            }
            
            if (warningRadius <= allowedRadius) {
                showError('ระยะเตือนต้องมากกว่าระยะอนุญาต');
                return;
            }
            
            if (warningRadius > 5000) {
                showError('ระยะเตือนต้องไม่เกิน 5000 เมตร');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = 'กำลังบันทึก...';
            
            const response = await AdminAPI.updateWorkLocation({
                name: name || 'ร้านหลัก',
                latitude,
                longitude,
                allowedRadius,
                warningRadius
            });
            
            if (response.success) {
                showSuccess('บันทึกตำแหน่งร้านสำเร็จ');
                
                // Reload current location display (will also keep form values)
                await this.loadCurrentLocation();
            }
            
        } catch (error) {
            console.error('Save location error:', error);
            showError(error.message || 'ไม่สามารถบันทึกได้');
            
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 บันทึกการตั้งค่า';
        }
    },

    // Cleanup when leaving the view
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.marker = null;
        this.radiusCircle = null;
        this.warningCircle = null;
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.WorkLocationView = WorkLocationView;
}
