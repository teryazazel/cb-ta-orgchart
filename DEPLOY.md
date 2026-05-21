# Deployment Guide — ขึ้นระบบออนไลน์

ระบบนี้เป็น **static web app** (HTML + JS + CSS เท่านั้น) ไม่ต้องมี server
backend สามารถ host ที่ไหนก็ได้ที่ serve static files ได้

## ✅ สิ่งที่ทำได้บนเวอร์ชันออนไลน์

- ใช้งานเต็มฟีเจอร์เหมือนใน localhost
- เข้าถึงได้จากทุกที่ผ่าน URL
- ข้อมูลทั้งหมดเก็บใน **localStorage ของเบราว์เซอร์ที่ใช้**

## ⚠️ ข้อจำกัด (ในเวอร์ชันนี้)

- **ข้อมูลไม่ sync ข้ามอุปกรณ์** — แต่ละเครื่อง/เบราว์เซอร์มีข้อมูลของตัวเอง
- **ไม่มีระบบล็อกอิน** — ใครเข้า URL ก็แก้ได้
- **ไม่มี collaborative editing** — แก้คนเดียวต่อ session

> ถ้าต้องการ multi-user / sync ข้อมูลเหมือนกันทั้งทีม ต้องเพิ่ม backend
> (Firebase / Supabase / API ของตัวเอง) — เป็นโปรเจคแยกอีกชั้น

---

## 🚀 วิธี deploy (เลือก 1 วิธี)

### วิธีที่ 1: Netlify Drop ⭐ ง่ายที่สุด (ไม่ต้องสมัครก็ได้)

1. ไปที่ https://app.netlify.com/drop
2. **ลากโฟลเดอร์ `ORG` ทั้งโฟลเดอร์** ลงในกรอบบนเว็บ
3. รอ ~30 วินาที → ได้ URL เช่น `https://amazing-cat-12345.netlify.app`
4. คลิกเข้าใช้งานได้เลย

   *(ถ้าอยากเปลี่ยนชื่อ subdomain ให้สมัคร Netlify ฟรีและ claim site แล้ว
   rename ใน Site settings)*

### วิธีที่ 2: Vercel

1. สมัครที่ https://vercel.com (login ด้วย GitHub/Email)
2. คลิก **Add New → Project**
3. ลือกเลือก **"Browse all templates"** → กดข้าม
4. ใช้ Vercel CLI:
   ```powershell
   npm i -g vercel
   cd "C:\Users\Sakdipat\Desktop\CB TA\ORG"
   vercel
   ```
5. ตอบคำถาม:
   - Set up and deploy? **Y**
   - Which scope? เลือก account
   - Link to existing project? **N**
   - Project name? `org-chart` (หรือชื่ออื่น)
   - In which directory? `./`
   - Override settings? **N**

### วิธีที่ 3: GitHub Pages (มี version control)

1. สร้าง repo บน GitHub (`org-chart`)
2. Push โค้ดขึ้นไป:
   ```powershell
   cd "C:\Users\Sakdipat\Desktop\CB TA\ORG"
   git init
   git add .
   git commit -m "Initial org chart app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/org-chart.git
   git push -u origin main
   ```
3. ใน GitHub repo → **Settings → Pages** → Source: **main** branch, folder: `/ (root)`
4. รอ ~1 นาที → URL: `https://YOUR-USER.github.io/org-chart/`

### วิธีที่ 4: Cloudflare Pages

1. ไปที่ https://pages.cloudflare.com
2. **Create a project → Direct upload** → ลากโฟลเดอร์
3. ตั้งชื่อ project → Deploy
4. ได้ URL `https://org-chart.pages.dev`

---

## 📋 Checklist ก่อน deploy

- [x] `index.html` อยู่ใน root (เป็น entry point)
- [x] โฟลเดอร์ `src/` มีไฟล์ JS/CSS ครบ
- [x] CDN ของ React/Babel ใช้ HTTPS แล้ว (จาก unpkg.com)
- [x] localStorage ทำงานบน HTTPS

## 🔧 ถ้ามีปัญหาหลัง deploy

**ไม่ load:** เปิด DevTools (F12) → tab Console — ดู error
- ถ้าเห็น CORS error: เกิดน้อยมาก เพราะ unpkg.com support cross-origin อยู่แล้ว
- ถ้าเห็น 404 บนไฟล์ใน `src/`: ตรวจชื่อไฟล์ (case-sensitive บน Linux server)

**ข้อมูลหาย:** localStorage แยกตาม domain — ถ้าเปลี่ยน URL ข้อมูลเก่าจะอยู่
ที่ URL เดิม ให้ export/import ผ่าน DevTools (`localStorage` object) ถ้าจะย้าย

## 💡 ขั้นถัดไป (ถ้าต้องการระดับ enterprise)

1. **เพิ่ม auth** — Firebase Auth / Auth0 / Clerk
2. **เพิ่ม database** — Firestore / Supabase ให้ทุกคนเห็นข้อมูลเดียวกัน
3. **Real-time sync** — WebSocket / Supabase Realtime
4. **Custom domain** — เช่น `orgchart.yourcompany.com`

แจ้งได้ครับถ้าอยากให้ช่วยขั้นนี้ — เป็นงานเพิ่มเติมที่ใหญ่กว่าเดิมพอสมควร
