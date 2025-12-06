# Health & System Logs Monitoring - Complete Implementation Log

## 🎯 สถานะปัจจุบัน (6 ธ.ค. 2568 - 13:40)

### ✅ สิ่งที่ทำเสร็จแล้ว
1. ✅ สร้าง Health Status และ System Logs monitoring pages
2. ✅ สร้าง LIFF apps แยก 2 ตัวสำหรับ subdomain (statushealth, systemlog)
3. ✅ ตั้งค่า DNS และ Vercel domains
4. ✅ แก้ไข vercel.json rewrites รองรับ subdomain routing
5. ✅ แก้ปัญหา API response parsing (role detection)
6. ✅ แก้ปัญหา module path ใน system-logs.js
7. ✅ เพิ่ม Eruda mobile console สำหรับ debugging
8. ✅ ย้าย Vercel account ใหม่ (แก้ปัญหา 12 functions limit)

### ⚠️ ปัญหาที่กำลังแก้ (ล่าสุด)
**"Invalid LIFF ID" Error** เมื่อเปิด subdomain pages

**สาเหตุที่พบ**: HTML files เรียก `liff.init()` ซ้ำซ้อน
- เปิดผ่าน `https://liff.line.me/xxx` → LIFF SDK init อัตโนมัติ
- แต่ `systemlog.html`/`status.html` พยายาม `liff.init()` อีกครั้ง
- การ init ซ้ำทำให้เกิด **"Invalid LIFF ID"** error

**วิธีแก้ (Deploy ล่าสุด)**:
- ลบ `const LIFF_ID = '...'` และ `liff.init()` ออกจาก HTML files
- LIFF SDK จะ init อัตโนมัติเมื่อเปิดผ่าน liff.line.me
- แค่เช็ค `liff.isLoggedIn()` และใช้ `liff.getAccessToken()` ได้เลย

**สถานะ**: 🔄 Deploy เสร็จแล้ว รอทดสอบ

---

## 📝 สรุปการแก้ไขทั้งหมด (Timeline)

### Phase 1: สร้าง Monitoring Pages

**ไฟล์ที่สร้าง:**
- `public/status.html` - Health status dashboard
  - แสดง Server, Database, API, Attendance status
  - Access: STAFF role ขึ้นไป
  - Auto-refresh ทุก 30 วินาที
  - Mobile-responsive design

- `public/systemlog.html` - System logs viewer
  - แสดง logs จากฐานข้อมูล SystemLog
  - Access: DEV role เท่านั้น
  - มี filtering (level, category, userId)
  - Pagination support

- `api/liff/admin/system-logs.js` - Backend API
  - ดึง SystemLog records
  - Role validation (DEV only)
  - Query parameters: level, category, userId, page, limit

**คำสั่ง LINE Bot:**
- `health` - ส่ง Flex Message เปิด status page
- `log`/`logs` - ส่ง Flex Message เปิด systemlog page (DEV only)
- `id` - แสดง LINE User ID พร้อม QR Code
- `groupid` - แสดง Group ID (ใช้ในกลุ่มเท่านั้น)

**Flex Messages:**
- `src/services/flex-messages.js`
  - `createHealthFlexMessage()` - Mint green theme
  - `createSystemLogFlexMessage()` - Mint green theme

---

### Phase 2: Debug Authentication Issues

#### Bug #1: Role Undefined Error
**ปัญหา**: Console แสดง `[Status] User role: undefined`

**สาเหตุ**: 
- API `/api/liff/user/profile` return structure คือ:
  ```json
  {
    "success": true,
    "data": {
      "employee": {"role": "DEV"}
    }
  }
  ```
- แต่โค้ดพยายามดึง `data.role` (ไม่มี!)

**แก้ไข**: 
```javascript
// ❌ ก่อนแก้
const userRole = data.role;

// ✅ หลังแก้
const userRole = data.employee?.role || data.data?.employee?.role;
```

**ไฟล์**: `status.html`, `systemlog.html`

---

#### Bug #2: Module Path Error
**ปัญหา**: `Cannot find module '../../src/services/liff-auth'`

**สาเหตุ**: Relative path ผิด
- ไฟล์อยู่ที่: `api/liff/admin/system-logs.js`
- ใช้ `../../src/` → ไปหา `api/src/` (ไม่มี!)

**แก้ไข**:
```javascript
// ❌ ก่อนแก้
require('../../src/services/liff-auth')

// ✅ หลังแก้
require('../../../src/services/liff-auth')
```

**ไฟล์**: `api/liff/admin/system-logs.js`

---

#### Debug Tools เพิ่มเติม:
1. **Eruda Mobile Console**
   - เพิ่ม `<script src="https://cdn.jsdelivr.net/npm/eruda"></script>`
   - เห็นไอคอนสีเขียวมุมขวาล่าง
   - เปิดดู Console, Network, Elements ได้บนมือถือ

2. **Debug Logging**
   - เพิ่ม `console.log()` ทุกขั้นตอนใน initLiff() และ checkAuth()
   - ติดตามว่า flow ทำงานถึงไหน

3. **Error Handling**
   - เพิ่ม try-catch ใน renderLogs()
   - Safe escape ค่า null/undefined

---

### Phase 3: Subdomain Implementation

#### สร้าง LIFF Apps ใหม่ 2 ตัว:

**LIFF #1: System Logs**
```
LIFF ID: 2008633012-J541Oqz4
Endpoint URL: https://systemlog.thaifoodie.site
Size: Full
Scopes: profile, openid
```

**LIFF #2: Status Health**
```
LIFF ID: 2008633012-L8e7VAme
Endpoint URL: https://statushealth.thaifoodie.site
Size: Full
Scopes: profile, openid
```

**Main LIFF (เดิม)**
```
LIFF ID: 2008633012-xKvPGV8v
Endpoint URL: https://staff.thaifoodie.site
Size: Full
```

---

#### Infrastructure Setup:

**1. DNS Configuration (Cloudflare)**
```
Type: A
Name: systemlog
IPv4: 76.76.21.21
Proxy: DNS only

Type: A
Name: statushealth
IPv4: 76.76.21.21
Proxy: DNS only
```

**2. Vercel Domains**
```bash
vercel domains add systemlog.thaifoodie.site
vercel domains add statushealth.thaifoodie.site
```

**3. Environment Variables**
```bash
vercel env add LIFF_ID_STATUS production  # 2008633012-L8e7VAme
vercel env add LIFF_ID_LOGS production    # 2008633012-J541Oqz4
```

---

#### Code Updates:

**webhook.js**
```javascript
const LIFF_ID_STATUS = process.env.LIFF_ID_STATUS || '2008633012-L8e7VAme';
const LIFF_ID_LOGS = process.env.LIFF_ID_LOGS || '2008633012-J541Oqz4';

// health command
const statusUrl = `https://liff.line.me/${LIFF_ID_STATUS}`;

// log command
const logUrl = `https://liff.line.me/${LIFF_ID_LOGS}`;
```

**.env.example**
```bash
LIFF_ID="2008633012-xKvPGV8v"
LIFF_ID_STATUS="2008633012-L8e7VAme"
LIFF_ID_LOGS="2008633012-J541Oqz4"
```

---

### Phase 4: Vercel Rewrites Fix

#### Bug #3: Subdomain Routing Error
**ปัญหา**: 
- Subdomain เปิดได้ (200 OK)
- แต่คืน 0 bytes (ไม่มี content)

**สาเหตุ**: 
- vercel.json มี catch-all rule: `{ "source": "/:path*", "destination": "/spa.html" }`
- ทุก path (รวม subdomain root `/`) ถูก redirect ไป spa.html

**แก้ไข**: เพิ่ม hostname-based rewrites
```json
{
  "rewrites": [
    {
      "source": "/",
      "has": [{"type": "host", "value": "systemlog.thaifoodie.site"}],
      "destination": "/systemlog.html"
    },
    {
      "source": "/",
      "has": [{"type": "host", "value": "statushealth.thaifoodie.site"}],
      "destination": "/status.html"
    },
    {"source": "/api/:path*", "destination": "/api/:path*"},
    {"source": "/:path*", "destination": "/spa.html"}
  ]
}
```

**ผลลัพธ์**:
- ✅ `https://systemlog.thaifoodie.site` → serve `systemlog.html` (37KB)
- ✅ `https://statushealth.thaifoodie.site` → serve `status.html` (37KB)
- ✅ `https://staff.thaifoodie.site` → serve `spa.html` (SPA)

---

### Phase 5: LIFF Double Init Bug (ปัญหาล่าสุด)

#### Bug #4: Invalid LIFF ID Error
**ปัญหา**: เปิด subdomain แล้วเจอ "ไม่สามารถเชื่อมต่อกับ LINE ได้: Invalid LIFF ID"

**Root Cause Analysis**:
1. User กดปุ่มใน Flex Message
2. เปิด URL: `https://liff.line.me/2008633012-J541Oqz4`
3. LIFF SDK **auto-init** แล้ว redirect ไป `https://systemlog.thaifoodie.site`
4. ไฟล์ `systemlog.html` โหลด LIFF SDK script
5. JavaScript ใน HTML เรียก `liff.init({ liffId: '2008633012-J541Oqz4' })` **อีกครั้ง**
6. ⚠️ การ init ซ้ำทำให้ LIFF SDK confused → **Invalid LIFF ID**

**วิธีแก้ (Commit ล่าสุด)**:

```javascript
// ❌ ก่อนแก้ (systemlog.html)
const LIFF_ID = '2008633012-J541Oqz4';
async function initLiff() {
    await liff.init({ liffId: LIFF_ID }); // ← init ซ้ำ!
}

// ✅ หลังแก้ (systemlog.html)
async function initLiff() {
    // LIFF is already initialized when opened via liff.line.me
    // No need to call liff.init() again
    console.log('[SystemLog] LIFF ready');
    
    if (!liff.isLoggedIn()) {
        liff.login();
        return;
    }
    accessToken = liff.getAccessToken();
    // ... ทำงานต่อได้เลย
}
```

**ไฟล์ที่แก้**: 
- `public/status.html`
- `public/systemlog.html`

---

## 🔧 Technical Summary

### LIFF Configuration (Final State)
| Purpose | LIFF ID | Endpoint URL |
|---------|---------|--------------|
| Main SPA | 2008633012-xKvPGV8v | https://staff.thaifoodie.site |
| Status Health | 2008633012-L8e7VAme | https://statushealth.thaifoodie.site |
| System Logs | 2008633012-J541Oqz4 | https://systemlog.thaifoodie.site |

### Environment Variables
```bash
DATABASE_URL=postgresql://...
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
LIFF_ID=2008633012-xKvPGV8v
LIFF_ID_STATUS=2008633012-L8e7VAme
LIFF_ID_LOGS=2008633012-J541Oqz4
TZ=Asia/Bangkok
```

### Vercel Rewrites (Final)
```json
[
  {
    "source": "/",
    "has": [{"type": "host", "value": "systemlog.thaifoodie.site"}],
    "destination": "/systemlog.html"
  },
  {
    "source": "/",
    "has": [{"type": "host", "value": "statushealth.thaifoodie.site"}],
    "destination": "/status.html"
  },
  {"source": "/api/:path*", "destination": "/api/:path*"},
  {"source": "/spa.html", "destination": "/spa.html"},
  {"source": "/status.html", "destination": "/status.html"},
  {"source": "/systemlog.html", "destination": "/systemlog.html"},
  {"source": "/css/:path*", "destination": "/css/:path*"},
  {"source": "/js/:path*", "destination": "/js/:path*"},
  {"source": "/:path*", "destination": "/spa.html"}
]
```

---

## 🚀 Next Steps & Testing

### รอทดสอบหลัง Deploy ล่าสุด:

1. **Clear Cache**
   - Clear browser cache
   - หรือใช้ Private/Incognito mode

2. **ทดสอบ Health Command**
   - ส่ง `health` ใน LINE chat
   - กดปุ่ม "🔍 ดูรายละเอียด"
   - ตรวจสอบว่าเปิด `statushealth.thaifoodie.site`
   - ✅ ไม่มี "Invalid LIFF ID" error
   - ✅ แสดง health status ได้

3. **ทดสอบ Log Command**
   - ส่ง `log` ใน LINE chat (ต้องมี DEV role)
   - กดปุ่ม "🔍 เปิด Dashboard"
   - ตรวจสอบว่าเปิด `systemlog.thaifoodie.site`
   - ✅ ไม่มี "Invalid LIFF ID" error
   - ✅ แสดง system logs ได้

4. **Debug ด้วย Eruda**
   - เปิด Eruda console (แตะไอคอนสีเขียว)
   - ดูแท็บ Console:
     - `[Status] LIFF ready` ✅
     - `[Status] User is logged in` ✅
     - `[Status] Auth check passed!` ✅
     - `[Status] Showing content...` ✅
   - ดูแท็บ Network:
     - `/api/liff/user/profile` → 200 OK
     - `/api/health` → 200 OK (สำหรับ status)
     - `/api/liff/admin/system-logs` → 200 OK (สำหรับ logs)

### ถ้ายังมีปัญหา:
- ตรวจสอบ LIFF Endpoint URLs ใน LINE Developers Console
- ตรวจสอบว่า DNS records propagate แล้ว
- ตรวจสอบ Vercel deployment logs
- ส่ง screenshot Eruda console มา

---

## 📚 Reference Files

### Key Files Modified:
```
api/webhook.js                      # LIFF URL generation
api/liff/admin/system-logs.js      # Backend API (fixed path)
public/status.html                  # Removed liff.init()
public/systemlog.html               # Removed liff.init()
public/liff-test.html               # Test page (new)
vercel.json                         # Hostname-based rewrites
.env.example                        # LIFF IDs documentation
src/services/flex-messages.js       # Flex messages
```

### Important Concepts:
- **LIFF Auto-Init**: เมื่อเปิดผ่าน `liff.line.me/xxx` LIFF SDK init อัตโนมัติ
- **Hostname-based Rewrites**: Vercel ใช้ `has` condition เช็ค hostname
- **Role-based Access**: Status (STAFF+), Logs (DEV only)
- **Environment Variables**: ใช้ fallback values ใน code

---

**Last Updated**: 6 ธันวาคม 2568, 13:40 น.  
**Deploy Status**: ✅ Deployed - Waiting for testing  
**Current Issue**: 🔄 Testing "Invalid LIFF ID" fix
