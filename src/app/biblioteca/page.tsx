"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/Providers";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { ProductArt } from "@/components/ProductArt";
import { IconBook, IconDownload, IconHeadphones } from "@/components/Icons";
import { formatPrice } from "@/lib/format";
import {
  claimLocalLibrary,
  fetchLibrary,
  localLibraryIds,
  readLocalProgress,
} from "@/lib/library-client";
import type { DigitalFile, LibraryItem, Product, ReadingProgress } from "@/lib/types";

/**
 * Biblioteca digital (Doc Mestre §8): lista os itens comprados com
 * progresso/última posição e liga leitor de e-book / player de audiobook.
 * Com conta: dados do Firestore (sincronizados). Visitante: este dispositivo.
 */

interface ViewItem {
  key: string;
  productId: string;
  title: string;
  type: "ebook" | "audiobook";
  product?: Product;
  image?: string;
  /** primeiro arquivo com download permitido (`null` = licença sem download) */
  downloadKind: "pdf" | "audio" | null;
  progress?: ReadingProgress;
}

function routeFor(item: ViewItem): string {
  return item.type === "audiobook"
    ? `/biblioteca/audiobook/${item.productId}`
    : `/biblioteca/leitor/${item.productId}`;
}

function progressLabel(item: ViewItem): string | null {
  const p = item.progress;
  if (!p || p.percent <= 0) return null;
  if (p.kind === "ebook" && p.page && p.pages) {
    return `página ${p.page} de ${p.pages}`;
  }
  if (p.kind === "audiobook" && typeof p.position === "number" && p.position > 0) {
    const m = Math.floor(p.position / 60);
    const s = String(Math.floor(p.position % 60)).padStart(2, "0");
    return `${m}:${s} ouvido`;
  }
  return `${p.percent}% concluído`;
}

export default function BibliotecaPage() {
  const { user, authLoading } = useStore();
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [items, setItems] = useState<ViewItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);

      let catalog: Product[] = [];
      try {
        const res = await fetch("/api/products");
        const data = (await res.json()) as { products?: Product[] };
        catalog = data.products ?? [];
      } catch {
        catalog = [];
        setError("Não foi possível carregar o catálogo agora — os itens seguem disponíveis.");
      }
      if (cancelled) return;

      let cloudItems: LibraryItem[] | null = null;
      let cloudProgress: Record<string, ReadingProgress> = {};
      if (user) {
        // compras feitas como visitante migram para a conta (best-effort)
        await claimLocalLibrary().catch(() => 0);
        const cloud = await fetchLibrary();
        if (cancelled) return;
        if (cloud) {
          cloudItems = cloud.items;
          cloudProgress = cloud.progress;
        }
      }

      if (cancelled) return;

      const build = (
        list: {
          productId: string;
          title?: string;
          type?: string;
          image?: string;
          files?: DigitalFile[];
        }[],
        progressOf: (productId: string) => ReadingProgress | undefined,
      ): ViewItem[] =>
        list.map((raw) => {
          const product = catalog.find((p) => p.id === raw.productId);
          const type: "ebook" | "audiobook" =
            raw.type === "audiobook" || product?.type === "audiobook"
              ? "audiobook"
              : "ebook";
          const allowed = (raw.files ?? product?.files ?? []).find(
            (f) => f.allowDownload && f.url,
          );
          return {
            key: raw.productId,
            productId: raw.productId,
            title: raw.title || product?.title || "Item digital",
            type,
            product,
            image: raw.image,
            downloadKind: allowed ? allowed.kind : null,
            progress: progressOf(raw.productId),
          };
        });

      let view: ViewItem[] = [];
      if (cloudItems) {
        setSynced(true);
        view = build(
          cloudItems.map((i) => ({
            productId: i.productId,
            title: i.title,
            type: i.type,
            image: i.image,
            files: i.files,
          })),
          (id) => cloudProgress[id],
        );
        // itens comprados localmente que ainda não sincronizaram
        const missing = localLibraryIds().filter(
          (id) => !cloudItems!.some((i) => i.productId === id),
        );
        if (missing.length > 0) {
          view = view.concat(
            build(
              missing.map((productId) => ({ productId })),
              (id) => readLocalProgress(id) ?? undefined,
            ),
          );
        }
      } else {
        setSynced(false);
        view = build(
          localLibraryIds().map((productId) => ({ productId })),
          (id) => readLocalProgress(id) ?? undefined,
        );
      }

      setProducts(catalog);
      setItems(view);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const ownedIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);
  const suggestions = useMemo(
    () => products.filter((p) => p.digital && !ownedIds.has(p.id)).slice(0, 4),
    [products, ownedIds],
  );

  return (
    <Page>
      <Section
        title="Biblioteca"
        subtitle={
          loading
            ? undefined
            : synced
              ? "Seus e-books e audiobooks, sincronizados com sua conta Cliffhanger em qualquer dispositivo."
              : "Seus itens digitais neste dispositivo. Entre na conta para sincronizar a biblioteca."
        }
        href="/ebooks"
        hrefLabel="Ver e-books"
      >
        {error && (
          <div className="card mb-6 border border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card grid place-items-center p-12 text-[var(--text-muted)]">
            Carregando biblioteca…
          </div>
        ) : items.length === 0 ? (
          <div className="card grid place-items-center gap-4 p-14 text-center">
            <p className="text-display text-4xl">Nenhum item ainda</p>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Compre um e-book ou audiobook e ele aparece aqui automaticamente
              após a confirmação do pagamento — sem esperar entrega.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/ebooks" className="btn btn-primary">
                Explorar e-books
              </Link>
              <Link href="/audiobooks" className="btn btn-ghost">
                Explorar audiobooks
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const percent = item.progress?.percent ?? 0;
              const label = progressLabel(item);
              return (
                <li key={item.key} className="card flex gap-4 p-4">
                  <span className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                    {item.product ? (
                      <ProductArt product={item.product} />
                    ) : item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[var(--text-muted)]">
                        {item.type === "audiobook" ? (
                          <IconHeadphones className="h-7 w-7" />
                        ) : (
                          <IconBook className="h-7 w-7" />
                        )}
                      </span>
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-gold">
                      {item.type === "audiobook" ? "Audiobook" : "E-book"}
                    </span>
                    <p className="mt-1 line-clamp-2 text-sm font-bold">{item.title}</p>

                    <div className="mt-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {label ??
                          (percent > 0
                            ? `${percent}% concluído`
                            : "Ainda não começado")}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      <Link href={routeFor(item)} className="btn btn-primary px-3 py-2 text-[11px]">
                        {percent > 0
                          ? item.type === "audiobook"
                            ? "Continuar ouvindo"
                            : "Continuar lendo"
                          : item.type === "audiobook"
                            ? "Ouvir"
                            : "Ler"}
                      </Link>
                      {item.downloadKind ? (
                        <a
                          href={`/api/library/download?productId=${encodeURIComponent(item.productId)}&kind=${item.downloadKind}`}
                          className="btn btn-ghost px-3 py-2 text-[11px]"
                        >
                          <IconDownload className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : (
                        <span
                          className="text-[11px] text-[var(--text-muted)]"
                          title="A licença deste item não inclui download do arquivo."
                        >
                          Sem download
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && items.length > 0 && suggestions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-display mb-4 text-2xl">Continue a coleção</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {suggestions.map((product) => (
                <li key={product.id} className="card flex items-center gap-3 p-3">
                  <span className="h-16 w-11 shrink-0 overflow-hidden rounded border border-[var(--border)]">
                    <ProductArt product={product} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-bold">{product.title}</p>
                    <p className="text-xs text-gold">{formatPrice(product.price)}</p>
                  </div>
                  <Link
                    href={`/produtos/${product.slug}`}
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                  >
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </Page>
  );
}
