import * as fs from "node:fs";
import * as path from "node:path";
import { catalog } from "../src/data/catalog";

/**
 * Semeia o Firestore do projeto `cliffhanger-store` com o catálogo de
 * demonstração (Fase 0).
 *
 * Uso:  npm run seed
 *
 * Credenciais: FIREBASE_SERVICE_ACCOUNT (JSON em linha única, em `.env.local`
 * ou na pasta `.env´s/`). Nenhum segredo é enviado ao Git.
 */

/** Carrega `.env.local` / `.env` sem depender de dependências externas. */
function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2] ?? "";
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFiles();

  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT ??
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!raw) {
    console.error(
      "✗ FIREBASE_SERVICE_ACCOUNT não definido.\n" +
        "  Copie `.env.example` para `.env.local` (ou use a pasta `.env´s/`) e preencha a service account.",
    );
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

  const batches: (() => Promise<void>)[] = [];

  async function writeCollection<T extends { id: string }>(
    name: string,
    items: T[],
  ): Promise<void> {
    const col = db.collection(name);
    // limpa coleções de demonstração anteriores (apenas IDs do catálogo demo)
    const existing = await col.listDocuments();
    await Promise.all(existing.map((doc) => doc.delete()));
    for (const item of items) {
      await col.doc(item.id).set({ ...item });
    }
    console.log(`✓ ${name}: ${items.length} documentos`);
  }

  batches.push(
    async () => writeCollection("universes", catalog.universes),
    async () => writeCollection("authors", catalog.authors),
    async () => writeCollection("works", catalog.works),
    async () => writeCollection("products", catalog.products),
    async () => writeCollection("collections", catalog.collections),
  );

  // Theme Engine (Fase 2): modelos de tema SEM apagar — merge por id,
  // preservando edições feitas no painel /admin.
  async function writeThemes(): Promise<void> {
    const { themes } = await import("../src/data/themes");
    const col = db.collection("themes");
    const existing = new Set((await col.listDocuments()).map((doc) => doc.id));
    let written = 0;
    let kept = 0;
    for (const theme of themes) {
      if (existing.has(theme.id)) {
        kept += 1;
        continue;
      }
      await col.doc(theme.id).set({ ...theme });
      written += 1;
    }
    console.log(
      `✓ themes: ${written} novos, ${kept} preservados (merge, sem limpar)`,
    );
  }

  batches.push(async () => writeThemes());

  for (const run of batches) {
    await run();
  }

  console.log("\n✓ Seed concluído no projeto", serviceAccount.project_id);
  process.exit(0);
}

main().catch((error) => {
  console.error("✗ Falha no seed:", error);
  process.exit(1);
});
