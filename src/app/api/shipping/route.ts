import {
  cepDigits,
  formatCep,
  quoteShipping,
  FREE_SHIPPING_FROM,
} from "@/lib/shipping";

/**
 * Cálculo de frete por CEP (Documento de Correção §17).
 *
 * Região resolvida pela faixa do CEP (tabela local, sempre disponível);
 * o UF é complementado via ViaCEP quando acessível — falha de rede não
 * derruba a cotação. Sem token de transportadora: sem dependência externa
 * obrigatória.
 */

const ViaCEP_TIMEOUT_MS = 3000;

async function resolveState(digits: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ViaCEP_TIMEOUT_MS);
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as { uf?: string; erro?: boolean };
    return body && !body.erro && typeof body.uf === "string" ? body.uf : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let payload: { cep?: string; itemCount?: number; subtotal?: number };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const digits = cepDigits(payload.cep ?? "");
  if (digits.length !== 8) {
    return Response.json(
      { error: "Informe um CEP válido com 8 dígitos." },
      { status: 400 },
    );
  }

  const itemCount = Math.max(1, Math.min(99, Number(payload.itemCount) || 1));
  const subtotal = Math.max(0, Number(payload.subtotal) || 0);

  const quote = quoteShipping({ cep: digits, itemCount, subtotal });
  if (!quote) {
    return Response.json(
      { error: "CEP fora das faixas atendidas." },
      { status: 400 },
    );
  }

  const state = await resolveState(digits);

  return Response.json({
    ok: true,
    cep: formatCep(digits),
    state,
    region: quote.region,
    regionLabel: quote.regionLabel,
    freeShippingFrom: FREE_SHIPPING_FROM,
    options: quote.options,
  });
}
