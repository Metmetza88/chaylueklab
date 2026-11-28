import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { quoteHref } from "@/lib/marketplace";
import { schoolPackagePriceLabel } from "@/lib/school-packages";
import { distributor } from "@/lib/procurement";

export function DemoQuoteTop({ slug }: { slug: string }) {
  return (
    <div className="demo-quote-top">
      <span className="demo-sandbox-chip">เดโม · ข้อมูลสมมติเท่านั้น</span>
      <span className="demo-quote-distributor">
        เสนอราคาและออกเอกสารในนาม {distributor}
      </span>
      <Link className="btn demo-quote-short" href={quoteHref(slug)}>
        ขอใบเสนอราคา <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function DemoQuoteStrip({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  return (
    <section className="demo-quote-strip" aria-labelledby="demo-offer-heading">
      <div className="demo-quote-icon" aria-hidden="true">
        <ClipboardList size={24} />
      </div>
      <div>
        <span className="eyebrow">จากเดโมสู่การติดตั้ง</span>
        <h2 id="demo-offer-heading">วางแผนใช้ {name} ในโรงเรียน</h2>
        <p>
          งบประเมิน <strong>{schoolPackagePriceLabel}</strong> ต่อระบบ
          ทีมงานยืนยันราคา ขอบเขต และกำหนดส่งก่อนรับงาน ออกเอกสารในนาม{" "}
          {distributor}
        </p>
      </div>
      <div className="demo-quote-actions">
        <Link className="btn" href={quoteHref(slug)}>
          ขอใบเสนอราคาติดตั้ง <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link className="subtle-link" href="/demo">
          ดูเดโมระบบอื่น
        </Link>
      </div>
    </section>
  );
}
