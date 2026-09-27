import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { invalidateCatalog } from "@/lib/data";
import {
  DIGITAL_MODULE_LABEL,
  DIGITAL_PRODUCT_TYPE,
  describeDigital,
  sanitizeDigitalInput,
  type DigitalModuleKind,
} from "@/lib/digital-fields";
import type { Product } from "@/lib/types";

/**
 * §12/§8 — grava o conteúdo digital de um produto: arquivos entregues,
 * permissão de download (licença) e sumário de capítulos do leitor/player.
 * Só esses três campos são mesclados no documento — preço, estoque e os
 * demais dados continuam sendo assunto do módulo Produtos.
 *
 * A gravação purga o catálogo e as páginas públicas: a flag "digital"
 * alimenta selos e listas da loja.
 */

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "digital.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("products").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  let body: { kind?: unknown; input?: unknown };
  try {
    body = (await request.json()) as { kind?: unknown; input?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (body?.kind !== "pdf" && body?.kind !== "audio") {
    return Response.json(
      { error: "Informe o módulo: kind deve ser pdf (E-books) ou audio (Audiobooks)." },
      { status: 400 },
    );
  }
  const kind: DigitalModuleKind = body.kind;

  const previous = { id: existing.id, ...(existing.data() as Partial<Product>) } as Product;

  if (previous.type !== DIGITAL_PRODUCT_TYPE[kind]) {
    return Response.json(
      {
        error:
          kind === "pdf"
            ? `“${previous.title}” não é um e-book (tipo ${previous.type}) — edite-o em Produtos.`
            : `“${previous.title}” não é um audiobook (tipo ${previous.type}) — edite-o em Produtos.`,
      },
      { status: 400 },
    );
  }

  const parsed = sanitizeDigitalInput(body?.input, kind);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const form = parsed.form;

  const before = {
    digital: previous.digital === true,
    files: previous.files ?? [],
    chapters: previous.chapters ?? [],
  };
  const changed =
    before.digital !== form.digital ||
    JSON.stringify(before.files) !== JSON.stringify(form.files) ||
    JSON.stringify(before.chapters) !== JSON.stringify(form.chapters);

  if (!changed) {
    return Response.json({ ok: true, changed: false });
  }

  try {
    await ref.set(
      plainDoc({ digital: form.digital, files: form.files, chapters: form.chapters }),
      { merge: true },
    );
  } catch {
    return Response.json({ error: "Falha ao gravar o conteúdo digital." }, { status: 500 });
  }

  invalidateCatalog();
  revalidatePath("/", "layout");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: DIGITAL_MODULE_LABEL[kind],
    entity: "product",
    entityId: id,
    summary: `Atualizou o conteúdo digital de “${previous.title}”: ${describeDigital(form)}`,
    before,
    after: form,
  });

  return Response.json({ ok: true, changed: true });
}
