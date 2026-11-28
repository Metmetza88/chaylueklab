import Link from "next/link";
import { distributor, lineId, lineMessage } from "@/lib/procurement";
import { quoteHref } from "@/lib/marketplace";

export default function LiveDemoBanner({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  return (
    <aside className="live-demo-banner" aria-label="ขอใบเสนอราคาระบบโรงเรียน">
      <p>
        <strong>ถูกใจระบบนี้?</strong> ขอใบเสนอราคาในนาม {distributor}{" "}
        เพื่อเตรียมเอกสารเบิกงบโรงเรียนได้ครับ
      </p>
      <div className="market-links">
        <a
          className="market-primary"
          href={lineMessage(
            `สวัสดีครับ ขอใบเสนอราคา ${name} และเอกสารเบิกงบสำหรับโรงเรียนครับ`,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          ขอราคาทาง LINE {lineId}
        </a>
        <Link className="btn ghost" href={quoteHref(slug)}>
          กรอกคำขอใบเสนอราคา
        </Link>
      </div>
    </aside>
  );
}
