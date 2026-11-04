# PostgreSQL demo — ขั้นที่ 2

## ตั้งค่าในเครื่อง (ห้ามส่งรหัสผ่านเข้าแชตหรือ GitHub)

หยุด dev server ด้วย Ctrl+C ก่อนติดตั้ง dependencies แล้วรันจากโฟลเดอร์ backend:

```powershell
npm.cmd ci
```

แก้ .env ที่มีอยู่ให้มีค่าเหล่านี้ โดยใส่รหัสผ่าน incubator_app ของคุณเอง:

```dotenv
HOST=127.0.0.1
PORT=3000
DATA_SOURCE=mock
DATA_STORE=postgres
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=incubator_demo
PGUSER=incubator_app
PGPASSWORD="your-local-password"
```

ค่ารหัสผ่านที่มี # ต้องอยู่ในเครื่องหมายคำพูด อย่าคัดลอกรหัสตัวอย่างไปใช้
หากรหัสมีเครื่องหมาย double quote ให้ใช้ single quote ครอบแทน
เราไม่เขียนทับ .env ของคุณอัตโนมัติ

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

migrate สร้างตารางและบันทึกเวอร์ชัน รันซ้ำได้; seed เติมตู้ 1 ตู้ รอบจำลอง 1 รอบ ไข่ 16 ฟอง ผล AI จำลอง 16 ผล และประวัติเซนเซอร์ 40 รายการ
seed ทำงานครั้งเดียวและไม่ล้างข้อมูลเดิม การรันซ้ำไม่รีเซ็ตวันที่หรือข้อมูล
รอบจำลองเริ่มวันที่ seed ตามเวลา Asia/Bangkok ไม่ได้ดึง localStorage จาก Dashboard
ประวัติเซนเซอร์เป็น snapshot ที่บันทึกตอน seed ยังไม่มีตัวจำลองเขียนค่าต่อเนื่อง ดังนั้น latest ไม่เปลี่ยนเองทุก 3 วินาทีในโหมด postgres

## ตรวจผล

GET /api/health ต้องแสดง storage=postgres, database.status=connected และ source=mock
ถ้าเชื่อมต่อไม่ได้หรือยังไม่ได้ migrate จะได้ HTTP 503 และ database.status=unavailable
GET /api/incubators/1/eggs ต้องได้ 16 ฟอง หลัง seed
หากเชื่อมฐานข้อมูลใหม่ที่ยังไม่มี seed ค่า latest เป็น null และ eggs/history เป็น []
โหมดนี้ไม่รองรับข้อมูลจริง ไม่เปิดพอร์ตสาธารณะ ไม่เชื่อม MQTT/ESP32 ไม่สร้างคำสั่งควบคุมฮาร์ดแวร์

## ตาราง

- incubators: ตู้ฟัก
- incubation_batches: รอบฟัก วันเริ่ม สถานะ และแหล่งข้อมูล
- eggs: ช่องไข่ 1–16 ในแต่ละรอบ (ห้ามซ้ำภายในรอบ)
- sensor_readings: อุณหภูมิ ความชื้น เวลา UTC และ source
- device_states: สถานะอุปกรณ์ล่าสุดพร้อมเวลาที่รายงาน
- ai_results: ผลวิเคราะห์แต่ละครั้ง อ้างอิงไข่และเก็บประวัติ
- schema_migrations / seed_runs: ป้องกันสร้าง schema หรือ seed ซ้ำ

API /eggs/:eggId ยังหมายถึงหมายเลขช่อง 1–16 ของรอบ active เพื่อรักษาสัญญา API เดิม
eggRecordId เป็นรหัสถาวรใน DB และ batchId ระบุรอบฟัก
ข้อมูลจำลองเก็บใน incubator_demo เท่านั้น ฐานข้อมูลจริงจะเตรียมแยกในขั้นถัดไป

## ปัญหาที่พบบ่อย

- 28P01: รหัสผ่านหรือชื่อผู้ใช้ไม่ถูกต้อง
- 3D000: ยังไม่มีฐานข้อมูล incubator_demo
- ECONNREFUSED: PostgreSQL ไม่ทำงานหรือ port ไม่ตรง
- 42P01: ยังไม่ได้รัน db:migrate
- EADDRINUSE: มี Backend อีกตัวใช้ port 3000 อยู่ ให้หยุดตัวเก่าก่อน

## Dashboard บนเครื่องนี้

เปิด http://127.0.0.1:3000/ ขณะ Backend ทำงาน
Express ให้บริการเฉพาะ backend/public/index.html ไม่เปิดโฟลเดอร์โปรเจกต์หรือไฟล์ .env ผ่านเว็บ
Dashboard อ่าน API ทุก 3 วินาที ไม่มีการสุ่มค่าเซนเซอร์ในเบราว์เซอร์
ค่าเซนเซอร์ยังเป็น snapshot จำลองที่บันทึกตอน seed พร้อมแสดงเวลาบันทึก ไม่ใช่ข้อมูลสดจากอุปกรณ์
หาก API ใช้งานไม่ได้ หน้าเว็บแจ้งข้อผิดพลาดและระบุว่าข้อมูลเดิมโหลดเมื่อใด
ปฏิทินอ่านรอบ active จาก PostgreSQL และบันทึกวันเริ่มด้วย PATCH /api/incubators/1/batch
body ต้องเป็น JSON {batchId: <รหัสรอบ>, startDate: "YYYY-MM-DD"} วันที่ต้องถูกต้องและรอบต้องยัง active
การแก้วันเริ่มเป็นการแก้รอบเดิม ไม่สร้างรอบใหม่และไม่ลบประวัติไข่
ปุ่มส่องไฟเป็นตัวอย่างแอนิเมชันเท่านั้น ไม่สั่งฮาร์ดแวร์
ไฟล์ index.html ที่ root และ GitHub Pages เดิมยังไม่เปลี่ยน Backend อยู่ใน branch backend-development และยังไม่ได้ deploy
