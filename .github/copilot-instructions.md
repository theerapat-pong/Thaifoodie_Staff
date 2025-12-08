# Thaifoodie Staff Management System - AI Agent Instructions

## 🎯 Project Overview

LINE LIFF-based staff management system for small restaurants. Single Page Application (SPA) architecture to prevent multiple tabs in LINE In-app Browser.

**Tech Stack:** Vanilla JS (Frontend) → Vercel Serverless Functions (Backend) → Prisma ORM → Neon PostgreSQL

**Deploy:** `vercel --prod` (changes must be deployed to reflect in LIFF app)

---

## 🏗️ Architecture Principles

### SPA Architecture (v3.0)
- **Entry Point:** `public/spa.html` - ALL URLs route here via `vercel.json` rewrites
- **Router:** Hash-based routing (`/#check-in`, `/#leave`) prevents multiple tabs
- **Views:** Modular JS files in `public/js/views/` - each exports `render()` function
- **No Framework:** Pure Vanilla JavaScript - no React, Vue, or Angular

### 3-Zone GPS Attendance System
```
Distance ≤ allowedRadius     → GREEN (auto-approve to Attendance)
allowedRadius < distance ≤ warningRadius → YELLOW (create PendingCheckIn)
distance > warningRadius     → RED (reject, save nothing)
```
- **Green Zone:** Creates `Attendance` record immediately with `check_in_status='VERIFIED'`
- **Yellow Zone:** Creates `PendingCheckIn` record, waits for admin approval
- **Red Zone:** Returns 403 error, saves no data
- **Check-out:** No GPS restrictions, always succeeds with `check_out_status='VERIFIED'`
- **Location Settings:** `WorkLocation` table holds `allowed_radius` and `warning_radius` (no default fallbacks)
- **Distance Calculation:** Haversine Formula in `src/utils/location.js`

### Database Schema (Prisma)
```
Employee → Attendance (1:N) - check-in/out records
Employee → PendingCheckIn (1:N) - Yellow zone approvals
Employee → Leave (1:N) - leave requests
Employee → Advance (1:N) - salary advance requests
WorkLocation (singleton) - GPS boundaries
SystemLog - debug/audit trail
```

---

## 📁 Directory Structure

```
api/liff/             # LIFF endpoints (serverless functions)
├── auth/verify.js    # LINE LIFF authentication
├── attendance/       # check-in, check-out, today, history
├── leave/           # request, quota, history, pending, cancel
├── advance/         # request, balance, history, pending, cancel
├── user/            # profile.js, work-location.js
└── admin/           # pending, approve, reject, employees, reset, 
                     # work-location, logs, system-logs, 
                     # pending-checkins, approve-pending-checkin, reject-pending-checkin

src/
├── config/line.js              # LINE Bot SDK config
├── lib/prisma.js               # Prisma singleton
├── modules/                    # Business logic (admin, attendance, leave, advance)
├── services/                   # LINE API helpers, LIFF auth, logger
└── utils/                      # datetime, format, location, salary, validation

public/
├── spa.html                    # SPA entry point
├── js/
│   ├── liff-init.js           # LIFF SDK initialization
│   ├── api.js                 # API wrapper functions
│   ├── router.js              # Hash-based SPA router
│   ├── app.js                 # App init + view registration
│   ├── logger.js              # Client-side logging
│   ├── time-format.js         # Time formatting utilities
│   └── views/                 # SPA view modules:
│       ├── home.js            # Main menu (role-based)
│       ├── attendance.js      # Today's attendance status
│       ├── check-in.js        # Quick check-in (GPS)
│       ├── check-out.js       # Quick check-out
│       ├── leave.js           # Leave request form
│       ├── advance.js         # Advance request form
│       ├── balance.js         # Balance summary
│       ├── history.js         # Transaction history
│       ├── cancel.js          # Cancel pending requests
│       ├── admin.js           # Admin panel (tabs)
│       ├── employees.js       # Employee management
│       ├── settings.js        # User settings
│       ├── health-status.js   # System health monitoring (ADMIN/DEV, auto-refresh 5s)
│       └── system-logs.js     # System logs viewer (DEV only)
└── css/style.css              # Mint Fresh theme
```

---

## 🔑 Critical Conventions

### 1. UI/UX Pattern: "Hide First, Show Later"
**Problem:** Users see empty gray boxes during loading  
**Solution:** ALL containers start with `style="display: none;"` in HTML, then show via JS

```javascript
// ❌ BAD: Shows empty container
<div class="quick-action-card">...</div>

// ✅ GOOD: Hidden until data ready
<div class="quick-action-card" style="display: none;">...</div>
// Then in JS:
container.style.display = 'block';
```

### 2. Auto-Close Behavior
- **`attendance.js` (Home):** NEVER auto-close, keep app open
- **`check-in.js` / `check-out.js` (Quick Actions):** MUST auto-close with `liff.closeWindow()` after 2-3s
- Use `setTimeout(() => liff.closeWindow(), 3000)` after success

### 3. Loading UI Pattern
**Problem:** Text and spinner rotate together, poor UX  
**Solution:** Use structured loading state with separated elements

```javascript
// ❌ BAD: Text rotates with spinner
<div class="loading-spinner">กำลังโหลด...</div>

// ✅ GOOD: Separate spinner and text
<div class="loading-state">
  <div class="spinner"></div>
  <div class="loading-text">กำลังโหลดข้อมูล...</div>
</div>
```

**CSS automatically handles animation:**
- `.spinner` rotates with keyframe animation
- `.loading-text` stays static below
- Uses Mint Fresh theme colors (`#4CAF50`, `rgba(0,0,0,0.1)`)

### 4. API Response Validation
**Always check data types before Prisma operations:**
```javascript
// ❌ BAD: Runtime error if daily_salary is null
const wage = parseFloat(employee.daily_salary);

// ✅ GOOD: Type-safe
const wage = employee.daily_salary 
  ? parseFloat(employee.daily_salary) 
  : 0;
```

### 5. Check-out Flow
**MUST fetch current attendance before showing confirmation:**
```javascript
// Fetch today's attendance to display check-in time
const response = await AttendanceAPI.getToday();
// Then show modal with actual check-in time
```

### 6. Location Tab System (OBSOLETE)
**The old `Location Tab` system is REMOVED:**
- ❌ `api/liff/admin/approve-location.js` - DELETED
- ❌ `api/liff/admin/reject-location.js` - DELETED
- ❌ `api/liff/admin/pending-locations.js` - DELETED
- ✅ Use `PendingCheckIn` table (Yellow zone approvals) instead
- ✅ Old `Attendance.check_in_status='PENDING'` superseded by new system

---

## 🔄 Common Workflows

### Adding a New View
1. Create `public/js/views/my-view.js`:
```javascript
export function render() {
  return `<div>My View HTML</div>`;
}
export async function init() {
  // Called after view is rendered
  // Setup event listeners, load data, start timers
}
export function destroy() {
  // Called when leaving view
  // Cleanup: stop timers, remove listeners, prevent memory leaks
  // Example: clearInterval(this.refreshInterval)
}
```
2. Register in `public/js/app.js`:
```javascript
import * as MyView from './views/my-view.js';
router.register('my-view', MyView);
```

**Important:** Always implement `destroy()` if view uses:
- `setInterval()` / `setTimeout()`
- Event listeners on window/document
- WebSocket connections

### Adding a LIFF API Endpoint
1. Create `api/liff/module/action.js`
2. Add CORS headers, auth check, Prisma query
3. Add wrapper in `public/js/api.js`:
```javascript
async myAction(data) {
  return this._fetch('/api/liff/module/action', 'POST', data);
}
```

### Testing Locally
```bash
vercel dev              # Start local dev server
vercel --prod          # Deploy to production
npm run prisma:studio  # Open Prisma Studio
```

---

## 🚨 Security & Access Control

- **LINE Internal Browser Only:** System blocks external browsers (like K-PLUS banking app)
- **LIFF Authentication:** All `/api/liff/*` endpoints use `authenticateRequest()` from `liff-auth.js`
- **Role-Based Access:** `Employee.role` enum (STAFF, ADMIN, DEV) - check via `src/utils/roles.js`
- **LINE Webhook Signature:** Verified in `src/middleware/lineSignature.js`

---

## 📊 System Monitoring & Logging

### Health Status View (`health-status.js`)
- **Access:** STAFF see limited view, ADMIN/DEV see full view
- **Auto-refresh:** Every 5 seconds
- **STAFF View:** Status overview + API endpoints only
- **ADMIN/DEV View:** + Database status + Recent activity
- **API:** `/api/health` returns `{status, timestamp, components, response_time}`
- **Cleanup:** Auto-refresh stops when leaving view (prevent memory leak)

### System Logs View (`system-logs.js`)
- **Access:** DEV role only
- **Features:** Pagination, category filtering, log detail expansion
- **API:** `/api/liff/admin/system-logs`
- **Data Source:** `SystemLog` table

### Bot Commands (Removed)
- ❌ `health` command - Removed (use Health Status view)
- ❌ `log/logs` command - Removed (use System Logs view)
- ✅ `id` command - Shows QR code with Mint Fresh theme

---

## 📊 Badge Notification System

**In-App Badge (HTML elements):**
- **Home Badge:** Shows total pending requests (leaves + advances + check-ins)
- **Admin Tabs:** Each tab shows individual counts
- **Location:** `public/js/views/home.js` (admin-pending-badge), `admin.js` (tab badges)
- **Data Source:** `api/liff/admin/pending.js` returns `{ leaves, advances, checkIns, total }`

**Not an App Icon Badge:** System uses HTML elements inside LIFF, not LINE Push Notification API

---

## 🔧 Debugging Tips

- **GPS Issues:** Check `SystemLog` table (category='GPS')
- **Auth Failures:** Verify `Authorization: Bearer <LIFF_TOKEN>` header
- **Prisma Errors:** Run `npm run prisma:generate` after schema changes
- **Browser Console:** All views log `[ViewName] Loading...` / `[ViewName] Loaded`
- **Router:** Check `[Router]` logs for route changes

---

## 📝 Code Style

- Use `const` over `let` (strict immutability)
- Comments: English for code logic, Thai OK for business logic
- Error messages: Always in Thai (user-facing)
- Async/await preferred over `.then()`
- No semicolons (project convention)
- Template literals for multi-line strings
