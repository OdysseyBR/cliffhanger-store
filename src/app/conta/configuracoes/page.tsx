import Link from "next/link";

/** §3 — índice das configurações pessoais (conteúdo chega na Etapa 2). */
const SECTIONS = [
  { href: "/conta/configuracoes/dados", label: "Dados pessoais", desc: "Nome, documento e dados de contato." },
  { href: "/conta/configuracoes/enderecos", label: "Endereços", desc: "Entrega e cobrança, com principal." },
  { href: "/conta/configuracoes/pagamentos", label: "Pagamentos", desc: "Métodos salvos e preferido." },
  { href: "/conta/configuracoes/seguranca", label: "Segurança", desc: "Senha, métodos, sessões e exclusão." },
  { href: "/conta/configuracoes/notificacoes", label: "Notificações", desc: "O que a loja pode te avisar." },
  { href: "/conta/configuracoes/privacidade", label: "Privacidade", desc: "Dados, consentimentos e exportação." },
  { href: "/conta/configuracoes/preferencias", label: "Preferências", desc: "Idioma, aparência, leitura e áudio." },
];

export default function ContaConfiguracoesPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-display text-2xl text-gold">Configurações</h1>
      <div className="grid gap-2 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="card block p-4 transition hover:border-gold/50"
          >
            <p className="text-sm font-bold">{section.label}</p>
            <p className="text-xs text-[var(--text-muted)]">{section.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
