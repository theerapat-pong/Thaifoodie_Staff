// ========================================
// GPS Dialog Service
// Beautiful UX for GPS permission & location
// ========================================

const GPSDialog = {
    // SweetAlert2 theme configuration
    theme: {
        confirmButtonColor: '#00B900',  // LINE Green
        cancelButtonColor: '#6c757d',
        denyButtonColor: '#dc3545',
    },

    /**
     * Show GPS permission request dialog
     * @returns {Promise<boolean>} true if user allows, false if denies
     */
    async showPermissionRequest() {
        const result = await Swal.fire({
            title: '📍 ขออนุญาตเข้าถึงตำแหน่ง',
            html: `
                <div style="text-align: center; padding: 10px 0;">
                    <p style="margin-bottom: 15px; color: #333;">
                        ระบบต้องการเข้าถึงตำแหน่ง GPS เพื่อลงบันทึกเวลาเข้างานของคุณ
                    </p>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                        <div style="display: block; text-align: left; margin-bottom: 8px;">
                            <span style="font-size: 20px; margin-right: 10px;">🔒</span>
                            <span style="color: #666; font-size: 14px;">ตำแหน่งของคุณจะถูกบันทึก</span>
                        </div>
                        <div style="display: block; text-align: left;">
                            <span style="font-size: 20px; margin-right: 10px;">🏢</span>
                            <span style="color: #666; font-size: 14px;">ตรวจสอบว่าคุณอยู่ในพื้นที่ทำงาน</span>
                        </div>
                    </div>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: '✓ อนุญาต',
            cancelButtonText: '✕ ยกเลิก',
            confirmButtonColor: GPSDialog.theme.confirmButtonColor,
            cancelButtonColor: GPSDialog.theme.cancelButtonColor,
            reverseButtons: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'gps-dialog-popup',
                title: 'gps-dialog-title',
                confirmButton: 'gps-dialog-confirm',
                cancelButton: 'gps-dialog-cancel'
            }
        });

        return result.isConfirmed;
    },

    /**
     * Show GPS loading indicator
     */
    showLoading() {
        Swal.fire({
            title: '📍 กำลังระบุตำแหน่ง...',
            html: `
                <div style="padding: 20px 0;">
                    <div class="gps-loading-animation">
                        <div class="gps-pulse"></div>
                        <div class="gps-icon">📍</div>
                    </div>
                    <p style="color: #666; margin-top: 20px;">กรุณารอสักครู่</p>
                    <p style="color: #999; font-size: 12px;">หากมี popup ขึ้นมา กรุณากด "อนุญาต"</p>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    },

    /**
     * Show GPS success
     * @param {Object} coords - { latitude, longitude, accuracy }
     * @param {number} distance - Distance from workplace in meters
     */
    showSuccess(coords, distance = null) {
        let distanceText = '';
        if (distance !== null) {
            if (distance < 1000) {
                distanceText = `<p style="color: #28a745; font-weight: 500;">📍 ห่างจากร้าน ${Math.round(distance)} เมตร</p>`;
            } else {
                distanceText = `<p style="color: #dc3545; font-weight: 500;">📍 ห่างจากร้าน ${(distance/1000).toFixed(2)} กม.</p>`;
            }
        }

        return Swal.fire({
            title: '✓ ได้รับตำแหน่งแล้ว',
            html: `
                <div style="padding: 10px 0;">
                    ${distanceText}
                    <p style="color: #999; font-size: 12px; margin-top: 10px;">
                        ความแม่นยำ: ±${Math.round(coords.accuracy)} เมตร
                    </p>
                </div>
            `,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    },

    /**
     * Show GPS error with helpful instructions
     * @param {string} errorType - 'denied', 'unavailable', 'timeout', 'unknown'
     * @param {string} message - Error message
     */
    async showError(errorType, message = '') {
        let title, html, showRetry = true;

        switch (errorType) {
            case 'denied':
                title = '🚫 ไม่ได้รับอนุญาต GPS';
                html = `
                    <div style="text-align: left; padding: 10px 0;">
                        <p style="margin-bottom: 15px; color: #333;">
                            คุณไม่ได้อนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิดการอนุญาตตามขั้นตอนนี้:
                        </p>
                        <div style="background: #fff3cd; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                            <p style="font-weight: 600; color: #856404; margin-bottom: 10px;">📱 สำหรับ iPhone:</p>
                            <ol style="color: #666; font-size: 13px; margin: 0; padding-left: 20px;">
                                <li>ไปที่ Settings (ตั้งค่า)</li>
                                <li>เลือก LINE</li>
                                <li>เปิด Location (ตำแหน่งที่ตั้ง)</li>
                                <li>เลือก "While Using the App"</li>
                            </ol>
                        </div>
                        <div style="background: #d4edda; border-radius: 10px; padding: 15px;">
                            <p style="font-weight: 600; color: #155724; margin-bottom: 10px;">🤖 สำหรับ Android:</p>
                            <ol style="color: #666; font-size: 13px; margin: 0; padding-left: 20px;">
                                <li>ไปที่ Settings (ตั้งค่า)</li>
                                <li>เลือก Apps > LINE</li>
                                <li>เลือก Permissions > Location</li>
                                <li>เลือก "Allow"</li>
                            </ol>
                        </div>
                    </div>
                `;
                break;

            case 'unavailable':
                title = '📍 ไม่พบตำแหน่ง';
                html = `
                    <div style="text-align: left; padding: 10px 0;">
                        <p style="margin-bottom: 15px; color: #333;">
                            ไม่สามารถระบุตำแหน่งได้ กรุณาตรวจสอบ:
                        </p>
                        <div style="background: #f8f9fa; border-radius: 10px; padding: 15px;">
                            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                <span style="font-size: 18px; margin-right: 10px;">📡</span>
                                <span style="color: #666; font-size: 14px;">เปิด GPS/Location บนเครื่องแล้ว</span>
                            </div>
                            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                <span style="font-size: 18px; margin-right: 10px;">📶</span>
                                <span style="color: #666; font-size: 14px;">มีสัญญาณอินเทอร์เน็ต</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <span style="font-size: 18px; margin-right: 10px;">🏠</span>
                                <span style="color: #666; font-size: 14px;">ไม่ได้อยู่ในอาคารที่บล็อกสัญญาณ</span>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'timeout':
                title = '⏱️ หมดเวลา';
                html = `
                    <div style="padding: 10px 0;">
                        <p style="color: #333; margin-bottom: 15px;">
                            ใช้เวลานานเกินไปในการระบุตำแหน่ง
                        </p>
                        <div style="background: #e7f3ff; border-radius: 10px; padding: 15px;">
                            <p style="color: #0056b3; font-size: 14px; margin: 0;">
                                💡 ลองออกไปที่โล่งแจ้ง หรือรอสักครู่แล้วลองใหม่
                            </p>
                        </div>
                    </div>
                `;
                break;

            default:
                title = '❌ เกิดข้อผิดพลาด';
                html = `
                    <div style="padding: 10px 0;">
                        <p style="color: #333;">${message || 'ไม่สามารถระบุตำแหน่งได้'}</p>
                    </div>
                `;
        }

        const result = await Swal.fire({
            title,
            html,
            icon: 'error',
            showCancelButton: showRetry,
            confirmButtonText: showRetry ? '🔄 ลองใหม่' : 'ตกลง',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: GPSDialog.theme.confirmButtonColor,
            cancelButtonColor: GPSDialog.theme.cancelButtonColor,
            reverseButtons: true
        });

        return result.isConfirmed; // true = retry
    },

    /**
     * Show location too far warning
     * @param {number} distance - Distance in meters
     * @param {number} maxDistance - Maximum allowed distance
     */
    async showTooFar(distance, maxDistance) {
        const result = await Swal.fire({
            title: '🚫 อยู่นอกพื้นที่',
            html: `
                <div style="padding: 10px 0;">
                    <div style="background: #fff3cd; border-radius: 15px; padding: 20px; margin-bottom: 15px;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📍</div>
                        <p style="font-size: 24px; font-weight: 600; color: #856404; margin: 0;">
                            ${distance < 1000 ? Math.round(distance) + ' เมตร' : (distance/1000).toFixed(2) + ' กม.'}
                        </p>
                        <p style="color: #856404; font-size: 14px; margin-top: 5px;">
                            ห่างจากร้าน
                        </p>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        ต้องอยู่ภายในรัศมี ${maxDistance} เมตร จากร้านจึงจะลงเวลาได้
                    </p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '🔄 ลองใหม่',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: GPSDialog.theme.confirmButtonColor,
            cancelButtonColor: GPSDialog.theme.cancelButtonColor,
            reverseButtons: true
        });

        return result.isConfirmed;
    },

    /**
     * Close any open dialog
     */
    close() {
        Swal.close();
    }
};

// Add CSS for GPS dialog animations
const gpsDialogStyles = document.createElement('style');
gpsDialogStyles.textContent = `
    /* GPS Loading Animation */
    .gps-loading-animation {
        position: relative;
        width: 80px;
        height: 80px;
        margin: 0 auto;
    }

    .gps-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        background: rgba(0, 185, 0, 0.3);
        border-radius: 50%;
        animation: gpsPulse 1.5s ease-out infinite;
    }

    .gps-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
        animation: gpsIconBounce 1s ease-in-out infinite;
    }

    @keyframes gpsPulse {
        0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
        }
    }

    @keyframes gpsIconBounce {
        0%, 100% {
            transform: translate(-50%, -50%) translateY(0);
        }
        50% {
            transform: translate(-50%, -50%) translateY(-5px);
        }
    }

    /* SweetAlert2 Custom Styles */
    .gps-dialog-popup {
        border-radius: 20px !important;
        padding: 10px !important;
    }

    .gps-dialog-title {
        font-family: 'Sarabun', sans-serif !important;
        font-size: 1.3em !important;
    }

    .gps-dialog-confirm, .gps-dialog-cancel {
        font-family: 'Sarabun', sans-serif !important;
        font-size: 16px !important;
        padding: 12px 30px !important;
        border-radius: 25px !important;
    }

    /* Responsive */
    @media (max-width: 480px) {
        .gps-dialog-popup {
            margin: 10px !important;
            width: calc(100% - 20px) !important;
        }
        
        .gps-dialog-confirm, .gps-dialog-cancel {
            padding: 10px 20px !important;
        }
    }
`;
document.head.appendChild(gpsDialogStyles);

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GPSDialog;
}
