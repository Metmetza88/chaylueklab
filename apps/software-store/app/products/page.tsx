import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/shop";
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const { products: all, source } = await getProducts();
  const q = (sp.q ?? "").slice(0, 100).toLocaleLowerCase("th");
  const cats = [...new Set(all.map((p) => p.category))];
  let products = all.filter(
    (p) =>
      (!q ||
        `${p.name} ${p.tagline} ${p.description}`
          .toLocaleLowerCase("th")
          .includes(q)) &&
      (!sp.category || p.category === sp.category),
  );
  if (sp.sort === "asc" || sp.sort === "desc")
    products = products.sort(
      (a, b) => (a.price_cents - b.price_cents) * (sp.sort === "desc" ? -1 : 1),
    );
  return (
    <section className="section">
      <div className="page-heading">
        <span className="eyebrow">THE SCHOOL SOFTWARE COLLECTION</span>
        <h1>โปรแกรมทั้งหมด</h1>
        <p className="muted">เลือกเครื่องมือที่เหมาะกับโรงเรียนของคุณ</p>
      </div>
      <form className="filters">
        <label className="search-field">
          ค้นหาโปรแกรม
          <input
            type="search"
            name="q"
            defaultValue={sp.q}
            placeholder="ค้นหาชื่อโปรแกรม หรืองานที่ต้องการ…"
            maxLength={100}
          />
        </label>
        <label>
          หมวดหมู่
          <select name="category" defaultValue={sp.category ?? ""}>
            <option value="">ทุกหมวดหมู่</option>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          เรียงลำดับ
          <select name="sort" defaultValue={sp.sort ?? ""}>
            <option value="">ตามชื่อ</option>
            <option value="asc">ราคาน้อยไปมาก</option>
            <option value="desc">ราคามากไปน้อย</option>
          </select>
        </label>
        <button className="btn">ค้นหา</button>
      </form>
      <div className="row spaced results">
        <p>{products.length} โปรแกรม</p>
        <span className="muted">
          {source === "database"
            ? "แคตตาล็อกจากฐานข้อมูล"
            : source === "roadmap"
              ? "แผนพัฒนา · ยังไม่เปิดจำหน่าย"
              : "โหลดข้อมูลไม่สำเร็จ"}
        </span>
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="panel">ไม่พบโปรแกรมที่ตรงกับการค้นหา</p>
      )}
    </section>
  );
}
