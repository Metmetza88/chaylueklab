import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/admin", "/orders", "/downloads", "/cart", "/checkout", "/login", "/register", "/forgot-password", "/reset-password", "/school-admin/", "/schools/"],
    },
    sitemap: "https://store.chaylueklab.com/sitemap.xml",
  };
}
