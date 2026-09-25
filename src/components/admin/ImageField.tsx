"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/components/admin/upload";

/**
 * Campo de imagem do CMS: upload para o Cloudinary (preset unsigned) com
 * fallback de colagem de URL. Usado no banner da Home (§5) e nas zonas.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState(value);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await uploadImage(file);
    setBusy(false);
    if (result.ok) {
      onChange(result.url);
      setUrlDraft(result.url);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </label>

      {value && (
        <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia de URL livre do CMS */}
          <img src={value} alt={label} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="btn btn-accent px-4 py-2 text-[11px]"
        >
          {busy ? "Enviando…" : "Enviar imagem"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setUrlDraft("");
            }}
            className="btn btn-ghost px-4 py-2 text-[11px]"
          >
            Remover
          </button>
        )}
      </div>

      <input
        type="text"
        value={urlDraft}
        onChange={(event) => setUrlDraft(event.target.value)}
        onBlur={() => onChange(urlDraft.trim())}
        placeholder="https://… ou /imagem.png"
        className="field w-full text-xs"
      />

      {hint && <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>}
      {error && <p className="text-[11px] text-[#e5484d]">{error}</p>}
    </div>
  );
}
