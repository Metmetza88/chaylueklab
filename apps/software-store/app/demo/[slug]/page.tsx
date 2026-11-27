import { notFound } from "next/navigation";
import SchoolDemo from "@/components/SchoolDemo";
import SportDemo from "@/components/SportDemo";
import AttendanceDemo from "@/components/AttendanceDemo";
import { productDemos } from "@/lib/product-demos";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!productDemos.some((demo) => demo.slug === slug)) notFound();
  if (slug === "met-sport") return <SportDemo />;
  if (slug === "met-attendance") return <AttendanceDemo />;
  return <SchoolDemo product={slug} />;
}
