"use client";

import { useState } from "react";

const colors = ["สีฟ้า", "สีทอง", "สีเขียว", "สีแดง"];
const medals = ["ทอง", "เงิน", "ทองแดง"];
const weights = [3, 2, 1];
const empty = [
  [2, 1, 0],
  [1, 1, 2],
  [1, 0, 1],
  [0, 1, 1],
];

export default function MedalDemo() {
  const [counts, setCounts] = useState(empty);
  const ranked = colors
    .map((color, index) => ({
      color,
      index,
      values: counts[index],
      score: counts[index].reduce(
        (total, qty, medal) => total + qty * weights[medal],
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || b.values[0] - a.values[0]);

  function award(team: number, medal: number) {
    setCounts((current) =>
      current.map((row, index) =>
        index === team
          ? row.map((value, column) => (column === medal ? value + 1 : value))
          : row,
      ),
    );
  }

  return (
    <section className="panel stack">
      <h2>ทดลองบันทึกเหรียญและอันดับคณะสี</h2>
      <p>ทอง 3 คะแนน เงิน 2 คะแนน ทองแดง 1 คะแนน</p>
      <div className="medal-list">
        {ranked.map(({ color, index, values, score }, rank) => (
          <article key={color} aria-label={color}>
            <h3>
              {rank + 1}. {color}
            </h3>
            <strong>{score} คะแนน</strong>
            <div className="market-links">
              {medals.map((medal, column) => (
                <button
                  type="button"
                  key={medal}
                  aria-label={`เพิ่มเหรียญ${medal} ${color}`}
                  onClick={() => award(index, column)}
                >
                  {medal} {values[column]} +
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <button
        type="button"
        className="btn ghost"
        onClick={() => setCounts(empty)}
      >
        คืนค่าเหรียญตัวอย่าง
      </button>
    </section>
  );
}
