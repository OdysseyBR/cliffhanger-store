"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { EbookReader } from "@/components/library/EbookReader";
import { useDigitalItem } from "@/components/library/useDigitalItem";
import { IconArrowLeft, IconBook } from "@/components/Icons";
import { Page } from "@/components/Page";

/**
 * Leitor de e-book (Doc Mestre §8 — plataforma digital própria).
 * Só abre para quem tem a licença (conta ou compra neste dispositivo).
 */
export default function LeitorPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const { status, item, product, progress, synced, persist } = useDigitalItem(
    productId,
    "ebook",
  );

  const file =
    item?.files.find((f) => f.kind === "pdf") ??
    item?.files[0] ??
    product?.files?.find((f) => f.kind === "pdf") ??
    null;

  return (
    <Page>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/biblioteca"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-gold transition hover:underline"
        >
          <IconArrowLeft className="h-4 w-4" />
          Biblioteca
        </Link>

        {status === "loading" && (
          <div className="card grid place-items-center gap-3 p-12 text-center text-[var(--text-muted)]">
            <p className="text-display text-2xl text-gold">Verificando sua licença…</p>
            <p className="text-sm">Consultando sua biblioteca digital.</p>
          </div>
        )}

        {status === "denied" && (
          <div className="card grid place-items-center gap-4 p-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-[var(--border)] text-gold">
              <IconBook className="h-7 w-7" />
            </span>
            <p className="text-display text-3xl">Acesso não autorizado</p>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Este e-book não está na sua biblioteca. Compre o item ou entre com
              a conta que realizou a compra para começar a ler.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/biblioteca" className="btn btn-primary">
                Ir para a biblioteca
              </Link>
              <Link href="/ebooks" className="btn btn-ghost">
                Ver e-books
              </Link>
            </div>
          </div>
        )}

        {status === "ready" && item && !file && (
          <div className="card grid place-items-center gap-4 p-14 text-center">
            <p className="text-display text-3xl">Conteúdo em preparação</p>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Você tem a licença de <strong>{item.title}</strong>, mas o arquivo
              ainda não foi publicado pela editora. Ele aparecerá aqui assim que
              for liberado.
            </p>
            <Link href="/biblioteca" className="btn btn-ghost">
              Voltar para a biblioteca
            </Link>
          </div>
        )}

        {status === "ready" && item && file && (
          <EbookReader
            file={file}
            title={item.title}
            initial={progress}
            chapters={product?.chapters ?? []}
            synced={synced}
            downloadHref={
              file.allowDownload
                ? `/api/library/download?productId=${encodeURIComponent(productId)}&kind=pdf`
                : null
            }
            onProgress={persist}
          />
        )}
      </div>
    </Page>
  );
}
