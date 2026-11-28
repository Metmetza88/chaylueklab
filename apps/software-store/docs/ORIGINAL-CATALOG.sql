insert into public.products(slug,name,description,category,price,published) values
('met-admission','ระบบรับสมัครนักเรียน','แผนพัฒนา ยังไม่พร้อมขาย','template',1490,false),
('met-student','ทะเบียนนักเรียน','แผนพัฒนา ยังไม่พร้อมขาย','template',990,false),
('met-attendance','เช็กชื่อและการลา','แผนพัฒนา ยังไม่พร้อมขาย','template',790,false),
('met-certificate','เกียรติบัตร','แผนพัฒนา ยังไม่พร้อมขาย','template',490,false),
('met-exam','สร้างข้อสอบ AI','แผนพัฒนา ยังไม่พร้อมขาย','template',790,false),
('met-grades','คะแนนและเกรด','แผนพัฒนา ยังไม่พร้อมขาย','template',990,false),
('met-schedule','ตารางเรียน','แผนพัฒนา ยังไม่พร้อมขาย','template',990,false),
('met-assign','ส่งงานออนไลน์','แผนพัฒนา ยังไม่พร้อมขาย','template',590,false),
('met-office','สารบรรณ','แผนพัฒนา ยังไม่พร้อมขาย','template',1990,false),
('met-inventory','พัสดุและครุภัณฑ์','แผนพัฒนา ยังไม่พร้อมขาย','template',1490,false),
('met-sport','กีฬาสี','แผนพัฒนา ยังไม่พร้อมขาย','template',990,false),
('met-library','ห้องสมุด','แผนพัฒนา ยังไม่พร้อมขาย','template',990,false),
('met-lunch','อาหารกลางวัน','แผนพัฒนา ยังไม่พร้อมขาย','template',790,false),
('met-parent','ข่าวสารผู้ปกครอง','แผนพัฒนา ยังไม่พร้อมขาย','template',990,false),
('met-uniform','สั่งชุดนักเรียน','แผนพัฒนา ยังไม่พร้อมขาย','template',990,false)
on conflict(slug) do nothing;
