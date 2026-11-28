"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, Flag, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import MedalDemo from "./MedalDemo";
import { quoteHref, sportSlug } from "@/lib/marketplace";

const teams = [
  { name: "สีฟ้า", points: 25 },
  { name: "สีทอง", points: 20 },
  { name: "สีเขียว", points: 18 },
];
const matches = [
  { title: "ฟุตบอล · รอบชิงชนะเลิศ", time: "09:00", home: 0, away: 1 },
  { title: "วอลเลย์บอล · รอบจัดอันดับ", time: "11:15", home: 1, away: 2 },
  { title: "ฟุตซอล · รอบแบ่งกลุ่ม", time: "14:30", home: 2, away: 0 },
];
type Score = { home: number; away: number };

export default function SportDemo() {
  const [results, setResults] = useState<Record<number, Score>>({});
  const [eventIndex, setEventIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const event = matches[eventIndex];
  const rankings = teams
    .map((team, index) => ({
      ...team,
      points: matches.reduce((points, match, indexInSchedule) => {
        const score = results[indexInSchedule];
        if (!score || (index !== match.home && index !== match.away))
          return points;
        if (score.home === score.away) return points + 1;
        return (
          points +
          (index === (score.home > score.away ? match.home : match.away)
            ? 3
            : 0)
        );
      }, team.points),
    }))
    .sort((a, b) => b.points - a.points);

  function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const home = Number(data.get("home"));
    const away = Number(data.get("away"));
    if (
      [home, away].some(
        (score) => !Number.isInteger(score) || score < 0 || score > 99,
      )
    )
      return;
    setResults((previous) => ({ ...previous, [eventIndex]: { home, away } }));
    setNotice("บันทึกผลตัวอย่างแล้ว ตารางคะแนนอัปเดตเรียบร้อย");
  }

  return (
    <section className="section sport-demo">
      <div className="sport-demo-board">
        <header className="sport-demo-header">
          <Trophy size={30} aria-hidden="true" />
          <div>
            <span className="eyebrow">MET SPORT · INTERACTIVE DEMO</span>
            <h1>ศูนย์จัดการแข่งขันกีฬาสี</h1>
            <p>โรงเรียนตัวอย่าง · ข้อมูลสมมติ · ผลที่ทดลองอยู่ในแท็บนี้</p>
          </div>
        </header>
        <div className="sport-stats">
          <div>
            <Flag size={19} />
            <strong>{teams.length}</strong>
            <small>ทีมสี</small>
          </div>
          <div>
            <CalendarDays size={19} />
            <strong>{matches.length}</strong>
            <small>รายการแข่ง</small>
          </div>
          <div>
            <Trophy size={19} />
            <strong>{Object.keys(results).length}</strong>
            <small>บันทึกผลแล้ว</small>
          </div>
        </div>
        <div className="sport-workspace">
          <div className="sport-panel">
            <h2>ตารางแข่งขัน</h2>
            <div className="sport-matches">
              {matches.map((match, index) => (
                <button
                  type="button"
                  key={match.title}
                  aria-pressed={eventIndex === index}
                  onClick={() => {
                    setEventIndex(index);
                    setNotice("");
                  }}
                >
                  <span>
                    <small>{match.time} น.</small>
                    <strong>{match.title}</strong>
                    <small>
                      {teams[match.home].name} พบ {teams[match.away].name}
                    </small>
                  </span>
                  <span>
                    {results[index]
                      ? `${results[index].home} : ${results[index].away}`
                      : "รอบันทึกผล"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="sport-panel">
            <h2>ตารางคะแนนทีมสี</h2>
            <ol className="sport-rankings">
              {rankings.map(({ name, points }) => (
                <li key={name}>
                  <span>{name}</span>
                  <strong>{points} คะแนน</strong>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="panel stack sport-score-entry">
        <h2>ลองบันทึกผลการแข่งขัน</h2>
        <p>{event.title} · ชนะ 3 คะแนน เสมอ 1 คะแนน</p>
        <form
          key={`${eventIndex}-${attempt}`}
          className="sport-score-form"
          onSubmit={record}
        >
          <label>
            คะแนน{teams[event.home].name}
            <input
              type="number"
              name="home"
              defaultValue={results[eventIndex]?.home ?? 0}
              required
              min={0}
              max={99}
            />
          </label>
          <label>
            คะแนน{teams[event.away].name}
            <input
              type="number"
              name="away"
              defaultValue={results[eventIndex]?.away ?? 0}
              required
              min={0}
              max={99}
            />
          </label>
          <button className="btn" type="submit">
            บันทึกผลตัวอย่าง
          </button>
        </form>
        <p role="status">{notice}</p>
        <div className="market-links">
          <button
            type="button"
            onClick={() => {
              setResults({});
              setEventIndex(0);
              setAttempt((value) => value + 1);
              setNotice("ล้างผลตัวอย่างแล้ว");
            }}
          >
            <RotateCcw size={16} /> ล้างผลตัวอย่าง
          </button>
          <Link className="market-primary" href={quoteHref(sportSlug)}>
            ขอใบเสนอราคา MET Sport
          </Link>
        </div>
      </div>
      <MedalDemo />
    </section>
  );
}
