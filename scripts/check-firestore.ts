/* Diagnóstico: lista contagens das coleções do Firestore (somente leitura). */
import * as fs from "node:fs";
import * as path from "node:path";

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

async function main() {
  loadEnvFiles();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.log("sem FIREBASE_SERVICE_ACCOUNT");
    return;
  }
  const sa = JSON.parse(raw.trim().startsWith("{") ? raw : fs.readFileSync(raw.trim(), "utf-8"));

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  const app =
    getApps()[0] ??
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  const db = getFirestore(app);

  console.log("projeto:", sa.project_id);
  const cols = [
    "users",
    "products",
    "works",
    "universes",
    "authors",
    "collections",
    "orders",
    "wishlists",
    "reviews",
    "campaigns",
    "launches",
    "preorders",
    "inventory",
    "notifications",
    "club",
    "libraries",
  ];

  const root = await db.listCollections();
  console.log(
    "coleções existentes:",
    root.map((c) => c.id).join(", ") || "(nenhuma)",
  );

  for (const name of cols) {
    const snap = await db.collection(name).limit(5).get();
    if (snap.size > 0) {
      const first = snap.docs[0].data();
      console.log(
        `  ${name}: ${snap.size}+ docs | chaves do 1º: ${Object.keys(first).join(",")}`,
      );
    }
  }
}

main().catch((e) => {
  console.error("erro:", e.message ?? e);
  process.exit(1);
});
