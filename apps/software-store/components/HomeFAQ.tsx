import Link from "next/link";
import { ChevronDown } from "lucide-react";
import styles from "./home-sections.module.css";

const questions = [
  {
    question: "โรงเรียนขนาดเล็กใช้งานได้ไหม",
    answer:
      "เริ่มสำรวจจากงานที่โรงเรียนต้องการได้ เช่น เว็บไซต์ รับสมัคร หรือเช็กชื่อ ก่อนติดตั้งจริงต้องประเมินจำนวนผู้ใช้ โฮสต์ และขอบเขตงานให้เหมาะกับโรงเรียน ปัจจุบันมี Demo ให้ทดลองด้วยข้อมูลสมมติ ส่วนโปรแกรมจำหน่ายยังอยู่ระหว่างพัฒนาและตรวจรับ",
  },
  {
    question: "มีทีมงานอบรมการใช้งานให้หรือไม่",
    answer:
      "มีคู่มือติดตั้งและคู่มือใช้งานภาษาไทยสำหรับ Source Code รุ่นทดสอบ ส่วนการติดตั้งให้หรือการอบรมออนไลน์ ต้องตกลงรูปแบบ ขอบเขต และค่าใช้จ่ายกับ WORAMET AI LAB ก่อนยืนยันบริการ",
  },
  {
    question: "ข้อมูลนักเรียนปลอดภัยแค่ไหน",
    answer:
      "ระบบต้นฉบับตรวจสิทธิ์ตามโรงเรียนและบทบาท จำกัดการเข้าถึงไฟล์ส่วนบุคคล และใช้ลิงก์ดาวน์โหลดที่หมดอายุได้ ก่อนรับข้อมูลจริงต้องตรวจการตั้งค่าฐานข้อมูล สิทธิ์ การสำรองข้อมูล และนโยบายข้อมูลของโรงเรียน ส่วน Demo บนเว็บไซต์นี้ใช้ข้อมูลสมมติเท่านั้น",
  },
  {
    question: "ทดลองใช้ต้องกรอกข้อมูลนักเรียนจริงไหม",
    answer:
      "ไม่ต้องกรอกชื่อ เบอร์โทร หรือเอกสารจริง Demo เตรียมข้อมูลสมมติให้ลองตามขั้นตอน ข้อมูลทดลองอยู่ในเบราว์เซอร์และเริ่มใหม่เมื่อรีเฟรชหน้า",
  },
];

export default function HomeFAQ() {
  return (
    <section className={styles.faq} aria-labelledby="home-faq-title">
      <div>
        <span className="eyebrow">A LITTLE MORE CLARITY</span>
        <h2 id="home-faq-title">คำถามที่พบบ่อย</h2>
        <p className="muted">ข้อมูลก่อนเลือกทดลองและวางระบบให้โรงเรียน</p>
        <Link className="subtle-link" href="/contact">
          สอบถามเรื่องการติดตั้งหรือการอบรม →
        </Link>
      </div>
      <div className={styles.questions}>
        {questions.map(({ question, answer }) => (
          <details key={question} className={styles.faqItem}>
            <summary>
              <span>{question}</span>
              <ChevronDown
                size={19}
                className={styles.faqIcon}
                aria-hidden="true"
              />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
