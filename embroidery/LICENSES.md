# Dependency license review — 23 พฤศจิกายน 2026

ตรวจใบอนุญาตจาก wheel metadata และไฟล์ LICENSE ของเวอร์ชันที่ติดตั้งจริงใน `requirements.txt` แล้ว เก็บสำเนาไว้ใน `embroidery/licenses/` โมดูลนี้ไม่ใช้ Wilcom SDK, โค้ด/รูปภาพจาก Wilcom หรือเครื่องมือสร้าง EMB

| Dependency | Version | License หลัก | ใช้ทำอะไร |
| --- | --- | --- | --- |
| Pillow | 12.0.0 | MIT-CMU / PIL permissive license | PNG/JPEG, EXIF orientation, foreground palette quantization |
| NumPy | 2.2.6 | BSD-3-Clause | masks และ geometry |
| opencv-python-headless | 4.12.0.88 | wrapper MIT; OpenCV Apache-2.0 | connected components, contours, morphology, affine clipping |
| pyembroidery | 1.5.1 | MIT | เขียน/อ่าน DST, PES, JEF จริง |

ใบอนุญาตเหล่านี้อนุญาตการใช้งานและปรับแต่งตามเงื่อนไขของแต่ละไลบรารี ต้องเก็บ copyright / license notices เมื่อแจกจ่ายซอฟต์แวร์หรือ binary dependencies

Binary wheels มี dependencies เพิ่มเติม: NumPy มี OpenBLAS และ GCC runtimes (รวม Runtime Library Exception) / libquadmath; OpenCV wheel มี FFmpeg ภายใต้ LGPL-2.1 และไลบรารีภาพอื่น ๆ ดูข้อความฉบับเต็มในไฟล์ LICENSE ของแต่ละ wheel ที่คัดลอกไว้ หากแจกจ่าย binaries ต้องจัดการ notices, corresponding sources / relinking ตามเงื่อนไขที่ใช้ ไม่ควรเรียกรวมว่า dependencies ทั้งหมดเป็น MIT ไฟล์แหล่งที่มาของ OpenCV wheel: https://github.com/opencv/opencv-python/tree/4.12.0.88

Frontend ใช้ Canvas / JavaScript ที่เขียนใหม่ และเรียกฟอนต์ Manrope / IBM Plex Sans Thai จาก Google Fonts (SIL Open Font License; ไม่ได้ bundle font binary) เมื่อไม่โหลดฟอนต์ใช้ system fonts แทน รูปตัวอย่างเป็นเรขาคณิตที่สร้างเองใน `make_samples.py` ไม่ใช่ตราโรงเรียนบ้านระหาร

Playwright 1.64.1 (Apache-2.0) ใช้สำหรับทดสอบเท่านั้น ไม่ใช่ runtime dependency ของเว็บไซต์
