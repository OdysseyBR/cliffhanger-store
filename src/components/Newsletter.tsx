"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "@/components/Providers";

/** Newsletter da Home (seção 3.6). */
export function Newsletter() {
  const { notify } = useStore();
  const [email, setEmail] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.includes("@")) {
      notify("Informe um e-mail válido", "error");
      return;
    }
    notify("Inscrição confirmada — até logo na brisa!", "success");
    setEmail("");
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-display text-3xl">Newsletter Cliffhanger</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Lançamentos, pré-vendas e ofertas — sem spam, só história.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full gap-2 sm:max-w-md">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="field"
            aria-label="E-mail para newsletter"
          />
          <button type="submit" className="btn btn-accent">
            Inscrever
          </button>
        </form>
      </div>
    </section>
  );
}
