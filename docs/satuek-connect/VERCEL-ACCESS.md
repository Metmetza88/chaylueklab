# การแก้สิทธิ์ Vercel สำหรับ Satuek Connect

วันที่ตรวจสอบ: 22 พฤศจิกายน 2569

โค้ดและ PR พร้อมแล้ว แต่การสร้าง HTTPS Preview ติดสิทธิ์ของบริการ Vercel ไม่ใช่ build ของแอป การตรวจ GitHub CI ของ commit `ee4f4e93c696134da1836006c06eecf023c51046` ผ่านทั้ง CodeQL, source/unit checks และ Control Center

## หลักฐานข้อผิดพลาด

ลองสร้างโปรเจกต์แยกหนึ่งครั้งด้วยการเชื่อมต่อ Vercel ที่มีอยู่:

- การทำงาน: `POST /v11/projects`
- ทีม: `waramatw2546-4532` (`team_kA0EAug4JrrTT6ZIc54RXcmL`)
- ชื่อโปรเจกต์: `satuek-connect`
- GitHub Repository: `Metmetza88/chaylueklab` (Repository เดิม)
- Root Directory: `satuek-connect`
- Framework: static HTML / Other
- Install Command: ว่าง, Build Command: ว่าง, Output Directory: `.`
- ผล: `403 forbidden` — `You don't have permission to create the project.`
- Request ID: `iad1:sin1:iad1:sfo1::b2cv2-1795309977878-8be113ba15d1`

ไม่สร้างโปรเจกต์สำเร็จ ไม่เกิด deployment และไม่แก้ Production เดิม ไม่วนเรียกสร้างซ้ำหลัง 403

การอ่านรายชื่อทีมสำเร็จ แต่รายชื่อโปรเจกต์ว่างทั้ง personal scope และทีมที่ระบุ ผลนี้ยังไม่บอกสาเหตุแน่ชัดว่าเกิดจากบทบาทผู้ใช้หรือขอบเขตสิทธิ์ของการเชื่อมต่อ จึงไม่อ้างว่าการลงชื่อเข้าใช้อีกครั้งอย่างเดียวจะแก้ปัญหาได้

ไม่มี Vercel CLI ที่ลงชื่อเข้าใช้หรือ credentials สำหรับใช้ CLI แทน และไม่มี browser-control tool ที่เข้าถึง session ที่ลงชื่อเข้าใช้ให้เรียกในรอบนี้ ไม่อ่าน คัดลอก หรือเปิดเผย Secret เพื่อหาทางข้ามข้อจำกัด

## สิ่งที่เจ้าของทีมต้องทำ

เปิด [ทีม Vercel เดิม](https://vercel.com/waramatw2546-4532) ด้วยบัญชีเจ้าของหรือผู้ดูแล แล้วเลือกแนวทางหนึ่ง:

1. ตรวจสิทธิ์บัญชีและการเชื่อมต่อที่ใช้กับ ChatGPT ให้มีสิทธิ์สร้างโปรเจกต์ (`CreateProject`) ในทีมนี้ และเข้าถึงโปรเจกต์ที่เกี่ยวข้องได้ หรือ
2. ให้เจ้าของสร้างโปรเจกต์แยกชื่อ `satuek-connect` โดยใช้ Repository เดิม แล้วให้การเชื่อมต่อเข้าถึงและ Deploy เฉพาะโปรเจกต์ใหม่นี้ ส่ง URL ของโปรเจกต์กลับมาได้ โดยไม่ส่ง Token/Secret

ห้ามสร้าง GitHub Repository ใหม่ ห้ามใช้ Clone Template ที่สร้าง Repository สำเนา และไม่เปลี่ยน settings ของโปรเจกต์ CHAYLUEKLAB/WORAMET เดิม

## ค่าที่เตรียมพร้อมสำหรับ Preview

| รายการ | ค่า |
| --- | --- |
| Repository | `Metmetza88/chaylueklab` |
| Branch ที่มีแอป | `feature/satuek-connect` |
| โค้ดที่ทดสอบแล้ว | `280bc66` (commit เอกสารต่อมาคือ `ee4f4e9`) |
| Root Directory | `satuek-connect` |
| Framework | Other / static HTML |
| Install / Build Command | ว่าง / ไม่ต้องติดตั้งหรือ compile ตอน Deploy |
| Output Directory | `.` |
| Target ครั้งถัดไป | Preview |
| API Keys / Environment Variables สำหรับเดโม | ไม่ต้องใช้ |

ต้องใช้ source จาก branch นี้ซึ่งมีโฟลเดอร์แอปอยู่จริง ไม่ deploy จาก `main` ที่ยังไม่ได้ merge PR #53 เมื่อแยกโปรเจกต์โดยใช้ Root Directory ดังกล่าว แอปจะเปิดที่ `/` ของ Preview ไม่ต้องเติม `/satuek-connect/` ส่วนการรวมกับ build ของ Repository เดิมยังคงใช้ `/satuek-connect/` ตามเดิม

หลังแก้สิทธิ์แล้วจึงสร้าง Preview ตรวจสถานะ READY ตรวจ HTTPS และรัน Playwright กับ URL จริงก่อนส่งมอบลิงก์ ไม่อ้างว่า deploy สำเร็จจากการมีโค้ดหรือ PR อย่างเดียว

[Pull Request #53](https://github.com/Metmetza88/chaylueklab/pull/53) · [คู่มือแอป](README.md) · [รายงานทดสอบ](DELIVERY.md)
