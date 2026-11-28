import type { MetadataRoute } from "next";
import catalog from "@/lib/catalog.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/products", "/categories", "/demo", "/contact", "/guide", "/school-systems", "/privacy", "/terms"];
  return [...pages, ...catalog.map((product) => `/products/${product.slug}`)]
    .map((path) => ({ url: `https://store.chaylueklab.com${path}` }));
}
