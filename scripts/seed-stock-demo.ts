import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Semeia a demonstração do módulo Estoque (Documento de Correção §12/§14):
 *
 *  - 3 movimentações plausíveis (entrada, saída, ajuste) para o produto com
 *    maior saldo, mantendo a trilha coerente com o estoque atual;
 *  - `minStock` em itens de baixa rotatividade, ativando o alerta de estoque
 *    baixo (a loja só alerta quando o mínimo está configurado, > 0).
 *
 * Idempotente: nada é recriado se já houver movimentações ou mínimo definido.
 *
 * Uso:  npx tsx scripts/seed-stock-demo.ts
 */

function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf-8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      let value = match[2] ?? "";
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  }
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function main() {
  loadEnvFiles();
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT ??
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!raw) {
    console.error("✗ FIREBASE_SERVICE_ACCOUNT não definido.");
    process.exit(1);
  }

  const serviceAccount = raw.trim().startsWith("{")
    ? JSON.parse(raw)
    : JSON.parse(fs.readFileSync(raw.trim(), "utf-8"));

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

  const db = getFirestore(app);
  const actor =
    (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase() ||
    "Dev.lucas.rafael@gmail.com";

  // --reset: descarta uma trilha anterior (ex.: semeada no produto errado)
  if (process.argv.includes("--reset")) {
    const old = await db.collection("stockMovements").get();
    let removed = 0;
    for (const doc of old.docs) {
      if (/-demo\d+$/.test(doc.id)) {
        await doc.ref.delete();
        removed += 1;
      }
    }
    console.log(`↻ ${removed} movimentação(ões) de demonstração removida(s)`);
  }

  const movSnap = await db.collection("stockMovements").count().get();
  const existingMovements = movSnap.data().count;

  const productsSnap = await db.collection("products").get();
  const products = productsSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      title: String(data.title ?? doc.id),
      type: String(data.type ?? ""),
      stock: Number(data.stock ?? 0),
      reserved: Number(data.reserved ?? 0),
      minStock: data.minStock,
      ref: doc.ref,
    };
  });

  // itens digitais não têm trilha física de estoque
  const isDigital = (product: { type: string }) =>
    product.type === "ebook" || product.type === "audiobook";

  // ---- movimentações de demonstração (uma trilha coerente com o saldo) ----
  if (existingMovements > 0) {
    console.log(`· ${existingMovements} movimentação(ões) já existente(s) — nada a fazer`);
  } else {
    const target = products
      .filter((p) => !isDigital(p) && p.stock >= 8)
      .sort((a, b) => b.stock - a.stock)[0];

    if (!target) {
      console.log("· nenhum produto com saldo ≥ 8 — sem trilha para semear");
    } else {
      const S = target.stock;
      // cadeia coerente: saída baixa, entrada repõe e o ajuste fecha no saldo atual
      const trail = [
        {
          id: `mov-${target.id}-demo1`,
          kind: "saida" as const,
          qty: 2,
          before: S - 5,
          after: S - 7,
          reason: "Venda em evento (Feira do Livro)",
          at: isoDaysAgo(6),
        },
        {
          id: `mov-${target.id}-demo2`,
          kind: "entrada" as const,
          qty: 5,
          before: S - 7,
          after: S - 2,
          reason: "Reposição do fornecedor — lote de exemplares",
          at: isoDaysAgo(3),
        },
        {
          id: `mov-${target.id}-demo3`,
          kind: "ajuste" as const,
          qty: S,
          before: S - 2,
          after: S,
          reason: "Ajuste de inventário — divergência de 2 exemplares",
          at: isoDaysAgo(1),
        },
      ];

      for (const item of trail) {
        await db.collection("stockMovements").doc(item.id).set({
          id: item.id,
          productId: target.id,
          productTitle: target.title,
          kind: item.kind,
          qty: item.qty,
          before: item.before,
          after: item.after,
          reason: item.reason,
          actor,
          at: item.at,
        });
      }
      console.log(
        `✓ ${trail.length} movimentação(ões) em "${target.title}" (saldo ${S})`,
      );
    }
  }

  // ---- mínimo configurado → alerta de estoque baixo (§14) ----
  const pending = products.filter((p) => p.minStock === undefined);
  const scarce = pending.filter((p) => !isDigital(p) && p.stock <= 6);
  const limited = pending.filter((p) => !isDigital(p) && p.stock > 6 && p.stock <= 12);
  const healthy = pending.filter(
    (p) => !isDigital(p) && p.type === "livro-fisico" && p.stock >= 20 && p.stock <= 30,
  );

  const plan = [
    ...scarce.map((p) => ({ p, min: 10 })),
    ...limited.map((p) => ({ p, min: 15 })),
    ...healthy.map((p) => ({ p, min: 20 })),
  ];

  for (const { p, min } of plan) {
    await p.ref.update({ minStock: min });
    console.log(
      `✓ mínimo ${min} em "${p.title}" (saldo ${p.stock}${min > p.stock ? " — alerta ativo" : ""})`,
    );
  }
  if (!plan.length) console.log("· nenhum produto novo para mínimo");

  const soldOut = products.filter((p) => p.stock <= 0).length;
  console.log(`\nestoque: ${products.length} produto(s) · ${soldOut} esgotado(s)`);
  process.exit(0);
}

main().catch((error) => {
  console.error("✗ Falha no seed de estoque:", error);
  process.exit(1);
});
