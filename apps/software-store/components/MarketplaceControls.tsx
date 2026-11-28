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
import {
  lineContact,
  matchesProduct,
  productOffer,
  procurementHref,
  quoteHref,
  sportSlug,
  sportTitle,
  type MarketplaceProduct,
} from "@/lib/marketplace";

import { ContactDialogIcon, StoreDialog } from "./StoreDialogs";

const quote = quoteHref();

export function MarketplaceHeader({
  products,
  source,
}: {
  products: MarketplaceProduct[];
  source: "database" | "roadmap" | "error";
}) {
  const search = useRef<HTMLDialogElement>(null);
  const news = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const matches = query.trim()
    ? products.filter((product) => matchesProduct(product, query))
    : [];
  const readyCount = products.filter(
    (product) => productOffer(product) !== "roadmap",
  ).length;
  return (
    <div className="market-header-actions">
      <button
        type="button"
        aria-label="ค้นหาโปรแกรม"
        aria-haspopup="dialog"
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
        aria-haspopup="dialog"
        onClick={() => news.current?.showModal()}
      >
        <Bell size={19} />
      </button>
      <ContactDialogIcon />
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            aria-label="ชื่อโปรแกรมหรืองานที่ต้องการ"
            placeholder="เช่น กีฬาสี หรือ รับสมัคร"
          />
          <button className="market-primary" type="submit">
            ดูผลในรายการระบบ
          </button>
        </form>
        {query.trim() && (
          <>
            <p role="status">
              {matches.length
                ? `พบ ${matches.length} โปรแกรม`
                : "ไม่พบโปรแกรมที่ตรงกับการค้นหา"}
            </p>
            <ul className="market-search-results">
              {matches.slice(0, 5).map((product) => (
                <li key={product.slug}>
                  <Link
                    href={`/products/${product.slug}`}
                    onClick={() => search.current?.close()}
                  >
                    <strong>
                      {product.slug === sportSlug ? sportTitle : product.name}
                    </strong>
                    <small>{product.tagline}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </dialog>
      <dialog
        ref={news}
        className="market-dialog"
        aria-labelledby="market-news-title"
      >
        <DialogTitle id="market-news-title" title="ข่าวสารร้านซอฟต์แวร์" />
        <p>
          {source === "error"
            ? "ไม่สามารถโหลดสถานะแคตตาล็อกได้ในขณะนี้"
            : readyCount
              ? `มี ${readyCount} โปรแกรมที่ติดต่อขอใบเสนอราคาได้ ดูรายละเอียดจากรายการระบบ`
              : "โปรแกรมอยู่ระหว่างพัฒนา ดูสถานะและราคาเป้าหมายได้จากแคตตาล็อก"}
        </p>
        <div className="market-links">
          <Link href="/products?q=กีฬาสี" onClick={() => news.current?.close()}>
            ดูระบบกีฬาสี
          </Link>
          <Link href={procurementHref} onClick={() => news.current?.close()}>
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
    "แต่ละระบบมีราคาและรอบคิดค่าบริการต่างกันครับ เลือกโปรแกรมที่สนใจเพื่อดูราคา หรือติดต่อขอประเมินตามขอบเขตงาน",
  ],
  [
    /เดโม|ทดลอง/,
    "เลือกเมนูทดลองใช้งานเพื่อเปิดตัวอย่างที่พร้อมให้ลอง โดยใช้ข้อมูลสมมติครับ",
  ],
] as const;

export default function MarketplaceDock({
  products,
}: {
  products: MarketplaceProduct[];
}) {
  const path = usePathname();
  const help = useRef<HTMLDialogElement>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [conversation, setConversation] = useState<
    { question: string; reply: string }[]
  >([]);
  if (
    ![
      "/",
      "/products",
      "/categories",
      "/demo",
      "/guide",
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
    { href: procurementHref, label: "เอกสารเบิกงบ", icon: FileText },
    { href: "/contact", label: "ติดต่อเรา", icon: Mail },
  ];
  function ask(question: string) {
    if (!question) return;
    const text = question.toLocaleLowerCase("th");
    const named = products.find(
      (p) =>
        text.includes(p.name.toLocaleLowerCase("th")) ||
        text.includes(p.slug) ||
        text.includes(p.tagline.toLocaleLowerCase("th")) ||
        (p.slug === sportSlug && text.includes("กีฬาสี")),
    );
    const product = named ?? products.find((p) => p.slug === selectedSlug);
    const pricing = /ราคา|เท่าไหร่|เท่าไร|กี่บาท|ค่าใช้จ่าย/u.test(
      text.replaceAll("ใบเสนอราคา", ""),
    );
    const offer = product && productOffer(product);
    const priceReply =
      product &&
      (pricing ||
        (named && !/เอกสาร|เบิก|จัดซื้อ|ใบเสนอราคา|เดโม|ทดลอง/u.test(text)))
        ? `${product.name} · ${product.price}${offer === "school-order" ? " · ยืนยันราคาในใบเสนอราคา" : offer === "roadmap" ? " · ขณะนี้ยังไม่เปิดจำหน่าย" : ""}`
        : "";
    const reply =
      replies.find(([pattern]) => pattern.test(question))?.[1] ??
      "ผมช่วยตอบเรื่องราคา เอกสารเบิกงบ และเดโมได้ครับ ถ้าเป็นคำถามเฉพาะโครงการ กดคุยกับทีมงานทาง LINE ได้เลย";
    if (named) setSelectedSlug(named.slug);
    setConversation((messages) => [
      ...messages.slice(-9),
      {
        question,
        reply: [priceReply, reply].filter(Boolean).join("\n\n"),
      },
    ]);
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
        aria-haspopup="dialog"
        onClick={() => help.current?.showModal()}
      >
        <span className="market-robot">
          <Bot size={23} aria-hidden="true" />
        </span>
        <span>🤖 ถามได้เลย!</span>
      </button>
      <a
        className="market-line"
        href={lineContact}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="แชท LINE"
      >
        <MessageCircle size={25} aria-hidden="true" />
        <small aria-hidden="true">LINE</small>
      </a>
      <nav className="market-dock" aria-label="เมนูลัดบนมือถือ">
        {shortcuts.map(({ href, label, icon: Icon }) => {
          const contents = (
            <>
              <span>
                <Icon size={19} aria-hidden="true" />
              </span>
              <small>{label}</small>
            </>
          );
          if (href === procurementHref || href === "/contact") {
            return (
              <StoreDialog
                key={href}
                kind={href === procurementHref ? "procurement" : "contact"}
              >
                {contents}
              </StoreDialog>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={href === quote ? "market-dock-quote" : undefined}
              aria-current={
                path === href ||
                (href === "/products" && path.startsWith("/products/"))
                  ? "page"
                  : undefined
              }
            >
              {contents}
            </Link>
          );
        })}
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
        <div
          role="log"
          aria-label="ข้อความแชท"
          className="market-messages"
          ref={(log) => {
            if (log) log.scrollTop = log.scrollHeight;
          }}
        >
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
        <div className="market-links market-chat-links">
          <Link
            href={quoteHref(selectedSlug)}
            onClick={() => help.current?.close()}
          >
            ขอใบเสนอราคา
          </Link>
          <StoreDialog kind="procurement" className="store-chat-documents" />
          <a href={lineContact} target="_blank" rel="noopener noreferrer">
            คุยกับทีมงานทาง LINE
          </a>
        </div>
      </dialog>
    </div>
  );
}
