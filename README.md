# Cliffhanger Store

Loja online do universo **Cliffhanger**: livros, e-books, audiobooks, produtos oficiais e
colecionáveis. Projeto desenvolvido conforme o Documento Mestre (`Projeto/` na raiz do workspace).

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** (temas: `default` (escuro) / `claro` via `data-theme`)
- **Firebase** — Auth (Google, Facebook, e-mail) + Firestore (catálogo, usuários, pedidos)
- **Vercel** — deploy de produção automático a cada push em `main`

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha os valores (ver tabela abaixo)
npm run dev                  # http://localhost:3000
```

### Comandos

| Comando             | Descrição                                                        |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                                       |
| `npm run build`     | Build de produção (gera as páginas estáticas)                    |
| `npm run start`     | Serve o build de produção                                        |
| `npm run lint`      | ESLint (Next + React Hooks)                                      |
| `npm run seed`      | Semear o Firestore com o catálogo de demonstração (Fase 0)       |
| `npx tsx scripts/check-firestore.ts` | Diagnóstico somente-leitura das coleções     |

## Variáveis de ambiente (`.env.local`)

Copie `.env.example` para `.env.local`. **Nenhum segredo vai para o Git** (`.env*` está no
`.gitignore`; apenas `.env.example` é versionado). Os valores reais ficam no `.env.local` e no
painel da Vercel (ambiente *Production*).

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` (6) | Cliente Firebase no navegador (auth + Firestore) |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON em **linha única** (seed e API no servidor) |
| `NEXT_PUBLIC_SITE_URL` | URL canônica (metadataBase / back_urls) |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | *Opcional* — sem o valor, o botão Facebook exibe um aviso |
| `CATALOG_SOURCE` | `local` força o catálogo de demonstração embarcado (desenvolvimento) |

## Fonte de dados do catálogo

`src/lib/data.ts` é **Firestore-first**: lê as coleções `products`, `works`, `universes`,
`authors` e `collections` no servidor. Sem credenciais — ou se o Firestore falhar — o load
**propaga a falha** (`console.error` + `throw`, sem fallback silencioso): a rota cai no
`error.tsx` correspondente e o `getCatalog()` tenta de novo na próxima navegação (a promessa
rejeitada sai do cache). O catálogo de demonstração (`src/data/catalog.ts`, mesma fonte do
`npm run seed`) só é usado com o flag explícito `CATALOG_SOURCE=local`.

## Rotas principais

`/` (Home) · `/loja` · `/livros` · `/ebooks` · `/audiobooks` · `/produtos` · `/colecionaveis` ·
`/lancamentos` · `/ofertas` · `/obras/[slug]` · `/produtos/[slug]` · `/universos` (+`/[slug]`) ·
`/autores` (+`/[slug]`) · `/buscar` · `/carrinho` · `/checkout` (Dados → Entrega → Pagamento →
Revisão → Pedido) · `/conta` · `/wishlist` · `/biblioteca` · `/api/products` · `/api/orders`

A Home segue a arquitetura fixa do Documento Mestre:
**BANNER → HEADER (só logo centralizado) → MENU BUTTONS → DESTAQUES (side scroll) → seções**.

## Estado no navegador

Carrinho, wishlist, tema e biblioteca são persistidos em `localStorage`
(`ch:cart`, `ch:wishlist`, `ch:theme`, `ch:library`) via store externo
(`src/lib/client-store.ts`) — funciona sem login e sincroniza com o perfil quando há sessão.

## Deploy

1. Push em `main` → a integração Git da Vercel faz o deploy de produção automaticamente.
2. Manual: `npx vercel --prod` (requer `npx vercel link`).
3. O checkout em `/api/orders` calcula totais **no servidor** (frete grátis ≥ R$199) e grava o
   pedido no Firestore quando `FIREBASE_SERVICE_ACCOUNT` está configurado.

Produção: <https://www.cliffhangerstore.xyz>

## Paleta

P4 — `#0E0000` (`--color-ink`) · `#A30707` (`--color-violet`) · `#E7CB9B` (`--color-gold`) ·
`#F8FEFF` (`--color-paper`), chapada (sem gradientes). Tokens em `src/app/globals.css`; os
valores por tema (incl. `accent`) vêm de `src/data/themes.ts` (`default` escuro / `claro`).
