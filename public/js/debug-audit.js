// ========================================
// CSS/HTML/JavaScript Debugging Console Script
// วางโค้ดนี้ใน Browser Console เพื่อตรวจสอบปัญหา
// ========================================

console.log('%c🔍 Starting CSS/HTML/JS Audit...', 'color: #4CAF50; font-size: 16px; font-weight: bold;');

// ========================================
// 1. ตรวจสอบ CSS Variables
// ========================================
function checkCSSVariables() {
    console.group('1️⃣ CSS Variables Check');
    
    const rootStyles = getComputedStyle(document.documentElement);
    const requiredVariables = [
        '--primary', '--primary-dark', '--primary-light', '--primary-gradient',
        '--danger', '--warning', '--success', '--info',
        '--bg', '--card-bg', '--text-primary', '--text-secondary',
        '--shadow', '--radius', '--transition'
    ];

    const missing = [];
    requiredVariables.forEach(varName => {
        const value = rootStyles.getPropertyValue(varName);
        if (!value || value.trim() === '') {
            console.error(`❌ ${varName} ไม่ได้ถูกกำหนดใน :root`);
            missing.push(varName);
        } else {
            console.log(`✅ ${varName} = ${value.trim()}`);
        }
    });

    if (missing.length === 0) {
        console.log('%c✅ All CSS variables defined correctly', 'color: green; font-weight: bold;');
    } else {
        console.error('%c❌ Missing variables:', 'color: red; font-weight: bold;', missing);
    }
    
    console.groupEnd();
    return missing;
}

// ========================================
// 2. ตรวจสอบ CSS Selector Conflicts
// ========================================
function checkCSSConflicts() {
    console.group('2️⃣ CSS Selector Conflicts');
    
    const testSelectors = [
        '.pending-badge',
        '.menu-item',
        '.balance-card',
        '.admin-section'
    ];

    testSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`\n📌 ${selector} found ${elements.length} element(s)`);
        
        if (elements.length > 0) {
            const firstEl = elements[0];
            const style = getComputedStyle(firstEl);
            
            console.table({
                'display': style.display,
                'position': style.position,
                'background': style.backgroundColor,
                'padding': style.padding,
                'margin': style.margin,
                'z-index': style.zIndex
            });

            // Check for inline styles override
            if (firstEl.hasAttribute('style')) {
                console.warn(`⚠️ ${selector} has inline styles:`, firstEl.getAttribute('style'));
            }
        } else {
            console.warn(`⚠️ ${selector} not found in DOM (may be in SPA view)`);
        }
    });

    console.groupEnd();
}

// ========================================
// 3. ตรวจสอบ HTML Structure
// ========================================
function checkHTMLStructure() {
    console.group('3️⃣ HTML Structure Validation');
    
    // IDs จาก home.js
    const requiredIds = [
        'user-avatar', 'user-name', 'user-role',
        'today-status', 'today-value', 'balance-value',
        'pending-badge', 'admin-section', 'admin-pending-badge',
        'app-container'
    ];

    const missing = [];
    requiredIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) {
            console.error(`❌ #${id} not found`);
            missing.push(id);
        } else {
            const display = getComputedStyle(el).display;
            const isHidden = display === 'none' ? '(hidden)' : '(visible)';
            console.log(`✅ #${id} exists ${isHidden}`);
        }
    });

    if (missing.length > 0) {
        console.error('%c❌ Missing elements:', 'color: red; font-weight: bold;', missing);
    }

    console.groupEnd();
    return missing;
}

// ========================================
// 4. ตรวจสอบ JavaScript Manipulation
// ========================================
function checkJavaScriptManipulation() {
    console.group('4️⃣ JavaScript Manipulation Check');
    
    // ตรวจสอบว่า JavaScript เปลี่ยน style หรือไม่
    const monitoredElements = [
        { id: 'pending-badge', name: 'Pending Badge' },
        { id: 'admin-section', name: 'Admin Section' },
        { id: 'balance-value', name: 'Balance Value' }
    ];

    monitoredElements.forEach(({ id, name }) => {
        const el = document.getElementById(id);
        if (el) {
            const computedStyle = getComputedStyle(el);
            const inlineStyle = el.getAttribute('style') || 'none';
            
            console.log(`\n📌 ${name} (#${id}):`);
            console.log('  Computed display:', computedStyle.display);
            console.log('  Inline style:', inlineStyle);
            console.log('  Text content:', el.textContent?.trim() || '(empty)');
            
            // Check for event listeners (approximation)
            if (el.onclick || el.getAttribute('onclick')) {
                console.log('  ⚡ Has onclick handler');
            }
        }
    });

    console.groupEnd();
}

// ========================================
// 5. ตรวจสอบ Media Queries
// ========================================
function checkMediaQueries() {
    console.group('5️⃣ Media Query Coverage');
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    console.log(`📱 Screen: ${screenWidth}x${screenHeight}px`);
    console.log(`📱 Device Pixel Ratio: ${window.devicePixelRatio}`);
    console.log(`📱 User Agent: ${navigator.userAgent}`);

    const mediaQueries = [
        { query: '(max-width: 320px)', name: 'Very Small (320px)' },
        { query: '(max-width: 360px)', name: 'Small Phones (360px)' },
        { query: '(max-width: 375px)', name: 'iPhone SE (375px)' },
        { query: '(max-width: 480px)', name: 'Standard Mobile (480px)' }
    ];

    console.log('\n📏 Active Media Queries:');
    mediaQueries.forEach(({ query, name }) => {
        const mq = window.matchMedia(query);
        if (mq.matches) {
            console.log(`✅ ${name} - ACTIVE`);
        } else {
            console.log(`⚪ ${name} - Inactive`);
        }
    });

    // Test responsive elements
    console.log('\n📐 Responsive Element Check:');
    const menuGrid = document.querySelector('.menu-grid');
    if (menuGrid) {
        const gridCols = getComputedStyle(menuGrid).gridTemplateColumns;
        console.log('  .menu-grid columns:', gridCols);
    } else {
        console.warn('  ⚠️ .menu-grid not found');
    }

    console.groupEnd();
}

// ========================================
// 6. ตรวจสอบ Browser Compatibility
// ========================================
function checkBrowserCompatibility() {
    console.group('6️⃣ Browser Compatibility');
    
    const ua = navigator.userAgent;
    console.log('User Agent:', ua);

    // Detect LINE Browser
    if (ua.includes('Line')) {
        console.log('%c✅ Running in LINE In-App Browser', 'color: green; font-weight: bold;');
    } else {
        console.warn('%c⚠️ Not running in LINE Browser', 'color: orange; font-weight: bold;');
    }

    // Check CSS features
    console.log('\n🎨 CSS Feature Support:');
    const features = [
        { name: 'CSS Grid', test: () => CSS.supports('display', 'grid') },
        { name: 'CSS Flexbox', test: () => CSS.supports('display', 'flex') },
        { name: 'CSS Variables', test: () => CSS.supports('--test', '1') },
        { name: 'CSS calc()', test: () => CSS.supports('width', 'calc(100% - 10px)') },
        { name: 'backdrop-filter', test: () => CSS.supports('backdrop-filter', 'blur(10px)') }
    ];

    features.forEach(({ name, test }) => {
        if (test()) {
            console.log(`✅ ${name} supported`);
        } else {
            console.error(`❌ ${name} NOT supported`);
        }
    });

    console.groupEnd();
}

// ========================================
// 7. ตรวจสอบ Performance
// ========================================
function checkPerformance() {
    console.group('7️⃣ Performance Check');
    
    // Count stylesheets
    const styleSheets = document.styleSheets.length;
    console.log(`📄 Total stylesheets: ${styleSheets}`);

    // Count DOM elements
    const allElements = document.getElementsByTagName('*').length;
    console.log(`📦 Total DOM elements: ${allElements}`);

    // Check for large images
    const images = document.images;
    console.log(`🖼️ Total images: ${images.length}`);
    
    Array.from(images).forEach((img, index) => {
        if (img.naturalWidth > 1000 || img.naturalHeight > 1000) {
            console.warn(`⚠️ Large image [${index}]: ${img.naturalWidth}x${img.naturalHeight}px - ${img.src}`);
        }
    });

    // Check for memory leaks (event listeners)
    console.log('\n🎯 Event Listener Check:');
    console.log('  Window hashchange listeners:', typeof window.onhashchange);
    console.log('  Document click listeners:', typeof document.onclick);

    console.groupEnd();
}

// ========================================
// 8. สร้าง Visual Test
// ========================================
function createVisualTest() {
    console.group('8️⃣ Creating Visual Test Elements');
    
    const testContainer = document.createElement('div');
    testContainer.id = 'visual-test-container';
    testContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        z-index: 99999;
        max-width: 300px;
    `;

    testContainer.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">Visual Test</h3>
        
        <!-- Test pending-badge -->
        <div style="position: relative; display: inline-block; margin: 10px;">
            <div class="menu-item" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                ⏰
                <span class="pending-badge" style="display: flex;">5</span>
            </div>
        </div>

        <!-- Test balance-card -->
        <div class="balance-card" style="margin: 10px 0;">
            <div class="balance-info">
                <div class="balance-label">Test Balance</div>
                <div class="balance-value">฿1,234</div>
            </div>
        </div>

        <button onclick="document.getElementById('visual-test-container').remove()" 
                style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close Test
        </button>
    `;

    document.body.appendChild(testContainer);
    console.log('✅ Visual test container created (bottom-right corner)');
    console.groupEnd();
}

// ========================================
// Run All Tests
// ========================================
function runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════', 'color: #4CAF50;');
    console.log('%c  CSS/HTML/JS AUDIT TOOL', 'color: #4CAF50; font-size: 18px; font-weight: bold;');
    console.log('%c  Thaifoodie Staff Management System', 'color: #666;');
    console.log('%c═══════════════════════════════════════════\n', 'color: #4CAF50;');

    const results = {
        missingCSSVars: checkCSSVariables(),
        missingElements: checkHTMLStructure()
    };
    
    checkCSSConflicts();
    checkJavaScriptManipulation();
    checkMediaQueries();
    checkBrowserCompatibility();
    checkPerformance();

    console.log('\n%c═══════════════════════════════════════════', 'color: #4CAF50;');
    console.log('%c  SUMMARY', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
    console.log('%c═══════════════════════════════════════════', 'color: #4CAF50;');

    if (results.missingCSSVars.length === 0 && results.missingElements.length === 0) {
        console.log('%c✅ All tests passed!', 'color: green; font-size: 14px; font-weight: bold;');
    } else {
        console.error('%c❌ Some tests failed - check logs above', 'color: red; font-size: 14px; font-weight: bold;');
        if (results.missingCSSVars.length > 0) {
            console.error('Missing CSS Variables:', results.missingCSSVars);
        }
        if (results.missingElements.length > 0) {
            console.error('Missing HTML Elements:', results.missingElements);
        }
    }

    console.log('\n💡 Tip: Run createVisualTest() to see visual test elements');
    
    return results;
}

// ========================================
// Export Functions
// ========================================
window.cssAudit = {
    runAll: runAllTests,
    checkCSSVariables,
    checkCSSConflicts,
    checkHTMLStructure,
    checkJavaScriptManipulation,
    checkMediaQueries,
    checkBrowserCompatibility,
    checkPerformance,
    createVisualTest
};

// Auto-run on load
console.log('\n%c💡 Available Commands:', 'color: #2196F3; font-weight: bold;');
console.log('  cssAudit.runAll()               - Run all tests');
console.log('  cssAudit.checkCSSVariables()    - Check CSS variables');
console.log('  cssAudit.checkCSSConflicts()    - Check selector conflicts');
console.log('  cssAudit.checkHTMLStructure()   - Check HTML elements');
console.log('  cssAudit.createVisualTest()     - Create visual test box');
console.log('\n%c🚀 Running initial audit...', 'color: #4CAF50; font-weight: bold;');

runAllTests();
