import type { Product } from "@/lib/shop";
import styles from "./product-preview.module.css";

const examples: Record<string, [string, string, string]> = {
  "met-student": [
    "ม.1/1 · ห้องเรียนตัวอย่าง",
    "ม.1/2 · ห้องเรียนตัวอย่าง",
    "ม.2/1 · ห้องเรียนตัวอย่าง",
  ],
  "met-schedule": [
    "08:30 · คณิตศาสตร์",
    "09:30 · ภาษาไทย",
    "10:30 · วิทยาศาสตร์",
  ],
  "met-grades": [
    "คณิตศาสตร์ · 85 คะแนน",
    "ภาษาไทย · 78 คะแนน",
    "วิทยาศาสตร์ · 92 คะแนน",
  ],
  "met-assignment": [
    "แบบฝึกหัดบทที่ 1 · ส่งแล้ว",
    "โครงงานกลุ่ม · รอตรวจ",
    "รายงานท้ายบท · เปิดรับงาน",
  ],
  "met-certificate": [
    "รางวัลชนะเลิศ · ร่าง",
    "ผู้เข้าร่วม · พร้อมพิมพ์",
    "ครูผู้ฝึกสอน · พร้อมพิมพ์",
  ],
  "met-inventory": [
    "โต๊ะนักเรียน · 30 ตัว",
    "เครื่องฉาย · 2 เครื่อง",
    "เครื่องพิมพ์ · 1 เครื่อง",
  ],
  "met-e-office": [
    "หนังสือรับ · รอลงทะเบียน",
    "หนังสือส่ง · ร่าง",
    "คำสั่งโรงเรียน · ลงนามแล้ว",
  ],
  "met-library": [
    "นิทานวิทยาศาสตร์ · พร้อมยืม",
    "แผนที่ประเทศไทย · ถูกยืม",
    "ภาษาไทยอ่านสนุก · พร้อมยืม",
  ],
  "met-parent": [
    "ประกาศประชุมผู้ปกครอง",
    "แจ้งเตือนการมาเรียน",
    "กำหนดส่งงานสัปดาห์นี้",
  ],
  "met-school-shop": [
    "เสื้อนักเรียน · ไซซ์ M",
    "ชุดพละ · ไซซ์ L",
    "ชุดเครื่องเขียน · 1 ชุด",
  ],
  "met-exam-ai": [
    "ปรนัย · 10 ข้อ",
    "อัตนัย · 3 ข้อ",
    "เฉลยและเกณฑ์ให้คะแนน · ร่าง",
  ],
};

export default function ProductPreview({
  product,
}: {
  product: Pick<Product, "slug" | "name" | "tagline" | "features">;
}) {
  const rows = examples[product.slug] ?? product.features;
  return (
    <div className={styles.screen}>
      <div className={styles.toolbar}>
        <strong>{product.name}</strong>
        <span>ข้อมูลสมมติ</span>
      </div>
      <div className={styles.workspace}>
        <aside aria-hidden="true">
          <strong>ภาพรวม</strong>
          {product.features.slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </aside>
        <div className={styles.content}>
          <strong>{product.tagline}</strong>
          <ul>
            {rows.slice(0, 3).map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
