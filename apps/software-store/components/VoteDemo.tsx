"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Check, RotateCcw, Vote } from "lucide-react";

const options = [
  { id: "a", name: "ผู้สมัครตัวอย่าง A", color: "blue", initial: 6 },
  { id: "b", name: "ผู้สมัครตัวอย่าง B", color: "green", initial: 4 },
  { id: "c", name: "ผู้สมัครตัวอย่าง C", color: "gold", initial: 2 },
] as const;

type Candidate = (typeof options)[number]["id"];
const storageKey = "chaylueklab-demo-vote-ballot";
const changeEvent = "chaylueklab-demo-vote-change";
let tabFallback: Candidate | null = null;

function isCandidate(value: unknown): value is Candidate {
  return options.some(({ id }) => id === value);
}

function readBallot() {
  try {
    const saved = window.sessionStorage.getItem(storageKey);
    return isCandidate(saved) ? saved : null;
  } catch {
    return tabFallback;
  }
}

function writeBallot(choice: Candidate | null) {
  tabFallback = choice;
  try {
    if (choice) window.sessionStorage.setItem(storageKey, choice);
    else window.sessionStorage.removeItem(storageKey);
  } catch {
    // The current tab remains usable when storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent));
}

function watchBallot(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  return () => window.removeEventListener(changeEvent, listener);
}

export default function VoteDemo() {
  const ballot = useSyncExternalStore<Candidate | null>(
    watchBallot,
    readBallot,
    () => null,
  );
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [notice, setNotice] = useState("");
  const totals = options.map((option) => ({
    ...option,
    votes: option.initial + Number(option.id === ballot),
  }));
  const total = totals.reduce((sum, option) => sum + option.votes, 0);

  function cast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || readBallot()) return;
    writeBallot(selected);
    setNotice("บันทึกคะแนนตัวอย่างแล้ว กราฟอัปเดตทันที");
  }

  function reset() {
    writeBallot(null);
    setSelected(null);
    setNotice("คืนค่าตัวอย่างแล้ว ลองเลือกใหม่ได้ 1 ครั้ง");
  }

  return (
    <section className="section vote-demo">
      <header className="vote-demo-head">
        <div>
          <span className="eyebrow">MET VOTE · DEMO ONLY</span>
          <h1>ทดลองลงคะแนนและดูผล</h1>
          <p className="muted">
            ตัวอย่างเพื่อการสาธิต
            ยังไม่เปิดเป็นระบบเลือกตั้งจริงหรือบริการติดตั้ง
          </p>
        </div>
        <Link className="btn ghost" href="/demo">
          เดโมทั้งหมด <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </header>
      <p className="notice">
        ผู้สมัครและคะแนนทั้งหมดเป็นข้อมูลสมมติ
        ไม่มีการส่งข้อมูลหรือคะแนนออกจากเครื่อง ทดลองลงคะแนนได้ 1
        ครั้งต่อแท็บจนกดเริ่มเดโมใหม่
      </p>

      <div className="vote-demo-layout">
        <div className="panel">
          <h2>
            <Vote size={22} aria-hidden="true" /> บัตรลงคะแนนสมมติ
          </h2>
          <form onSubmit={cast}>
            <fieldset>
              <legend>เลือกผู้สมัครหนึ่งคน</legend>
              {options.map(({ id, name }) => (
                <label key={id} className="vote-demo-option">
                  <input
                    type="radio"
                    name="candidate"
                    value={id}
                    disabled={Boolean(ballot)}
                    checked={(ballot ?? selected) === id}
                    onChange={() => setSelected(id)}
                  />
                  <span>{name}</span>
                  {ballot === id && (
                    <Check size={18} aria-label="ลงคะแนนตัวอย่างแล้ว" />
                  )}
                </label>
              ))}
            </fieldset>
            <button
              className="btn"
              type="submit"
              disabled={!selected || Boolean(ballot)}
            >
              {ballot ? "ลงคะแนนตัวอย่างแล้ว" : "ยืนยันลงคะแนนตัวอย่าง"}
            </button>
          </form>
          <p role="status" className="vote-feedback">
            {notice || (ballot ? "แท็บนี้ลงคะแนนตัวอย่างแล้ว" : "")}
          </p>
        </div>

        <div
          className="panel vote-demo-results"
          aria-labelledby="vote-results-heading"
        >
          <h2 id="vote-results-heading">
            <BarChart3 size={22} aria-hidden="true" /> กราฟคะแนนตัวอย่าง
          </h2>
          <p className="muted">
            คะแนนรวม {total} คะแนน · ไม่ใช่ผลการเลือกตั้งจริง
          </p>
          <ul>
            {totals.map(({ id, name, color, votes }) => (
              <li key={id}>
                <div>
                  <span>{name}</span>
                  <strong>{votes} คะแนน</strong>
                </div>
                <meter
                  className={`vote-meter-${color}`}
                  min={0}
                  max={total}
                  value={votes}
                  aria-label={name + " ได้ " + votes + " คะแนนตัวอย่าง"}
                />
              </li>
            ))}
          </ul>
          <button className="btn ghost" type="button" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> เริ่มเดโมใหม่
            (ล้างคะแนนที่ทดลอง)
          </button>
        </div>
      </div>
    </section>
  );
}
