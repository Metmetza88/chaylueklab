import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getProducts } from "@/lib/shop";
export default async function Page() {
  const { products } = await getProducts();
  const cats = [...new Set(products.map((p) => p.category))];
  return (
    <section className="section">
      <span className="eyebrow">EXPLORE BY CATEGORY</span>
      <h1>หมวดหมู่โปรแกรม</h1>
      <div className="product-grid">
        {cats.map((c) => (
          <Link
            key={c}
            className="panel category-card"
            href={`/products?category=${encodeURIComponent(c)}`}
          >
            <ArrowUpRight />
            <h2>{c}</h2>
            <span className="muted">
              {products.filter((p) => p.category === c).length} โปรแกรม
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
