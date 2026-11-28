"use client";
import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowUpRight,
  Check,
  Download,
  FileCheck,
  RotateCcw,
} from "lucide-react";
type Application = {
  no: string;
  grade: string;
  status: "submitted" | "approved" | "rejected" | "needs_documents";
  documents: boolean;
};
const labels = {
  submitted: "รอตรวจสอบ",
  approved: "อนุมัติ",
  rejected: "ไม่ผ่าน",
  needs_documents: "ขอเอกสารเพิ่ม",
};
const tabs = [
  ["overview", "ภาพรวม"],
  ["website", "เว็บไซต์โรงเรียน"],
  ["apply", "สมัครเรียน"],
  ["review", "ตรวจใบสมัคร"],
  ["results", "ตรวจสอบผล"],
  ["rounds", "รอบรับสมัคร"],
  ["settings", "ตั้งค่าโรงเรียน"],
];
export default function SchoolDemo({ product }: { product: string }) {
  const [tab, setTab] = useState(
    product === "met-school-pro" ? "website" : "overview",
  );
  const [apps, setApps] = useState<Application[]>([]);
  const [grade, setGrade] = useState("ม.1");
  const [documents, setDocuments] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [published, setPublished] = useState(false);
  const [school, setSchool] = useState("โรงเรียนสาธิตเมตศึกษา (สมมติ)");
  const [color, setColor] = useState("#8e7bff");
  const [notice, setNotice] = useState("");
  const [news, setNews] = useState([
    "ประกาศเปิดรับสมัครนักเรียน ปีการศึกษา 2570",
  ]);
  const [selected, setSelected] = useState(
    "ประกาศกำหนดการรายงานตัว (ข้อมูลสมมติ)",
  );
  const move = (id: string) => {
    setTab(id);
    setNotice("");
  };
  function apply() {
    if (!isOpen) {
      setNotice("รอบรับสมัครปิดอยู่");
      return;
    }
    const no = `DEMO-2570-${String(apps.length + 1).padStart(4, "0")}`;
    setApps((old) => [...old, { no, grade, status: "submitted", documents }]);
    setNotice(
      `ส่งใบสมัคร ${no} แล้ว — ใช้ชื่อนักเรียนและผู้ปกครองสมมติเท่านั้น`,
    );
  }
  function exportCsv() {
    const csv =
      "\uFEFFเลขที่ใบสมัคร,ชั้น,ชื่อสมมติ,สถานะ\r\n" +
      apps
        .map((a) => `${a.no},${a.grade},นักเรียนสมมติ เมตศึกษา,${a.status}`)
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo-admissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="section">
      <div className="row spaced">
        <div>
          <span className="eyebrow">
            WORAMET AI LAB / INTERACTIVE PRODUCT TOUR
          </span>
          <h1>
            {product === "met-school-pro" ? "MET School Pro" : "MET Admission"}
          </h1>
        </div>
        <Link className="btn ghost" href={`/products/${product}`}>
          รายละเอียดโปรแกรม <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="demo-bar">
        <strong>DEMO · ข้อมูลสมมติเท่านั้น</strong> —
        ทดลองการใช้งานโดยไม่ส่งใบสมัครขึ้น Server ไม่รับชื่อ เบอร์โทร
        หรือเอกสารจริง ข้อมูลทดลองจะหายเมื่อรีเฟรชหน้า
      </div>
      <div className="workspace">
        <aside>
          <span className="brand">
            <GraduationCap size={24} />
            <span>
              MET<small>SCHOOL WORKSPACE</small>
            </span>
          </span>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => move(id)}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              setApps([]);
              setNews(["ประกาศเปิดรับสมัครนักเรียน ปีการศึกษา 2570"]);
              setNotice("ล้างข้อมูลทดลองแล้ว");
            }}
          >
            <RotateCcw size={13} /> เริ่มทดลองใหม่
          </button>
        </aside>
        <main style={{ borderTop: `2px solid ${color}` }}>
          <div className="row spaced">
            <span className="eyebrow">{school}</span>
            <span className="status">DEMO WORKSPACE</span>
          </div>
          {tab === "overview" && (
            <>
              <h2>ภาพรวมการรับสมัคร</h2>
              <p className="muted">
                ปีการศึกษา 2570 · จำนวนคำนวณจากใบสมัครที่คุณทดลองในหน้านี้
              </p>
              <div className="stats-grid">
                {[
                  ["ใบสมัครทั้งหมด", apps.length],
                  [
                    "รอตรวจ",
                    apps.filter((a) =>
                      ["submitted", "needs_documents"].includes(a.status),
                    ).length,
                  ],
                  [
                    "อนุมัติ",
                    apps.filter((a) => a.status === "approved").length,
                  ],
                  ["เอกสารครบ", apps.filter((a) => a.documents).length],
                ].map(([label, n]) => (
                  <div className="stat-card" key={label}>
                    <span>{label}</span>
                    <strong>{n}</strong>
                  </div>
                ))}
              </div>
              <div className="panel stack">
                <h3>เริ่มสำรวจระบบ</h3>
                <p className="muted">
                  ลองสมัครเรียนหนึ่งรายการ จากนั้นเข้าตรวจใบสมัคร อนุมัติ
                  และประกาศผล
                </p>
                <div className="row">
                  <button className="btn" onClick={() => move("apply")}>
                    ทดลองสมัครเรียน →
                  </button>
                  <button className="btn ghost" onClick={() => move("review")}>
                    ตรวจใบสมัคร
                  </button>
                </div>
              </div>
              <div className="info-grid">
                {[
                  ["สมัครออนไลน์", "กรอกข้อมูล เลือกชั้นเรียน และแนบเอกสาร"],
                  [
                    "ปลอดภัยตามหน้าที่",
                    "ระบบจริงตรวจสิทธิ์ผู้ปกครองและเจ้าหน้าที่ทุกคำขอ",
                  ],
                ].map(([h, p]) => (
                  <div className="panel" key={h}>
                    <FileCheck size={22} color={color} />
                    <h3>{h}</h3>
                    <p className="muted">{p}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "website" && (
            <>
              <div className="school-hero">
                <div className="school-card-logo" style={{ color }}>
                  M
                </div>
                <span className="eyebrow">ปีการศึกษา 2570</span>
                <h2>{school}</h2>
                <p className="muted">
                  พื้นที่แห่งการเรียนรู้และโอกาสใหม่
                  ตัวอย่างเว็บไซต์ประชาสัมพันธ์โรงเรียน
                </p>
                <button className="btn" onClick={() => move("apply")}>
                  สมัครเรียนออนไลน์ →
                </button>
              </div>
              <h3 style={{ marginTop: 25 }}>ข่าวสารและประกาศ</h3>
              {news.map((n, i) => (
                <article
                  className="panel"
                  style={{ marginTop: 15 }}
                  key={n + i}
                >
                  <span className="eyebrow">
                    ข่าวประชาสัมพันธ์ · ข้อมูลสมมติ
                  </span>
                  <h3>{n}</h3>
                  <p className="muted">
                    ติดตามขั้นตอนการสมัครและตรวจสอบสถานะผ่านพื้นที่ผู้ปกครอง
                  </p>
                </article>
              ))}
              <details className="panel" style={{ marginTop: 20 }}>
                <summary>ทดลองจัดการข่าว (บทบาทผู้ดูแลสมมติ)</summary>
                <div className="stack" style={{ marginTop: 15 }}>
                  <label>
                    เลือกข่าวตัวอย่าง
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      <option>ประกาศกำหนดการรายงานตัว (ข้อมูลสมมติ)</option>
                      <option>กิจกรรมเปิดบ้านวิชาการ (ข้อมูลสมมติ)</option>
                      <option>ปฏิทินการศึกษา (ข้อมูลสมมติ)</option>
                    </select>
                  </label>
                  <button
                    className="btn ghost"
                    onClick={() => {
                      setNews((old) => [selected, ...old]);
                      setNotice("เผยแพร่ข่าวตัวอย่างแล้ว");
                    }}
                  >
                    เผยแพร่ข่าวตัวอย่าง
                  </button>
                  {news.length > 0 && (
                    <button
                      className="btn ghost"
                      onClick={() => setNews((old) => old.slice(1))}
                    >
                      นำข่าวล่าสุดออก
                    </button>
                  )}
                </div>
              </details>
            </>
          )}
          {tab === "apply" && (
            <>
              <h2>สมัครเรียนออนไลน์</h2>
              <p className="muted">
                เพื่อความเป็นส่วนตัว ระบบทดลองกำหนดชื่อและข้อมูลสมมติให้
              </p>
              <form
                className="panel stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  apply();
                }}
              >
                <span className="status">
                  {isOpen ? "เปิดรับสมัคร" : "ปิดรับสมัคร"}
                </span>
                <div className="form-grid">
                  <label>
                    ชื่อ-นามสกุลนักเรียน
                    <input readOnly value="นักเรียนสมมติ เมตศึกษา" />
                  </label>
                  <label>
                    ผู้ปกครอง
                    <input readOnly value="ผู้ปกครองสมมติ เมตศึกษา" />
                  </label>
                  <label>
                    เบอร์โทรศัพท์
                    <input readOnly value="ไม่เก็บเบอร์โทรใน Demo" />
                  </label>
                  <label>
                    ระดับชั้น
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                    >
                      <option>ม.1</option>
                      <option>ม.4</option>
                    </select>
                  </label>
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={documents}
                    onChange={(e) => setDocuments(e.target.checked)}
                  />
                  แนบชุดเอกสารจำลอง (ไม่มีไฟล์หรือข้อมูลจริง)
                </label>
                <p className="muted">
                  ข้อมูลนี้ใช้ทดลองเท่านั้น ไม่เป็นการสมัครเรียนจริง
                </p>
                <button className="btn" disabled={!isOpen}>
                  ส่งใบสมัครตัวอย่าง <Check size={16} />
                </button>
              </form>
            </>
          )}
          {(tab === "review" || tab === "results") && (
            <>
              <div className="row spaced">
                <h2>
                  {tab === "review"
                    ? "ตรวจใบสมัคร (บทบาทเจ้าหน้าที่สมมติ)"
                    : "ติดตามสถานะและผลการสมัคร"}
                </h2>
                {tab === "review" && (
                  <button className="btn ghost" onClick={exportCsv}>
                    <Download size={15} /> CSV
                  </button>
                )}
              </div>
              {!apps.length ? (
                <div className="empty panel">
                  <p>ยังไม่มีใบสมัครทดลอง</p>
                  <button className="btn" onClick={() => move("apply")}>
                    ทดลองสมัครเรียน
                  </button>
                </div>
              ) : (
                apps.map((a) => (
                  <article
                    className="panel stack"
                    style={{ marginTop: 18 }}
                    key={a.no}
                  >
                    <div className="row spaced">
                      <h3>{a.no}</h3>
                      <span className="status">
                        {tab === "results" &&
                        ["approved", "rejected"].includes(a.status) &&
                        !published
                          ? "รอประกาศผล"
                          : labels[a.status]}
                      </span>
                    </div>
                    <p>นักเรียนสมมติ เมตศึกษา · {a.grade}</p>
                    <p className="muted">
                      เอกสาร:{" "}
                      {a.documents
                        ? "แนบเอกสารจำลองแล้ว"
                        : "ยังไม่มีเอกสารจำลอง"}
                    </p>
                    {tab === "review" && (
                      <div className="row">
                        {(
                          ["needs_documents", "approved", "rejected"] as const
                        ).map((status) => (
                          <button
                            className="btn ghost"
                            key={status}
                            onClick={() => {
                              setApps((old) =>
                                old.map((x) =>
                                  x.no === a.no ? { ...x, status } : x,
                                ),
                              );
                              setNotice(`บันทึกสถานะ ${labels[status]} แล้ว`);
                            }}
                          >
                            {labels[status]}
                          </button>
                        ))}
                      </div>
                    )}
                    <a
                      className="btn ghost"
                      href={`/api/demo/application-pdf?grade=${encodeURIComponent(a.grade)}`}
                    >
                      ดาวน์โหลดใบสมัคร PDF (ข้อมูลสมมติ)
                    </a>
                  </article>
                ))
              )}
            </>
          )}
          {tab === "rounds" && (
            <>
              <h2>รอบรับสมัคร</h2>
              <p className="muted">
                ทดลองเปิด/ปิด และประกาศผล ไม่เปลี่ยนข้อมูลของโรงเรียนจริง
              </p>
              <div className="panel stack">
                <h3>รอบทั่วไป ปีการศึกษา 2570</h3>
                <p className="muted">
                  ม.1 / ม.4 · สถานะ {isOpen ? "เปิดรับสมัคร" : "ปิดรับสมัคร"}
                </p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => setIsOpen(e.target.checked)}
                  />
                  เปิดรับสมัคร
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                  />
                  ประกาศผลการคัดเลือก
                </label>
                <button className="btn ghost" onClick={() => move("results")}>
                  ดูหน้าตรวจสอบผล →
                </button>
              </div>
            </>
          )}
          {tab === "settings" && (
            <>
              <h2>ตั้งค่าโรงเรียน</h2>
              <p className="muted">
                เลือกชุดโรงเรียนสมมติและสี เพื่อทดลองการปรับแต่งแบรนด์
              </p>
              <div className="panel stack">
                <label>
                  โรงเรียนตัวอย่าง
                  <select
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                  >
                    <option>โรงเรียนสาธิตเมตศึกษา (สมมติ)</option>
                    <option>โรงเรียนอนาคตวิทยา (สมมติ)</option>
                    <option>โรงเรียนเทคโนโลยีศึกษา (สมมติ)</option>
                  </select>
                </label>
                <label>
                  สีประจำโรงเรียน
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  >
                    <option value="#8e7bff">ม่วง</option>
                    <option value="#5bdecf">เขียว Cyan</option>
                    <option value="#78aaff">น้ำเงิน</option>
                  </select>
                </label>
                <p className="muted">
                  ระบบติดตั้งจริงรองรับชื่อ โลโก้ สี ปีการศึกษา
                  และสิทธิ์เจ้าหน้าที่ผ่านฐานข้อมูล
                </p>
                <button
                  className="btn"
                  onClick={() => {
                    move("website");
                    setNotice("เปลี่ยนการตั้งค่าทดลองแล้ว");
                  }}
                >
                  ดูเว็บไซต์โรงเรียน →
                </button>
              </div>
            </>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </main>
      </div>
    </section>
  );
}
