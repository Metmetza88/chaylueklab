"use client";

import Link from "next/link";
import { useState } from "react";
import {
  budgetCategories,
  displayStatus,
  hasLocalDemo,
  money,
} from "@/lib/procurement";
import { quoteHref } from "@/lib/marketplace";
import { AddQuoteItem } from "./QuoteCart";

type Item = {
  slug: string;
  name: string;
  category: string;
  features: string[];
  status: string;
  price_cents: number;
};

export default function ProductComparison({ products }: { products: Item[] }) {
  const [choice, setChoice] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const rows = selected.flatMap((slug) =>
    products.filter((item) => item.slug === slug),
  );
  return (
    <>
      <form
        className="compare-picker"
        onSubmit={(event) => {
          event.preventDefault();
          if (choice && selected.length < 3 && !selected.includes(choice)) {
            setSelected([...selected, choice]);
            setChoice("");
          }
        }}
      >
        <label>
          เลือกโปรแกรม
          <select
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            disabled={selected.length === 3}
          >
            <option value="">เลือกจากแคตตาล็อก</option>
            {products
              .filter((p) => !selected.includes(p.slug))
              .map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <button
          className="market-primary"
          type="submit"
          disabled={!choice || selected.length === 3}
        >
          เพิ่มเพื่อเปรียบเทียบ
        </button>
      </form>
      <p role="status">{selected.length} / 3 โปรแกรม</p>
      {rows.length > 0 && (
        <>
          <div className="market-links">
            {rows.map((p) => (
              <button
                type="button"
                key={p.slug}
                onClick={() =>
                  setSelected(selected.filter((slug) => slug !== p.slug))
                }
              >
                นำ {p.name} ออก
              </button>
            ))}
          </div>
          <div
            className="compare-scroll"
            tabIndex={0}
            role="region"
            aria-label="ตารางเปรียบเทียบโปรแกรม"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">รายการ</th>
                  {rows.map((p) => (
                    <th scope="col" key={p.slug}>
                      <Link href={`/products/${p.slug}`}>{p.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">ราคาไฟล์ระบบ</th>
                  {rows.map((p) => (
                    <td key={p.slug}>
                      {p.status === "ready" ? "เริ่มต้น" : "ราคาเป้าหมาย"}{" "}
                      {money(p.price_cents)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">ฟีเจอร์เด่น</th>
                  {rows.map((p) => (
                    <td key={p.slug}>
                      <ul>
                        {p.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">หมวดงานสำหรับพิจารณางบ</th>
                  {rows.map((p) => (
                    <td key={p.slug}>
                      {budgetCategories[p.category] ?? p.category}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">สถานะ</th>
                  {rows.map((p) => (
                    <td key={p.slug}>
                      {displayStatus(p.status, hasLocalDemo(p.slug))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">ใบเสนอราคา</th>
                  {rows.map((p) => (
                    <td key={p.slug}>
                      <AddQuoteItem slug={p.slug} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <Link className="market-primary" href={quoteHref()}>
            เปิดตะกร้าใบเสนอราคา
          </Link>
        </>
      )}
    </>
  );
}
