import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeCoupon } from "@/lib/coupons";
import type { Coupon } from "@/lib/types";

/**
 * Edição/exclusão de um cupom pelo painel (§13 — `coupons.edit`).
 * Params de rota são Promise nesta versão do Next — sempre `await params`.
 */

type RouteCtx = { params: Promise<{ id: string }> };

function notFound() {
  return Response.json({ error: "Cupom não encontrado." }, { status: 404 });
}

function describe(coupon: Coupon): string {
  const value =
    coupon.type === "percent"
      ? `${coupon.value}%`
      : coupon.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${coupon.code} (${value}${coupon.minSubtotal > 0 ? ` acima de ${coupon.minSubtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""})`;
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "coupons.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("coupons").doc(id.toUpperCase());
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  let raw: unknown;
  try {
    const body = (await request.json()) as { coupon?: unknown };
    raw = body?.coupon;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const coupon = sanitizeCoupon(raw);
  if (!coupon || coupon.code !== id.toUpperCase()) {
    return Response.json(
      { error: "Dados do cupom inválidos (o código não pode ser alterado)." },
      { status: 400 },
    );
  }

  const previous = existing.data() as Partial<Coupon> | undefined;
  const record: Coupon = {
    ...coupon,
    usedCount:
      typeof previous?.usedCount === "number" && previous.usedCount >= 0
        ? previous.usedCount
        : 0,
    createdAt:
      typeof previous?.createdAt === "string" && previous.createdAt
        ? previous.createdAt
        : coupon.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await ref.set(plainDoc(record));

  const bits: string[] = [];
  if (previous?.active !== record.active) bits.push(record.active ? "ativado" : "desativado");
  if (previous?.value !== record.value || previous?.type !== record.type) {
    bits.push(`desconto → ${describe(record)}`);
  }
  if (previous?.minSubtotal !== record.minSubtotal) bits.push(`mínimo → R$ ${record.minSubtotal}`);
  if (previous?.maxUses !== record.maxUses) {
    bits.push(`limite de usos → ${record.maxUses ?? "ilimitado"}`);
  }
  if (previous?.endsAt !== record.endsAt) bits.push("prazo de validade alterado");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: record.active === false ? "desativar" : "editar",
    module: "Cupons",
    entity: "coupon",
    entityId: record.code,
    summary: `Atualizou o cupom ${record.code}: ${bits.join(", ") || "configuração revisada"}`,
    before: previous,
    after: record,
  });

  return Response.json({ ok: true, coupon: { id: record.code, ...record } });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(_request, "coupons.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("coupons").doc(id.toUpperCase());
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  const previous = existing.data() as Coupon;
  await ref.delete();

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Cupons",
    entity: "coupon",
    entityId: previous.code ?? id.toUpperCase(),
    summary: `Excluiu o cupom ${describe(previous)}`,
    before: previous,
  });

  return Response.json({ ok: true });
}
