/**
 * Dimensões reais de uma imagem lidas do cabeçalho do arquivo (P1.9 — CLS
 * do banner da home).
 *
 * O banner é arte de proporção livre enviada pelo admin (Documento de
 * Correção §5: "sem recorte"), então `width`/`height` não podem ser
 * constantes nem um `aspect-ratio` fixo com `object-cover` (que cortaria a
 * arte). Baixamos só os primeiros 64 KB, identificamos o formato e
 * devolvemos a proporção real — o `<img>` reserva o espaço exato antes do
 * load e nada pula. Qualquer falha devolve `null` e a página fica como
 * hoje (sem os atributos).
 */

export interface ImageSize {
  width: number;
  height: number;
}

function u16be(b: Uint8Array, o: number): number {
  return (b[o] << 8) | b[o + 1];
}

function u16le(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}

function u24le(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
}

function u32be(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

/** Lê as dimensões do começo do arquivo; `null` se não reconhecer. */
function sniff(b: Uint8Array): ImageSize | null {
  // PNG: assinatura 89 50 4E 47 … + IHDR (width/height BE em 16 e 20)
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: u32be(b, 16), height: u32be(b, 20) };
  }

  // GIF: "GIF8" + "7a/9a" + width/height LE em 6 e 8
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) {
    return { width: u16le(b, 6), height: u16le(b, 8) };
  }

  // WebP: "RIFF"…"WEBP" + fourcc (VP8X / VP8 / VP8L)
  if (
    b.length >= 30 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    const fourcc = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fourcc === "VP8X") {
      // canvas width-1 / height-1 em 3 bytes LE cada (24 e 27)
      return { width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) };
    }
    if (fourcc === "VP8 ") {
      // start code 9D 01 2A em 23..25; 14 bits LE cada (26 e 28)
      return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    }
    if (fourcc === "VP8L") {
      // sinal 2F em 20; 14 bits de width-1 e 14 bits de height-1 a partir de 21
      const b0 = b[21];
      const b1 = b[22];
      const b2 = b[23];
      const b3 = b[24];
      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    return null;
  }

  // JPEG: FF D8 … varre marcadores até o SOF (C0–CF, exceto C4/C8/CC)
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = b[i + 1];
      // SOI/padding: sem corpo
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      // SOS (DA): dados começam; SOF deveria ter aparecido antes
      if (marker === 0xda) return null;
      const len = u16be(b, i + 2);
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        // FF marker len(2) precisão(1) height(2) width(2)
        return { height: u16be(b, i + 5), width: u16be(b, i + 7) };
      }
      if (len < 2) return null;
      i += 2 + len;
    }
    return null;
  }

  return null;
}

/**
 * Busca os primeiros 64 KB da imagem e devolve as dimensões, ou `null`
 * (formato desconhecido, rede/timeout, URL não-http). Nunca lança: o CLS é
 * melhorado quando dá certo e nada muda quando não dá.
 */
export async function readImageSize(url: string): Promise<ImageSize | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-65535" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok && res.status !== 206) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return sniff(bytes);
  } catch {
    return null;
  }
}
