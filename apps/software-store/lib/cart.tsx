"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
type Cart = {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};
const Ctx = createContext<Cart>({
  ids: [],
  toggle: () => {},
  remove: () => {},
  clear: () => {},
});
const key = "woramet_store_cart_v2";
export function CartProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(saved))
        setIds(
          [
            ...new Set(
              saved.filter(
                (x): x is string =>
                  typeof x === "string" && /^[a-f0-9-]{36}$/.test(x),
              ),
            ),
          ].slice(0, 15),
        );
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(key, JSON.stringify(ids));
      } catch {}
  }, [ids, ready]);
  return (
    <Ctx.Provider
      value={{
        ids,
        toggle: (id) =>
          setIds((old) =>
            old.includes(id)
              ? old.filter((x) => x !== id)
              : old.length < 15
                ? [...old, id]
                : old,
          ),
        remove: (id) => setIds((old) => old.filter((x) => x !== id)),
        clear: () => setIds([]),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
export const useCart = () => useContext(Ctx);
