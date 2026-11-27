"use client";

import Link from "next/link";
import { useState } from "react";
import { quoteHref, sportSlug } from "@/lib/marketplace";

const events = ["วิ่ง 100 เมตร", "วิ่งผลัด 4 × 100 เมตร", "ชักเย่อ"];
const teams = ["ทีมสีฟ้า", "ทีมสีทอง", "ทีมสีเขียว"];
const initialScores = [
  [10, 7, 5],
  [5, 10, 7],
  [7, 5, 10],
];

export default function SportDemo() {
  const [event, setEvent] = useState(0);
  const [team, setTeam] = useState(0);
  const [scores, setScores] = useState(initialScores);
  return (
    <section className="section stack store-sport-demo">
      <div className="page-heading">
        <span className="eyebrow">MET SPORT</span>
        <h1>ทดลองบันทึกคะแนนกีฬาสี</h1>
        <p>เลือกการแข่งขันและทีมสีเพื่อทดลองเพิ่มคะแนนด้วยข้อมูลสมมติ</p>
      </div>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setScores((current) =>
            current.map((row, i) =>
              i === event
                ? row.map((score, j) => (j === team ? score + 1 : score))
                : row,
            ),
          );
        }}
      >
        <label>
          รายการแข่งขัน
          <select
            value={event}
            onChange={(e) => setEvent(Number(e.target.value))}
          >
            {events.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          ทีมสี
          <select
            value={team}
            onChange={(e) => setTeam(Number(e.target.value))}
          >
            {teams.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" type="submit">
          เพิ่ม 1 คะแนน
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => setScores(initialScores)}
        >
          คืนคะแนนตัวอย่าง
        </button>
      </form>
      <div className="panel">
        <h2>สรุปคะแนนทีมสี</h2>
        <dl className="store-sport-scores" aria-live="polite">
          {teams.map((label, index) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {scores.reduce((total, row) => total + row[index], 0)} คะแนนรวม
              </dd>
              <dd>
                {scores[event][index]} คะแนนใน{events[event]}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="market-links">
        <Link className="market-primary" href={quoteHref(sportSlug)}>
          ขอใบเสนอราคา
        </Link>
        <Link href="/demo">ดูเดโมระบบอื่น</Link>
      </div>
    </section>
  );
}
