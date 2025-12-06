// ========================================
// Employee Management View
// Admin only - สำหรับจัดการพนักงาน
// ========================================

const EmployeesView = {
    name: 'employees',
    employees: [],
    editTarget: null,
    qrScanner: null,

    async render() {
        return `
            <div class="view-employees">
                <!-- Header -->
                <div class="header admin-header">
                    <div class="header-title">👥 จัดการพนักงาน</div>
                    <div class="header-subtitle">เพิ่ม แก้ไข และดูรายชื่อพนักงาน</div>
                </div>
                
                <!-- Stats -->
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-value" id="total-employees">0</div>
                        <div class="stat-label">พนักงานทั้งหมด</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="active-employees">0</div>
                        <div class="stat-label">ใช้งานอยู่</div>
                    </div>
                </div>
                
                <!-- Add Employee Button -->
                <button class="btn btn-primary btn-block mb-2" onclick="EmployeesView.showAddModal()">
                    ➕ เพิ่มพนักงานใหม่
                </button>
                
                <!-- Employee List -->
                <div class="section-title">รายชื่อพนักงาน</div>
                <div id="employee-list">
                    <div class="empty-state" id="employee-empty">
                        <div class="empty-icon">👥</div>
                        <div class="empty-title">ไม่มีพนักงานในระบบ</div>
                    </div>
                </div>
                
                <!-- Back to Settings -->
                <button class="btn btn-outline btn-block mt-2" onclick="router.navigate('settings')">
                    ← กลับหน้าตั้งค่า
                </button>
                
                <!-- Add/Edit Employee Modal -->
                <div class="confirm-modal" id="employee-modal">
                    <div class="confirm-content employee-form-modal">
                        <div class="confirm-title" id="modal-title">➕ เพิ่มพนักงานใหม่</div>
                        
                        <!-- QR Scanner Section -->
                        <div id="qr-section" class="qr-section">
                            <div class="form-label">LINE User ID</div>
                            <div id="qr-scanner-container" class="qr-scanner-container" style="display: none;">
                                <video id="qr-video" playsinline></video>
                                <div class="qr-overlay">
                                    <div class="qr-frame"></div>
                                </div>
                            </div>
                            <div class="qr-buttons">
                                <button type="button" class="btn btn-outline btn-sm" id="btn-scan-qr" onclick="EmployeesView.toggleQRScanner()">
                                    📷 สแกน QR Code
                                </button>
                                <button type="button" class="btn btn-outline btn-sm" onclick="EmployeesView.showManualInput()">
                                    ⌨️ พิมพ์เอง
                                </button>
                            </div>
                            <div class="form-group" id="manual-id-group" style="display: none;">
                                <input type="text" id="employee-id" class="form-control" placeholder="U1234567890abcdef...">
                                <div class="form-hint">LINE User ID จะขึ้นต้นด้วย U และมีความยาว 33 ตัวอักษร</div>
                            </div>
                            <div class="scanned-result" id="scanned-result" style="display: none;">
                                <div class="scanned-label">✅ สแกนสำเร็จ</div>
                                <div class="scanned-id" id="scanned-id">-</div>
                            </div>
                        </div>
                        
                        <!-- Employee Info Form -->
                        <form id="employee-form" onsubmit="return false;">
                            <div class="form-group">
                                <label class="form-label">ชื่อพนักงาน *</label>
                                <input type="text" id="employee-name" class="form-control" placeholder="ชื่อ - นามสกุล" required>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group half">
                                    <label class="form-label">ค่าจ้าง/วัน *</label>
                                    <input type="number" id="employee-salary" class="form-control" placeholder="ใส่จำนวนเงิน" min="1" required>
                                </div>
                                <div class="form-group half">
                                    <label class="form-label">แผนก *</label>
                                    <input type="text" id="employee-department" class="form-control" placeholder="ตำแหน่งงาน" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group half">
                                    <label class="form-label">เวลาเข้างาน</label>
                                    <input type="time" id="employee-shift-start" class="form-control" value="00:00" required>
                                </div>
                                <div class="form-group half">
                                    <label class="form-label">เวลาออกงาน</label>
                                    <input type="time" id="employee-shift-end" class="form-control" value="00:00" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">บทบาท</label>
                                <select id="employee-role" class="form-control">
                                    <option value="STAFF">พนักงาน (Staff)</option>
                                    <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                                </select>
                            </div>
                            
                            <div class="form-group" id="active-group" style="display: none;">
                                <label class="form-label">สถานะ</label>
                                <select id="employee-active" class="form-control">
                                    <option value="true">ใช้งานอยู่</option>
                                    <option value="false">ปิดการใช้งาน</option>
                                </select>
                            </div>
                        </form>
                        
                        <div class="confirm-buttons">
                            <button class="btn btn-outline" onclick="EmployeesView.hideModal()">
                                ยกเลิก
                            </button>
                            <button class="btn btn-primary" id="btn-save-employee" onclick="EmployeesView.saveEmployee()">
                                💾 บันทึก
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Delete Confirm Modal -->
                <div class="confirm-modal" id="delete-modal">
                    <div class="confirm-content danger">
                        <div class="confirm-icon">⚠️</div>
                        <div class="confirm-title">ยืนยันการลบพนักงาน?</div>
                        <div class="confirm-message" id="delete-message">-</div>
                        
                        <div class="confirm-buttons">
                            <button class="btn btn-outline" onclick="EmployeesView.hideDeleteModal()">
                                ยกเลิก
                            </button>
                            <button class="btn btn-danger" onclick="EmployeesView.confirmDelete()">
                                🗑️ ลบ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        try {
            await this.loadEmployees();
        } catch (error) {
            console.error('Employees init error:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    destroy() {
        // Stop QR scanner when leaving view
        this.stopQRScanner();
    },

    async loadEmployees() {
        try {
            showLoading('กำลังโหลดรายชื่อพนักงาน...');
            
            const response = await AdminAPI.getEmployees();
            
            if (response.success && response.data) {
                this.employees = response.data.employees || [];
                
                // Update stats
                const total = this.employees.length;
                const active = this.employees.filter(e => e.isActive).length;
                
                document.getElementById('total-employees').textContent = total;
                document.getElementById('active-employees').textContent = active;
                
                this.renderList();
            }
            
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Load employees error:', error);
            showError(error.message || 'ไม่สามารถโหลดข้อมูลได้');
        }
    },

    renderList() {
        const list = document.getElementById('employee-list');
        const empty = document.getElementById('employee-empty');
        
        // Clear existing cards
        list.querySelectorAll('.employee-card').forEach(el => el.remove());
        
        if (this.employees.length > 0) {
            empty.style.display = 'none';
            
            this.employees.forEach(emp => {
                const card = document.createElement('div');
                card.className = `employee-card ${emp.isActive ? '' : 'inactive'}`;
                card.innerHTML = `
                    <div class="employee-info">
                        <div class="employee-name">
                            ${emp.name}
                            ${['ADMIN', 'DEV'].includes(emp.role)
                                ? `<span class="role-badge admin">${emp.role === 'DEV' ? 'Dev' : 'Admin'}</span>`
                                : ''}
                            ${!emp.isActive ? '<span class="status-badge inactive">ปิดใช้งาน</span>' : ''}
                        </div>
                        <div class="employee-details">
                            <span>💵 ${formatCurrency(emp.dailySalary)}/วัน</span>
                            <span>🏢 ${emp.department}</span>
                            <span>⏰ ${emp.shiftStart}-${emp.shiftEnd}</span>
                        </div>
                        <div class="employee-id">ID: ${emp.idShort}</div>
                    </div>
                    <div class="employee-actions">
                        <button class="btn-icon" onclick="EmployeesView.showEditModal('${emp.id}')" title="แก้ไข">
                            ✏️
                        </button>
                        <button class="btn-icon danger" onclick="EmployeesView.showDeleteModal('${emp.id}', '${emp.name}')" title="ลบ">
                            🗑️
                        </button>
                    </div>
                `;
                list.appendChild(card);
            });
        } else {
            empty.style.display = 'block';
        }
    },

    // ========================================
    // Add/Edit Modal
    // ========================================

    showAddModal() {
        this.editTarget = null;
        
        // Reset form
        document.getElementById('modal-title').textContent = '➕ เพิ่มพนักงานใหม่';
        document.getElementById('employee-id').value = '';
        document.getElementById('employee-name').value = '';
        document.getElementById('employee-salary').value = '';
        document.getElementById('employee-department').value = '';
        document.getElementById('employee-shift-start').value = '00:00';
        document.getElementById('employee-shift-end').value = '00:00';
        document.getElementById('employee-role').value = 'STAFF';
        
        // Show QR section for new employee
        document.getElementById('qr-section').style.display = 'block';
        document.getElementById('active-group').style.display = 'none';
        document.getElementById('scanned-result').style.display = 'none';
        document.getElementById('manual-id-group').style.display = 'none';
        
        document.getElementById('employee-modal').classList.add('show');
    },

    showEditModal(employeeId) {
        const emp = this.employees.find(e => e.id === employeeId);
        if (!emp) return;
        
        this.editTarget = emp;
        
        // Fill form with employee data
        document.getElementById('modal-title').textContent = '✏️ แก้ไขข้อมูลพนักงาน';
        document.getElementById('employee-name').value = emp.name;
        document.getElementById('employee-salary').value = emp.dailySalary;
        document.getElementById('employee-department').value = emp.department === '-' ? '' : emp.department;
        document.getElementById('employee-shift-start').value = emp.shiftStart;
        document.getElementById('employee-shift-end').value = emp.shiftEnd;
        document.getElementById('employee-role').value = emp.role;
        document.getElementById('employee-active').value = emp.isActive ? 'true' : 'false';
        
        // Hide QR section for edit (can't change ID)
        document.getElementById('qr-section').style.display = 'none';
        document.getElementById('active-group').style.display = 'block';
        
        document.getElementById('employee-modal').classList.add('show');
    },

    hideModal() {
        document.getElementById('employee-modal').classList.remove('show');
        this.stopQRScanner();
        this.editTarget = null;
    },

    // ========================================
    // QR Code Scanner
    // ========================================

    async toggleQRScanner() {
        const container = document.getElementById('qr-scanner-container');
        const btn = document.getElementById('btn-scan-qr');
        
        if (container.style.display === 'none') {
            // Start scanner
            container.style.display = 'block';
            btn.textContent = '⏹️ หยุดสแกน';
            await this.startQRScanner();
        } else {
            // Stop scanner
            container.style.display = 'none';
            btn.textContent = '📷 สแกน QR Code';
            this.stopQRScanner();
        }
    },

    async startQRScanner() {
        try {
            // Check if LIFF scanCodeV2 is available (best option in LINE)
            if (liff.isInClient() && liff.scanCodeV2) {
                try {
                    const result = await liff.scanCodeV2();
                    if (result && result.value) {
                        this.onQRCodeScanned(result.value);
                        return;
                    }
                } catch (e) {
                    console.log('[QR] LIFF scanCodeV2 not available, falling back to camera');
                }
            }
            
            // Fallback: Use camera directly
            const video = document.getElementById('qr-video');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            video.srcObject = stream;
            await video.play();
            
            // Start scanning loop
            this.scanQRCode();
            
        } catch (error) {
            console.error('[QR] Scanner error:', error);
            showError('ไม่สามารถเปิดกล้องได้ กรุณาพิมพ์ ID เอง');
            this.showManualInput();
        }
    },

    scanQRCode() {
        const video = document.getElementById('qr-video');
        
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(() => this.scanQRCode());
            return;
        }
        
        // Create canvas for scanning
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        // Try to decode QR code using jsQR library if available
        if (typeof jsQR !== 'undefined') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height);
            
            if (code && code.data) {
                this.onQRCodeScanned(code.data);
                return;
            }
        }
        
        // Continue scanning
        if (document.getElementById('qr-scanner-container').style.display !== 'none') {
            requestAnimationFrame(() => this.scanQRCode());
        }
    },

    onQRCodeScanned(data) {
        console.log('[QR] Scanned:', data);
        
        // Validate LINE User ID format
        if (data.startsWith('U') && data.length >= 30) {
            // Valid LINE User ID
            document.getElementById('employee-id').value = data;
            document.getElementById('scanned-id').textContent = data.substring(0, 16) + '...';
            document.getElementById('scanned-result').style.display = 'block';
            document.getElementById('manual-id-group').style.display = 'none';
            
            this.stopQRScanner();
            document.getElementById('qr-scanner-container').style.display = 'none';
            document.getElementById('btn-scan-qr').textContent = '📷 สแกน QR Code';
            
            showSuccess('สแกน QR Code สำเร็จ!');
        } else {
            showError('QR Code ไม่ถูกต้อง กรุณาใช้ QR Code จากคำสั่ง "id"');
        }
    },

    stopQRScanner() {
        const video = document.getElementById('qr-video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    },

    showManualInput() {
        document.getElementById('manual-id-group').style.display = 'block';
        document.getElementById('scanned-result').style.display = 'none';
        this.stopQRScanner();
        document.getElementById('qr-scanner-container').style.display = 'none';
        document.getElementById('btn-scan-qr').textContent = '📷 สแกน QR Code';
    },

    // ========================================
    // Save Employee
    // ========================================

    async saveEmployee() {
        const name = document.getElementById('employee-name').value.trim();
        const salary = document.getElementById('employee-salary').value;
        const department = document.getElementById('employee-department').value.trim();
        const shiftStart = document.getElementById('employee-shift-start').value;
        const shiftEnd = document.getElementById('employee-shift-end').value;
        const role = document.getElementById('employee-role').value;
        
        // Validate
        if (!name) {
            showError('กรุณาระบุชื่อพนักงาน');
            return;
        }
        
        if (!salary || salary <= 0) {
            showError('กรุณาระบุรายไดต่อวัน');
            return;
        }

        try {
            const btn = document.getElementById('btn-save-employee');
            btn.disabled = true;
            btn.textContent = 'กำลังบันทึก...';
            
            let response;
            
            if (this.editTarget) {
                // Update existing employee
                const isActive = document.getElementById('employee-active').value === 'true';
                
                response = await AdminAPI.updateEmployee({
                    id: this.editTarget.id,
                    name,
                    dailySalary: parseFloat(salary),
                    department,
                    shiftStart,
                    shiftEnd,
                    role,
                    isActive
                });
            } else {
                // Create new employee
                const employeeId = document.getElementById('employee-id').value.trim();
                
                if (!employeeId) {
                    showError('กรุณาสแกน QR Code หรือพิมพ์ LINE User ID');
                    btn.disabled = false;
                    btn.textContent = '💾 บันทึก';
                    return;
                }
                
                response = await AdminAPI.createEmployee({
                    id: employeeId,
                    name,
                    dailySalary: parseFloat(salary),
                    department,
                    shiftStart,
                    shiftEnd,
                    role
                });
            }
            
            if (response.success) {
                showSuccess(response.message || 'บันทึกสำเร็จ');
                this.hideModal();
                await this.loadEmployees();
            }
            
            btn.disabled = false;
            btn.textContent = '💾 บันทึก';
            
        } catch (error) {
            console.error('Save employee error:', error);
            showError(error.message || 'ไม่สามารถบันทึกได้');
            
            const btn = document.getElementById('btn-save-employee');
            btn.disabled = false;
            btn.textContent = '💾 บันทึก';
        }
    },

    // ========================================
    // Delete Employee
    // ========================================

    showDeleteModal(employeeId, employeeName) {
        this.deleteTarget = { id: employeeId, name: employeeName };
        
        document.getElementById('delete-message').textContent = 
            `คุณต้องการลบพนักงาน "${employeeName}" ออกจากระบบหรือไม่?`;
        
        document.getElementById('delete-modal').classList.add('show');
    },

    hideDeleteModal() {
        document.getElementById('delete-modal').classList.remove('show');
        this.deleteTarget = null;
    },

    async confirmDelete() {
        if (!this.deleteTarget) return;
        
        try {
            const response = await AdminAPI.deleteEmployee(this.deleteTarget.id);
            
            if (response.success) {
                showSuccess(response.message || 'ลบพนักงานสำเร็จ');
                this.hideDeleteModal();
                await this.loadEmployees();
            }
            
        } catch (error) {
            console.error('Delete employee error:', error);
            showError(error.message || 'ไม่สามารถลบได้');
        }
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.EmployeesView = EmployeesView;
}
