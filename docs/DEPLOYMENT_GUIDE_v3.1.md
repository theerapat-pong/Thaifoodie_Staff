# 🚀 Deployment Guide - v3.1.0 Cleanup

**Ready to Deploy:** ✅ All tests passed  
**Commit:** 083d999  
**Git Tag:** v3.0-pre-cleanup (rollback point)

---

## 📋 Pre-Deployment Checklist

- [x] ✅ Files archived to `archive/` folder
- [x] ✅ `vercel build` successful (9s)
- [x] ✅ No syntax errors
- [x] ✅ Documentation updated
- [x] ✅ Git committed
- [x] ✅ Backup tag created

---

## 🚀 Deployment Command

```bash
vercel --prod
```

**Expected Output:**
```
✅  Production deployment successful
🔗  https://staff.thaifoodie.site
```

---

## ✅ Post-Deployment Testing (CRITICAL)

### 1. Test SPA Entry Point (2 minutes)
Open in LINE App:
```
https://liff.line.me/2008633012-xKvPGV8v/
```

**Expected:** Loads spa.html, shows home view

### 2. Test Hash Routing (3 minutes)
Click through these routes:
- ⏰ เข้างาน → `/#check-in` → Auto-submit + Auto-close
- 🏁 ออกงาน → `/#check-out` → Confirmation modal + Auto-close
- 📅 ลางาน → `/#leave` → Leave form
- 💰 เบิกเงิน → `/#advance` → Advance form
- 🏠 เมนูหลัก → `/#home` → Home view

**Expected:** All routes work, no 404 errors, no console errors

### 3. Test Standalone LIFF Pages (2 minutes)

#### Health Status Page
```
https://statushealth.thaifoodie.site
```
**Expected:** Loads status.html, shows health metrics

#### System Logs Page
```
https://systemlog.thaifoodie.site
```
**Expected:** Loads systemlog.html (DEV only), shows logs

### 4. Test Legacy URL Compatibility (2 minutes)
These old URLs should redirect to hash routes:
```
https://staff.thaifoodie.site/check-in.html → /#check-in
https://staff.thaifoodie.site/leave.html → /#leave
https://staff.thaifoodie.site/index.html → /#home
```

**Expected:** All redirect properly, no broken links

### 5. Browser Console Check (1 minute)
Open DevTools (F12) and check:
- [ ] No red errors
- [ ] No 404 network errors
- [ ] LIFF SDK initialized successfully
- [ ] Router logs show correct navigation

---

## 🔍 What Changed in This Deployment

### Files Removed from Production
1. `public/index.html` (legacy landing page) → Archived
2. `debug-css.html` (debug tool) → Archived
3. `public/fouc-test.html` (test file) → Archived

### Files Still Active
1. `public/spa.html` - Main SPA entry point ✅
2. `public/status.html` - Health Status LIFF ✅
3. `public/systemlog.html` - System Logs LIFF ✅

### No Breaking Changes
- ✅ All SPA routes unchanged
- ✅ All API endpoints unchanged
- ✅ vercel.json rewrites unchanged
- ✅ Legacy URL support maintained

---

## ⚠️ Rollback Plan (If Issues Found)

### Quick Rollback (Option 1: Git Revert)
```bash
git revert 083d999
git push origin main
vercel --prod
```

### Full Rollback (Option 2: Use Backup Tag)
```bash
git checkout v3.0-pre-cleanup
vercel --prod
```

### Restore Specific Files (Option 3)
```bash
# Restore index.html
cp archive/legacy-html/index.html public/
git add public/index.html
git commit -m "hotfix: restore index.html"
vercel --prod
```

---

## 📊 Success Metrics

**Deployment is SUCCESSFUL if:**
1. ✅ spa.html loads in < 2 seconds
2. ✅ All hash routes work (#check-in, #leave, etc.)
3. ✅ status.html and systemlog.html load correctly
4. ✅ Quick actions auto-close properly
5. ✅ No user-facing errors
6. ✅ No console errors

**Rollback IMMEDIATELY if:**
- ❌ Users cannot check-in/check-out
- ❌ Multiple 404 errors reported
- ❌ LIFF app won't load
- ❌ Critical features broken

---

## 📝 Monitoring Plan

### First Hour (Critical Monitoring)
- [ ] Watch for user error reports
- [ ] Monitor Vercel logs for errors
- [ ] Check LINE webhook deliveries
- [ ] Test all critical paths manually

### First 24 Hours (Active Monitoring)
- [ ] Check daily cron jobs run successfully
- [ ] Monitor check-in/check-out success rate
- [ ] Review system logs for anomalies
- [ ] Collect user feedback

### After 1 Week (Normal Operations)
- [ ] Confirm no issues reported
- [ ] Verify all features stable
- [ ] Consider deleting archive/ folder (after 1 month)

---

## 🎯 Expected User Impact

**User Experience:**
- ✅ **No visible changes** - App works exactly the same
- ✅ **Same URLs** - Legacy URLs still work via redirect
- ✅ **Same features** - All functionality preserved
- ✅ **Better performance** - Smaller codebase

**Developer Experience:**
- ✅ **Cleaner codebase** - No legacy files cluttering workspace
- ✅ **Clear structure** - Archive folder for old files
- ✅ **Better docs** - Updated README and CLEANUP_REPORT

---

## 📞 Emergency Contacts

If issues arise:
1. Check `docs/POST_CLEANUP_TESTING.md` for test cases
2. Check `docs/CLEANUP_REPORT.md` for rollback instructions
3. Check Vercel deployment logs
4. Revert to v3.0-pre-cleanup tag if needed

---

## ✅ Final Pre-Deploy Verification

Run this command to verify everything is ready:
```powershell
# Check archive exists
ls archive/

# Check active HTML files
ls public/*.html

# Check git status
git log -1 --oneline

# Check git tag
git tag -l "v3.0*"
```

**Expected Output:**
```
archive/legacy-html/index.html ✅
archive/debug-files/debug-css.html ✅
archive/debug-files/fouc-test.html ✅

public/spa.html ✅
public/status.html ✅
public/systemlog.html ✅

083d999 chore: cleanup legacy files after SPA migration (v3.1) ✅

v3.0-pre-cleanup ✅
```

---

**When you're ready, run:**
```bash
vercel --prod
```

**Good luck! 🚀**
