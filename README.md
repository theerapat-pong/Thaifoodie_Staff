ระบบจัดการพนักงานผ่าน LINE LIFF Single Page Application สำหรับร้านอาหารขนาดเล็ก ด้วย Node.js, PostgreSQL และ Vercel

---

## 🆕 Version 3.0 - Single Page Application (SPA)

Version 3.0 ปรับโครงสร้างเป็น **Single Page Application (SPA)** เพื่อแก้ปัญหาแท็บซ้อนใน LINE In-app Browser

### ปัญหาที่แก้ไข

| ปัญหาเดิม (MPA) | แก้ไขใหม่ (SPA) |
|-----------------|-----------------|
| เปิดแต่ละปุ่ม Rich Menu = สร้างแท็บใหม่ | ทุก Rich Menu นำไปหน้าเดียวกัน + Hash Routing |
| มีหลายแท็บค้างใน LINE Browser | มีเพียงแท็บเดียว + Auto-close หลัง action |
| Navigate ด้วย `<a href>` = เปิดหน้าใหม่ | Navigate ด้วย hash change = อยู่หน้าเดิม |
| ผู้ใช้ต้องปิดแท็บเอง | ระบบปิดให้อัตโนมัติหลังทำรายการสำเร็จ |

---

## 📱 สถาปัตยกรรม SPA ใหม่

### Frontend Architecture

\`\`\`
public/
├── spa.html                 # ⭐ Single Entry Point (ทุก URL มาที่นี่)
├── css/style.css           # Global styles
└── js/
    ├── liff-init.js        # LIFF SDK initialization
    ├── api.js              # API helpers
    ├── router.js           # ⭐ Hash-based SPA Router
    ├── app.js              # ⭐ App initialization
    └── views/              # ⭐ View modules
        ├── home.js         # หน้าหลัก
        ├── attendance.js   # เข้า-ออกงาน (ครบทั้ง check-in/check-out)
        ├── check-in.js     # Quick check-in (auto-submit + auto-close)
        ├── check-out.js    # Quick check-out (auto-submit + auto-close)
        ├── leave.js        # ลางาน
        ├── advance.js      # เบิกเงิน
        ├── balance.js      # ดูยอดเงิน
        ├── cancel.js       # ยกเลิกคำขอ
        ├── admin.js        # Admin panel
        └── history.js      # ประวัติ
\`\`\`

### URL Routing

| Old URL (MPA) | New URL (SPA) | พฤติกรรม |
|---------------|---------------|----------|
| `/check-in.html` | `/#check-in` | Auto-submit + Auto-close 5 วินาที |
| `/check-out.html` | `/#check-out` | Auto-submit + Auto-close 5 วินาที |
| `/attendance.html` | `/#attendance` | หน้า full พร้อมปุ่ม check-in/out |
| `/leave.html` | `/#leave` | ฟอร์มลางาน + ประวัติ |
| `/advance.html` | `/#advance` | ฟอร์มเบิกเงิน + ประวัติ |
| `/balance.html` | `/#balance` | ดูยอดเงินละเอียด |
| `/cancel.html` | `/#cancel` | ยกเลิกคำขอ |
| `/admin.html` | `/#admin` | Admin panel |
| `/liff.html` / `/index.html` | `/#home` | หน้าหลัก |

---

## 🎯 Rich Menu Configuration (อัพเดทใหม่)

### ⚠️ สำคัญ: เปลี่ยน URL ใน Rich Menu

**Rich Menu ใหม่ควรใช้ URL พร้อม Hash:**

| ปุ่ม | URI (ใหม่) |
|------|------------|
| ⏰ เข้างาน | `https://liff.line.me/2008633012-xKvPGV8v/#check-in` |
| 🏁 ออกงาน | `https://liff.line.me/2008633012-xKvPGV8v/#check-out` |
| 📅 ลางาน | `https://liff.line.me/2008633012-xKvPGV8v/#leave` |
| 💰 เบิกเงิน | `https://liff.line.me/2008633012-xKvPGV8v/#advance` |
| 📊 ดูยอดเงิน | `https://liff.line.me/2008633012-xKvPGV8v/#balance` |
| 🏠 เมนูหลัก | `https://liff.line.me/2008633012-xKvPGV8v/` |

> **หมายเหตุ**: ถ้าไม่สะดวกแก้ Rich Menu ทันที ระบบยังรองรับ URL เดิม (เช่น `/check-in.html`) โดย vercel.json จะ rewrite ไปยัง `spa.html` และ `app.js` จะ redirect ไปยัง hash route ที่ถูกต้อง

---

## 🚀 Auto-close หลัง Action สำคัญ

### พฤติกรรม liff.closeWindow()

| Action | พฤติกรรม |
|--------|----------|
| ✅ เช็คอินสำเร็จ | แสดง Modal + Auto-close ใน 5 วินาที (หรือกด "ปิด" เอง) |
| ✅ เช็คเอาท์สำเร็จ | แสดง Modal + Auto-close ใน 5 วินาที |
| ✅ ส่งคำขอลาสำเร็จ | แสดง Modal ให้เลือก "ดำเนินการต่อ" หรือ "ปิด" |
| ✅ ส่งคำขอเบิกเงินสำเร็จ | แสดง Modal ให้เลือก "ดำเนินการต่อ" หรือ "ปิด" |

### ตัวอย่าง Flow

\`\`\`
User กด "เข้างาน" ใน Rich Menu
  ↓
LINE เปิด LIFF ที่ /#check-in
  ↓
Auto-submit check-in API ทันที
  ↓
แสดงผลสำเร็จ + นับถอยหลัง 5 วินาที
  ↓
liff.closeWindow() → กลับไปหน้า Chat
  ↓
(ไม่มีแท็บค้าง!)
\`\`\`

---

## ✨ ฟีเจอร์หลัก

- ✅ **เข้า-ออกงาน**: บันทึกเวลาเข้า-ออกงาน พร้อมคำนวณชั่วโมงและค่าจ้างอัตโนมัติ
- 📅 **ขอลางาน**: ส่งคำขอลาพร้อมระบบอนุมัติจาก Admin
- 💰 **เบิกเงินล่วงหน้า**: เบิกเงินจากยอดสะสม พร้อมตรวจสอบยอดคงเหลือ
- 📊 **ตรวจสอบยอดเงิน**: ดูยอดเงินสะสมและประวัติการเบิก
- ❌ **ยกเลิกคำขอ**: ยกเลิกคำขอลาหรือเบิกเงินที่ยังรออนุมัติ
- 🔔 **แจ้งเตือนอัตโนมัติ**: แจ้งเตือนลืม Check-out รายวัน
- 📈 **รายงานรายเดือน**: สรุปยอดรายเดือนส่งให้ Admin อัตโนมัติ
- 🔧 **Admin Panel**: ล้างข้อมูลระบบ (เฉพาะ Admin)
- 🔒 **LINE-Only Access**: บังคับเปิดผ่าน LINE Internal Browser เท่านั้น

---

## 🔒 Security: LINE Internal Browser Only

ระบบนี้บังคับให้ผู้ใช้เปิดผ่าน **LINE App (Internal Browser)** เท่านั้น เหมือนกับระบบธนาคาร K-PLUS

| การเปิด | ผลลัพธ์ |
|---------|---------|
| เปิดจาก LINE Rich Menu | ✅ ใช้งานได้ปกติ |
| เปิดจาก Chrome, Safari, Firefox | ❌ แสดงหน้า "กรุณาเปิดผ่าน LINE" |
| Copy URL ไปเปิดใน Browser | ❌ แสดงหน้า "กรุณาเปิดผ่าน LINE" |

---

## 🛠️ เทคโนโลยีที่ใช้

- **Runtime**: Node.js 20.x
- **Framework**: Vercel Serverless Functions
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 5.22.0
- **LINE API**: @line/bot-sdk 9.3.0
- **LINE LIFF**: LIFF SDK v2
- **Frontend**: Single Page Application (Vanilla JS)
- **Routing**: Hash-based Client-side Router
- **Date/Time**: dayjs 1.11.13

---

## 📁 โครงสร้างโปรเจค

> **Note:** โปรเจคใช้ SPA Architecture (v3.0+) - Legacy HTML files ถูกย้ายไป `archive/` (Dec 8, 2025)

\`\`\`
Thaifoodie_Staff/
├── package.json                    # Node.js dependencies
├── vercel.json                     # Vercel configuration (with SPA rewrites)
├── archive/                        # 🗄️ Archived legacy files (not in production)
│   ├── legacy-html/                # Old HTML files from pre-SPA era
│   └── debug-files/                # Development/debug tools
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
├── api/
│   ├── webhook.js                  # Main LINE Webhook
│   ├── health.js                   # Health check endpoint
│   ├── cron-forgot-checkout.js     # Cron: แจ้งเตือนลืม Check-out
│   ├── cron-monthly-report.js      # Cron: รายงานรายเดือน
│   └── liff/                       # LIFF API Endpoints
│       ├── auth/verify.js
│       ├── attendance/             # check-in, check-out, today, history
│       ├── leave/                  # request, quota, history, pending, cancel
│       ├── advance/                # request, balance, history, pending, cancel
│       ├── user/profile.js
│       └── admin/                  # pending, approve, reject, employees, reset
├── public/
│   ├── spa.html                    # ⭐ SPA Entry Point (ALL routes → here)
│   ├── status.html                 # 🏥 Health Status Monitor (standalone LIFF)
│   ├── systemlog.html              # 🔧 System Logs Viewer (standalone LIFF)
│   ├── css/style.css               # Shared styles
│   └── js/
│       ├── liff-init.js            # LIFF SDK initialization
│       ├── api.js                  # API helper functions
│       ├── router.js               # ⭐ SPA Hash Router
│       ├── app.js                  # ⭐ App initialization
│       └── views/                  # ⭐ View modules
│           ├── home.js             # หน้าหลัก
│           ├── attendance.js       # เข้า-ออกงาน (ครบทั้ง check-in/check-out)
│           ├── check-in.js         # Quick check-in (auto-submit + auto-close)
│           ├── check-out.js        # Quick check-out (auto-submit + auto-close)
│           ├── leave.js            # ลางาน
│           ├── advance.js          # เบิกเงิน
│           ├── balance.js          # ดูยอดเงิน
│           ├── cancel.js           # ยกเลิกคำขอ
│           ├── admin.js            # Admin panel
│           ├── employees.js        # จัดการพนักงาน
│           ├── settings.js         # ตั้งค่าระบบ
│           └── history.js          # ประวัติ
├── src/
│   ├── config/line.js
│   ├── lib/prisma.js
│   ├── middleware/lineSignature.js
│   ├── modules/                    # Business logic
│   │   ├── admin.js
│   │   ├── attendance.js
│   │   ├── leave.js
│   │   └── advance.js
│   ├── services/                   # LINE API helpers
│   │   ├── line.js
│   │   ├── liff-auth.js
│   │   └── flex-messages.js
│   └── utils/                      # Utilities
│       ├── datetime.js
│       ├── format.js
│       ├── location.js
│       ├── salary.js
│       └── validation.js
└── docs/                           # 📚 Documentation
    ├── CLEANUP_REPORT.md           # 🆕 Cleanup report (Dec 8, 2025)
    ├── SPA_MIGRATION_REPORT.md
    ├── SYSTEM_MONITORING_IMPLEMENTATION.md
    └── instructions.md
\`\`\`

---

## 🚀 การติดตั้งและใช้งาน

### 1. Clone และติดตั้ง Dependencies

\`\`\`bash
cd C:\Users\TRPPT\Documents\Thaifoodie_Staff
npm install
\`\`\`

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local`:

\`\`\`env
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST].neon.tech/[DATABASE]?sslmode=require"
LINE_CHANNEL_ACCESS_TOKEN="YOUR_CHANNEL_ACCESS_TOKEN"
LINE_CHANNEL_SECRET="YOUR_CHANNEL_SECRET"
LINE_ADMIN_GROUP_ID="YOUR_ADMIN_GROUP_CHAT_ID"
LIFF_ID="YOUR_LIFF_ID"
CRON_SECRET="random-secret-string"
\`\`\`

### 3. ตั้งค่า LIFF

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Channel > LIFF > Add
3. ตั้งค่า:
   - **LIFF app name**: `Thaifoodie Staff v3`
   - **Size**: `Full`
   - **Endpoint URL**: `https://staff.thaifoodie.site/spa.html`

### 4. Deploy

\`\`\`bash
vercel --prod
\`\`\`

---

## 🧪 วิธีทดสอบ

### ทดสอบ SPA Routing

\`\`\`bash
# ทดสอบ URL ต่างๆ (ควรเปิดจาก LINE App)
https://staff.thaifoodie.site/              → /#home
https://staff.thaifoodie.site/#check-in     → Auto check-in
https://staff.thaifoodie.site/#check-out    → Auto check-out
https://staff.thaifoodie.site/#leave        → ฟอร์มลางาน
https://staff.thaifoodie.site/#advance      → ฟอร์มเบิกเงิน
\`\`\`

### ทดสอบ Legacy URL (Backward Compatible)

\`\`\`bash
# URL เก่ายังใช้ได้ (จะ redirect ไป hash route)
https://staff.thaifoodie.site/check-in.html → /#check-in
https://staff.thaifoodie.site/leave.html    → /#leave
\`\`\`

---

## 📝 Changelog

### v3.1.0 (Dec 8, 2025)
- 🧹 **Project Cleanup** - ย้าย legacy HTML files ไป `archive/`
- 📝 **Documentation Update** - อัพเดท project structure ใน README

### v3.0.0
- 🆕 **SPA Architecture** - ปรับเป็น Single Page Application
- 🆕 **Hash-based Router** - ใช้ hash routing ป้องกันแท็บซ้อน
- 🆕 **Auto-close Modal** - ปิด LIFF อัตโนมัติหลังทำ action สำเร็จ
- 🆕 **Quick Actions** - Check-in/Check-out แบบ 1-tap auto-submit
- 🆕 **Legacy URL Support** - รองรับ URL เดิมโดย redirect อัตโนมัติ

### v2.0.0
- ย้ายฟีเจอร์หลักจาก Chatbot ไปยัง LIFF
- เพิ่ม LINE-Only Access security

### v1.0.0
- Initial release - Chatbot-based system

---

## 📄 License

MIT License
'@