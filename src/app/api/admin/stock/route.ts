import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { availableOf, isLowStock, type AdminStockItem } from "@/lib/stock-fields";
import type { Product, StockMovement } from "@/lib/types";

/**
 * §12/§14 — módulo Estoque do painel: estoque atual, reservado, disponível,
 * mínimo e alerta de estoque baixo, além do histórico de movimentações
 * (entradas, saídas e ajustes com motivo). Leitura com `stock.view`;
 * a escrita acontece em `/api/admin/stock/[productId]`.
 */

function toItem(doc: { id: string; data(): unknown }): AdminStockItem {
  const data = doc.data() as Partial<Product>;
  const stock = Math.max(0, Number(data.stock ?? 0));
  const reserved = Math.max(0, Number(data.reserved ?? 0));
  const minStock = Math.max(0, Number(data.minStock ?? 0));
  return {
    id: doc.id,
    title: String(data.title ?? doc.id),
    slug: String(data.slug ?? ""),
    stock,
    reserved,
    available: availableOf(stock, reserved),
    minStock,
    digital: Boolean(data.digital),
    badge: data.badge,
    low: isLowStock(stock, minStock),
    soldOut: stock === 0,
  };
}

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "stock.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) return Response.json({ products: [], movements: [] });

  try {
    const [productsSnap, movementsSnap] = await Promise.all([
      db.collection("products").get(),
      db.collection("stockMovements").orderBy("at", "desc").limit(120).get(),
    ]);

    const products = productsSnap.docs
      .map(toItem)
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

    const movements = movementsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as StockMovement,
    );

    return Response.json({ products, movements });
  } catch {
    return Response.json({ error: "Falha ao ler o estoque." }, { status: 500 });
  }
}
