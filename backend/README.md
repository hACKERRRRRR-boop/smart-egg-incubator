# Backend — Smart Egg Incubator

Node.js + Express + PostgreSQL สำหรับ Dashboard 16 ฟอง พร้อม Login, สมัครสมาชิก, อนุมัติผู้ใช้ และปฏิทินเริ่มฟัก

## สถานะ
- ใช้ข้อมูลจำลองที่บันทึกใน PostgreSQL (snapshot จาก seed)
- ยังไม่เชื่อม ESP32, MQTT หรือ AI จริง
- รันเฉพาะ localhost; ยังไม่ได้ deploy ไป public server
- ไฟล์ Dashboard ที่เชื่อม Backend คือ public/index.html
- index.html ที่ root เป็นตัวอย่างสำหรับ GitHub Pages แยกต่างหาก

## เริ่มบน Windows เครื่องใหม่
ติดตั้ง Node.js ที่รองรับคำสั่งใน package.json, PostgreSQL และ Git ก่อน

รันใน PowerShell:
```powershell
git clone --branch backend-development https://github.com/hACKERRRRRR-boop/smart-egg-incubator.git
cd smart-egg-incubator/backend
npm.cmd ci
Copy-Item .env.example .env
```

สร้าง role incubator_app และ database incubator_demo โดยให้ role นี้เป็นเจ้าของฐานข้อมูลใน PostgreSQL ของเครื่องนั้น
ตั้งรหัสผ่านด้วยตัวเอง แล้วเปิดไฟล์ .env ใน VS Code เพื่อใส่ค่าของเครื่องนั้น อย่าพิมพ์เนื้อหา .env ลงใน PowerShell
ดู DATABASE.md สำหรับการตั้งค่าการเชื่อมต่อ และ LOGIN.md สำหรับบัญชีเว็บไซต์

เมื่อฐานข้อมูลและ .env พร้อม รัน:
```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run auth:create-user
npm.cmd run dev
```

เปิด http://127.0.0.1:3000/ และเปิด Terminal ค้างไว้
auth:create-user ใช้สร้างผู้ดูแลครั้งแรก เลือกรหัสผ่าน 8–256 ตัวอักษรด้วยตัวเอง
บัญชีจากหน้า /register ต้องได้รับการอนุมัติโดยผู้ดูแลก่อน
หากลืมรหัสผ่าน ใช้ npm.cmd run auth:reset-password ในโฟลเดอร์ backend

## พัฒนาจากหลายเครื่อง
ใช้ git pull ก่อนแก้ไข จากนั้น commit และ push ไปยัง branch ที่ทำงาน
แต่ละเครื่องมี .env และฐานข้อมูลของตัวเอง GitHub เก็บโค้ด ไม่ซิงก์บัญชีผู้ใช้หรือข้อมูล PostgreSQL
ห้าม commit .env, node_modules, ไฟล์สำรองฐานข้อมูล หรือรหัสผ่านจริง
เครื่องเดิมที่โหลด ZIP จะยังใช้ git pull ไม่ได้ ให้ clone ลงโฟลเดอร์ใหม่ก่อน

## ทดสอบ
```powershell
npm.cmd test
```

## API
- GET /api/health (สาธารณะ ตรวจ Backend และการเชื่อมต่อฐานข้อมูล)
- GET /api/incubators/1/status
- GET /api/incubators/1/sensors/latest
- GET /api/incubators/1/sensors/history?limit=40
- GET /api/incubators/1/eggs
- GET /api/incubators/1/eggs/4
- PATCH /api/incubators/1/batch (เฉพาะผู้ดูแล)

API ข้อมูลตู้ต้อง Login; วันที่เริ่มฟักแก้ได้เฉพาะผู้ดูแล
GitHub Pages ไม่รัน Node.js หรือ PostgreSQL จึงไม่ใช้เป็นที่ให้บริการ Backend
