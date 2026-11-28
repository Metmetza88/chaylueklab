import { schoolPackage, schoolQuotePrice } from "@/lib/quote";

export default function SchoolPackage({ slug }: { slug?: string }) {
  return (
    <section
      className="market-budget school-package"
      aria-label={schoolPackage.label}
    >
      <strong>
        {schoolPackage.label}
        {slug && ` · ${schoolQuotePrice(slug)}`}
      </strong>
      {slug === "met-sport" && <p>ระบบกีฬาสีพร้อมออกเกียรติบัตรออนไลน์</p>}
      <ul>
        {schoolPackage.includes.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
      <p>ราคาและกำหนดส่งยืนยันในใบเสนอราคา</p>
    </section>
  );
}
