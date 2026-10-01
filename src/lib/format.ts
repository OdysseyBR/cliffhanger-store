/** Formatação de valores comerciais em pt-BR. */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatPrice(value: number): string {
  return brl.format(value);
}

export function discountPercent(price: number, compareAt?: number): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatStars(rating: number): string {
  return rating.toFixed(1).replace(".", ",");
}

/**
 * Máscara de CPF/CNPJ enquanto o comprador digita — Etapa B: o documento é
 * exigido pela API do PagBank para gerar a cobrança (§7.3).
 */
export function maskTaxId(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)].filter(Boolean);
    let out = p[0] ?? "";
    if (p.length > 1) out += `.${p[1]}`;
    if (p.length > 2) out += `.${p[2]}`;
    if (p.length > 3) out += `-${p[3]}`;
    return out;
  }
  const p = [
    d.slice(0, 2),
    d.slice(2, 5),
    d.slice(5, 8),
    d.slice(8, 12),
    d.slice(12, 14),
  ].filter(Boolean);
  let out = p[0] ?? "";
  if (p.length > 1) out += `.${p[1]}`;
  if (p.length > 2) out += `.${p[2]}`;
  if (p.length > 3) out += `/${p[3]}`;
  if (p.length > 4) out += `-${p[4]}`;
  return out;
}

/** Valida CPF ou CNPJ pelos dígitos verificadores. */
export function isValidTaxId(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
    let digit = sum % 11;
    digit = digit < 2 ? 0 : 11 - digit;
    if (digit !== Number(d[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
    digit = sum % 11;
    digit = digit < 2 ? 0 : 11 - digit;
    return digit === Number(d[10]);
  }
  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false;
    const calc = (base: string, weights: number[]): number => {
      const total = base
        .split("")
        .reduce((acc, char, index) => acc + Number(char) * weights[index], 0);
      const rest = total % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    const first = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (first !== Number(d[12])) return false;
    const second = calc(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return second === Number(d[13]);
  }
  return false;
}
