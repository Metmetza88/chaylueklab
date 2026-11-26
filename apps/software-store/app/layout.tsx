import "./globals.css";
import { configured, paymentMode } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { Command, ArrowUpRight, ShieldCheck, Menu } from "lucide-react";
import { CartProvider } from "@/lib/cart";
import { getViewer } from "@/lib/shop";
import CartLink from "@/components/CartLink";
export const metadata: Metadata = {
  title: {
    default: "CHAYLUEKLAB SOFTWARE STORE | WORAMET AI LAB",
    template: "%s | CHAYLUEKLAB STORE",
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
  const links = accountsEnabled
    ? [...publicLinks, ["/membership", "สมาชิก VIP"]]
    : publicLinks;
  return (
    <html lang="th">
      <body>
        <CartProvider>
          <a className="skip-link" href="#main">
            ข้ามไปเนื้อหา
          </a>
          <div className="top-bar">
            <span>SOFTWARE FOR THE NEXT GENERATION OF SCHOOLS</span>
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
                {accountsEnabled && (
                  <>
                    <CartLink />
                    <Link
                      href={user ? "/orders" : "/login"}
                      className="login-link"
                    >
                      {user ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}{" "}
                      <ArrowUpRight size={15} />
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
                </p>
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
                {accountsEnabled && <Link href="/membership">สมาชิก VIP</Link>}
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
                <a href="https://chaylueklab.com">เว็บไซต์หลัก ↗</a>
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
