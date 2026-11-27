import type { Product } from "@/lib/shop";

export const lineId = "@125cbuuu";
export const lineContact = `https://line.me/R/ti/p/${encodeURIComponent(lineId)}`;
export const schoolDemoArea =
  "พร้อมเข้าสาธิตระบบถึงโรงเรียนในพื้นที่ อ.สตึก และ จ.บุรีรัมย์";

const schoolOrderSlugs = new Set([
  "met-sport",
  "met-attendance",
  "met-admission",
  "met-school-pro",
]);

export function productOffer({
  slug,
  status,
}: Pick<Product, "slug" | "status">) {
  if (status === "ready") return "ready";
  if (status === "coming_soon" && schoolOrderSlugs.has(slug))
    return "school-order";
  return "roadmap";
}
export const procurementHref = "/school-systems#procurement";
export const sportSlug = "met-sport";
export const sportTitle = "ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน";

export const quoteHref = (slug?: string) =>
  slug
    ? `/contact?product=${encodeURIComponent(slug)}#quotation`
    : "/contact#quotation";

export const sportFirst = (
  a: Pick<Product, "slug">,
  b: Pick<Product, "slug">,
) => Number(b.slug === sportSlug) - Number(a.slug === sportSlug);

export type SearchProduct = Pick<
  Product,
  | "slug"
  | "name"
  | "tagline"
  | "description"
  | "category"
  | "features"
  | "status"
>;

export function matchesProduct(product: SearchProduct, query: string) {
  const searchable = [
    product.name,
    product.slug,
    product.tagline,
    product.description,
    product.category,
    ...product.features,
    product.slug === sportSlug ? sportTitle : "",
  ]
    .join(" ")
    .toLocaleLowerCase("th");

  return query
    .trim()
    .toLocaleLowerCase("th")
    .split(/\s+/)
    .every((term) => searchable.includes(term));
}

export type MarketplaceProduct = SearchProduct & { price: string };
