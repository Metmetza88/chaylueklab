import type { MetadataRoute } from "next";
import { schoolOfferSlugs } from "@/lib/school-offers";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/products",
    "/categories",
    "/demo",
    "/contact",
    "/guide",
    "/school-systems",
    "/privacy",
    "/terms",
  ];
  return [
    ...pages,
    ...schoolOfferSlugs.flatMap((slug) => [
      `/products/${slug}`,
      `/demo/${slug}`,
    ]),
  ].map((path) => ({ url: `https://store.chaylueklab.com${path}` }));
}
