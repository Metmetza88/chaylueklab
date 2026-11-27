import type { NextConfig } from "next";
const dev = process.env.NODE_ENV !== "production";
const config: NextConfig = {
  poweredByHeader: false,
  // Keep metadata in <head>; avoid streamed metadata racing client hydration.
  htmlLimitedBots: /.*/,
  outputFileTracingIncludes: { "/api/**": ["./public/fonts/*.ttf"] },
  experimental: { serverActions: { bodySizeLimit: "8mb" }, cpus: 2 },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${dev ? "'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co ${dev ? "http://127.0.0.1:55431 ws://localhost:3000" : ""}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
          },
        ],
      },
    ];
  },
};
export default config;
