# 🧪 Post-Cleanup Testing Checklist

**Date:** December 8, 2025  
**Version:** 3.1.0  
**Status:** Pre-deployment Testing

---

## ✅ Pre-Deployment Tests (Local)

### Build Tests
- [x] `vercel build` - ✅ Passed (9s build time)
- [x] No syntax errors - ✅ Confirmed
- [x] Prisma generate - ✅ Generated successfully
- [x] Archive folders created - ✅ Verified

### File Structure Tests
- [x] Legacy files moved to archive - ✅ 3 files (31.81 KB)
- [x] Active HTML files remain - ✅ 3 files (spa.html, status.html, systemlog.html)
- [x] No broken file references - ✅ Grep search completed
- [x] vercel.json routes intact - ✅ status.html and systemlog.html rewrites preserved

### Documentation Tests
- [x] CLEANUP_REPORT.md created - ✅ Complete with rollback instructions
- [x] README.md updated - ✅ New project structure documented
- [x] Git tag created - ✅ v3.0-pre-cleanup

---

## 🚀 Post-Deployment Tests (Production)

### Critical Path Tests (MUST PASS)

#### 1. SPA Routing Tests
- [ ] Open `https://liff.line.me/2008633012-xKvPGV8v/` → Should load spa.html
- [ ] Navigate to `/#home` → Should show home view
- [ ] Navigate to `/#attendance` → Should show attendance view
- [ ] Navigate to `/#check-in` → Should auto-submit check-in (if within GPS zone)
- [ ] Navigate to `/#check-out` → Should show check-out confirmation
- [ ] Navigate to `/#leave` → Should show leave request form
- [ ] Navigate to `/#advance` → Should show advance request form
- [ ] Navigate to `/#admin` → Should show admin panel (for admins)

#### 2. Standalone LIFF Pages Tests
- [ ] Open `https://statushealth.thaifoodie.site` → Should load status.html
- [ ] Health status page shows data correctly
- [ ] Open `https://systemlog.thaifoodie.site` → Should load systemlog.html
- [ ] System logs page shows data correctly (DEV only)

#### 3. Quick Action Tests (Auto-close)
- [ ] Rich Menu "เข้างาน" → Auto check-in + Modal shows + Auto-close in 5s
- [ ] Rich Menu "ออกงาน" → Auto check-out + Modal shows + Auto-close in 5s
- [ ] "ปิด" button closes LIFF immediately
- [ ] No multiple tabs created

#### 4. Legacy URL Compatibility Tests
- [ ] `/check-in.html` redirects to `/#check-in` ✅
- [ ] `/check-out.html` redirects to `/#check-out` ✅
- [ ] `/attendance.html` redirects to `/#attendance` ✅
- [ ] `/leave.html` redirects to `/#leave` ✅
- [ ] `/advance.html` redirects to `/#advance` ✅
- [ ] `/index.html` redirects to `/#home` ✅
- [ ] No 404 errors for old URLs

---

## 🔍 Regression Tests

### GPS & Check-in Tests
- [ ] Check-in within GREEN zone → Creates Attendance record
- [ ] Check-in within YELLOW zone → Creates PendingCheckIn record
- [ ] Check-in in RED zone → Shows error, no record created
- [ ] Check-out always succeeds → Updates Attendance record

### Leave Request Tests
- [ ] Submit leave request → Creates Leave record with PENDING status
- [ ] Admin approves leave → Status changes to APPROVED
- [ ] Admin rejects leave → Status changes to REJECTED
- [ ] Cancel pending leave → Status changes to CANCELLED

### Advance Request Tests
- [ ] Submit advance request → Creates Advance record with PENDING status
- [ ] Check available balance → Shows correct amount
- [ ] Admin approves advance → Deducts from balance
- [ ] Admin rejects advance → No balance change

### Admin Panel Tests
- [ ] View pending requests → Shows correct counts
- [ ] Badge notifications → Display proper numbers
- [ ] Approve/reject actions → Update records correctly
- [ ] Employee management → CRUD operations work

---

## 📊 Performance Tests

### Load Time Tests
- [ ] spa.html loads < 2s
- [ ] status.html loads < 2s
- [ ] systemlog.html loads < 2s
- [ ] View transitions < 500ms
- [ ] API responses < 1s

### Browser Console Tests
- [ ] No JavaScript errors
- [ ] No 404 network errors
- [ ] No CORS errors
- [ ] LIFF SDK initializes correctly
- [ ] Router logs show correct navigation

---

## 🔒 Security Tests

### Access Control Tests
- [ ] Non-LINE browsers blocked → Shows "กรุณาเปิดผ่าน LINE" message
- [ ] LIFF authentication works → Token validated correctly
- [ ] Admin-only features blocked for STAFF users
- [ ] DEV-only features blocked for non-DEV users

### Data Protection Tests
- [ ] GPS coordinates sanitized in logs
- [ ] Personal data not exposed in public endpoints
- [ ] LINE webhook signature validated

---

## 🐛 Edge Case Tests

### Navigation Tests
- [ ] Back button works correctly
- [ ] Forward button works correctly
- [ ] Refresh page maintains hash route
- [ ] Direct URL with hash works
- [ ] Switching between views doesn't break state

### Error Handling Tests
- [ ] Network offline → Shows error message
- [ ] API timeout → Shows timeout error
- [ ] Invalid GPS → Shows location error
- [ ] Database error → Shows friendly error message

---

## 📝 Testing Notes

### Test Environment
- **Browser:** LINE In-app Browser (iOS/Android)
- **Network:** WiFi + 4G/5G
- **GPS:** Enabled
- **Users:** STAFF, ADMIN, DEV roles

### Known Issues (Pre-deployment)
- None identified

### Known Issues (Post-deployment)
- [ ] List any issues found during production testing

---

## ✅ Sign-off Checklist

### Before Deployment
- [x] All local tests passed
- [x] Build successful
- [x] Git committed
- [x] Backup tag created (v3.0-pre-cleanup)
- [ ] Team notified

### After Deployment
- [ ] All critical path tests passed
- [ ] No console errors
- [ ] User testing completed (1 hour)
- [ ] Monitoring for issues (24 hours)

### Rollback Plan
If issues found:
```bash
# Option 1: Restore from archive
cp -r archive/legacy-html/* public/
git add public/
git commit -m "rollback: restore legacy files"
vercel --prod

# Option 2: Git rollback
git checkout v3.0-pre-cleanup
vercel --prod
```

---

## 🎯 Success Criteria

**Deployment is successful if:**
1. ✅ All SPA routes work correctly
2. ✅ status.html and systemlog.html load properly
3. ✅ Quick actions auto-close correctly
4. ✅ No user-facing errors
5. ✅ No regression in existing features
6. ✅ Performance remains good (< 2s load time)

**Deployment should be rolled back if:**
- ❌ Critical features broken (check-in/check-out)
- ❌ Multiple user reports of errors
- ❌ Data loss or corruption
- ❌ Security vulnerabilities exposed

---

**Last Updated:** December 8, 2025  
**Tester:** AI Agent  
**Next Review:** After 24 hours in production
