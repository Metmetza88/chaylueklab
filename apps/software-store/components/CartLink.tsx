"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
export default function CartLink() {
  const { ids } = useCart();
  return (
    <Link
      className="cart-link"
      href="/cart"
      aria-label={`ตะกร้าสินค้า ${ids.length} รายการ`}
    >
      <ShoppingBag size={20} />
      {ids.length > 0 && <span>{ids.length}</span>}
    </Link>
  );
}
