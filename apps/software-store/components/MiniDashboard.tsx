import QRCode from "qrcode";
import Image from "next/image";

type Metric = {
  label: string;
  value: string;
  level?: number;
  tone?: "blue" | "gold" | "green";
};
type Dashboard = {
  title: string;
  metrics: Metric[];
  columns: string[];
  rows: string[][];
};

const dashboards: Record<string, Dashboard> = {
  "met-sport": {
    title: "คะแนนรวมกีฬาสี",
    metrics: [
      { label: "ฟ้า", value: "86", level: 86, tone: "blue" },
      { label: "ทอง", value: "75", level: 75, tone: "gold" },
      { label: "เขียว", value: "62", level: 62, tone: "green" },
    ],
    columns: ["เวลา", "รายการ", "สนาม"],
    rows: [
      ["09:00", "วิ่ง 100 ม. · รอบชิง", "ลู่วิ่ง"],
      ["10:30", "วอลเลย์บอล · ฟ้า / ทอง", "สนาม 2"],
    ],
  },
  "met-e-office": {
    title: "ทะเบียนหนังสือราชการ",
    metrics: [
      { label: "หนังสือรับ", value: "28", level: 72 },
      { label: "หนังสือส่ง", value: "14", level: 48 },
      { label: "รออนุมัติ", value: "4", level: 26 },
    ],
    columns: ["เลขที่", "เรื่อง", "สถานะ"],
    rows: [
      ["รับ 042", "ประชุมเครือข่าย", "รออนุมัติ"],
      ["ส่ง 018", "รายงานผลกิจกรรม", "เกษียนหนังสือแล้ว"],
    ],
  },
  "met-grades": {
    title: "สมุดคะแนน · คณิตศาสตร์",
    metrics: [
      { label: "เฉลี่ย", value: "79%", level: 79 },
      { label: "บันทึกแล้ว", value: "30/30", level: 100 },
      { label: "คำนวณเกรด", value: "อัตโนมัติ" },
    ],
    columns: ["รหัส", "เก็บ", "กลาง", "ปลาย", "รวม", "เกรด"],
    rows: [
      ["001", "35", "22", "25", "82", "4"],
      ["002", "32", "21", "24", "77", "3.5"],
    ],
  },
  "met-inventory": {
    title: "ครุภัณฑ์และเบิกจ่าย",
    metrics: [
      { label: "คอมพิวเตอร์", value: "42", level: 82 },
      { label: "โต๊ะเรียน", value: "28", level: 57 },
      { label: "อุปกรณ์สอน", value: "16", level: 34 },
    ],
    columns: ["วัสดุ", "รายการ", "จำนวน"],
    rows: [
      ["กระดาษ A4", "จ่าย", "−5 รีม"],
      ["หมึกพิมพ์", "รับเข้า", "+2 กล่อง"],
    ],
  },
  "met-library": {
    title: "ยืม–คืนหนังสือ",
    metrics: [
      { label: "กำลังยืม", value: "32", level: 78 },
      { label: "คืนวันนี้", value: "12", level: 53 },
      { label: "เกินกำหนด", value: "2", level: 17 },
    ],
    columns: ["หนังสือยอดนิยม", "ยืมเดือนนี้", "ล่าสุด"],
    rows: [
      ["โลกใต้ทะเล", "18 ครั้ง", "ยืม"],
      ["นิทานเมืองดาว", "15 ครั้ง", "คืน"],
    ],
  },
  "met-schedule": {
    title: "ตารางเรียน · ม.2/1",
    metrics: [
      { label: "คาบสัปดาห์นี้", value: "30" },
      { label: "กลุ่มสาระ", value: "8" },
    ],
    columns: ["วัน", "08:30", "09:30", "10:30"],
    rows: [
      ["จันทร์", "คณิต", "ภาษาไทย", "วิทย์"],
      ["อังคาร", "อังกฤษ", "วิทย์", "คณิต"],
      ["พุธ", "ภาษาไทย", "สังคม", "อังกฤษ"],
    ],
  },
  "met-school-shop": {
    title: "จองชุดนักเรียน",
    metrics: [
      { label: "รับจองวันนี้", value: "24", level: 65 },
      { label: "จัดชุดแล้ว", value: "18", level: 49 },
      { label: "รอรับ", value: "6", level: 20 },
    ],
    columns: ["รายการ", "ขนาด", "จำนวน"],
    rows: [
      ["เสื้อนักเรียน", "34 / 36 / 38", "1 ตัว"],
      ["ชุดพละ", "S / M / L", "1 ชุด"],
    ],
  },
  "met-student": {
    title: "บัตรประวัติ · นักเรียนตัวอย่าง 001",
    metrics: [
      { label: "มาเรียน", value: "92%", level: 92 },
      { label: "สาย", value: "3 วัน", level: 18 },
      { label: "ลา", value: "1 วัน", level: 9 },
    ],
    columns: ["รหัส", "ระดับชั้น", "สถานะ"],
    rows: [
      ["MET-001", "ม.2/1", "กำลังศึกษา"],
      ["2569/2", "เลขที่ 01", "สรุปรายเทอม"],
    ],
  },
  "met-assignment": {
    title: "งานที่มอบหมาย · ม.2/1",
    metrics: [
      { label: "มอบหมาย", value: "6" },
      { label: "ส่งรวม", value: "83%", level: 83 },
      { label: "รอตรวจ", value: "11", level: 30 },
    ],
    columns: ["ชื่องาน", "กำหนดส่ง", "อัตราส่ง"],
    rows: [
      ["แบบฝึกหัดเศษส่วน", "12 ธ.ค.", "90%"],
      ["แผนภาพระบบสุริยะ", "15 ธ.ค.", "75%"],
    ],
  },
};

const certificateQr = () =>
  QRCode.toDataURL("MET-CERT-DEMO-2569-001", { width: 64, margin: 1 });

export default async function MiniDashboard({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const data = dashboards[slug];
  const special = ["met-certificate", "met-exam-ai", "met-parent"].includes(
    slug,
  );
  if (!data && !special)
    return (
      <div className="mini-dashboard">
        <strong>{name}</strong>
        <span>ภาพแนวคิด · ข้อมูลสมมติ</span>
      </div>
    );
  return (
    <div className={`mini-dashboard preview-${slug}`}>
      <div className="mini-top">
        <span className="mini-lights">● ● ●</span>
        <strong>{name}</strong>
        <span>ข้อมูลสมมติ</span>
      </div>
      {data && (
        <div className="mini-body">
          <b>{data.title}</b>
          <div className="mini-kpis">
            {data.metrics.map((metric) => (
              <div className={metric.tone ?? "blue"} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                {metric.level !== undefined && (
                  <i style={{ width: `${metric.level}%` }} />
                )}
              </div>
            ))}
          </div>
          <table>
            <thead>
              <tr>
                {data.columns.map((column) => (
                  <th scope="col" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index}>
                      {slug === "met-assignment" && index === 2 ? (
                        <>
                          <span>{cell}</span>
                          <i
                            className="mini-progress"
                            style={{ width: cell }}
                          />
                        </>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {slug === "met-certificate" && (
        <div className="mini-certificate">
          <div>
            <span>โรงเรียนตัวอย่าง</span>
            <strong>เกียรติบัตร</strong>
            <span>มอบแก่นักเรียนตัวอย่าง</span>
            <span>ผ่านกิจกรรมส่งเสริมการอ่าน</span>
            <small>รหัสตรวจสอบ MET-CERT-DEMO-2569-001</small>
          </div>
          <Image
            src={await certificateQr()}
            alt="คิวอาร์โค้ดรหัสตัวอย่าง"
            width={48}
            height={48}
            unoptimized
          />
        </div>
      )}
      {slug === "met-exam-ai" && (
        <div className="mini-body">
          <b>ข้อสอบปรนัย · ฉบับร่าง 01/10</b>
          <div className="mini-exam">
            <span>ข้อใดเป็นดาวเคราะห์ในระบบสุริยะ</span>
            <div>
              <span>ก. ดาวอังคาร</span>
              <span>ข. ดวงจันทร์</span>
              <span>ค. ดวงอาทิตย์</span>
              <span>ง. กลุ่มดาวนายพราน</span>
            </div>
          </div>
          <span className="mini-export">↓ ส่งออกไฟล์ .CSV</span>
        </div>
      )}
      {slug === "met-parent" && (
        <div className="mini-phone">
          <b>แจ้งเตือนถึงผู้ปกครอง</b>
          <span>08:02 · ถึงโรงเรียนแล้ว</span>
          <span>15:41 · ออกจากโรงเรียนแล้ว</span>
          <span>ประกาศ · นัดประชุมผู้ปกครอง</span>
        </div>
      )}
    </div>
  );
}
