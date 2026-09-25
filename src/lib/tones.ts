/**
 * Cores compartilhadas entre cards e páginas de detalhe,
 * para badges e status serem idênticos em qualquer superfície.
 */
export const badgeTone: Record<string, string> = {
  NOVO: "bg-[#30a46c] text-white",
  "LANÇAMENTO": "bg-violet text-white",
  "PRÉ-VENDA": "bg-gold text-ink",
  EXCLUSIVO: "bg-ink text-gold",
  LIMITADO: "bg-[#e5484d] text-white",
  "BEST-SELLER": "bg-gold text-ink",
  ESGOTANDO: "bg-[#e5484d] text-white",
  OFERTA: "bg-[#e5484d] text-white",
  DIGITAL: "bg-violet text-white",
  "EDIÇÃO ESPECIAL": "bg-ink text-gold",
};

/** Pills de status da página de produto (borda + tom translúcido). */
export const statusTone = {
  ok: "border-[#30a46c]/40 bg-[#30a46c]/10 text-[#30a46c]",
  alert: "border-[#e5484d]/40 bg-[#e5484d]/10 text-[#e5484d]",
} as const;
