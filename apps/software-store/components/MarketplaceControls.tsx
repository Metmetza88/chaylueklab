"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  ClipboardList,
  FileText,
  Grid2X2,
  Home,
  Mail,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

const procurement = "/school-systems#procurement";
const quote = "/contact#quotation";
const line = "https://lin.ee/Vgg2m3N";

export function MarketplaceHeader() {
  const search = useRef<HTMLDialogElement>(null);
  const news = useRef<HTMLDialogElement>(null);
  return (
    <div className="market-header-actions">
      <button
        type="button"
        aria-label="ค้นหาโปรแกรม"
        onClick={() => {
          search.current?.showModal();
          search.current?.querySelector("input")?.focus();
        }}
      >
        <Search size={19} />
      </button>
      <button
        type="button"
        aria-label="แจ้งเตือน"
        onClick={() => news.current?.showModal()}
      >
        <Bell size={19} />
      </button>
      <Link href="/contact" aria-label="ติดต่อเรา">
        <Mail size={19} />
      </Link>
      <dialog
        ref={search}
        className="market-dialog"
        aria-labelledby="market-search-title"
      >
        <DialogTitle id="market-search-title" title="ค้นหาโปรแกรม" />
        <form
          action="/products"
          className="market-input-row"
          onSubmit={() => search.current?.close()}
        >
          <input
            type="search"
            name="q"
            maxLength={100}
            aria-label="ชื่อโปรแกรมหรืองานที่ต้องการ"
            placeholder="เช่น กีฬาสี หรือ รับสมัคร"
          />
          <button className="market-primary" type="submit">
            ค้นหา
          </button>
        </form>
      </dialog>
      <dialog
        ref={news}
        className="market-dialog"
        aria-labelledby="market-news-title"
      >
        <DialogTitle id="market-news-title" title="ข่าวสารร้านซอฟต์แวร์" />
        <p>ดูโปรแกรมสำหรับกิจกรรมกีฬาสีและเอกสารประกอบการจัดซื้อ</p>
        <div className="market-links">
          <Link href="/products?q=กีฬาสี" onClick={() => news.current?.close()}>
            ดูระบบกีฬาสี
          </Link>
          <Link href={procurement} onClick={() => news.current?.close()}>
            อ่านคู่มือเบิกงบ
          </Link>
        </div>
      </dialog>
    </div>
  );
}

export function DialogTitle({ id, title }: { id: string; title: string }) {
  return (
    <div className="market-dialog-title">
      <h2 id={id}>{title}</h2>
      <form method="dialog">
        <button className="market-close" aria-label="ปิดหน้าต่าง">
          <X size={20} />
        </button>
      </form>
    </div>
  );
}

const replies = [
  [
    /เอกสาร|เบิก|จัดซื้อ|พัสดุ|tor|ภาษี/i,
    "แจ้งแบบเอกสารที่โรงเรียนใช้ เช่น ใบเสนอราคา รายละเอียดประกอบ TOR หรือใบส่งของ ทีมงานจะยืนยันรายการที่จัดทำได้ก่อนเสนอราคา ส่วนการอนุมัติเป็นขั้นตอนของโรงเรียนครับ",
  ],
  [
    /ขอราคา|ใบเสนอราคา/,
    "เปิดการ์ดโปรแกรมแล้วกดขอใบเสนอราคา แจ้งชื่อโรงเรียน ขอบเขตโครงการ จำนวนผู้ใช้ และกำหนดส่งผ่าน LINE ครับ",
  ],
  [
    /ราคา|งบ|บาท|กีฬาสี/,
    "ราคาเป้าหมายบนการ์ดเป็นข้อมูลวางแผนสำหรับโปรแกรมที่ยังไม่เปิดขาย ราคาของงานกีฬาสีให้ทีมประเมินจากจำนวนทีม รายการแข่ง และงานที่ต้องการครับ",
  ],
  [
    /เดโม|ทดลอง/,
    "เลือกเมนูทดลองใช้งานเพื่อเปิดตัวอย่างที่พร้อมให้ลอง โดยใช้ข้อมูลสมมติครับ",
  ],
] as const;

export default function MarketplaceDock() {
  const path = usePathname();
  const help = useRef<HTMLDialogElement>(null);
  const [conversation, setConversation] = useState<
    { question: string; reply: string }[]
  >([]);
  if (
    ![
      "/",
      "/products",
      "/categories",
      "/demo",
      "/school-systems",
      "/contact",
    ].includes(path) &&
    !path.startsWith("/products/") &&
    !path.startsWith("/demo/")
  )
    return null;

  const shortcuts = [
    { href: "/", label: "หน้าแรก", icon: Home },
    { href: "/products", label: "ระบบทั้งหมด", icon: Grid2X2 },
    { href: quote, label: "ขอใบเสนอราคา", icon: ClipboardList },
    { href: procurement, label: "เอกสารเบิกงบ", icon: FileText },
    { href: "/contact", label: "ติดต่อเรา", icon: Mail },
  ];
  function ask(question: string) {
    if (!question) return;
    const reply =
      replies.find(([pattern]) => pattern.test(question))?.[1] ??
      "ผมช่วยตอบเรื่องราคา เอกสารเบิกงบ และเดโมได้ครับ ถ้าเป็นคำถามเฉพาะโครงการ กดคุยกับทีมงานทาง LINE ได้เลย";
    setConversation((messages) => [...messages.slice(-9), { question, reply }]);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    ask(String(new FormData(form).get("question") ?? "").trim());
    form.reset();
  }
  return (
    <div className="market-tools">
      <button
        className="market-help"
        type="button"
        onClick={() => help.current?.showModal()}
      >
        <span className="market-robot">
          <Bot size={23} aria-hidden="true" />
        </span>
        <span>ถามได้เลย!</span>
      </button>
      <a
        className="market-line"
        href={line}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="แชท LINE"
      >
        <MessageCircle size={25} aria-hidden="true" />
        <small aria-hidden="true">LINE</small>
      </a>
      <nav className="market-dock" aria-label="เมนูลัดบนมือถือ">
        {shortcuts.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={href === quote ? "market-dock-quote" : undefined}
            aria-current={path === href ? "page" : undefined}
          >
            <span>
              <Icon size={19} aria-hidden="true" />
            </span>
            <small>{label}</small>
          </Link>
        ))}
      </nav>
      <dialog
        ref={help}
        className="market-dialog market-chat"
        aria-labelledby="market-chat-title"
      >
        <DialogTitle id="market-chat-title" title="ถามเรื่องราคาและเบิกงบ" />
        <p>ผู้ช่วยตอบคำถามอัตโนมัติในหน้านี้</p>
        <div className="market-links">
          {["ราคากีฬาสี", "เอกสารเบิกงบ", "ขอใบเสนอราคา"].map((q) => (
            <button key={q} type="button" onClick={() => ask(q)}>
              {q}
            </button>
          ))}
        </div>
        <div role="log" aria-label="ข้อความแชท" className="market-messages">
          {!conversation.length && (
            <p>ลองพิมพ์คำถามเรื่องราคา เอกสารจัดซื้อ หรือการทดลองใช้งาน</p>
          )}
          {conversation.map(({ question, reply }, index) => (
            <div key={index}>
              <p>
                <b>คุณ</b> {question}
              </p>
              <p>
                <b>ผู้ช่วย</b> {reply}
              </p>
            </div>
          ))}
        </div>
        <form className="market-input-row" onSubmit={submit}>
          <input
            name="question"
            aria-label="พิมพ์คำถาม"
            placeholder="พิมพ์คำถาม"
            maxLength={220}
            required
            autoComplete="off"
          />
          <button className="market-primary" type="submit">
            ถาม
          </button>
        </form>
        <p>
          <a href={line} target="_blank" rel="noopener noreferrer">
            คุยกับทีมงานทาง LINE
          </a>
        </p>
      </dialog>
    </div>
  );
}
