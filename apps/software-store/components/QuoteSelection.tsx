"use client";

import Link from "next/link";
import { useSyncExternalStore, type ChangeEvent } from "react";
import { ClipboardList, Plus } from "lucide-react";
import {
  formatBaht,
  packages,
  serviceRange,
  type QuotePlan,
} from "@/lib/quote";

const storageKey = "chaylueklab-quote-selection";
const changeEvent = "chaylueklab-quote-change";
type Selection = Record<string, QuotePlan>;
const empty: Selection = {};
let previousValue: string | null = null;
let selection: Selection = empty;

function readSelection() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (previousValue !== raw) {
      previousValue = raw;
      const saved: unknown = JSON.parse(raw ?? "{}");
      selection = Object.fromEntries(
        Object.entries(saved && typeof saved === "object" ? saved : {}).filter(
          ([slug, plan]) =>
            /^[a-z0-9-]{1,100}$/.test(slug) &&
            (plan === "files" || plan === "service"),
        ),
      );
    }
  } catch {
    // In-memory selection still works when browser storage is unavailable.
  }
  return selection;
}

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useQuoteSelection() {
  return useSyncExternalStore(subscribe, readSelection, () => empty);
}

export function updateQuoteSelection(slug: string, plan?: QuotePlan) {
  const next = { ...readSelection() };
  if (plan) next[slug] = plan;
  else delete next[slug];
  selection = next;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    previousValue = window.localStorage.getItem(storageKey);
  } catch {
    // Keep the in-memory selection for this page.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function QuoteCartLink() {
  const items = useQuoteSelection();
  const count = Object.keys(items).length;
  return (
    <Link
      className="market-quote-cart-link"
      href="/contact#quotation"
      aria-label={`ตะกร้าใบเสนอราคา ${count} รายการ`}
    >
      <ClipboardList size={19} aria-hidden="true" />
      <span>ตะกร้าใบเสนอราคา</span>
      <b>{count}</b>
    </Link>
  );
}

export function AddToQuote({ slug, plan }: { slug: string; plan?: QuotePlan }) {
  const items = useQuoteSelection();
  const desired = plan ?? items[slug] ?? "files";
  return (
    <button
      className="btn ghost market-add-quote"
      type="button"
      aria-pressed={items[slug] === desired}
      onClick={() => updateQuoteSelection(slug, desired)}
    >
      <Plus size={15} aria-hidden="true" />
      {items[slug] === desired ? "เพิ่มในใบเสนอราคาแล้ว" : "เพิ่มลงใบเสนอราคา"}
    </button>
  );
}

export function PackageChoice({
  value,
  onChange,
  filesPrice,
}: {
  value: QuotePlan;
  onChange: (plan: QuotePlan) => void;
  filesPrice: string;
}) {
  function select(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value === "service" ? "service" : "files");
  }

  return (
    <label>
      แพ็กเกจ
      <select value={value} onChange={select}>
        <option value="files">
          {packages.files.label} · {filesPrice}
        </option>
        <option value="service">
          {packages.service.label} · 3,500–5,900 บาท
        </option>
      </select>
    </label>
  );
}

export function PackageDetails({ plan }: { plan: QuotePlan }) {
  return (
    <p>
      {packages[plan].description}
      {plan === "service" &&
        ` · งานเพิ่มตามขอบเขตประเมินได้ถึง ${formatBaht(serviceRange.extendedMax)}`}
    </p>
  );
}
