import Image from "next/image";
import { FileText } from "lucide-react";
import type { Product } from "@/lib/shop";
import { productDemos } from "@/lib/product-demos";

const illustrated = new Set([
  "met-student",
  "met-schedule",
  "met-grades",
  "met-assignment",
  "met-certificate",
  "met-inventory",
  "met-e-office",
  "met-library",
  "met-parent",
  "met-school-shop",
  "met-exam-ai",
]);

export default function ProductPreview({
  product,
  large = false,
}: {
  product: Pick<Product, "slug" | "name" | "tagline">;
  large?: boolean;
}) {
  const demo = productDemos.find(({ slug }) => slug === product.slug);
  const concept = illustrated.has(product.slug);
  return (
    <div
      className={`market-preview market-preview-v2 ${concept ? "market-preview-concept" : ""}${large ? " market-preview-large" : ""}`}
    >
      {demo || concept ? (
        <Image
          src={demo?.preview ?? `/art/concepts/${product.slug}.svg`}
          alt={
            demo?.previewAlt ??
            `ภาพแนวคิด ${product.name} แสดง ${product.tagline} ไม่ใช่หน้าจอระบบจริง`
          }
          fill
          unoptimized={concept || product.slug === "met-sport"}
          sizes={
            large
              ? "(max-width: 600px) 90vw, 640px"
              : "(max-width: 600px) 90vw, (max-width: 950px) 46vw, 400px"
          }
        />
      ) : (
        <div className="market-preview-unavailable">
          <FileText size={24} aria-hidden="true" />
          <strong>{product.name}</strong>
          <span>ยังไม่มีภาพตัวอย่าง</span>
        </div>
      )}
      {(demo || concept) && (
        <span className="market-ribbon">
          {demo ? "หน้าจอเดโม · ข้อมูลสมมติ" : "ภาพแนวคิด"}
        </span>
      )}
    </div>
  );
}
