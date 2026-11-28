"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Vote } from "lucide-react";

const candidates = [
  { id: "1", name: "ทีมโรงเรียนรักษ์โลก", votes: 18 },
  { id: "2", name: "ทีมกิจกรรมสร้างสรรค์", votes: 14 },
  { id: "3", name: "ทีมเพื่อนช่วยเพื่อน", votes: 9 },
];
const voteKey = "chaylueklab:vote-demo:ballot";

function savedVote() {
  try {
    const value = sessionStorage.getItem(voteKey);
    return candidates.find(({ id }) => id === value)?.id ?? "";
  } catch {
    return "";
  }
}

export default function VoteDemo() {
  const [submitted, setSubmitted] = useState("");
  const [choice, setChoice] = useState("");
  const vote = useRef("");
  useEffect(() => {
    const saved = savedVote();
    vote.current = saved;
    setSubmitted(saved);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recorded = vote.current || savedVote();
    if (recorded || !candidates.some(({ id }) => id === choice)) return;
    vote.current = choice;
    try {
      sessionStorage.setItem(voteKey, choice);
    } catch {}
    setSubmitted(choice);
  }

  return (
    <section className="section module-demo">
      <div className="page-heading">
        <span className="eyebrow">MET VOTE · ข้อมูลสมมติ</span>
        <h1>ทดลองเลือกตั้งสภานักเรียน</h1>
        <p>ลงคะแนนได้หนึ่งครั้งในแท็บนี้ ลองดูผลคะแนนที่อัปเดตหลังลงคะแนน</p>
      </div>
      <div className="sample-dashboard vote-demo">
        <form onSubmit={submit}>
          <fieldset disabled={Boolean(submitted)}>
            <legend>เลือกผู้สมัคร</legend>
            {candidates.map(({ id, name }) => (
              <label key={id}>
                <input
                  type="radio"
                  name="candidate"
                  value={id}
                  checked={(submitted || choice) === id}
                  onChange={() => setChoice(id)}
                  required
                />{" "}
                เบอร์ {id} · {name}
              </label>
            ))}
            <button className="market-primary" type="submit">
              <Vote size={18} aria-hidden="true" /> ลงคะแนนตัวอย่าง
            </button>
          </fieldset>
        </form>
        <p role="status">
          {submitted
            ? `ลงคะแนนเบอร์ ${submitted} แล้ว · แท็บนี้ลงคะแนนได้ครั้งเดียว`
            : "รอเลือกผู้สมัคร"}
        </p>
        <div className="sample-chart" aria-label="สรุปผลคะแนนตัวอย่าง">
          <h2>ผลคะแนนตัวอย่าง</h2>
          {candidates.map(({ id, name, votes }) => {
            const score = votes + Number(submitted === id);
            return (
              <div className="vote-result" key={id}>
                <span>{name}</span>
                <span className="sample-chart-track">
                  <i style={{ width: `${(score / 22) * 100}%` }} />
                </span>
                <strong>{score} คะแนน</strong>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
