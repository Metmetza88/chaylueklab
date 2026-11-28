"use client";
import { useCart } from "@/lib/cart";

export default function AddToCart({ id }: { id: string }) {
  const { ids, toggle } = useCart();
  const inCart = ids.includes(id);
  return (
    <button
      type="button"
      className={inCart ? "btn" : "btn ghost"}
      onClick={() => toggle(id)}
      aria-pressed={inCart}
    >
      {inCart ? "อยู่ในตะกร้า" : "ใส่ตะกร้า"}
    </button>
  );
}
