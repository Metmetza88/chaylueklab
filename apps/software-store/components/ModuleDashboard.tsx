"use client";

import Link from "next/link";
import { useState } from "react";
import { dashboardSample, sampleGroups } from "@/lib/dashboard-samples";
import { quoteHref } from "@/lib/marketplace";

export default function ModuleDashboard({
  slug,
  name,
  tagline,
}: {
  slug: string;
  name: string;
  tagline: string;
}) {
  const sample = dashboardSample(slug, tagline);
  const groups = sampleGroups(sample.rows);
  const ceiling = Math.max(...groups.map(({ average }) => average), 1);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const rows = sample.rows.filter(
    ([code, title, group]) =>
      (!selected || group === selected) &&
      `${code} ${title} ${group}`
        .toLocaleLowerCase("th")
        .includes(search.trim().toLocaleLowerCase("th")),
  );

  return (
    <section className="section module-demo">
      <div className="page-heading">
        <p className="eyebrow">หน้าจอทดลอง · ข้อมูลสมมติ</p>
        <h1>{name}</h1>
        <p>
          เลือกแท่งกราฟเพื่อกรองรายการในตาราง หรือค้นหาจากชื่อและรหัสตัวอย่าง
        </p>
      </div>
      <div className="sample-dashboard" aria-label={sample.title}>
        <header>
          <div>
            <span className="eyebrow">แดชบอร์ดตัวอย่าง</span>
            <h2>{sample.title}</h2>
          </div>
          <Link className="btn ghost" href={quoteHref(slug)}>
            ขอใบเสนอราคา
          </Link>
        </header>
        <dl className="sample-metrics">
          <div>
            <dt>รายการทั้งหมด</dt>
            <dd>{sample.rows.length}</dd>
          </div>
          <div>
            <dt>รายการที่แสดง</dt>
            <dd>{rows.length}</dd>
          </div>
          <div>
            <dt>{sample.group}ทั้งหมด</dt>
            <dd>{groups.length}</dd>
          </div>
        </dl>
        <section
          aria-label={`ค่าเฉลี่ยตาม${sample.group}`}
          className="sample-chart"
        >
          <h3>
            ค่าเฉลี่ยตาม{sample.group} ({sample.unit})
          </h3>
          {groups.map(({ name, average }) => (
            <button
              type="button"
              key={name}
              aria-pressed={selected === name}
              onClick={() => setSelected(selected === name ? "" : name)}
            >
              <span>{name}</span>
              <span className="sample-chart-track">
                <i style={{ width: `${(average / ceiling) * 100}%` }} />
              </span>
              <strong>{average}</strong>
            </button>
          ))}
        </section>
        <div className="sample-controls">
          <label>
            {sample.group}
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {groups.map(({ name }) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            ค้นหารายการ
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              setSelected("");
              setSearch("");
            }}
          >
            ล้างตัวกรอง
          </button>
        </div>
        <p role="status">
          {rows.length
            ? `แสดง ${rows.length} รายการ`
            : "ไม่พบรายการที่ตรงกับตัวกรอง"}
        </p>
        <div className="sample-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">รหัส</th>
                <th scope="col">{sample.field}</th>
                <th scope="col">{sample.group}</th>
                <th scope="col">{sample.unit}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([code, title, group, amount]) => (
                <tr key={code}>
                  <th scope="row">{code}</th>
                  <td>{title}</td>
                  <td>{group}</td>
                  <td>{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Link href={`/products/${slug}`}>กลับไปดูรายละเอียด {name}</Link>
    </section>
  );
}
