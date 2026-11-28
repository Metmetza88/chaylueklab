import { notFound } from "next/navigation";
import SchoolDemo from "@/components/SchoolDemo";
import SportDemo from "@/components/SportDemo";
import AttendanceDemo from "@/components/AttendanceDemo";
import DemoQuoteStrip, { DemoQuoteTop } from "@/components/DemoQuoteStrip";
import VoteDemo from "@/components/VoteDemo";
import { productDemos } from "@/lib/product-demos";
import { isSchoolPackage } from "@/lib/school-packages";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "met-vote") return <VoteDemo />;
  const demo = productDemos.find((entry) => entry.slug === slug);
  if (!demo) notFound();

  let workspace;
  if (slug === "met-sport") workspace = <SportDemo />;
  else if (slug === "met-attendance") workspace = <AttendanceDemo />;
  else if (slug === "met-school-pro" || slug === "met-admission")
    workspace = <SchoolDemo product={slug} />;
  else notFound();

  return (
    <>
      {isSchoolPackage(slug) && <DemoQuoteTop slug={slug} />}
      {workspace}
      {isSchoolPackage(slug) && <DemoQuoteStrip name={demo.name} slug={slug} />}
    </>
  );
}
