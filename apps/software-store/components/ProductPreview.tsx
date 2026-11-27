import Image from "next/image";
import { CalendarDays, ClipboardList, LayoutDashboard } from "lucide-react";
import type { Product } from "@/lib/shop";
import { productDemos } from "@/lib/product-demos";

const previews: Record<
  string,
  [string, [string, string, string], [number, number, number], string]
> = {
  "met-student": [
    "สรุปทะเบียนนักเรียน",
    ["นักเรียน", "ห้องเรียน", "ย้ายเข้า"],
    [428, 12, 8],
    "ทะเบียนนักเรียนรายห้อง",
  ],
  "met-schedule": [
    "ตารางสอนประจำสัปดาห์",
    ["คาบเรียน", "ครูผู้สอน", "ห้องเรียน"],
    [35, 18, 12],
    "คาบเรียนตามรายวิชา",
  ],
  "met-grades": [
    "บันทึกผลการเรียน",
    ["รายวิชา", "ส่งคะแนน", "รอตรวจ"],
    [24, 19, 5],
    "ความคืบหน้าตามห้อง",
  ],
  "met-assignment": [
    "งานและการบ้าน",
    ["งานที่เปิด", "ส่งแล้ว", "รอตรวจ"],
    [12, 86, 19],
    "การส่งงานรายวิชา",
  ],
  "met-certificate": [
    "ออกเกียรติบัตร",
    ["แม่แบบ", "ผู้รับ", "ออกแล้ว"],
    [4, 68, 52],
    "รายการตามกิจกรรม",
  ],
  "met-inventory": [
    "คลังพัสดุโรงเรียน",
    ["รายการพัสดุ", "คงเหลือต่ำ", "รอเบิก"],
    [142, 8, 12],
    "ความเคลื่อนไหวของคลัง",
  ],
  "met-e-office": [
    "สารบรรณอิเล็กทรอนิกส์",
    ["หนังสือเข้า", "หนังสือออก", "รอส่งต่อ"],
    [28, 16, 4],
    "เอกสารตามหน่วยงาน",
  ],
  "met-library": [
    "ห้องสมุดโรงเรียน",
    ["หนังสือ", "กำลังยืม", "เกินกำหนด"],
    [820, 64, 9],
    "ยอดยืมรายหมวด",
  ],
  "met-parent": [
    "พอร์ทัลผู้ปกครอง",
    ["ประกาศ", "การบ้าน", "กิจกรรม"],
    [3, 5, 2],
    "สรุปข้อมูลรายสัปดาห์",
  ],
  "met-school-shop": [
    "ร้านค้าสวัสดิการโรงเรียน",
    ["สินค้า", "รายการขาย", "เติมสต๊อก"],
    [64, 31, 7],
    "ยอดขายรายหมวด",
  ],
  "met-exam-ai": [
    "คลังข้อสอบ",
    ["คำถาม", "ชุดข้อสอบ", "รอตรวจ"],
    [96, 8, 14],
    "ข้อสอบรายวิชา",
  ],
};

export default function ProductPreview({
  product,
  large = false,
}: {
  product: Pick<Product, "slug" | "name" | "tagline">;
  large?: boolean;
}) {
  const demo = productDemos.find(({ slug }) => slug === product.slug);
  const [title, labels, values, chart] = previews[product.slug] ?? [
    product.tagline,
    ["รายการ", "ดำเนินการแล้ว", "คงเหลือ"],
    [18, 12, 6],
    "ภาพรวมรายการ",
  ];
  return (
    <div className={`market-preview${large ? " market-preview-large" : ""}`}>
      {demo ? (
        <Image
          src={demo.preview}
          alt={demo.previewAlt}
          fill
          quality={85}
          sizes={
            large
              ? "(max-width: 600px) 90vw, 640px"
              : "(max-width: 600px) 90vw, (max-width: 950px) 46vw, 400px"
          }
        />
      ) : (
        <div
          className="market-dashboard-preview"
          role="img"
          aria-label={`หน้าจอจำลอง ${product.name} · ${title}`}
        >
          <aside aria-hidden="true">
            <span className="preview-emblem">M</span>
            <LayoutDashboard size={17} />
            <ClipboardList size={17} />
            <CalendarDays size={17} />
          </aside>
          <div className="preview-overview" aria-hidden="true">
            <header>
              <strong>{product.name}</strong>
              <span>ข้อมูลตัวอย่าง</span>
            </header>
            <b>{title}</b>
            <div className="preview-metrics">
              {labels.map((label, index) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{values[index].toLocaleString("th-TH")}</strong>
                </div>
              ))}
            </div>
            <section className="preview-summary">
              <div className="preview-chart">
                <small>{chart}</small>
                <div>
                  {[46, 65, 55, 77, 60, 90, 70].map((height, index) => (
                    <i
                      key={index}
                      style={{
                        height: `${height + (values[index % values.length] % 10)}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="preview-report">
                <small>สรุปรายการ</small>
                {labels.map((label) => (
                  <span key={label}>
                    <i />
                    {label}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
      <span className="market-ribbon">
        {product.slug === "met-sport"
          ? "แนะนำสำหรับงบโครงการ"
          : demo
            ? "มีหน้าจอเดโม"
            : "หน้าจอจำลอง"}
      </span>
      {product.slug === "met-sport" && (
        <small className="market-sample">ข้อมูลตัวอย่าง</small>
      )}
    </div>
  );
}
