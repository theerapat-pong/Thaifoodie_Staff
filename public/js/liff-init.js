// ========================================
// LIFF SDK Initialization
// Requires LINE Login - External browsers blocked
// ========================================

// LIFF ID จาก LINE Developers Console
const LIFF_ID = '2008633012-xKvPGV8v';

// LINE Official Account ID (สำหรับแสดงลิงก์เปิด LINE)
const LINE_OA_ID = '@482pycvx'; // เปลี่ยนเป็น LINE OA ID ของคุณ

// Security Settings
const REQUIRE_LINE_CLIENT = true; // บังคับเปิดใน LINE App เท่านั้น
const ALLOW_EXTERNAL_LOGIN = false; // ❌ ปิดไม่อนุญาต Login จาก External Browser (เหมือน K-PLUS)

// Global state
window.liffState = {
    isInitialized: false,
    isLoggedIn: false,
    userId: null,
    accessToken: null,
    profile: null,
    isInClient: false,
    error: null
};

/**
 * Initialize LIFF SDK
 * @returns {Promise<boolean>} - true ถ้า initialize สำเร็จ
 */
async function initializeLiff() {
    try {
        showLoading('กำลังเชื่อมต่อกับ LINE...');

        // Initialize LIFF
        await liff.init({ liffId: LIFF_ID });
        window.liffState.isInitialized = true;
        window.liffState.isInClient = liff.isInClient();

        console.log('[LIFF] Initialized successfully');
        console.log('[LIFF] Is in LINE client:', liff.isInClient());
        console.log('[LIFF] OS:', liff.getOS());

        // ========================================
        // 🔒 Security Check: LINE Internal Browser Only
        // บังคับให้เปิดจาก LINE App เท่านั้น (เหมือน K-PLUS)
        // ========================================
        if (REQUIRE_LINE_CLIENT && !liff.isInClient()) {
            console.log('[LIFF] ⛔ External browser detected - BLOCKING ACCESS');
            
            // Block ทุกกรณีที่ไม่ได้เปิดจาก LINE (ไม่ว่าจะ Login แล้วหรือไม่)
            if (!ALLOW_EXTERNAL_LOGIN) {
                hideLoading();
                showBlockedMessage();
                return false;
            }
            
            // ถ้าอนุญาต External Login (ปัจจุบันปิดอยู่)
            if (!liff.isLoggedIn()) {
                console.log('[LIFF] External browser detected, redirecting to LINE login...');
                liff.login();
                return false;
            }
        }

        // Check login status
        if (!liff.isLoggedIn()) {
            console.log('[LIFF] User not logged in, redirecting to login...');
            liff.login();
            return false;
        }

        window.liffState.isLoggedIn = true;

        // Get access token
        const accessToken = liff.getAccessToken();
        if (!accessToken) {
            throw new Error('ไม่สามารถรับ Access Token ได้');
        }
        window.liffState.accessToken = accessToken;

        // Get user profile
        const profile = await liff.getProfile();
        window.liffState.profile = profile;
        window.liffState.userId = profile.userId;

        // Set global variables for easy access
        window.userId = profile.userId;
        window.accessToken = accessToken;
        window.userName = profile.displayName;
        window.userPicture = profile.pictureUrl;

        console.log('[LIFF] User profile loaded:', profile.displayName);

        // ========================================
        // 🔒 EMPLOYEE VERIFICATION - Block non-employees
        // ========================================
        showLoading('กำลังตรวจสอบสิทธิ์...');
        
        const verifyResult = await verifyEmployeeAccess(accessToken);
        
        if (!verifyResult.success) {
            console.log('[LIFF] ⛔ User is not an employee - BLOCKING ACCESS');
            hideLoading();
            showNotEmployeeMessage(profile, verifyResult.error);
            return false;
        }

        // Store employee data for use in views
        window.liffState.employee = verifyResult.employee;
        window.employeeData = verifyResult.employee;
        
        console.log('[LIFF] ✅ Employee verified:', verifyResult.employee.name);

        hideLoading();
        return true;

    } catch (error) {
        console.error('[LIFF] Initialization error:', error);
        window.liffState.error = error.message;
        hideLoading();
        showError('ไม่สามารถเชื่อมต่อกับ LINE ได้: ' + error.message);
        return false;
    }
}

/**
 * Verify if user is a registered employee
 * @param {string} accessToken - LIFF Access Token
 * @returns {Promise<Object>} - { success, employee, error }
 */
async function verifyEmployeeAccess(accessToken) {
    try {
        // เพิ่ม timeout เพื่อป้องกันค้าง
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/liff/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok || !data.success) {
            return {
                success: false,
                error: data.error || 'ไม่สามารถตรวจสอบสิทธิ์ได้'
            };
        }

        return {
            success: true,
            employee: data.user
        };

    } catch (error) {
        console.error('[LIFF] Verify employee error:', error);
        
        // Handle timeout error
        if (error.name === 'AbortError') {
            return {
                success: false,
                error: 'หมดเวลาในการเชื่อมต่อ กรุณาลองใหม่'
            };
        }
        
        return {
            success: false,
            error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'
        };
    }
}

/**
 * Show blocked message for non-employees
 * แสดงหน้า block สำหรับผู้ที่ไม่ใช่พนักงาน
 */
function showNotEmployeeMessage(profile, errorMessage) {
    document.documentElement.innerHTML = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>ไม่มีสิทธิ์เข้าใช้งาน | Thaifoodie</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body {
                    height: 100%;
                    font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                .blocked-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%);
                    color: white;
                    text-align: center;
                    padding: 24px;
                }
                .blocked-icon {
                    width: 120px;
                    height: 120px;
                    background: rgba(255,255,255,0.15);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 24px;
                }
                .blocked-icon svg {
                    width: 60px;
                    height: 60px;
                    fill: white;
                }
                .user-avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    border: 3px solid rgba(255,255,255,0.5);
                    margin-bottom: 16px;
                }
                .user-name {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    opacity: 0.9;
                }
                .blocked-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 12px;
                }
                .blocked-message {
                    font-size: 16px;
                    opacity: 0.9;
                    max-width: 300px;
                    line-height: 1.7;
                    margin-bottom: 32px;
                }
                .error-detail {
                    background: rgba(0,0,0,0.15);
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    margin-bottom: 24px;
                    max-width: 300px;
                }
                .contact-info {
                    background: rgba(255,255,255,0.15);
                    padding: 20px;
                    border-radius: 16px;
                    max-width: 300px;
                }
                .contact-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 12px;
                }
                .contact-text {
                    font-size: 14px;
                    opacity: 0.9;
                    line-height: 1.6;
                }
                .close-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 14px 28px;
                    background: white;
                    color: #EE5A5A;
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 16px;
                    text-decoration: none;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    margin-top: 24px;
                }
                .blocked-footer {
                    margin-top: 40px;
                    font-size: 12px;
                    opacity: 0.6;
                }
            </style>
        </head>
        <body>
            <div class="blocked-container">
                ${profile.pictureUrl ? `<img class="user-avatar" src="${profile.pictureUrl}" alt="Profile">` : ''}
                <div class="user-name">${profile.displayName || 'ผู้ใช้งาน'}</div>
                
                <div class="blocked-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                
                <h1 class="blocked-title">ไม่มีสิทธิ์เข้าใช้งาน</h1>
                
                <p class="blocked-message">
                    บัญชี LINE ของคุณยังไม่ได้ลงทะเบียน<br>เป็นพนักงานในระบบ
                </p>
                
                <div class="error-detail">
                    ${errorMessage || 'กรุณาติดต่อผู้ดูแลระบบเพื่อลงทะเบียน'}
                </div>
                
                <div class="contact-info">
                    <div class="contact-title">📞 ติดต่อผู้ดูแลระบบ</div>
                    <div class="contact-text">
                        หากคุณเป็นพนักงาน กรุณาแจ้งผู้ดูแลระบบ<br>
                        เพื่อเพิ่มบัญชีของคุณเข้าสู่ระบบ
                    </div>
                </div>
                
                <button class="close-button" onclick="liff.closeWindow()">
                    ✕ ปิดหน้าต่าง
                </button>
                
                <div class="blocked-footer">
                    <div>🍜</div>
                    <div>Thaifoodie Staff Management</div>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // ไม่ throw error เพราะจะถูก catch และแสดง error message แทน
    // แค่หยุด execution โดย return false จาก initializeLiff
}

/**
 * Show blocked message for unauthorized access (External Browser Blocked)
 * พฤติกรรมเหมือน K-PLUS: แสดงหน้าเปล่าพร้อมข้อความแจ้งเตือน
 */
function showBlockedMessage() {
    // หยุด render ทั้งหมดและแสดงหน้า block
    document.documentElement.innerHTML = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>กรุณาเปิดผ่าน LINE | Thaifoodie</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body {
                    height: 100%;
                    font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                .blocked-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #00B900 0%, #007700 100%);
                    color: white;
                    text-align: center;
                    padding: 24px;
                }
                .blocked-icon {
                    width: 120px;
                    height: 120px;
                    background: rgba(255,255,255,0.15);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 24px;
                }
                .blocked-icon svg {
                    width: 60px;
                    height: 60px;
                    fill: white;
                }
                .blocked-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 12px;
                }
                .blocked-message {
                    font-size: 16px;
                    opacity: 0.9;
                    max-width: 280px;
                    line-height: 1.7;
                    margin-bottom: 32px;
                }
                .blocked-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    padding: 16px 32px;
                    background: white;
                    color: #00B900;
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 16px;
                    text-decoration: none;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .blocked-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
                }
                .blocked-button:active {
                    transform: translateY(0);
                }
                .line-logo {
                    width: 24px;
                    height: 24px;
                }
                .blocked-steps {
                    margin-top: 40px;
                    padding: 20px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 16px;
                    max-width: 300px;
                }
                .blocked-steps-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    opacity: 0.9;
                }
                .blocked-step {
                    font-size: 14px;
                    opacity: 0.85;
                    margin: 8px 0;
                    text-align: left;
                }
                .blocked-footer {
                    margin-top: 40px;
                    font-size: 12px;
                    opacity: 0.6;
                }
                .blocked-footer img {
                    width: 32px;
                    height: 32px;
                    margin-bottom: 8px;
                    opacity: 0.7;
                }
            </style>
        </head>
        <body>
            <div class="blocked-container">
                <div class="blocked-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2 0 .74-.4 1.38-1 1.72V19h-2v-2.28c-.6-.34-1-.98-1-1.72 0-1.1.9-2 2-2z"/>
                    </svg>
                </div>
                <h1 class="blocked-title">กรุณาเปิดผ่าน LINE</h1>
                <p class="blocked-message">
                    เพื่อความปลอดภัยและการใช้งานที่ดีที่สุด<br>
                    ระบบนี้ใช้งานได้เฉพาะใน LINE App เท่านั้น
                </p>
                <a href="https://line.me/R/oaMessage/${LINE_OA_ID}" class="blocked-button">
                    <svg class="line-logo" viewBox="0 0 24 24" fill="#00B900">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    เปิดใน LINE
                </a>
                <div class="blocked-steps">
                    <div class="blocked-steps-title">📌 วิธีเปิดใช้งาน</div>
                    <div class="blocked-step">1. เปิดแอป LINE</div>
                    <div class="blocked-step">2. ไปที่ Thaifoodie Official Account</div>
                    <div class="blocked-step">3. กดปุ่มเมนูด้านล่าง (Rich Menu)</div>
                </div>
                <div class="blocked-footer">
                    <div>🍜</div>
                    <div>Thaifoodie Staff Management</div>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // ไม่ throw error - แค่หยุด execution โดย return false จาก initializeLiff
}

/**
 * Check if LIFF is ready
 * @returns {boolean}
 */
function isLiffReady() {
    return window.liffState.isInitialized && window.liffState.isLoggedIn;
}

/**
 * Get current user ID
 * @returns {string|null}
 */
function getUserId() {
    return window.liffState.userId;
}

/**
 * Get access token
 * @returns {string|null}
 */
function getAccessToken() {
    return window.liffState.accessToken;
}

/**
 * Get user profile
 * @returns {Object|null}
 */
function getUserProfile() {
    return window.liffState.profile;
}

/**
 * Close LIFF window
 */
function closeLiff() {
    if (liff.isInClient()) {
        liff.closeWindow();
    } else {
        // For external browser, go back or show message
        window.history.back();
    }
}

/**
 * Logout from LIFF
 */
function logoutLiff() {
    if (liff.isLoggedIn()) {
        liff.logout();
        window.location.reload();
    }
}

/**
 * Share message via LINE
 * @param {Object} message - Flex Message or Text Message
 */
async function shareMessage(message) {
    if (!liff.isInClient()) {
        showError('ฟีเจอร์นี้ใช้ได้เฉพาะใน LINE App');
        return false;
    }

    try {
        await liff.shareTargetPicker([message]);
        return true;
    } catch (error) {
        console.error('[LIFF] Share error:', error);
        showError('ไม่สามารถแชร์ข้อความได้');
        return false;
    }
}

// ========================================
// UI Helper Functions
// ========================================

/**
 * Show loading overlay
 * @param {string} message - Loading message
 */
function showLoading(message = 'กำลังโหลด...') {
    // ซ่อน view-loading ใน container (ถ้ามี) เพื่อไม่ให้ซ้อนกัน
    const viewLoading = document.querySelector('.view-loading');
    if (viewLoading) {
        viewLoading.style.display = 'none';
    }
    
    let overlay = document.getElementById('loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-text">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        const textEl = overlay.querySelector('.loading-text');
        if (textEl) textEl.textContent = message;
        overlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Show error message
 * @param {string} message - Error message
 * @param {number} duration - Duration in milliseconds (0 = permanent)
 */
function showError(message, duration = 5000) {
    if (!message) return;
    const normalized = String(message).toLowerCase();
    if (normalized.includes('aborted') || normalized.includes('component unmounted')) {
        return;
    }

    // Remove existing error
    const existingError = document.querySelector('.error-toast');
    if (existingError) existingError.remove();

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <span class="error-icon">⚠️</span>
        <span class="error-message">${message}</span>
        <button class="error-close" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => toast.remove(), duration);
    }
}

/**
 * Show success message
 * @param {string} message - Success message
 * @param {number} duration - Duration in milliseconds
 */
function showSuccess(message, duration = 3000) {
    // Remove existing success toast
    const existingToast = document.querySelector('.success-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <span class="success-icon">✓</span>
        <span class="success-message">${message}</span>
    `;
    document.body.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => toast.remove(), duration);
    }
}

/**
 * Format date for display (Thai)
 * @param {string|Date} date
 * @returns {string}
 */
function formatDate(date) {
    const d = new Date(date);
    const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/**
 * Format datetime for display (Thai)
 * @param {string|Date} datetime
 * @returns {string}
 */
function formatDateTime(datetime) {
    if (!datetime) return '-';
    const d = new Date(datetime);
    const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543} ${time}`;
}

/**
 * Format time for display
 * @param {string|Date} time
 * @returns {string}
 */
function formatTime(time) {
    if (!time) return '-';
    const d = new Date(time);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format currency
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

// ========================================
// Auto-initialize on DOM ready
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const success = await initializeLiff();
        
        if (success) {
            window.dispatchEvent(new CustomEvent('liffReady', {
                detail: {
                    userId: window.liffState.userId,
                    profile: window.liffState.profile
                }
            }));

            if (typeof initializeApp === 'function') {
                try {
                    await initializeApp();
                } catch (appError) {
                    console.error('initializeApp ERROR:', appError);
                    showError('เกิดข้อผิดพลาดในการโหลดแอป: ' + appError.message);
                }
            }
        }
    } catch (error) {
        console.error('LIFF init error:', error);
        showError('เกิดข้อผิดพลาด: ' + error.message);
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeLiff,
        isLiffReady,
        getUserId,
        getAccessToken,
        getUserProfile,
        closeLiff,
        logoutLiff,
        shareMessage,
        showLoading,
        hideLoading,
        showError,
        showSuccess,
        formatDate,
        formatDateTime,
        formatTime,
        formatCurrency
    };
}
