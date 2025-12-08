// ========================================
// Settings View - Admin Settings
// ========================================

const SettingsView = {
    name: 'settings',

    async render() {
        const isDev = window?.employeeData?.role === 'DEV';

        return `
            <div class="view-settings">
                <!-- Header -->
                <div class="header admin-header">
                    <div class="header-title">⚙️ ตั้งค่าระบบ</div>
                    <div class="header-subtitle">จัดการพนักงานและการตั้งค่า</div>
                </div>
                
                <!-- Settings Menu -->
                <div class="settings-menu">
                    <!-- Employee Management -->
                    <div class="admin-link-card" onclick="router.navigate('employees')">
                        <div class="admin-link-icon">👥</div>
                        <div class="admin-link-info">
                            <div class="admin-link-title">จัดการพนักงาน</div>
                            <div class="admin-link-desc">เพิ่ม แก้ไข ดูรายชื่อพนักงาน</div>
                        </div>
                        <div class="admin-link-arrow">→</div>
                    </div>
                    
                    <!-- Work Location Settings -->
                    <div class="admin-link-card" onclick="router.navigate('work-location')">
                        <div class="admin-link-icon">📍</div>
                        <div class="admin-link-info">
                            <div class="admin-link-title">ตั้งค่าตำแหน่งร้าน</div>
                            <div class="admin-link-desc">กำหนดพิกัด GPS และระยะทางลงเวลา</div>
                        </div>
                        <div class="admin-link-arrow">→</div>
                    </div>
                </div>
                
                ${isDev ? `
                <!-- Danger Zone -->
                <div class="danger-zone mt-2">
                    <div class="danger-zone-info">
                        <div class="danger-zone-title">⚠️ คำเตือน </div>
                        <p class="danger-zone-desc">  โปรดใช้งานฟังชั่นนี้ด้วยความระมัดระวัง</p>
                    </div>
                    <div class="danger-zone-action">
                        <button class="btn btn-danger-outline" onclick="SettingsView.showResetModal()">
                            🗑️ ล้างข้อมูลระบบ
                        </button>
                    </div>
                </div>
                ` : ''}
                
                <!-- Back to Menu -->
                <button class="btn btn-outline btn-block mt-2" onclick="router.navigate('home')">
                    ← กลับหน้าหลัก
                </button>
                
                <!-- Reset System Modal -->
                <div class="confirm-modal" id="reset-modal">
                    <div class="confirm-content danger">
                        <div class="confirm-icon">⚠️</div>
                        <div class="confirm-title">เลือกข้อมูลที่ต้องการล้าง</div>
                        <div class="confirm-message">
                            <p>ข้อมูลพนักงานและตำแหน่งร้านจะไม่ถูกลบ</p>
                            <div class="reset-options-panel">
                                <div class="reset-options">
                                    <label class="reset-option">
                                        <input type="checkbox" name="resetTarget" value="attendance" class="reset-checkbox">
                                        <div>
                                            <div class="option-title">ประวัติการลงเวลา</div>
                                            <div class="option-desc">ลบข้อมูลขาเข้า/ออกทั้งหมด</div>
                                        </div>
                                    </label>
                                    <label class="reset-option">
                                        <input type="checkbox" name="resetTarget" value="leaves" class="reset-checkbox">
                                        <div>
                                            <div class="option-title">ประวัติการลา</div>
                                            <div class="option-desc">ลบคำขอลางานทุกประเภท</div>
                                        </div>
                                    </label>
                                    <label class="reset-option">
                                        <input type="checkbox" name="resetTarget" value="advances" class="reset-checkbox">
                                        <div>
                                            <div class="option-title">ประวัติการเบิกเงิน</div>
                                            <div class="option-desc">ลบคำขอเบิกเงินทั้งหมด</div>
                                        </div>
                                    </label>
                                    <label class="reset-option">
                                        <input type="checkbox" name="resetTarget" value="logs" class="reset-checkbox">
                                        <div>
                                            <div class="option-title">System Logs</div>
                                            <div class="option-desc">ลบข้อมูล Log ทั้งหมด</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <p style="color: var(--danger); margin-top: 12px;"><strong>⚠️ การล้างข้อมูลจะไม่สามารถกู้คืนได้</strong></p>
                        </div>
                        
                        <div class="confirm-buttons">
                            <button class="btn btn-outline" onclick="SettingsView.hideResetModal()">
                                ยกเลิก
                            </button>
                            <button class="btn btn-danger" id="btn-confirm-reset" onclick="SettingsView.confirmReset()">
                                ยืนยันการล้างข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        // No initialization needed for settings page
    },

    // ========================================
    // Reset System Functions
    // ========================================
    
    showResetModal() {
        const modal = document.getElementById('reset-modal');
        document.querySelectorAll('input[name="resetTarget"]').forEach(cb => cb.checked = false);
        document.body.classList.add('modal-open');
        modal.classList.add('show');
    },

    hideResetModal() {
        const modal = document.getElementById('reset-modal');
        document.body.classList.remove('modal-open');
        modal.classList.remove('show');
    },

    async confirmReset() {
        const selectedTargets = Array.from(document.querySelectorAll('input[name="resetTarget"]:checked'))
            .map(cb => cb.value);

        if (selectedTargets.length === 0) {
            showError('กรุณาเลือกข้อมูลที่ต้องการล้างอย่างน้อย 1 รายการ');
            return;
        }

        try {
            const btn = document.getElementById('btn-confirm-reset');
            btn.disabled = true;
            btn.textContent = 'กำลังล้าง...';

            const response = await apiPost('/admin/reset', { targets: selectedTargets });
            
            if (response.success) {
                showSuccess(response.message || 'ล้างข้อมูลสำเร็จ');
                this.hideResetModal();
            }

            btn.disabled = false;
            btn.textContent = 'ยืนยันการล้างข้อมูล';

        } catch (error) {
            console.error('Reset error:', error);
            showError(error.message || 'ไม่สามารถล้างข้อมูลได้');

            const btn = document.getElementById('btn-confirm-reset');
            btn.disabled = false;
            btn.textContent = 'ยืนยันการล้างข้อมูล';
        }
    }
};

// Register globally for vanilla runtime
if (typeof window !== 'undefined') {
    window.SettingsView = SettingsView;
}
