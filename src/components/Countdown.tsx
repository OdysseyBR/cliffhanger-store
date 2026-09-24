"use client";

import { useEffect, useState } from "react";
import { IconClock } from "@/components/Icons";

/** Contagem regressiva do banner (7.7 pré-venda / campanhas). */
export function Countdown({ target }: { target: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const diff = Date.parse(target) - Date.now();
      if (Number.isNaN(diff)) {
        setLabel(null);
        return;
      }
      if (diff <= 0) {
        setLabel("encerrado");
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setLabel(
        days > 0
          ? `${days}d ${hours}h ${minutes}min`
          : `${hours}h ${minutes}min ${seconds}s`,
      );
    };

    // primeiro cálculo asíncrono (evita setState síncrono no efeito)
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [target]);

  if (label === null) return null;

  return (
    <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-4 py-2 text-sm font-bold text-gold">
      <IconClock className="h-4 w-4" />
      {label === "encerrado" ? "Campanha encerrada" : `Termina em ${label}`}
    </p>
  );
}
