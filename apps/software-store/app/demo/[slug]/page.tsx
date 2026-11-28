import { notFound } from "next/navigation";
import SchoolDemo from "@/components/SchoolDemo";
import SportDemo from "@/components/SportDemo";
import AttendanceDemo from "@/components/AttendanceDemo";
import ModuleDashboard from "@/components/ModuleDashboard";
import { getProducts } from "@/lib/shop";
import { voteOffer } from "@/lib/school-offers";
import VoteDemo from "@/components/VoteDemo";
import LiveDemoBanner from "@/components/LiveDemoBanner";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "met-sport")
    return (
      <>
        <LiveDemoBanner name="MET Sport" slug={slug} />
        <SportDemo />
      </>
    );
  if (slug === "met-attendance")
    return (
      <>
        <LiveDemoBanner name="MET Attendance" slug={slug} />
        <AttendanceDemo />
      </>
    );
  if (slug === voteOffer.slug)
    return (
      <>
        <LiveDemoBanner name={voteOffer.name} slug={slug} />
        <VoteDemo />
      </>
    );
  if (slug === "met-admission" || slug === "met-school-pro") {
    return (
      <>
        <LiveDemoBanner
          name={slug === "met-admission" ? "MET Admission" : "MET School Pro"}
          slug={slug}
        />
        <SchoolDemo product={slug} />
      </>
    );
  }
  const { products } = await getProducts();
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  return (
    <ModuleDashboard
      slug={product.slug}
      name={product.name}
      tagline={product.tagline}
    />
  );
}
