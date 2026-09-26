import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getLibrary } from "@/lib/library";
import { getProducts } from "@/lib/data";
import type { DigitalFile } from "@/lib/types";

/**
 * Download de arquivo digital (Doc Mestre §8 — "downloads quando permitidos").
 *
 * Serve o arquivo com `Content-Disposition: attachment` (o atributo
 * `download` não funciona cross-origin) e respeita a licença:
 * 1. logado → arquivo do item na biblioteca da conta;
 * 2. fallback → arquivo publicado no produto (compra local/visitante).
 * Sem arquivo permitido responde 403.
 */

const EXT_BY_KIND: Record<DigitalFile["kind"], string> = {
  pdf: ".pdf",
  audio: ".mp3",
};

function filenameFor(file: DigitalFile): string {
  const urlPath = file.url.split("?")[0].split("#")[0];
  const ext = /\.[a-z0-9]{2,5}$/i.test(urlPath)
    ? urlPath.slice(urlPath.lastIndexOf("."))
    : EXT_BY_KIND[file.kind];
  const base = (file.name || "arquivo").replace(/\.[a-z0-9]{2,5}$/i, "");
  const safe = base
    .replace(/[^\w .()\-áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]+/gu, "_")
    .slice(0, 80)
    .trim() || "arquivo";
  return `${safe}${ext}`;
}

async function verifyUid(request: Request): Promise<string | null> {
  const bearer = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!bearer) return null;
  const app = getAdminApp();
  if (!app) return null;
  try {
    return (await getAuth(app).verifyIdToken(bearer)).uid;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") ?? "";
  const kindParam = url.searchParams.get("kind");
  const kind: DigitalFile["kind"] | null =
    kindParam === "pdf" || kindParam === "audio" ? kindParam : null;

  if (!productId || productId.length > 128) {
    return Response.json({ error: "Produto inválido." }, { status: 400 });
  }

  const pick = (files: DigitalFile[] | undefined): DigitalFile | null => {
    const allowed = (files ?? []).filter((f) => f.allowDownload && f.url);
    if (allowed.length === 0) return null;
    return (kind && allowed.find((f) => f.kind === kind)) || allowed[0];
  };

  let file: DigitalFile | null = null;

  // 1) licença da conta (item comprado)
  const uid = await verifyUid(request);
  if (uid) {
    try {
      const library = await getLibrary(uid);
      const item = library?.items.find((i) => i.productId === productId);
      file = pick(item?.files);
    } catch {
      /* segue para o produto */
    }
  }

  // 2) fallback: arquivo publicado no produto
  if (!file) {
    try {
      const products = await getProducts();
      const product = products.find((p) => p.id === productId);
      file = pick(product?.files);
    } catch {
      file = null;
    }
  }

  if (!file) {
    return Response.json(
      { error: "Download não incluído na licença deste item." },
      { status: 403 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(file.url, { cache: "no-store" });
  } catch {
    return Response.json({ error: "Falha ao buscar o arquivo." }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Arquivo indisponível." }, { status: 502 });
  }

  const filename = filenameFor(file);
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(filename);
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`,
    "Cache-Control": "private, max-age=0",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
