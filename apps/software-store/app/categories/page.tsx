import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getProducts } from "@/lib/shop";
import { schoolOffers } from "@/lib/school-offers";
export default async function Page() {
  const { products: catalog, source } = await getProducts();
  const products = source === "error" ? [] : schoolOffers(catalog);
  const cats = [...new Set(products.map((p) => p.category))].map((name) => ({
    name,
    count: products.filter((product) => product.category === name).length,
  }));
  if (catalog.some((product) => product.slug === "met-school-shop")) {
    cats.push({ name: "งานการเงิน", count: 1 });
  }
  return (
    <section className="section">
      <span className="eyebrow">EXPLORE BY CATEGORY</span>
      <h1>หมวดหมู่โปรแกรม</h1>
      <div className="product-grid">
        {cats.map(({ name, count }) => (
          <Link
            key={name}
            className="panel category-card"
            href={`/products?category=${encodeURIComponent(name)}`}
          >
            <ArrowUpRight />
            <h2>{name}</h2>
            <span className="muted">{count} โปรแกรม</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
