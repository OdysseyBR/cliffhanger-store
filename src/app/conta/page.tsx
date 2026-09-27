"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import type { LibraryItem, Order, ReadingProgress } from "@/lib/types";

/**
 * §2 — Centro da Conta: dashboard pessoal (visão geral da relação com a
 * loja). Topo com avatar/nome/e-mail/Plus; resumos de coleção, digitais,
 * pedidos e wishlist; continuidade do último ebook/audiobook.
 */

interface LibraryPayload {
  items?: LibraryItem[];
  progress?: Record<string, ReadingProgress>;
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="card block p-4 transition hover:border-gold/50"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-lg font-bold text-gold">{value}</p>
    </Link>
  );
}

export default function ContaDashboardPage() {
  const { user, wishlist } = useStore();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [progress, setProgress] = useState<Record<string, ReadingProgress>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [libraryRes, ordersRes] = await Promise.all([
          fetch("/api/library", { headers }),
          fetch("/api/orders/mine", { headers }),
        ]);
        if (libraryRes.ok) {
          const data = (await libraryRes.json()) as LibraryPayload;
          setItems(data.items ?? []);
          setProgress(data.progress ?? {});
        }
        if (ordersRes.ok) {
          const data = (await ordersRes.json()) as { orders?: Order[] };
          setOrders(data.orders ?? []);
        }
      } catch {
        /* offline — resumos ficam zerados */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  const ebooks = items.filter((item) => item.type === "ebook").length;
  const audiobooks = items.filter((item) => item.type === "audiobook").length;

  const progressList = Object.values(progress);
  const last = progressList.sort((a, b) =>
    String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
  )[0];
  const lastItem = last ? items.find((item) => item.productId === last.productId) : undefined;

  const initials = (user.displayName ?? user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-violet text-xl font-extrabold text-white">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-bold">{user.displayName ?? "Leitor(a)"}</p>
          <p className="truncate text-sm text-[var(--text-muted)]">{user.email}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Cliffhanger+ não assinado —{" "}
            <Link href="/conta/cliffhanger-plus" className="text-gold underline">
              conhecer planos
            </Link>
          </p>
        </div>
        <Link href="/conta/perfil" className="btn btn-ghost px-4 py-2 text-xs">
          Editar perfil
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando seus resumos…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="E-books" value={String(ebooks)} href="/conta/biblioteca" />
            <Stat label="Audiobooks" value={String(audiobooks)} href="/conta/biblioteca" />
            <Stat label="Pedidos" value={String(orders.length)} href="/conta/pedidos" />
            <Stat label="Wishlist" value={String(wishlist.length)} href="/conta/wishlist" />
          </div>

          {last && lastItem && (
            <div className="card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Continue de onde parou
                </p>
                <p className="truncate font-bold text-gold">{lastItem.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[var(--surface-raised)]">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${Math.max(0, Math.min(100, last.percent))}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{last.percent}%</span>
                </div>
              </div>
              <Link
                href={
                  lastItem.type === "audiobook"
                    ? `/biblioteca/audiobook/${lastItem.productId}`
                    : `/biblioteca/leitor/${lastItem.productId}`
                }
                className="btn btn-primary px-4 py-2 text-xs"
              >
                Continuar
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
