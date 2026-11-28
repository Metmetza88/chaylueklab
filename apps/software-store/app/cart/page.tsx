import Cart from "@/components/Cart";
import { getProducts } from "@/lib/shop";
import { paymentMode } from "@/lib/env";
export default async function Page() {
  const { products } = await getProducts();
  return <Cart products={products} mode={paymentMode()} />;
}
