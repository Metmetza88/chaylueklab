"use client";

import { useState, type FormEvent } from "react";
import { downloadCsv } from "@/lib/csv";

const teams = ["สีฟ้า", "สีทอง", "สีเขียว"] as const;
const events = [
  { time: "09:00", name: "วิ่ง 100 เมตร", venue: "ลู่วิ่ง" },
  { time: "10:30", name: "วอลเลย์บอล", venue: "สนาม 2" },
];
const initialScores = [
  [86, 75, 62],
  [0, 0, 0],
];

export default function SportDemo() {
  const [scores, setScores] = useState(initialScores);
  const [eventIndex, setEventIndex] = useState(0);
  const [saved, setSaved] = useState("");
  const totals = teams
    .map((team, index) => ({
      team,
      total: scores.reduce((sum, row) => sum + row[index], 0),
    }))
    .sort((a, b) => b.total - a.total);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const row = teams.map((team) => Number(data.get(team)));
    if (
      row.some(
        (points) => !Number.isInteger(points) || points < 0 || points > 999,
      )
    )
      return;
    setScores((old) =>
      old.map((previous, index) => (index === eventIndex ? row : previous)),
    );
    setSaved(`บันทึกคะแนนตัวอย่างของ ${events[eventIndex].name} แล้ว`);
  }

  return (
    <div className="info-grid sport-demo">
      <section className="panel stack">
        <h2>บันทึกคะแนน</h2>
        <label>
          รายการแข่งขัน
          <select
            value={eventIndex}
            onChange={(event) => {
              setEventIndex(Number(event.target.value));
              setSaved("");
            }}
          >
            {events.map((item, index) => (
              <option value={index} key={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <form
          key={eventIndex + ":" + scores[eventIndex].join(",")}
          className="stack"
          onSubmit={save}
        >
          {teams.map((team, index) => (
            <label key={team}>
              คะแนน{team}
              <input
                name={team}
                type="number"
                min={0}
                max={999}
                step={1}
                required
                defaultValue={scores[eventIndex][index]}
              />
            </label>
          ))}
          <button type="submit" className="market-primary">
            บันทึกคะแนนตัวอย่าง
          </button>
        </form>
        <div role="status">{saved}</div>
      </section>
      <section className="panel stack">
        <h2>ตารางคะแนนรวม</h2>
        <ol className="sport-standings">
          {totals.map(({ team, total }) => (
            <li key={team}>
              <span>{team}</span>
              <strong>{total} คะแนน</strong>
            </li>
          ))}
        </ol>
        <h3>ตารางแข่งขัน</h3>
        <ul>
          {events.map((item) => (
            <li key={item.name}>
              {item.time} · {item.name} · {item.venue}
            </li>
          ))}
        </ul>
        <button
          className="btn ghost"
          type="button"
          onClick={() =>
            downloadCsv("met-sport-demo.csv", [
              ["คณะสี", "คะแนนรวม"],
              ...totals.map(({ team, total }) => [team, String(total)]),
            ])
          }
        >
          ดาวน์โหลดสรุป CSV
        </button>
      </section>
    </div>
  );
}
