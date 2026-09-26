import * as fs from "node:fs";
import * as path from "node:path";
import { launches } from "../src/data/launches";

/**
 * Semeia a coleção `launches` com os lançamentos de demonstração
 * (Documento Mestre 13.1 / Correção §15).
 *
 * Diferente de `npm run seed`, este script é aditivo: documentos já
 * existentes (eventualmente editados pelo painel) são preservados.
 *
 * Uso:  npx tsx scripts/seed-launches.ts
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
  const force = process.argv.includes("--force");
  let created = 0;
  let kept = 0;

  for (const launch of launches) {
    const ref = db.collection("launches").doc(launch.id);
    const existing = await ref.get();
    if (existing.exists && !force) {
      kept += 1;
      console.log(`· mantido ${launch.id} (${launch.slug})`);
      continue;
    }
    await ref.set({ ...launch });
    created += 1;
    console.log(`${existing.exists ? "↻ atualizado" : "✓ criado"} ${launch.id} (${launch.slug})`);
  }

  console.log(`\nlaunches: ${created} gravado(s), ${kept} mantido(s)`);
  process.exit(0);
}

main().catch((error) => {
  console.error("✗ Falha no seed de launches:", error);
  process.exit(1);
});
