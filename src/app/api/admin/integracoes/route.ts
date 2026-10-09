import { readFile } from "node:fs/promises";
import path from "node:path";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";

/**
 * SISTEMA → Integrações (Etapa T) — status de LEITURA das integrações
 * externas. A resposta traz apenas a PRESENÇA de cada configuração
 * (boolean) — nunca os valores das chaves (§13) — mais a saúde do
 * auto-update do aplicativo lendo o manifesto público
 * (`public/app-version.json`). Acesso: `settings.view`.
 */

/** Só campos públicos do manifesto de auto-update. */
interface ManifestoAutoUpdate {
  version: string | null;
  versionCode: number | null;
  releasedAt: string | null;
  apkUrl: string | null;
}

function tem(valor: string | undefined): boolean {
  return Boolean(valor?.trim());
}

async function lerManifesto(): Promise<ManifestoAutoUpdate | null> {
  try {
    const bruto = await readFile(
      path.join(process.cwd(), "public", "app-version.json"),
      "utf8",
    );
    const json = JSON.parse(bruto) as Record<string, unknown>;
    return {
      version: typeof json.version === "string" ? json.version : null,
      versionCode: typeof json.versionCode === "number" ? json.versionCode : null,
      releasedAt: typeof json.releasedAt === "string" ? json.releasedAt : null,
      apkUrl: typeof json.apkUrl === "string" ? json.apkUrl : null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "settings.view");
  if (isGateResponse(gate)) return gate;

  const manifesto = await lerManifesto();

  return Response.json({
    pagbank: {
      token: tem(process.env.PAGBANK_TOKEN),
      publicKey: tem(process.env.NEXT_PUBLIC_PAGBANK_PUBLIC_KEY),
      sandbox: process.env.PAGBANK_SANDBOX !== "false",
    },
    firebase: {
      client: tem(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      admin:
        tem(process.env.FIREBASE_SERVICE_ACCOUNT) ||
        tem(process.env.FIREBASE_ADMIN_KEY) ||
        tem(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    },
    cloudinary: {
      cloud: tem(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
      preset: tem(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET),
    },
    facebook: tem(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID),
    site: {
      url: tem(process.env.NEXT_PUBLIC_SITE_URL),
      superAdmin: tem(process.env.SUPER_ADMIN_EMAIL),
    },
    autoUpdate: manifesto,
  });
}
