"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconList,
  IconX,
} from "@/components/Icons";
import type { Bookmark, Chapter, DigitalFile, ReadingProgress } from "@/lib/types";

/**
 * Leitor de e-book da plataforma digital (Doc Mestre §8).
 *
 * Renderiza o PDF do item com pdf.js (worker próprio em `/pdf.worker.min.mjs`),
 * com sumário/capítulos, progresso e última posição, marcadores e download
 * apenas quando a licença permite.
 */

async function openPdf(url: string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ url });
  const doc = await task.promise;
  return { doc, task };
}

type PdfBundle = Awaited<ReturnType<typeof openPdf>>;
type PdfDoc = PdfBundle["doc"];
type PdfPage = Awaited<ReturnType<PdfDoc["getPage"]>>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function newBookmarkId(): string {
  return `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Resolve o sumário embutido no PDF quando o produto não define capítulos. */
async function resolveOutline(doc: PdfDoc): Promise<Chapter[]> {
  try {
    const outline = await doc.getOutline();
    if (!outline?.length) return [];
    const chapters: Chapter[] = [];
    for (const entry of outline) {
      let dest: unknown = entry.dest;
      if (typeof dest === "string") dest = await doc.getDestination(dest);
      if (Array.isArray(dest) && dest[0] != null) {
        const pageIndex = await doc.getPageIndex(dest[0]);
        chapters.push({ title: entry.title || "Capítulo", start: pageIndex + 1 });
      }
      if (chapters.length >= 60) break;
    }
    return chapters.sort((a, b) => a.start - b.start);
  } catch {
    return [];
  }
}

interface EbookReaderProps {
  file: DigitalFile;
  title: string;
  initial: ReadingProgress | null;
  /** capítulos do produto (páginas) — vazio tenta o sumário do PDF */
  chapters: Chapter[];
  synced: boolean;
  /** rota de download com licença; `null` = sem download na licença */
  downloadHref: string | null;
  onProgress: (patch: {
    page?: number;
    pages?: number;
    percent: number;
    bookmarks?: Bookmark[];
  }) => void;
}

export function EbookReader({
  file,
  title,
  initial,
  chapters,
  synced,
  downloadHref,
  onProgress,
}: EbookReaderProps) {
  const initialRef = useRef(initial);
  const chaptersPropRef = useRef(chapters);
  const docRef = useRef<PdfDoc | null>(null);
  const taskRef = useRef<PdfBundle["task"] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(1);
  const pagesRef = useRef(1);
  const bookmarksRef = useRef<Bookmark[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const pendingRef = useRef<number | null>(null);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [pageDraft, setPageDraft] = useState("");

  const renderPage = useCallback(async (n: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!doc || !canvas || !wrap) return;
    const pdfPage: PdfPage = await doc.getPage(n);
    const base = pdfPage.getViewport({ scale: 1 });
    const avail = Math.max(240, wrap.clientWidth - 32);
    const scale = avail / base.width;
    const viewport = pdfPage.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await pdfPage.render({
      canvas,
      canvasContext: ctx,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
    }).promise;
  }, []);

  /** fila serializada: uma página por vez (evita "canvas em uso") */
  const pump = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      while (pendingRef.current != null) {
        const target = pendingRef.current;
        pendingRef.current = null;
        try {
          await renderPage(target);
        } catch (error) {
          /* documento destruído/interrompido — registra para diagnóstico */
          console.warn("[leitor] falha ao renderizar página:", error);
        }
      }
    } finally {
      busyRef.current = false;
    }
  }, [renderPage]);

  const requestRender = useCallback(
    (n: number) => {
      pendingRef.current = n;
      void pump();
    },
    [pump],
  );

  const flushSave = useCallback(
    (next?: { page: number; bookmarks: Bookmark[] }) => {
      const p = next?.page ?? pageRef.current;
      const bms = next?.bookmarks ?? bookmarksRef.current;
      const total = pagesRef.current || 1;
      onProgressRef.current({
        page: p,
        pages: pagesRef.current,
        percent: Math.round((p / total) * 100),
        bookmarks: bms,
      });
    },
    [],
  );

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      flushSave();
    }, 600);
  }, [flushSave]);

  const goTo = useCallback(
    (n: number) => {
      const total = pagesRef.current || 1;
      const target = clamp(Math.round(n), 1, total);
      if (target === pageRef.current) return;
      pageRef.current = target;
      setPage(target);
      setPageDraft(String(target));
      requestRender(target);
      scheduleSave();
    },
    [requestRender, scheduleSave],
  );

  const applyBookmarks = useCallback(
    (list: Bookmark[]) => {
      bookmarksRef.current = list;
      setBookmarks(list);
      flushSave({ page: pageRef.current, bookmarks: list });
    },
    [flushSave],
  );

  const addBookmark = useCallback(() => {
    const current = pageRef.current;
    if (bookmarksRef.current.some((b) => b.page === current)) return;
    applyBookmarks([
      ...bookmarksRef.current,
      {
        id: newBookmarkId(),
        label: `Página ${current}`,
        page: current,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [applyBookmarks]);

  // carrega o documento (1×)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { doc, task } = await openPdf(file.url);
        if (cancelled) {
          void task.destroy();
          return;
        }
        taskRef.current = task;
        docRef.current = doc;
        pagesRef.current = doc.numPages;
        setPages(doc.numPages);

        const start = clamp(initialRef.current?.page ?? 1, 1, doc.numPages);
        const startBookmarks = (initialRef.current?.bookmarks ?? []).filter(
          (b) => typeof b.page === "number" && b.page <= doc.numPages,
        );
        pageRef.current = start;
        bookmarksRef.current = startBookmarks;
        setPage(start);
        setPageDraft(String(start));
        setBookmarks(startBookmarks);

        const fromProduct = chaptersPropRef.current;
        const list = fromProduct.length > 0 ? fromProduct : await resolveOutline(doc);
        setChapterList(list);

        setStatus("ready");
        requestRender(start);
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        flushSave();
      }
      const task = taskRef.current;
      docRef.current = null;
      taskRef.current = null;
      if (task) void task.destroy().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.url]);

  // teclado: setas navegam páginas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goTo(pageRef.current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(pageRef.current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(1);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(pagesRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  // redimensionamento → reencaixa na largura
  useEffect(() => {
    const onResize = () => {
      if (status === "ready") requestRender(pageRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [status, requestRender]);

  // primeira pintura: só roda depois do commit, quando o <canvas> já existe
  // (o render disparado dentro do effect de load cai com canvasRef null)
  useEffect(() => {
    if (status === "ready") requestRender(pageRef.current);
  }, [status, requestRender]);

  const percent = pages > 0 ? Math.round((page / pages) * 100) : 0;
  const currentChapter = chapterList.reduce(
    (acc: Chapter | null, c) => (c.start <= page ? c : acc),
    null,
  );

  if (status === "loading") {
    return (
      <div className="card grid min-h-[50vh] place-items-center gap-3 p-10 text-center text-[var(--text-muted)]">
        <p className="text-display text-2xl text-gold">Abrindo o e-book…</p>
        <p className="text-sm">Carregando o arquivo e sua última posição.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card grid place-items-center gap-4 p-12 text-center">
        <p className="text-display text-2xl">Não foi possível abrir este arquivo</p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          O PDF não pôde ser carregado. Verifique sua conexão e tente novamente —
          sua licença e seu progresso continuam salvos.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {/* topo: título, licença e download */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {currentChapter ? `${currentChapter.title} · ` : ""}
            página {page} de {pages} · {percent}%
          </p>
        </div>
        {downloadHref ? (
          <a
            href={downloadHref}
            className="btn btn-ghost px-3 py-2 text-xs"
            title={`Baixar ${title}`}
          >
            <IconDownload className="h-4 w-4" />
            Baixar
          </a>
        ) : (
          <span
            className="text-xs text-[var(--text-muted)]"
            title="A licença deste item não inclui download do arquivo."
          >
            Download não incluído
          </span>
        )}
        <button
          type="button"
          className={`btn btn-ghost px-3 py-2 text-xs ${bookmarks.some((b) => b.page === page) ? "text-gold" : ""}`}
          onClick={addBookmark}
          disabled={bookmarks.some((b) => b.page === page)}
        >
          <IconBookmark className="h-4 w-4" />
          {bookmarks.some((b) => b.page === page) ? "Marcado" : "Marcar página"}
        </button>
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-xs lg:hidden"
          onClick={() => setShowSidebar((v) => !v)}
          aria-expanded={showSidebar}
        >
          <IconList className="h-4 w-4" />
          Sumário
        </button>
      </div>

      <div className="flex min-h-[55vh] flex-1">
        {/* palco do PDF */}
        <div
          ref={wrapRef}
          className="flex min-w-0 flex-1 justify-center overflow-auto p-4"
          style={{ background: "#0C0014" }}
        >
          <canvas ref={canvasRef} className="rounded shadow-2xl" aria-label={`Página ${page}`} />
        </div>

        {/* lateral: capítulos + marcadores */}
        <aside
          className={`${showSidebar ? "flex" : "hidden"} w-64 shrink-0 flex-col gap-4 overflow-y-auto border-l border-[var(--border)] p-4 lg:flex`}
        >
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
              <IconList className="h-4 w-4" />
              Capítulos
            </p>
            {chapterList.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Este arquivo não possui sumário.
              </p>
            ) : (
              <ul className="space-y-1">
                {chapterList.map((c) => (
                  <li key={`${c.title}-${c.start}`}>
                    <button
                      type="button"
                      onClick={() => goTo(c.start)}
                      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition hover:bg-[var(--surface-raised,rgba(86,3,173,.18))] ${
                        currentChapter?.start === c.start ? "text-gold" : ""
                      }`}
                    >
                      <span className="truncate">{c.title}</span>
                      <span className="shrink-0 text-[var(--text-muted)]">{c.start}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
              <IconBookmark className="h-4 w-4" />
              Marcadores
            </p>
            {bookmarks.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Nenhum marcador. Use “Marcar página” para guardar uma passagem.
              </p>
            ) : (
              <ul className="space-y-1">
                {bookmarks
                  .slice()
                  .sort((a, b) => (a.page ?? 0) - (b.page ?? 0))
                  .map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:bg-[var(--surface-raised,rgba(86,3,173,.18))]"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => b.page && goTo(b.page)}
                      >
                        {b.label}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover marcador ${b.label}`}
                        className="shrink-0 text-[var(--text-muted)] transition hover:text-gold"
                        onClick={() =>
                          applyBookmarks(bookmarks.filter((x) => x.id !== b.id))
                        }
                      >
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <p className="mt-auto text-[11px] text-[var(--text-muted)]">
            {synced
              ? "Progresso sincronizado com sua conta Cliffhanger."
              : "Progresso salvo neste dispositivo. Entre na conta para sincronizar."}
          </p>
        </aside>
      </div>

      {/* barra inferior: navegação + progresso */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] px-4 py-3">
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-xs"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="number"
            min={1}
            max={pages}
            value={pageDraft}
            onChange={(e) => setPageDraft(e.target.value)}
            onBlur={() => goTo(Number(pageDraft) || page)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goTo(Number(pageDraft) || page);
            }}
            aria-label="Ir para a página"
            className="w-14 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-center text-xs"
          />
          <span className="text-[var(--text-muted)]">/ {pages}</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-xs"
          onClick={() => goTo(page + 1)}
          disabled={page >= pages}
          aria-label="Próxima página"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>

        <div className="min-w-40 flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-bold text-gold">{percent}%</span>
      </div>
    </div>
  );
}
