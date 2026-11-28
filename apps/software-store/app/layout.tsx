import "./globals.css";
import "./premium.css";
import "./marketplace.css";
import "./school-store-visual.css";
import "./dashboard-samples.css";
import { schoolOffers } from "@/lib/school-offers";
import MarketplaceDock, {
  MarketplaceHeader,
} from "@/components/MarketplaceControls";
import { configured, paymentMode } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Command,
  ArrowUpRight,
  ShieldCheck,
  Menu,
  UserRound,
} from "lucide-react";
import { CartProvider } from "@/lib/cart";
import { getProducts, getViewer } from "@/lib/shop";
import { sportFirst } from "@/lib/marketplace";
import CartLink from "@/components/CartLink";
import DisplayControls from "@/components/DisplayControls";
import ViewportControls from "@/components/ViewportControls";
import StoreDialogs, { StoreDialogButton } from "@/components/StoreDialogs";
import { schoolQuotePrice } from "@/lib/quote";
import {
  distributor,
  greetingLine,
  lineId,
  localService,
  shopPhone,
  shopLocation,
} from "@/lib/procurement";
export const metadata: Metadata = {
  title: {
    default: "CHAYLUEKLAB SOFTWARE STORE | WORAMET AI LAB",
    template: "%s | CHAYLUEKLAB STORE",
  },
  metadataBase: new URL("https://store.chaylueklab.com"),
  applicationName: "CHAYLUEKLAB Software Store",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "CHAYLUEKLAB Software Store",
    title: "CHAYLUEKLAB SOFTWARE STORE | WORAMET AI LAB",
    description:
      "สำรวจโปรแกรมสำหรับโรงเรียนไทย ทดลองด้วยข้อมูลสมมติ และดูสถานะการพัฒนาอย่างชัดเจน",
  },
  description:
    "โปรแกรมสำหรับโรงเรียน โดย WORAMET AI LAB ทดลองระบบ ดูรายละเอียด และจัดการซอฟต์แวร์ของคุณ",
};
export const dynamic = "force-dynamic";
const publicLinks = [
  ["/products", "โปรแกรมทั้งหมด"],
  ["/categories", "หมวดหมู่"],
  ["/demo", "ทดลองใช้งาน"],
  ["/contact", "ติดต่อ"],
];
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin } = await getViewer();
  if (process.env.APP_VARIANT === "school") {
    const slug = process.env.SCHOOL_SLUG ?? "my-school";
    return (
      <html lang="th">
        <body>
          <a className="skip-link" href="#main">
            ข้ามไปเนื้อหา
          </a>
          <header className="site-header school-header">
            <div className="container header-inner">
              <Link href={`/schools/${slug}`} className="brand">
                <Command />
                <span>
                  MET SCHOOL<small>BY WORAMET AI LAB</small>
                </span>
              </Link>
              <nav className="row">
                <Link href={`/schools/${slug}/apply`}>สมัครเรียน</Link>
                <Link href={`/schools/${slug}/applications`}>ตรวจสถานะ</Link>
                <Link href={`/school-admin/${slug}`}>เจ้าหน้าที่</Link>
                {user ? (
                  <form method="post" action="/auth/signout">
                    <button className="text-button">ออกจากระบบ</button>
                  </form>
                ) : (
                  <Link href={`/login?next=/schools/${slug}`}>เข้าสู่ระบบ</Link>
                )}
              </nav>
            </div>
          </header>
          <main id="main" className="container">
            {children}
          </main>
          <footer className="site-footer">
            <div className="container footer-bottom">
              <span>MET School Pro / MET Admission · WORAMET AI LAB</span>
              <Link href="/privacy">นโยบายข้อมูล</Link>
            </div>
          </footer>
        </body>
      </html>
    );
  }
  const accountsEnabled = configured();
  const { products, source } = await getProducts();
  const marketplaceProducts = (source === "error" ? [] : schoolOffers(products))
    .sort(sportFirst)
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      category: product.category,
      features: product.features,
      status: product.status,
      price: schoolQuotePrice(product.slug),
    }));
  const links = accountsEnabled
    ? [...publicLinks, ["/membership", "สมาชิก VIP"]]
    : publicLinks;
  return (
    <html lang="th">
      <body className="storefront">
        <CartProvider>
          <StoreDialogs>
            <a className="skip-link" href="#main">
              ข้ามไปเนื้อหา
            </a>
            <div className="top-bar">
              <a
                className="school-home-link"
                href="https://education.chaylueklab.com/"
              >
                หน้ารวมระบบโรงเรียน
              </a>
              <Link href="/guide">
                คู่มือเริ่มต้นใช้งาน <ArrowUpRight size={12} />
              </Link>
            </div>
            <header className="site-header">
              <div className="container header-inner">
                <Link href="/" className="brand">
                  <span className="brand-icon">
                    <Command size={24} />
                  </span>
                  <span>
                    CHAYLUEKLAB
                    <small>
                      SOFTWARE STORE <i>BY WORAMET AI LAB</i>
                    </small>
                  </span>
                </Link>
                <nav className="desktop-nav" aria-label="เมนูหลัก">
                  {links.map(([h, l]) => (
                    <Link key={h} href={h}>
                      {l}
                    </Link>
                  ))}
                </nav>
                <div className="header-actions">
                  <MarketplaceHeader
                    products={marketplaceProducts}
                    source={source}
                  />
                  <DisplayControls />
                  {accountsEnabled && (
                    <>
                      <CartLink />
                      <Link
                        href={user ? "/orders" : "/login"}
                        className="login-link"
                        aria-label={user ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}
                      >
                        <span className="account-label">
                          {user ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}
                        </span>
                        <UserRound size={18} />
                      </Link>
                    </>
                  )}
                  <details className="mobile-menu">
                    <summary aria-label="เปิดเมนู">
                      <Menu size={23} />
                    </summary>
                    <nav>
                      {links.map(([h, l]) => (
                        <Link key={h} href={h}>
                          {l}
                        </Link>
                      ))}
                      {accountsEnabled && (
                        <>
                          <Link href="/orders">คำสั่งซื้อ</Link>
                          <Link href="/downloads">ดาวน์โหลด</Link>
                          <Link href="/support">แจ้งปัญหา</Link>
                          {isAdmin && <Link href="/admin">Admin</Link>}
                        </>
                      )}
                    </nav>
                  </details>
                </div>
              </div>
            </header>
            <main id="main" className="container main-content">
              {paymentMode() === "sandbox" && (
                <p className="demo-bar">
                  SANDBOX — ใช้ทดสอบระบบเท่านั้น ห้ามโอนเงินจริง
                </p>
              )}
              <aside
                className="market-procurement-banner"
                aria-label="ข้อมูลผู้จำหน่ายและจัดซื้อ"
              >
                <ShieldCheck size={23} aria-hidden="true" />
                <div>
                  <strong>
                    จัดจำหน่ายและออกเอกสารจัดซื้อในนาม {distributor}
                  </strong>
                  <p>
                    {shopLocation} · พัฒนาโดย WORAMET AI LAB ·
                    รองรับการจัดซื้อวิธีเฉพาะเจาะจงตามเงื่อนไขของโรงเรียน
                  </p>
                </div>
                <StoreDialogButton name="procurement" className="btn ghost">
                  เอกสารเบิกงบ
                </StoreDialogButton>
              </aside>
              {children}
            </main>
            <section className="footer-cta container">
              <div>
                <span className="eyebrow">LET’S BUILD A BETTER SCHOOL</span>
                <h2>
                  เลือกเครื่องมือที่ใช่
                  <br />
                  ให้โรงเรียนของคุณ
                </h2>
              </div>
              <Link className="btn" href="/contact">
                คุยกับ WORAMET AI LAB <ArrowUpRight size={18} />
              </Link>
            </section>
            <footer className="site-footer">
              <div className="container footer-grid">
                <div>
                  <Link href="/" className="brand">
                    <Command size={28} />
                    <span>
                      CHAYLUEKLAB<small>SOFTWARE STORE</small>
                    </span>
                  </Link>
                  <p className="muted">
                    ซอฟต์แวร์ที่ออกแบบมาเพื่อโรงเรียนไทย
                    <br />
                    พัฒนาโดย WORAMET AI LAB
                    <br />
                    จัดจำหน่ายโดย {distributor}
                    <br />
                    {shopLocation}
                  </p>
                  <a
                    href={greetingLine}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LINE OA {lineId}
                  </a>
                  <a href={shopPhone.href}>โทร {shopPhone.label}</a>
                  <p className="muted">{localService}</p>
                  {accountsEnabled && (
                    <span className="trust">
                      <ShieldCheck size={16} />{" "}
                      ไฟล์โปรแกรมจัดส่งผ่านสิทธิ์ดาวน์โหลดส่วนตัว
                    </span>
                  )}
                </div>
                <div>
                  <h3>เลือกโปรแกรม</h3>
                  <Link href="/products">โปรแกรมทั้งหมด</Link>
                  <Link href="/categories">หมวดหมู่โปรแกรม</Link>
                  <Link href="/demo">ทดลองใช้งาน</Link>
                  {accountsEnabled && (
                    <Link href="/membership">สมาชิก VIP</Link>
                  )}
                </div>
                <div>
                  <h3>ความช่วยเหลือ</h3>
                  {accountsEnabled && (
                    <>
                      <Link href="/orders">คำสั่งซื้อของฉัน</Link>
                      <Link href="/downloads">ดาวน์โหลดโปรแกรม</Link>
                      <Link href="/support">แจ้งปัญหา</Link>
                    </>
                  )}
                  <Link href="/guide">คู่มือการใช้งาน</Link>
                  <Link href="/school-systems">วางระบบสำหรับสถานศึกษา</Link>
                  <Link href="/contact">ติดต่อเรา</Link>
                  {isAdmin && <Link href="/admin">Admin Dashboard</Link>}
                  {user && (
                    <form method="post" action="/auth/signout">
                      <button className="text-button">ออกจากระบบ</button>
                    </form>
                  )}
                </div>
              </div>
              <div className="container footer-bottom">
                <span>© {new Date().getUTCFullYear()} WORAMET AI LAB</span>
                <div>
                  <Link href="/privacy">ความเป็นส่วนตัว</Link>
                  <Link href="/terms">เงื่อนไขและการคืนเงิน</Link>
                  <a href="https://education.chaylueklab.com/">
                    Education 2570
                  </a>
                </div>
              </div>
            </footer>
            <ViewportControls />
            <MarketplaceDock products={marketplaceProducts} />
          </StoreDialogs>
        </CartProvider>
      </body>
    </html>
  );
}
