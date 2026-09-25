import { DEFAULT_BANNER, localBanners } from "@/data/banners";
import { getAdminDb, revive } from "@/lib/firebase-admin";
import type { Banner } from "@/lib/types";

/**
 * Camada de dados dos banners (Documento de Correção §5).
 *
 * Prioridade: Cloud Firestore (coleção `banners`) → catálogo local.
 * Falha de rede/credencial cai silenciosamente no fallback local, como no
 * catálogo (lib/data.ts).
 */

const CACHE_KEY = "__cliffhanger_banners__";
const globalCache = globalThis as unknown as Record<string, Promise<Banner[]> | undefined>;

async function loadBanners(): Promise<Banner[]> {
  if (process.env.CATALOG_SOURCE === "local") return localBanners;

  const db = getAdminDb();
  if (!db) return localBanners;

  try {
    const snap = await db.collection("banners").limit(50).get();
    return snap.docs.map((doc) =>
      normalizeBanner(revive({ ...doc.data(), id: doc.id }) as Banner),
    );
  } catch {
    return localBanners;
  }
}

/**
 * Docs do schema legado (title/subtitle/link — antigo construtor de banner)
 * são convertidos para o modelo do §5 começando INATIVOS: o gestor revisa,
 * ajusta o destino e só então ativa. O modelo atual passa direto.
 */
function normalizeBanner(banner: Banner): Banner {
  if (banner.destinationType) return banner;

  const legacy = banner as unknown as Record<string, unknown>;
  const text = (key: string): string =>
    typeof legacy[key] === "string" ? (legacy[key] as string).trim() : "";
  const link = text("link");
  const name = text("title") || "Banner legado (revisar)";

  return {
    id: banner.id,
    name,
    image: text("image"),
    alt: text("subtitle") || name,
    destinationType: /^https?:\/\//i.test(link) ? "externo" : "pagina",
    destinationValue: link || "/",
    order: typeof legacy.order === "number" ? legacy.order : 0,
    active: false,
    fullscreen: false,
    showHeader: true,
    createdAt: "",
    updatedAt: "",
  };
}

/** Lista de banners (cacheada). Com Firestore, reflete o estado real do painel. */
export function getBanners(): Promise<Banner[]> {
  if (!globalCache[CACHE_KEY]) {
    globalCache[CACHE_KEY] = loadBanners();
  }
  return globalCache[CACHE_KEY];
}

/** Invalida o cache após escrita do painel (chamar junto de revalidatePath). */
export function invalidateBanners(): void {
  delete globalCache[CACHE_KEY];
}

function inWindow(banner: Banner, now: Date): boolean {
  if (banner.startsAt) {
    const start = Date.parse(banner.startsAt);
    if (!Number.isNaN(start) && now.getTime() < start) return false;
  }
  if (banner.endsAt) {
    const end = Date.parse(banner.endsAt);
    if (!Number.isNaN(end) && now.getTime() > end) return false;
  }
  return true;
}

/**
 * Banner exibido na Home: ativo, com arte e dentro da janela de agendamento,
 * ordenado por `order`. Sem nenhum elegível, cai no banner padrão da loja —
 * a Home sempre começa com o Banner (§3). A Home usa ISR de 5 min, então a
 * precisão do agendamento é de até esse intervalo.
 */
export async function getActiveBanner(now = new Date()): Promise<Banner> {
  const banners = await getBanners();
  const eligible = banners
    .filter(
      (banner) =>
        banner.active && banner.image && Boolean(banner.destinationType) && inWindow(banner, now),
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return eligible[0] ?? DEFAULT_BANNER;
}
