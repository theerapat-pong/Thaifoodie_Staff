# 🔧 คู่มือการใช้งาน CSS/HTML/JavaScript Debugging Tools

## 📚 เอกสารที่สร้าง

1. **`docs/CSS_HTML_JS_AUDIT_REPORT.md`** - รายงานการตรวจสอบฉบับสมบูรณ์
2. **`debug-css.html`** - หน้า Web UI สำหรับทดสอบ
3. **`public/js/debug-audit.js`** - Console script สำหรับ debug

---

## 🚀 วิธีใช้งาน (3 วิธี)

### วิธีที่ 1: เปิดหน้า Debug UI

```bash
# Start dev server
vercel dev
```

เปิด browser: `http://localhost:3000/debug-css.html`

**Features:**
- ✅ ตรวจสอบ CSS Variables
- ✅ ตรวจสอบ CSS Conflicts
- ✅ ตรวจสอบ HTML Structure
- ✅ ตรวจสอบ Media Queries
- ✅ ทดสอบ Element Rendering
- ✅ Download รายงาน

**ปุ่มคำสั่ง:**
- `🔄 Run All Tests` - รันการทดสอบทั้งหมด
- `🌐 Browser Compatibility` - ตรวจสอบ browser
- `📥 Download Report` - ดาวน์โหลดรายงาน

---

### วิธีที่ 2: ใช้ Console Script

1. เปิด LIFF app ใน browser
2. เปิด Developer Tools (F12)
3. ไปที่ Console tab
4. Load script:

```javascript
// Option A: Load from file
const script = document.createElement('script');
script.src = '/js/debug-audit.js';
document.head.appendChild(script);

// Option B: Copy-paste จาก public/js/debug-audit.js
```

5. รันคำสั่ง:

```javascript
// รันทั้งหมด
cssAudit.runAll()

// หรือแยกตามหัวข้อ
cssAudit.checkCSSVariables()
cssAudit.checkCSSConflicts()
cssAudit.checkHTMLStructure()
cssAudit.checkMediaQueries()
cssAudit.checkBrowserCompatibility()

// สร้าง visual test box
cssAudit.createVisualTest()
```

---

### วิธีที่ 3: Manual Console Testing

วาง code snippets เหล่านี้ใน Browser Console:

#### ตรวจสอบ CSS Variables

```javascript
const rootStyles = getComputedStyle(document.documentElement);
const vars = ['--primary', '--danger', '--warning', '--success'];
vars.forEach(v => {
    console.log(v, '=', rootStyles.getPropertyValue(v));
});
```

#### ตรวจสอบ Element Display

```javascript
const checkElement = (id) => {
    const el = document.getElementById(id);
    if (!el) {
        console.error(`❌ #${id} not found`);
        return;
    }
    const style = getComputedStyle(el);
    console.table({
        'ID': id,
        'Display': style.display,
        'Visibility': style.visibility,
        'Opacity': style.opacity,
        'Position': style.position
    });
};

// ตรวจสอบ elements
checkElement('pending-badge');
checkElement('admin-section');
checkElement('balance-value');
```

#### ตรวจสอบ CSS Conflicts

```javascript
const selector = '.pending-badge';
const elements = document.querySelectorAll(selector);

console.log(`Found ${elements.length} ${selector} element(s)`);

elements.forEach((el, i) => {
    const style = getComputedStyle(el);
    console.group(`Element ${i + 1}:`);
    console.log('Display:', style.display);
    console.log('Position:', style.position);
    console.log('Background:', style.backgroundColor);
    console.log('Inline style:', el.getAttribute('style') || 'none');
    console.groupEnd();
});
```

#### ตรวจสอบ Media Query

```javascript
const queries = [
    '(max-width: 320px)',
    '(max-width: 375px)',
    '(max-width: 480px)'
];

console.log('Screen width:', window.innerWidth, 'px');

queries.forEach(query => {
    const mq = window.matchMedia(query);
    console.log(query, '→', mq.matches ? '✅ ACTIVE' : '⚪ Inactive');
});
```

#### Monitor Style Changes

```javascript
// สังเกต style changes real-time
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const el = mutation.target;
            console.log('Style changed:', el.id || el.className);
            console.log('New style:', el.getAttribute('style'));
        }
    });
});

const target = document.getElementById('pending-badge');
if (target) {
    observer.observe(target, {
        attributes: true,
        attributeFilter: ['style']
    });
    console.log('✅ Monitoring style changes on #pending-badge');
}
```

---

## 📊 ตัวอย่างผลลัพธ์

### ✅ Success Output

```
═══════════════════════════════════════════
  CSS/HTML/JS AUDIT TOOL
  Thaifoodie Staff Management System
═══════════════════════════════════════════

1️⃣ CSS Variables Check
  ✅ --primary = #4CAF50
  ✅ --danger = #e85a6b
  ✅ --warning = #f0a500
  ✅ All CSS variables defined correctly

2️⃣ CSS Selector Conflicts
  📌 .pending-badge found 1 element(s)
  ┌─────────────┬──────────────────┐
  │ display     │ flex             │
  │ position    │ absolute         │
  │ background  │ rgb(232, 90, 107)│
  └─────────────┴──────────────────┘

3️⃣ HTML Structure Validation
  ✅ #user-avatar exists (visible)
  ✅ #pending-badge exists (hidden)
  ✅ #admin-section exists (hidden)

4️⃣ JavaScript Manipulation Check
  📌 Pending Badge (#pending-badge):
    Computed display: none
    Inline style: display: none;
    Text content: (empty)

5️⃣ Media Query Coverage
  📱 Screen: 390x844px
  📏 Active Media Queries:
  ✅ Standard Mobile (480px) - ACTIVE
  ⚪ iPhone SE (375px) - Inactive

6️⃣ Browser Compatibility
  ✅ Running in LINE In-App Browser
  🎨 CSS Feature Support:
  ✅ CSS Grid supported
  ✅ CSS Flexbox supported
  ✅ CSS Variables supported

═══════════════════════════════════════════
  SUMMARY
═══════════════════════════════════════════
✅ All tests passed!
```

### ❌ Error Output

```
1️⃣ CSS Variables Check
  ❌ --primary ไม่ได้ถูกกำหนดใน :root

3️⃣ HTML Structure Validation
  ❌ #admin-section not found

═══════════════════════════════════════════
  SUMMARY
═══════════════════════════════════════════
❌ Some tests failed - check logs above
Missing CSS Variables: ['--primary']
Missing HTML Elements: ['admin-section']
```

---

## 🐛 Common Issues และวิธีแก้

### ปัญหา: `.pending-badge` ไม่แสดงผล

**Debug:**
```javascript
const badge = document.getElementById('pending-badge');
console.log('Exists:', !!badge);
if (badge) {
    console.log('Display:', getComputedStyle(badge).display);
    console.log('Parent:', badge.parentElement);
    console.log('Text:', badge.textContent);
}
```

**เหตุผล:**
1. Element มี `style="display: none"` (ตาม "Hide First, Show Later" pattern)
2. JavaScript ยังไม่ได้เรียก `.style.display = 'flex'`

**วิธีแก้:**
```javascript
// แสดงผลทันที (for testing)
badge.style.display = 'flex';
badge.textContent = '5';
```

---

### ปัญหา: CSS Variable ไม่ทำงาน

**Debug:**
```javascript
const root = getComputedStyle(document.documentElement);
const primary = root.getPropertyValue('--primary');

if (!primary || primary.trim() === '') {
    console.error('❌ --primary not defined');
    
    // Set manually
    document.documentElement.style.setProperty('--primary', '#4CAF50');
}
```

---

### ปัญหา: Media Query ไม่ทำงาน

**Debug:**
```javascript
const mq = window.matchMedia('(max-width: 480px)');

console.log('Query matches:', mq.matches);
console.log('Screen width:', window.innerWidth);

// Listen for changes
mq.addEventListener('change', (e) => {
    console.log('Media query changed:', e.matches);
});
```

**ทดสอบ:**
- Resize browser window
- ใช้ Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M)
- เลือก device preset (iPhone SE, Galaxy S10, etc.)

---

### ปัญหา: Style ถูก Override

**Debug:**
```javascript
const element = document.querySelector('.menu-item');
const computed = getComputedStyle(element);

// ดู computed style (final style ที่ใช้จริง)
console.log('Computed padding:', computed.padding);

// ดู inline style
console.log('Inline style:', element.getAttribute('style'));

// ดู all CSS rules ที่ match
const rules = [];
for (const sheet of document.styleSheets) {
    try {
        for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes('menu-item')) {
                rules.push({
                    selector: rule.selectorText,
                    cssText: rule.style.cssText
                });
            }
        }
    } catch (e) {
        // CORS error
    }
}
console.table(rules);
```

---

## 📱 ทดสอบใน LINE LIFF

### เปิด Debug Console ใน LINE

**iOS:**
1. เปิด Safari → Develop → [Your Device] → LINE
2. หรือใช้ Remote Debug ผ่าน Mac

**Android:**
1. เปิด Chrome → `chrome://inspect`
2. เลือก LINE WebView
3. คลิก "Inspect"

**Alternative: Use weinre**
```bash
npm install -g weinre
weinre --boundHost -all-
```

เพิ่มใน `spa.html`:
```html
<script src="http://YOUR_IP:8080/target/target-script-min.js#anonymous"></script>
```

---

## 🎯 Recommended Workflow

### 1. Development Phase
```javascript
// Load debug script
const script = document.createElement('script');
script.src = '/js/debug-audit.js';
document.head.appendChild(script);

// Run tests
cssAudit.runAll();
```

### 2. After Code Changes
```javascript
// Quick check
cssAudit.checkCSSConflicts();
cssAudit.checkHTMLStructure();
```

### 3. Before Deployment
```bash
# Open debug UI
vercel dev
# → http://localhost:3000/debug-css.html

# Run all tests
# Download report
# Review issues
```

### 4. Production Testing
```javascript
// In LINE Browser console
cssAudit.runAll();
cssAudit.checkBrowserCompatibility();
```

---

## 💡 Tips & Best Practices

### 1. ใช้ Bookmarklet
สร้าง bookmark ใน browser:
```javascript
javascript:(function(){const s=document.createElement('script');s.src='/js/debug-audit.js';document.head.appendChild(s);})();
```

### 2. Monitor Performance
```javascript
// Check render time
console.time('view-render');
router.navigate('home');
console.timeEnd('view-render');
```

### 3. Detect Memory Leaks
```javascript
// Before navigation
const beforeHeap = performance.memory?.usedJSHeapSize || 0;

// Navigate
router.navigate('other-view');

// After navigation
setTimeout(() => {
    const afterHeap = performance.memory?.usedJSHeapSize || 0;
    const diff = afterHeap - beforeHeap;
    console.log('Heap size change:', (diff / 1024 / 1024).toFixed(2), 'MB');
}, 1000);
```

---

## 📋 Checklist สำหรับ Deployment

- [ ] รัน `cssAudit.runAll()` ไม่มี error
- [ ] ทดสอบใน LINE Browser (iOS + Android)
- [ ] ทดสอบ responsive ทุกขนาดหน้าจอ (320px - 480px)
- [ ] ตรวจสอบ CSS Variables ครบถ้วน
- [ ] ไม่มี inline style ที่ไม่จำเป็น
- [ ] Media queries ทำงานถูกต้อง
- [ ] JavaScript "Hide First, Show Later" pattern ถูกต้อง
- [ ] ไม่มี console errors

---

## 🔗 เอกสารเพิ่มเติม

- **Full Audit Report:** `docs/CSS_HTML_JS_AUDIT_REPORT.md`
- **Project Instructions:** `docs/instructions.md`
- **SPA Migration Report:** `docs/SPA_MIGRATION_REPORT.md`

---

**หมายเหตุ:** Debug tools เหล่านี้ควรใช้ใน development/staging เท่านั้น อย่า deploy ไป production
