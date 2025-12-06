# Rich Menu Setup Guide

## Rich Menu Configuration for LIFF Integration

### Step 1: Create Rich Menu Image

สร้างรูปภาพ Rich Menu ขนาด **2500 x 1686 pixels** หรือ **1200 x 810 pixels**

**Layout แนะนำ (2x3 Grid):**
```
+------------------+------------------+
|    ⏰ เข้างาน    |    🏁 ออกงาน     |
+------------------+------------------+
|    📅 ลางาน     |    💰 เบิกเงิน    |
+------------------+------------------+
|    📊 ดูยอดเงิน  |    ⚙️ เมนูหลัก   |
+------------------+------------------+
```

### Step 2: Create Rich Menu via LINE Developers Console

1. ไปที่ https://developers.line.biz/console/
2. เลือก Channel ของคุณ
3. ไปที่ "Messaging API" > "Rich Menu"
4. คลิก "Create"
5. อัปโหลดรูปภาพ
6. กำหนด Actions ตามด้านล่าง

### Step 3: Rich Menu Actions Configuration

**LIFF ID:** `2008633012-xKvPGV8v`
**LIFF Base URL:** `https://liff.line.me/2008633012-xKvPGV8v`

| Position | Label | Action Type | URI |
|----------|-------|-------------|-----|
| Top-Left | เข้างาน | uri | `https://liff.line.me/2008633012-xKvPGV8v/check-in.html` |
| Top-Right | ออกงาน | uri | `https://liff.line.me/2008633012-xKvPGV8v/check-out.html` |
| Middle-Left | ลางาน | uri | `https://liff.line.me/2008633012-xKvPGV8v/leave.html` |
| Middle-Right | เบิกเงิน | uri | `https://liff.line.me/2008633012-xKvPGV8v/advance.html` |
| Bottom-Left | ดูยอดเงิน | uri | `https://liff.line.me/2008633012-xKvPGV8v/balance.html` |
| Bottom-Right | เมนูหลัก | uri | `https://liff.line.me/2008633012-xKvPGV8v/` |

### Alternative: Create Rich Menu via API

```bash
# 1. Create Rich Menu
curl -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "size": {
      "width": 2500,
      "height": 1686
    },
    "selected": true,
    "name": "Thaifoodie Staff Menu",
    "chatBarText": "📱 เมนู",
    "areas": [
      {
        "bounds": {"x": 0, "y": 0, "width": 1250, "height": 562},
        "action": {"type": "uri", "uri": "https://liff.line.me/2008633012-xKvPGV8v/check-in.html"}
      },
      {
        "bounds": {"x": 1250, "y": 0, "width": 1250, "height": 562},
        "action": {"type": "uri", "uri": "https://liff.line.me/2008633012-xKvPGV8v/check-out.html"}
      },
      {
        "bounds": {"x": 0, "y": 562, "width": 1250, "height": 562},
        "action": {"type": "uri", "uri": "https://liff.line.me/2008633012-xKvPGV8v/leave.html"}
      },
      {
        "bounds": {"x": 1250, "y": 562, "width": 1250, "height": 562},
        "action": {"type": "uri", "uri": "https://liff.line.me/2008633012-xKvPGV8v/advance.html"}
      },
      {
        "bounds": {"x": 0, "y": 1124, "width": 1250, "height": 562},
        "action": {"type": "uri", "uri": "https://liff.line.me/2008633012-xKvPGV8v/balance.html"}
      },
      {
        "bounds": {"x": 1250, "y": 1124, "width": 1250, "height": 562},
        "action": {"type": "uri", "uri": "https://liff.line.me/2008633012-xKvPGV8v/"}
      }
    ]
  }'

# 2. Upload Rich Menu Image
# Response จากคำสั่งบน จะได้ richMenuId
curl -X POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: image/png" \
  --data-binary @richmenu.png

# 3. Set as Default Rich Menu
curl -X POST https://api.line.me/v2/bot/user/all/richmenu/{richMenuId} \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}"
```

### Admin Rich Menu (Optional)

สำหรับ Admin สามารถสร้าง Rich Menu แยกที่มีเมนู "จัดการคำขอ" เพิ่มเติม:

```json
{
  "bounds": {"x": 1250, "y": 1124, "width": 1250, "height": 562},
  "action": {"type": "uri", "uri": "https://liff.line.me/2008633012-xKvPGV8v/admin.html"}
}
```

### Switching Rich Menu per User

```javascript
// ตั้ง Rich Menu สำหรับ User เฉพาะคน
const line = require('@line/bot-sdk');

async function setUserRichMenu(userId, richMenuId) {
  await client.linkRichMenuToUser(userId, richMenuId);
}
```

---

## Notes

- Rich Menu จะแสดงที่ด้านล่างของหน้าจอ Chat
- ผู้ใช้สามารถกดเปิด/ปิดได้
- **ทุกเมนูใช้ LIFF URL** เพื่อลด LINE Messaging API Quota
- หน้า check-in.html และ check-out.html จะทำงานอัตโนมัติเมื่อเปิด
- ไม่ต้องใช้ message type อีกต่อไป
