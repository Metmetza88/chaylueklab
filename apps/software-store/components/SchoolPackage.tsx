import { schoolPackage } from "@/lib/quote";

export default function SchoolPackage() {
  return (
    <section
      className="market-budget school-package"
      aria-label={schoolPackage.label}
    >
      <strong>
        {schoolPackage.label} · {schoolPackage.price} ต่อระบบ
      </strong>
      <ul>
        {schoolPackage.includes.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
      <p>ราคาและกำหนดส่งยืนยันในใบเสนอราคา</p>
    </section>
  );
}
