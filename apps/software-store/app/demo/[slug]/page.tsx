import { notFound } from "next/navigation";
import SchoolDemo from "@/components/SchoolDemo";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!["met-school-pro", "met-admission"].includes(slug)) notFound();
  return <SchoolDemo product={slug} />;
}
