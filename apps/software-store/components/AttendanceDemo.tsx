"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, Download, Bell } from "lucide-react";
import { csvCell } from "@/lib/csv";
import styles from "./attendance-demo.module.css";

const statuses = {
  present: "มาเรียน",
  late: "มาสาย",
  excused: "ลา",
  absent: "ขาด",
} as const;
type Status = keyof typeof statuses;
type Records = Record<string, Record<string, Status>>;

const schools = [
  {
    id: "riverside",
    name: "โรงเรียนสาธิตริมน้ำ",
    room: "ม.1/1",
    students: ["ธารา", "ตะวัน", "ปลายฟ้า", "พอใจ", "ภูผา", "อิงดาว"],
  },
  {
    id: "hilltop",
    name: "โรงเรียนสาธิตสายภู",
    room: "ม.2/1",
    students: ["สายรุ้ง", "ใบหม่อน", "ต้นกล้า", "นที"],
  },
] as const;
const periods = [
  { id: "math", time: "08:40", label: "คณิตศาสตร์" },
  { id: "thai", time: "10:30", label: "ภาษาไทย" },
  { id: "science", time: "13:00", label: "วิทยาศาสตร์" },
] as const;
const sampleDate = "2026-11-27";
const initialRecords: Records = {
  "riverside|2026-11-24|daily": {
    "01": "absent",
    "02": "late",
    "03": "present",
  },
  "riverside|2026-11-25|daily": {
    "01": "absent",
    "02": "late",
    "03": "present",
  },
  "riverside|2026-11-26|daily": {
    "01": "present",
    "02": "late",
    "05": "excused",
  },
};

function studentId(index: number) {
  return String(index + 1).padStart(2, "0");
}

export default function AttendanceDemo() {
  const [schoolId, setSchoolId] = useState<string>(schools[0].id);
  const [date, setDate] = useState(sampleDate);
  const [period, setPeriod] = useState("daily");
  const [scanNotice, setScanNotice] = useState("");
  const [records, setRecords] = useState(initialRecords);
  const [feedback, setFeedback] = useState("");
  const school = schools.find((item) => item.id === schoolId) ?? schools[0];
  const session = `${school.id}|${date}|${period}`;
  const current = records[session] ?? {};
  const periodName =
    periods.find((item) => item.id === period)?.label ?? "รายวัน";
  const reported = Object.values(current);
  const firstDay = new Date(`${date}T00:00:00Z`);
  firstDay.setUTCDate(firstDay.getUTCDate() - 6);
  const earliest = firstDay.toISOString().slice(0, 10);
  const dailyHistory = Object.entries(records).filter(([key]) => {
    const [recordSchool, day, recordPeriod] = key.split("|");
    return (
      recordSchool === school.id &&
      recordPeriod === "daily" &&
      day >= earliest &&
      day <= date
    );
  });
  const followUps = school.students.flatMap((name, index) => {
    const studentHistory = dailyHistory.map(
      ([, entries]) => entries[studentId(index)],
    );
    const absences = studentHistory.filter(
      (status) => status === "absent",
    ).length;
    const late = studentHistory.filter((status) => status === "late").length;
    return absences >= 2 || late >= 3 ? [{ name, absences, late }] : [];
  });

  function update(id: string, status: Status | "") {
    setRecords((previous) => {
      const entries = { ...previous[session] };
      if (status) entries[id] = status;
      else delete entries[id];
      return { ...previous, [session]: entries };
    });
    setFeedback(
      status ? `บันทึกสถานะ ${statuses[status]} แล้ว` : "ล้างสถานะแล้ว",
    );
  }

  function download() {
    const rows = [
      [
        "โรงเรียนตัวอย่าง",
        "ห้อง",
        "วันที่",
        "รอบเช็กชื่อ",
        "เลขที่",
        "ชื่อสมมติ",
        "สถานะ",
      ],
      ...school.students.map((name, index) => {
        const id = studentId(index);
        return [
          school.name,
          school.room,
          date,
          periodName,
          id,
          name,
          statuses[current[id]] ?? "ยังไม่เช็ก",
        ];
      }),
    ];
    const csv =
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `met-attendance-demo-${date}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className={`section ${styles.demo}`}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">MET ATTENDANCE</p>
          <h1>เช็กชื่อและติดตามการมาเรียน</h1>
          <p>เลือกวันหรือคาบเรียน บันทึกสถานะ แล้วดูรายงานได้ทันที</p>
        </div>
        <Link href="/demo" className="btn ghost">
          ดูเดโมทั้งหมด
        </Link>
      </div>
      <p className={styles.notice}>
        <ClipboardCheck size={19} /> เดโมใช้ข้อมูลสมมติ
        สถานะเริ่มใหม่เมื่อรีเฟรชหน้า
      </p>

      <div className={styles.filters}>
        <label>
          โรงเรียนและห้อง
          <select
            value={schoolId}
            onChange={(event) => {
              setSchoolId(event.target.value);
              setFeedback("");
            }}
          >
            {schools.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.room}
              </option>
            ))}
          </select>
        </label>
        <label>
          วันที่เช็กชื่อ
          <input
            type="date"
            value={date}
            min="2026-11-20"
            max="2026-12-04"
            onChange={(event) => {
              if (event.target.validity.valid && event.target.value)
                setDate(event.target.value);
              setFeedback("");
            }}
          />
        </label>
        <label>
          รอบเช็กชื่อ
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setFeedback("");
            }}
          >
            <option value="daily">เช็กชื่อรายวัน</option>
            {periods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.time} · {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>เช็กแล้ว</dt>
          <dd>
            {reported.length} <small>/ {school.students.length}</small>
          </dd>
        </div>
        {Object.entries(statuses).map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd className={styles[key]}>
              {reported.filter((status) => status === key).length}
            </dd>
          </div>
        ))}
      </dl>

      <section className="panel stack">
        <h2>ทดลองสแกนบัตรนักเรียน QR Code</h2>
        <p>เดโมใช้บัตรสมมติและแสดงตัวอย่างข้อความบนหน้านี้</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            update(studentId(0), "present");
            setScanNotice(
              `LINE OA · แจ้งผู้ปกครองตัวอย่าง: ${school.students[0]} เช็กชื่อเข้าเรียนเวลา 07:42 น. · ${date}`,
            );
          }}
        >
          จำลองสแกนบัตรนักเรียน QR Code
        </button>
        {scanNotice && (
          <p role="status" className="market-budget">
            {scanNotice}
          </p>
        )}
      </section>
      <div className={styles.workspace}>
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <div>
              <h2>รายชื่อนักเรียน {school.room}</h2>
              <p>{periodName} · เลือกสถานะของแต่ละคน</p>
            </div>
            <button type="button" className="btn ghost" onClick={download}>
              <Download size={17} /> ดาวน์โหลด CSV
            </button>
          </header>
          <ul className={styles.roster}>
            {school.students.map((name, index) => {
              const id = studentId(index);
              return (
                <li key={id}>
                  <span className={styles.student}>
                    <span aria-hidden="true">{id}</span>
                    <strong>{name}</strong>
                  </span>
                  <select
                    aria-label={`สถานะของ ${name}`}
                    value={current[id] ?? ""}
                    onChange={(event) =>
                      update(id, event.target.value as Status | "")
                    }
                    className={styles[current[id]]}
                  >
                    <option value="">ยังไม่เช็ก</option>
                    {Object.entries(statuses).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
          <p role="status" className={styles.feedback}>
            {feedback}
          </p>
        </section>

        <div className={styles.side}>
          <section className={`${styles.panel} ${styles.aside}`}>
            <h2>
              <Bell size={18} /> รายการติดตาม
            </h2>
            <p>
              จากผลเช็กชื่อรายวันย้อนหลัง 7 วัน ขาด 2 วันขึ้นไป หรือมาสาย 3
              วันขึ้นไป
            </p>
            {followUps.length ? (
              <ul>
                {followUps.map(({ name, absences, late }) => (
                  <li key={name}>
                    <strong>{name}</strong>
                    <span>
                      ขาด {absences} · สาย {late}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>ยังไม่มีรายการที่เข้าเกณฑ์</p>
            )}
          </section>
          <section className={`${styles.panel} ${styles.aside}`}>
            <h2>
              <CalendarDays size={18} /> ตารางคาบเรียนตัวอย่าง
            </h2>
            <ul>
              {periods.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={period === item.id}
                    onClick={() => {
                      setPeriod(item.id);
                      setFeedback("");
                    }}
                  >
                    <time>{item.time}</time>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <Link href="/school-systems" className="subtle-link">
        ดูแนวทางวางระบบโรงเรียน
      </Link>
    </section>
  );
}
