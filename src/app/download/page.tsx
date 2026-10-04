import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { IconCheck, IconDownload, IconPhone } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Download do App",
  description:
    "Baixe o app Cliffhanger Store para Android: leitor de e-books, player de audiobooks e seus pedidos direto no celular.",
};

/** Manifesto da versão atual do app (public/app-version.json).
 *  É a mesma fonte que o app mobile consulta pra checar atualizações. */
interface AppVersionManifest {
  version: string;
  versionCode: number;
  platform: string;
  apkUrl: string;
  sizeBytes: number;
  /** Data ISO (YYYY-MM-DD) da publicação da versão. */
  releasedAt: string;
  notes: string;
}

async function getAppVersion(): Promise<AppVersionManifest> {
  const raw = await readFile(join(process.cwd(), "public", "app-version.json"), "utf8");
  return JSON.parse(raw) as AppVersionManifest;
}

/** Data YYYY-MM-DD → DD/MM/YYYY sem depender de fuso do servidor. */
function formatDataBR(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Tamanho em MB com vírgula decimal (pt-BR). */
function formatTamanho(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Rota de download do app — aba "Download do App" (Etapa M).
 *  Estática: lê o manifesto no build; atualizar a versão = editar o JSON. */
export default async function DownloadPage() {
  const app = await getAppVersion();

  return (
    <Page>
      <Section
        title="Download do App"
        subtitle="A experiência Cliffhanger Store no seu celular — leia, ouça e acompanhe seus pedidos."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* hero + CTA */}
          <div className="card space-y-5 p-6 lg:col-span-2">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#A30707] text-[#F8FEFF]">
                <IconPhone className="h-7 w-7" />
              </span>
              <div className="min-w-0 space-y-1">
                <h2 className="text-display text-2xl">Cliffhanger Store para Android</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Baixe a versão mais recente direto daqui — o mesmo arquivo publicado
                  oficialmente no GitHub da OdysseyBR.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a href={app.apkUrl} className="btn btn-primary px-6" download>
                <IconDownload className="mr-2 h-5 w-5" />
                Baixar APK (Android)
              </a>
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Sempre a última versão
              </span>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-muted)]">
              <li>Versão {app.version}</li>
              <li>{formatTamanho(app.sizeBytes)}</li>
              <li>Publicado em {formatDataBR(app.releasedAt)}</li>
              <li>Android</li>
            </ul>

            <p className="border-t border-[var(--border)] pt-4 text-sm text-[var(--text-muted)]">
              <span className="font-bold text-gold">Novidades desta versão:</span>{" "}
              {app.notes}
            </p>
          </div>

          {/* como instalar */}
          <div className="card space-y-3 p-6">
            <h2 className="text-display text-2xl">Como instalar</h2>
            <ol className="space-y-3 text-sm text-[var(--text-muted)]">
              <li className="flex gap-3">
                <span className="font-bold text-gold">1.</span>
                <span>
                  Toque em <strong className="text-[var(--text)]">Baixar APK</strong> — o
                  arquivo baixa direto no seu celular.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-gold">2.</span>
                <span>
                  Se o Android pedir permissão para instalar de fontes desconhecidas,
                  toque em permitir (normalmente aparece para o navegador que você usou).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-gold">3.</span>
                <span>
                  Abra o arquivo baixado e toque em <strong className="text-[var(--text)]">Instalar</strong>.
                  Pronto: o app fica no seu menu.
                </span>
              </li>
            </ol>
            <p className="text-xs text-[var(--text-muted)]">
              iPhone e iPad: por enquanto o app está disponível apenas para Android.
            </p>
          </div>

          {/* benefícios */}
          <div className="card space-y-3 p-6">
            <h2 className="text-display text-2xl">Por que usar o app</h2>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>Leitor de e-books e player de audiobooks feitos pro celular.</span>
              </li>
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>Notificações de lançamentos, ofertas e status dos pedidos.</span>
              </li>
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>Conta, biblioteca e wishlist sincronizadas com a loja.</span>
              </li>
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>O app avisa quando sair uma versão nova e atualiza por aqui mesmo.</span>
              </li>
            </ul>
          </div>
        </div>
      </Section>
    </Page>
  );
}
