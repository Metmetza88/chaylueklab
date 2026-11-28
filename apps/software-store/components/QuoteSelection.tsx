"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ClipboardList, Plus } from "lucide-react";
import type { QuotePlan } from "@/lib/quote";
import { isSchoolPackage } from "@/lib/school-packages";

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
  if (plan && !isSchoolPackage(slug)) return;
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
  const count = Object.keys(items).filter(isSchoolPackage).length;
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

export function AddToQuote({ slug }: { slug: string }) {
  const items = useQuoteSelection();
  if (!isSchoolPackage(slug)) return null;
  const chosen = Boolean(items[slug]);
  return (
    <button
      className="btn ghost market-add-quote"
      type="button"
      aria-pressed={chosen}
      onClick={() => updateQuoteSelection(slug, "service")}
    >
      <Plus size={15} aria-hidden="true" />
      {chosen ? "เพิ่มในใบเสนอราคาแล้ว" : "เพิ่มลงใบเสนอราคา"}
    </button>
  );
}
