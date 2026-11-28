"use client";

import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  Flag,
  Medal,
  Plus,
  RotateCcw,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { quoteHref, sportSlug } from "@/lib/marketplace";

const teams = [
  { name: "สีฟ้า", points: 25, gold: 1, silver: 1, bronze: 0 },
  { name: "สีทอง", points: 20, gold: 0, silver: 2, bronze: 1 },
  { name: "สีเขียว", points: 18, gold: 0, silver: 1, bronze: 2 },
];
const matches = [
  {
    title: "ฟุตบอล · รอบชิงชนะเลิศ",
    time: "09:00",
    home: 0,
    away: 1,
    medalFinal: true,
  },
  { title: "วอลเลย์บอล · รอบจัดอันดับ", time: "11:15", home: 1, away: 2 },
  { title: "ฟุตซอล · รอบแบ่งกลุ่ม", time: "14:30", home: 2, away: 0 },
];
type Score = { home: number; away: number };
const outcome = (score: Score) => Math.sign(score.home - score.away);
const medalLabels = { gold: "ทอง", silver: "เงิน", bronze: "ทองแดง" } as const;
type MedalKey = keyof typeof medalLabels;
type MedalAdjustments = Record<number, Partial<Record<MedalKey, number>>>;
const medalKeys = Object.keys(medalLabels) as MedalKey[];

export default function SportDemo() {
  const [results, setResults] = useState<Record<number, Score>>({});
  const [eventIndex, setEventIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [medalAdjustments, setMedalAdjustments] = useState<MedalAdjustments>(
    {},
  );
  const [medalNotice, setMedalNotice] = useState("");
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

  const medalRankings = teams
    .map((team, index) => {
      const extras = medalAdjustments[index] ?? {};
      let gold = team.gold + (extras.gold ?? 0);
      let silver = team.silver + (extras.silver ?? 0);
      const bronze = team.bronze + (extras.bronze ?? 0);
      matches.forEach((match, matchIndex) => {
        const score = results[matchIndex];
        if (!match.medalFinal || !score || score.home === score.away) return;
        const winner = score.home > score.away ? match.home : match.away;
        const runnerUp = winner === match.home ? match.away : match.home;
        if (winner === index) gold += 1;
        if (runnerUp === index) silver += 1;
      });
      return { ...team, index, gold, silver, bronze };
    })
    .sort(
      (a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze,
    );

  function addMedal(index: number, kind: MedalKey) {
    setMedalAdjustments((previous) => {
      const team = previous[index] ?? {};
      return {
        ...previous,
        [index]: { ...team, [kind]: Math.min(99, (team[kind] ?? 0) + 1) },
      };
    });
    setMedalNotice(
      `เพิ่มเหรียญ${medalLabels[kind]}ให้ทีม${teams[index].name}ในเดโมแล้ว`,
    );
  }

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
    const score = { home, away };
    const previous = results[eventIndex];
    setResults((current) => ({ ...current, [eventIndex]: score }));
    if (previous && outcome(previous) === outcome(score)) {
      setNotice(
        "บันทึกผลตัวอย่างแล้ว ผลแพ้–ชนะหรือเสมอไม่เปลี่ยน คะแนนสะสมจึงเท่าเดิม",
      );
    } else {
      const points =
        outcome(score) === 0
          ? "ทั้งสองทีมได้ทีมละ 1 คะแนน"
          : `ทีม${teams[outcome(score) > 0 ? matches[eventIndex].home : matches[eventIndex].away].name} ได้ 3 คะแนน`;
      setNotice(`บันทึกผลตัวอย่างแล้ว ตารางคะแนนอัปเดต · ${points}`);
    }
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

      <section
        className="panel sport-medals"
        aria-labelledby="sport-medals-heading"
      >
        <h2 id="sport-medals-heading">
          <Medal size={22} aria-hidden="true" /> ตารางอันดับเหรียญตัวอย่าง
        </h2>
        <p className="muted">
          กดเครื่องหมายบวกเพื่อเพิ่มเหรียญให้ทีมได้ทีละเหรียญ
          หรือบันทึกผลฟุตบอลรอบชิง
          เพื่อเพิ่มทองให้ผู้ชนะและเงินให้รองชนะเลิศอัตโนมัติเมื่อผลไม่เสมอ
          ทั้งหมดเป็นข้อมูลสมมติ
        </p>
        <table>
          <caption>เรียงตามเหรียญทอง เงิน และทองแดง</caption>
          <thead>
            <tr>
              <th scope="col">ทีม</th>
              {medalKeys.map((kind) => (
                <th key={kind} scope="col">
                  {medalLabels[kind]}
                </th>
              ))}
              <th scope="col">รวม</th>
            </tr>
          </thead>
          <tbody>
            {medalRankings.map((team) => (
              <tr key={team.name}>
                <th scope="row">{team.name}</th>
                {medalKeys.map((kind) => (
                  <td key={kind}>
                    <div className="sport-medal-control">
                      <span>{team[kind]}</span>
                      <button
                        className={`sport-medal-add sport-medal-${kind}`}
                        type="button"
                        aria-label={`เพิ่มเหรียญ${medalLabels[kind]}ให้ทีม${team.name}`}
                        disabled={
                          (medalAdjustments[team.index]?.[kind] ?? 0) >= 99
                        }
                        onClick={() => addMedal(team.index, kind)}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                ))}
                <td>
                  <strong>{team.gold + team.silver + team.bronze}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="market-links sport-medal-reset">
          <button
            type="button"
            onClick={() => {
              setMedalAdjustments({});
              setMedalNotice(
                "ล้างเหรียญที่เพิ่มเองแล้ว ผลการแข่งขันตัวอย่างยังอยู่",
              );
            }}
          >
            <RotateCcw size={16} aria-hidden="true" /> ล้างเหรียญที่เพิ่มเอง
          </button>
        </div>
        <p role="status" className="sport-medal-notice">
          {medalNotice}
        </p>
      </section>

      <div className="panel stack sport-score-entry">
        <h2>ลองบันทึกผลการแข่งขัน</h2>
        <p>{event.title} · ชนะ 3 คะแนน เสมอ 1 แพ้ 0</p>
        <p className="muted">คะแนนสะสมคิดจากผลแพ้–ชนะ ไม่ได้บวกจำนวนประตู</p>
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
              setMedalAdjustments({});
              setMedalNotice("");
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
    </section>
  );
}
