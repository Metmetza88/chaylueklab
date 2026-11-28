import Image from "next/image";
import DashboardThumbnail from "./DashboardThumbnail";
import type { Product } from "@/lib/shop";
import { productDemos } from "@/lib/product-demos";

export default function ProductPreview({
  product,
  large = false,
}: {
  product: Pick<Product, "slug" | "name" | "tagline">;
  large?: boolean;
}) {
  const demo = productDemos.find(({ slug }) => slug === product.slug);
  return (
    <div
      className={`market-preview market-preview-v2${large ? " market-preview-large" : ""}`}
    >
      {demo ? (
        <Image
          src={demo.preview}
          alt={demo.previewAlt}
          fill
          unoptimized={product.slug === "met-sport"}
          sizes={
            large
              ? "(max-width: 600px) 90vw, 640px"
              : "(max-width: 600px) 90vw, (max-width: 950px) 46vw, 400px"
          }
        />
      ) : (
        <DashboardThumbnail {...product} />
      )}
      <span className="market-ribbon">
        {demo || product.slug === "met-vote"
          ? "มีระบบจริงให้ทดลองเล่น"
          : "แดชบอร์ดตัวอย่าง · ข้อมูลสมมติ"}
      </span>
    </div>
  );
}
