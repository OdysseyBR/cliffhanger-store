import { getProducts } from "@/lib/data";

/** Catálogo em JSON — usado pelo carrinho, wishlist e biblioteca (client). */
export async function GET() {
  const products = await getProducts();
  return Response.json({ products });
}
