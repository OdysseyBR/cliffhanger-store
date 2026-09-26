"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconBookmark,
  IconDownload,
  IconForward15,
  IconList,
  IconPause,
  IconPlay,
  IconReplay15,
  IconX,
} from "@/components/Icons";
import type { Bookmark, Chapter, DigitalFile, ReadingProgress } from "@/lib/types";

/**
 * Player de audiobook da plataforma digital (Doc Mestre §8): capítulos,
 * progresso/última posição, marcadores por timestamp, velocidade e
 * download apenas quando a licença permite.
 */

function newBookmarkId(): string {
  return `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];

interface AudioPlayerProps {
  file: DigitalFile;
  title: string;
  initial: ReadingProgress | null;
  chapters: Chapter[];
  synced: boolean;
  /** rota de download com licença; `null` = sem download na licença */
  downloadHref: string | null;
  onProgress: (patch: {
    position?: number;
    percent: number;
    bookmarks?: Bookmark[];
  }) => void;
}

export function AudioPlayer({
  file,
  title,
  initial,
  chapters,
  synced,
  downloadHref,
  onProgress,
}: AudioPlayerProps) {
  const initialRef = useRef(initial);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const bookmarksRef = useRef<Bookmark[]>(initial?.bookmarks ?? []);
  const lastSaveRef = useRef(0);
  const resumedRef = useRef(false);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initial?.bookmarks ?? []);
  const [showChapters, setShowChapters] = useState(false);

  const flushSave = useCallback(
    (force = false, next?: Bookmark[]) => {
      const dur = durationRef.current || 0;
      const pos = positionRef.current;
      const percent = dur > 0 ? Math.round((pos / dur) * 100) : 0;
      onProgressRef.current({
        position: Math.round(pos),
        percent,
        bookmarks: next ?? bookmarksRef.current,
      });
      lastSaveRef.current = force ? Date.now() : lastSaveRef.current;
    },
    [],
  );

  /** salva no máximo a cada 4s durante a reprodução */
  const maybeSave = useCallback(() => {
    if (Date.now() - lastSaveRef.current >= 4000) {
      lastSaveRef.current = Date.now();
      flushSave();
    }
  }, [flushSave]);

  const applyBookmarks = useCallback(
    (list: Bookmark[]) => {
      bookmarksRef.current = list;
      setBookmarks(list);
      flushSave(true, list);
    },
    [flushSave],
  );

  const addBookmark = useCallback(() => {
    const pos = Math.floor(positionRef.current);
    if (bookmarksRef.current.some((b) => b.position === pos)) return;
    applyBookmarks([
      ...bookmarksRef.current,
      {
        id: newBookmarkId(),
        label: formatTime(pos),
        position: pos,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [applyBookmarks]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(seconds, durationRef.current || seconds));
    audio.currentTime = target;
    positionRef.current = target;
    setPosition(target);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => undefined);
    else audio.pause();
  }, []);

  // metadata + resume da última posição
  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    durationRef.current = audio.duration || 0;
    setDuration(audio.duration || 0);
    const saved = initialRef.current?.position ?? 0;
    if (!resumedRef.current && saved > 1 && saved < (audio.duration || 0) - 2) {
      audio.currentTime = saved;
      positionRef.current = saved;
      setPosition(saved);
    }
    resumedRef.current = true;
    setReady(true);
  }, []);

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    positionRef.current = audio.currentTime;
    setPosition(audio.currentTime);
    maybeSave();
  }, [maybeSave]);

  const persistNow = useCallback(() => {
    flushSave(true);
  }, [flushSave]);

  // pause/unload → grava a última posição
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", persistNow);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", persistNow);
      flushSave();
    };
  }, [flushSave, persistNow]);

  const percent = duration > 0 ? Math.round((position / duration) * 100) : 0;
  const currentChapter = chapters.reduce(
    (acc: Chapter | null, c) => (c.start <= position ? c : acc),
    null,
  );

  if (error) {
    return (
      <div className="card grid place-items-center gap-4 p-12 text-center">
        <p className="text-display text-2xl">Não foi possível reproduzir o áudio</p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          O arquivo de áudio não pôde ser carregado. Sua licença e seu progresso
          continuam salvos.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {/* cabeçalho + download */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {currentChapter ? currentChapter.title : "Audiobook"}
            {duration > 0 && ` · ${formatTime(position)} de ${formatTime(duration)}`}
          </p>
        </div>
        {downloadHref ? (
          <a
            href={downloadHref}
            className="btn btn-ghost px-3 py-2 text-xs"
            title={`Baixar ${title}`}
          >
            <IconDownload className="h-4 w-4" />
            Baixar áudio
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
          className="btn btn-ghost px-3 py-2 text-xs"
          onClick={addBookmark}
        >
          <IconBookmark className="h-4 w-4" />
          Marcar momento
        </button>
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-xs lg:hidden"
          onClick={() => setShowChapters((v) => !v)}
          aria-expanded={showChapters}
        >
          <IconList className="h-4 w-4" />
          Capítulos
        </button>
      </div>

      {/* seek */}
      <div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.5}
          value={position}
          onChange={(e) => seekTo(Number(e.target.value))}
          aria-label="Posição da faixa"
          className="w-full accent-[#FDC500]"
          disabled={!ready}
        />
        <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* controles */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-xs"
          onClick={() => seekTo(position - 15)}
          aria-label="Voltar 15 segundos"
        >
          <IconReplay15 className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="btn btn-primary grid h-14 w-14 place-items-center rounded-full p-0"
          onClick={togglePlay}
          disabled={!ready}
          aria-label={playing ? "Pausar" : "Reproduzir"}
        >
          {playing ? (
            <IconPause className="h-7 w-7" />
          ) : (
            <IconPlay className="h-7 w-7" />
          )}
        </button>
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-xs"
          onClick={() => seekTo(position + 15)}
          aria-label="Avançar 15 segundos"
        >
          <IconForward15 className="h-5 w-5" />
        </button>

        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          Velocidade
          <select
            value={rate}
            onChange={(e) => {
              const next = Number(e.target.value);
              setRate(next);
              if (audioRef.current) audioRef.current.playbackRate = next;
            }}
            className="rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs"
          >
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* barra de progresso simples */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* capítulos */}
        <div className={showChapters ? "block" : "hidden lg:block"}>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
            <IconList className="h-4 w-4" />
            Capítulos
          </p>
          {chapters.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              Este audiobook não possui capítulos cadastrados.
            </p>
          ) : (
            <ul className="space-y-1">
              {chapters.map((c) => (
                <li key={`${c.title}-${c.start}`}>
                  <button
                    type="button"
                    onClick={() => seekTo(c.start)}
                    className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition hover:bg-[var(--surface-raised,rgba(86,3,173,.18))] ${
                      currentChapter?.title === c.title ? "text-gold" : ""
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 text-[var(--text-muted)]">
                      {formatTime(c.start)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* marcadores */}
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
            <IconBookmark className="h-4 w-4" />
            Marcadores
          </p>
          {bookmarks.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              Nenhum marcador. Use “Marcar momento” para guardar um trecho.
            </p>
          ) : (
            <ul className="space-y-1">
              {bookmarks
                .slice()
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:bg-[var(--surface-raised,rgba(86,3,173,.18))]"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => seekTo(b.position ?? 0)}
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
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">
        {synced
          ? "Progresso sincronizado com sua conta Cliffhanger."
          : "Progresso salvo neste dispositivo. Entre na conta para sincronizar."}
      </p>

      {/* elemento de áudio (oculto) */}
      <audio
        ref={audioRef}
        src={file.url}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          flushSave();
        }}
        onEnded={() => {
          setPlaying(false);
          flushSave();
        }}
        onError={() => setError(true)}
      />
    </div>
  );
}
