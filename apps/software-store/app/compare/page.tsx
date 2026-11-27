import ProductComparison from "@/components/ProductComparison";
import { getProducts } from "@/lib/shop";
import { sportFirst } from "@/lib/marketplace";

export default async function Page() {
  const { products, source } = await getProducts();
  return (
    <section className="section stack">
      <h1>เปรียบเทียบโปรแกรม</h1>
      <p className="muted">
        เลือกได้สูงสุด 3 ระบบ หมวดงานใช้ประกอบการสอบถาม
        ฝ่ายพัสดุของโรงเรียนเป็นผู้ตรวจเงื่อนไขการเบิกงบ
      </p>
      {source === "error" ? (
        <p className="notice">โหลดแคตตาล็อกไม่สำเร็จ กรุณาลองใหม่</p>
      ) : (
        <ProductComparison
          products={[...products]
            .sort(sportFirst)
            .map(({ slug, name, category, features, status, price_cents }) => ({
              slug,
              name,
              category,
              features,
              status,
              price_cents,
            }))}
        />
      )}
    </section>
  );
}
