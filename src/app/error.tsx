"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div>
        <p className="text-display text-7xl text-[#e5484d]">Ops</p>
        <h1 className="text-display mt-3 text-4xl">Algo deu errado</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-[var(--text-muted)]">
          Enfrentamos um cliffhanger técnico. Tente novamente — se persistir, volte para a home.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Tentar novamente
          </button>
          <Link href="/" className="btn btn-ghost">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
