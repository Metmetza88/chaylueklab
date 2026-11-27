"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Check, Plus } from "lucide-react";
import {
  money,
  packageNames,
  quoteTotals,
  sellerLine,
  servicePrice,
  type PackageKind,
  type QuoteProduct,
  type QuoteSelection,
} from "@/lib/procurement";
import { quoteHref } from "@/lib/marketplace";
import { CartProvider } from "@/lib/cart";

const storageKey = "chaylueklab-school-quotation";
const QuoteContext = createContext<{
  products: QuoteProduct[];
  selections: QuoteSelection;
  choose: (slug: string, kind?: PackageKind) => void;
}>({ products: [], selections: {}, choose: () => {} });

export function StoreProviders({
  products,
  children,
}: {
  products: QuoteProduct[];
  children: ReactNode;
}) {
  const [selections, setSelections] = useState<QuoteSelection>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(storageKey) ?? "{}",
      );
      if (saved && typeof saved === "object") {
        setSelections(
          Object.fromEntries(
            Object.entries(saved).filter(
              ([slug, kind]) =>
                /^[a-z0-9-]{1,100}$/.test(slug) &&
                (kind === "source" || kind === "service"),
            ),
          ),
        );
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(selections));
      } catch {}
    }
  }, [ready, selections]);

  function choose(slug: string, kind?: PackageKind) {
    if (!products.some((p) => p.slug === slug)) return;
    setSelections((old) => {
      const next = { ...old };
      if (kind) next[slug] = kind;
      else delete next[slug];
      return next;
    });
  }

  return (
    <QuoteContext.Provider value={{ products, selections, choose }}>
      <CartProvider>{children}</CartProvider>
    </QuoteContext.Provider>
  );
}

export function AddQuoteItem({
  slug,
  kind,
}: {
  slug: string;
  kind?: PackageKind;
}) {
  const { selections, choose } = useContext(QuoteContext);
  const selected = selections[slug];
  const added = !!selected && (!kind || selected === kind);
  return (
    <button
      className="btn ghost quote-add"
      type="button"
      aria-pressed={added}
      onClick={() => choose(slug, kind ?? selected ?? "source")}
    >
      {added ? (
        <>
          <Check size={17} /> อยู่ในใบเสนอราคา
        </>
      ) : (
        <>
          <Plus size={17} /> เพิ่มลงใบเสนอราคา
        </>
      )}
    </button>
  );
}

export function QuoteCartLink() {
  const { products, selections } = useContext(QuoteContext);
  const count = products.filter((p) => selections[p.slug]).length;
  return (
    <Link href={quoteHref()}>
      ตะกร้าใบเสนอราคา <span aria-label={`${count} รายการ`}>({count})</span>
    </Link>
  );
}

export function QuotePackages({
  slug,
  close,
  price,
}: {
  slug: string;
  close: () => void;
  price: string;
}) {
  const router = useRouter();
  const { choose, selections } = useContext(QuoteContext);
  const [kind, setKind] = useState<PackageKind>("source");
  const selected = selections[slug] ?? kind;
  return (
    <fieldset className="quote-packages">
      <legend>เลือกแพ็กเกจ</legend>
      <label>
        <input
          type="radio"
          name={`package-${slug}`}
          checked={selected === "source"}
          onChange={() => {
            setKind("source");
            if (selections[slug]) choose(slug, "source");
          }}
        />
        <span>
          <b>{packageNames.source}</b>
          <small>{price} ตามหน้าการ์ด · ทีมยืนยันความพร้อมของไฟล์</small>
        </span>
      </label>
      <label>
        <input
          type="radio"
          name={`package-${slug}`}
          checked={selected === "service"}
          onChange={() => {
            setKind("service");
            if (selections[slug]) choose(slug, "service");
          }}
        />
        <span>
          <b>{packageNames.service}</b>
          <small>
            {money(servicePrice.min)}–{money(servicePrice.max)} ต่อระบบ ·
            ประเมินโลโก้ อบรม การนำเข้าจาก DMC ที่โรงเรียนอนุญาต
            และเอกสารใบเสนอราคา TOR หรือใบเสร็จตามขอบเขตงาน
          </small>
        </span>
      </label>
      <div className="market-links">
        <AddQuoteItem slug={slug} kind={selected} />
        <a
          className="market-primary"
          href={quoteHref(slug)}
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            choose(slug, selected);
            close();
            router.push(quoteHref(slug));
          }}
        >
          ขอใบเสนอราคา
        </a>
      </div>
    </fieldset>
  );
}

export function ConsolidatedQuote({ initialSlug }: { initialSlug?: string }) {
  const { products, selections, choose } = useContext(QuoteContext);
  const [removed, setRemoved] = useState<string>();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const items = products.flatMap((product) => {
    const kind =
      selections[product.slug] ??
      (product.slug === initialSlug && removed !== initialSlug
        ? "source"
        : undefined);
    return kind ? [{ product, kind }] : [];
  });
  const total = quoteTotals(items);
  const totalLabel =
    total.min === total.max
      ? money(total.min)
      : `${money(total.min)}–${money(total.max)}`;

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const school = String(form.get("school")).trim();
    const phone = String(form.get("phone")).trim();
    const note = String(form.get("note")).trim();
    if (
      school.length < 2 ||
      !/^[+0-9][0-9 ()-]{7,23}$/.test(phone) ||
      phone.replace(/\D/g, "").length < 8
    ) {
      setError("กรุณาตรวจชื่อโรงเรียนและเบอร์โทรติดต่อ");
      return;
    }
    setError("");
    setDraft(
      [
        "ขอใบเสนอราคารวมสำหรับโรงเรียน",
        `ชื่อสถานศึกษา: ${school}`,
        `เบอร์ติดต่อ: ${phone}`,
        ...items.map(
          ({ product, kind }, index) =>
            `${index + 1}. ${product.name} · ${packageNames[kind]}`,
        ),
        `ยอดประเมิน: ${totalLabel}`,
        note && `รายละเอียด: ${note}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return (
    <section aria-labelledby="quote-cart-title" className="quote-cart">
      <h3 id="quote-cart-title">ตะกร้าใบเสนอราคา · {items.length} ระบบ</h3>
      {items.length === 0 ? (
        <p>
          เลือกโปรแกรมเพื่อรวมไว้ในคำขอเดียว{" "}
          <Link href="/products">ดูระบบทั้งหมด →</Link>
        </p>
      ) : (
        <>
          <ul className="quote-items">
            {items.map(({ product, kind }) => (
              <li key={product.slug}>
                <strong>{product.name}</strong>
                <label>
                  แพ็กเกจ
                  <select
                    value={kind}
                    onChange={(event) => {
                      choose(product.slug, event.target.value as PackageKind);
                      setDraft("");
                    }}
                  >
                    <option value="source">
                      {packageNames.source} · {money(product.price_cents)}
                    </option>
                    <option value="service">{packageNames.service}</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="text-button"
                  aria-label={`นำ ${product.name} ออก`}
                  onClick={() => {
                    choose(product.slug);
                    if (product.slug === initialSlug) setRemoved(initialSlug);
                    setDraft("");
                  }}
                >
                  นำออก
                </button>
              </li>
            ))}
          </ul>
          <p className="quote-total">
            ยอดประเมินรวม <strong>{totalLabel}</strong>
          </p>
          <p className="muted">
            {total.hasTarget ? "รวมราคาเป้าหมายของบางระบบ " : ""}
            ผู้ขายยืนยันราคาและเอกสารตามขอบเขตก่อนออกใบเสนอราคา
          </p>
          <form
            className="stack"
            onSubmit={prepare}
            onInput={() => {
              setDraft("");
              setError("");
            }}
          >
            <label>
              ชื่อโรงเรียน
              <input
                name="school"
                autoComplete="organization"
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label>
              เบอร์โทรติดต่อ
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={24}
                required
              />
            </label>
            <label>
              ขอบเขตงาน / เอกสารที่ต้องการ
              <textarea name="note" rows={3} maxLength={300} />
            </label>
            <button type="submit" className="market-primary">
              เตรียมคำขอรวม
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
          {draft && (
            <div className="stack">
              <p role="status">
                เตรียมข้อความแล้ว กดเปิด LINE เพื่อตรวจและส่งให้ร้าน
              </p>
              <label>
                สรุปคำขอ
                <textarea rows={7} readOnly value={draft} />
              </label>
              <a
                className="btn"
                href={sellerLine + encodeURIComponent(draft)}
                target="_blank"
                rel="noopener noreferrer"
              >
                เปิด LINE เพื่อส่งคำขอรวม ↗
              </a>
            </div>
          )}
        </>
      )}
    </section>
  );
}
