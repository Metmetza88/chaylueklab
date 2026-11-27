import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Download,
  FileText,
  Globe2,
  School,
} from "lucide-react";
import { ProcurementDocuments } from "@/components/Procurement";
import styles from "./school-systems.module.css";

export const metadata: Metadata = {
  title: "วางระบบบริหารโรงเรียน",
  description:
    "เลือกโมดูลให้ตรงกับงานโรงเรียน ทดลองระบบรับสมัครและเช็กชื่อ พร้อมข้อมูลจัดซื้อและแบบฟอร์มจดโดเมน .ac.th",
};

const modules = [
  {
    name: "รับสมัครและมอบตัว",
    description:
      "รับใบสมัครออนไลน์ ตรวจเอกสาร นัดหมาย ประกาศผล และส่งต่อข้อมูลให้ทะเบียน",
    demo: "met-admission",
  },
  {
    name: "เช็กชื่อและติดตามการมาเรียน",
    description:
      "เช็กชื่อรายวันหรือรายคาบ ส่งออกรายงาน และวางขั้นตอนแจ้งผู้ปกครองผ่าน LINE OA",
    demo: "met-attendance",
  },
  {
    name: "เว็บไซต์และพอร์ทัลผู้ปกครอง",
    description:
      "รวมประกาศ ปฏิทิน การมาเรียน ผลการเรียน และใบแจ้งค่าเทอมตามสิทธิ์ของครอบครัว",
    demo: "met-school-pro",
  },
  {
    name: "ทะเบียนนักเรียน",
    description:
      "รวมข้อมูลนักเรียนกับผู้ปกครองในทะเบียนเดียว รองรับย้ายห้อง เลื่อนชั้น และย้ายออก",
  },
  {
    name: "คะแนนและสมุดรายงาน",
    description:
      "คำนวณเกรดตามเกณฑ์ของโรงเรียน ตรวจทานก่อนเผยแพร่ และส่งออกรายงาน",
  },
  {
    name: "ตารางเรียนและตารางสอน",
    description: "จัดคาบตามครู ห้อง และวิชา ตรวจเวลาที่ทับซ้อนและจัดสอนแทน",
  },
  {
    name: "ค่าเทอมและค่าธรรมเนียม",
    description:
      "ออกใบแจ้งหนี้ ติดตามยอดค้าง และกำหนดการเชื่อม QR PromptPay ตามผู้ให้บริการของโรงเรียน",
  },
  {
    name: "ห้องเรียนออนไลน์และห้องสมุด",
    description:
      "มอบหมายงานและจัดเก็บสื่อ เชื่อมระบบเดิมเมื่อรองรับ หรือจัดการยืมคืนด้วยบาร์โค้ด",
  },
  {
    name: "ดูแลช่วยเหลือนักเรียน",
    description:
      "ติดตามการช่วยเหลือรายบุคคลและการเยี่ยมบ้าน โดยกำหนดผู้ที่เข้าถึงข้อมูลแยกจากทะเบียนทั่วไป",
  },
  {
    name: "บุคลากร พัสดุ และบัญชี",
    description:
      "เก็บคำขอลา ภาระงาน และสถานะจัดซื้อ พร้อมส่งต่อข้อมูลให้ฝ่ายบัญชี",
  },
];

export default function SchoolSystems() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className="eyebrow">
            <School size={18} /> ระบบโรงเรียน · CHAYLUEKLAB
          </p>
          <h1>
            รวมงานโรงเรียน
            <br />
            ให้ใช้ข้อมูลชุดเดียว
          </h1>
          <p>
            ลดงานกรอกซ้ำ ตั้งแต่รับสมัครและเช็กชื่อ
            ไปจนถึงรายงานของครูและฝ่ายการเงิน
            เริ่มจากสองหรือสามงานที่เสียเวลามากที่สุดในแต่ละเทอม
          </p>
          <div className={styles.actions}>
            <a className="btn" href="#modules">
              เลือกโมดูล <ArrowRight size={16} />
            </a>
            <a className="btn ghost" href="#procurement">
              ข้อมูลจัดซื้อและโดเมน
            </a>
          </div>
        </div>
        <aside className={styles.signals}>
          <h2>งานไหนควรเริ่มก่อน</h2>
          <ul>
            <li>ครูสรุปขาด ลา มาสาย หรือกรอกคะแนนซ้ำทุกเดือน</li>
            <li>ผู้ปกครองต้องทักครูเพื่อถามข้อมูลเดิม</li>
            <li>ทะเบียนกับการเงินนับยอดจากคนละไฟล์</li>
            <li>เอกสารรับสมัครซ้ำและตามสถานะมอบตัวยาก</li>
          </ul>
        </aside>
      </section>

      <section className={styles.section} id="modules">
        <h2>เลือกโมดูลตามงานของโรงเรียน</h2>
        <p>
          ระบบที่มีเดโมเปิดทดลองด้วยข้อมูลสมมติได้
          ส่วนรายละเอียดการติดตั้งและการเชื่อมต่อประเมินตามขอบเขตงานของโรงเรียน
        </p>
        <div className={styles.cards}>
          {modules.map((item) => (
            <article key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {item.demo && (
                <Link
                  aria-label={`เปิดเดโม ${item.name}`}
                  href={`/demo/${item.demo}`}
                >
                  เปิดเดโม <ArrowRight size={15} />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="procurement">
        <h2>ราคา เอกสารจัดซื้อ และโดเมนโรงเรียน</h2>
        <div className="panel">
          <ProcurementDocuments />
        </div>
        <div className={styles.procurement}>
          <article>
            <FileText size={23} />
            <h3>ขอเอกสารประกอบจัดซื้อ</h3>
            <p>
              แจ้งชื่อสถานศึกษา โมดูลที่ต้องการ และรายการเอกสาร เช่น ใบเสนอราคา
              เอกสารบริษัท หรือใบส่งของตามขั้นตอนของงาน
              พร้อมอีเมลหน่วยงานสำหรับรับเอกสาร
            </p>
            <Link className="btn ghost" href="/contact">
              ติดต่อเรื่องเอกสาร
            </Link>
          </article>
          <article>
            <Globe2 size={23} />
            <h3>จดทะเบียน .ac.th</h3>
            <p>
              เตรียมหนังสือรับรองขอจดชื่อโดเมนที่ลงนามแล้วและหลักฐานจัดตั้งสถานศึกษาตามเงื่อนไขของนายทะเบียน
              สแกนเอกสารและส่งตามช่องทางที่ผู้รับจดแจ้ง
              หากต้องแนบหลักฐานชำระเงินให้ใช้ช่องทางที่ผู้รับจดยืนยัน
            </p>
            <a
              className="btn ghost"
              href="https://www.thnic.co.th/doc/doc.ac/2018/doc-ac-th.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={16} /> แบบฟอร์ม THNIC (PDF)
            </a>
            <p>
              <a
                href="https://www.thnic.co.th/policy#acth"
                target="_blank"
                rel="noopener noreferrer"
              >
                ดูหลักเกณฑ์และเอกสารจากนายทะเบียน
              </a>
            </p>
          </article>
          <article>
            <ClipboardCheck size={23} />
            <h3>สิทธิ์ดูแลเว็บและโฮสติ้ง</h3>
            <p>
              ตรวจว่าใบเสนอราคารวมค่าจดและต่ออายุโดเมน พื้นที่ให้บริการ ระยะดูแล
              และการสำรองข้อมูลหรือไม่
              เว็บไซต์แบบดูแลรายแพ็กเกจอัปเดตเนื้อหาผ่านหน้าแอดมิน
              ส่วนสิทธิ์เซิร์ฟเวอร์และการส่งมอบซอร์สโค้ดให้ตกลงเป็นลายลักษณ์อักษร
            </p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <h2>ก่อนเปิดให้ใช้ข้อมูลจริง</h2>
        <div className={styles.faq}>
          <details>
            <summary>ย้ายจาก Excel หรือเชื่อมกับระบบเดิมได้อย่างไร</summary>
            <p>
              รวบรวมไฟล์ตัวอย่าง แยกคอลัมน์ที่จำเป็น ตรวจรายการซ้ำ
              และให้ฝ่ายทะเบียนตรวจยอดก่อนย้ายจริง งานเชื่อม Google Workspace,
              LINE OA, การเงิน
              หรือโปรแกรมบัญชีขึ้นกับสิทธิ์และความสามารถของระบบต้นทาง
            </p>
          </details>
          <details>
            <summary>
              โรงเรียนควรเริ่มจากโปรแกรมสำเร็จรูปหรือระบบพัฒนาเฉพาะ
            </summary>
            <p>
              โปรแกรมสำเร็จรูปเหมาะกับงานมาตรฐานและเริ่มได้เร็ว
              งานที่ต้องใช้เกณฑ์เฉพาะ รายงานเฉพาะ
              หรือเชื่อมหลายระบบควรสำรวจขั้นตอนจริงและทดสอบต้นแบบก่อนประเมินราคา
            </p>
          </details>
          <details>
            <summary>ข้อมูลนักเรียนควรเปิดให้ใครเห็น</summary>
            <p>
              กำหนดสิทธิ์ตามโรงเรียนและหน้าที่
              จำกัดข้อมูลสุขภาพและข้อมูลรายบุคคลให้ผู้เกี่ยวข้อง
              กำหนดระยะเก็บข้อมูลและตรวจแผนสำรองก่อนเปิดใช้จริง
              สำหรับเช็กชื่อเริ่มจากครูกดบนมือถือหรือใช้บัตรของโรงเรียนได้
            </p>
          </details>
          <details>
            <summary>มีงานเฉพาะสำหรับอนุบาลหรืออุดมศึกษาหรือไม่</summary>
            <p>
              อนุบาลอาจต้องการรายงานประจำวันและตรวจผู้มีสิทธิ์รับเด็ก
              ส่วนวิทยาลัยหรือมหาวิทยาลัยอาจต้องการลงทะเบียนรายวิชา หน่วยกิต และ
              Transcript ควรระบุระเบียบและขั้นตอนของสถานศึกษาเมื่อขอประเมิน
            </p>
          </details>
        </div>
      </section>

      <section className={styles.contact}>
        <div>
          <h2>เริ่มจากงานที่เสียเวลามากที่สุด</h2>
          <p>
            บอกประเภทสถานศึกษา จำนวนนักเรียนโดยประมาณ
            และงานที่อยากเริ่มในเทอมถัดไป
          </p>
        </div>
        <Link className="btn" href="/contact">
          ปรึกษาและขอใบเสนอราคา <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
