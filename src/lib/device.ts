/**
 * Dispositivo e sessões (Doc Mestre 9.5) — código compartilhado entre
 * `Providers` (registro automático no login) e o `SecuritySection`
 * (lista de dispositivos). O `sid` é estável por navegador
 * (`ch:sid`) e a API grava o registry em `users/{uid}/sessions/{sid}`.
 */
import { getClientAuth } from "@/lib/firebase";

const SID_KEY = "ch:sid";
const SID_AT_KEY = "ch:sid:at";
const THROTTLE_MS = 5 * 60_000;

export interface AccountSession {
  sid: string;
  device: string;
  /** IP mascrado no servidor (189.42.*.*) */
  ip: string;
  firstSeen: string;
  lastSeen: string;
}

/** Id estável deste navegador (gerado uma vez, persistido no localStorage). */
export function getSid(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(SID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(SID_KEY, generated);
    return generated;
  } catch {
    // storage indisponível (modo privado) — sid volátil desta página
    return "ephemeral";
  }
}

/** Rótulo amigável do dispositivo atual (navegador + SO). */
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "outro sistema";
  return `${browser} em ${os}`;
}

/** Bearer do usuário logado, ou null. */
async function bearer(): Promise<string | null> {
  const token = await getClientAuth()?.currentUser?.getIdToken();
  return token ?? null;
}

/**
 * Registra/atualiza a sessão deste dispositivo — throttled no cliente
 * (5 min em `ch:sid:at`) para não bater na API a cada visita. Melhor
 * esforço: falha silenciosa (sem Admin configurado a API responde 503).
 */
export async function registerSession(): Promise<void> {
  const sid = getSid();
  if (!sid) return;
  try {
    const last = Number(window.localStorage.getItem(SID_AT_KEY) ?? "0");
    if (Number.isFinite(last) && Date.now() - last < THROTTLE_MS) return;
  } catch {
    /* sem storage — segue para o registro */
  }

  const token = await bearer();
  if (!token) return;
  try {
    const res = await fetch("/api/account/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sid, device: deviceLabel() }),
    });
    if (res.ok) {
      try {
        window.localStorage.setItem(SID_AT_KEY, String(Date.now()));
      } catch {
        /* melhor esforço */
      }
    }
  } catch {
    /* offline — tenta na próxima visita */
  }
}

/** Lista as sessões do usuário (null quando a API falha/503). */
export async function loadSessions(): Promise<AccountSession[] | null> {
  const token = await bearer();
  if (!token) return null;
  try {
    const res = await fetch("/api/account/sessions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sessions?: AccountSession[] };
    return Array.isArray(data.sessions) ? data.sessions : [];
  } catch {
    return null;
  }
}

/** Sai apenas deste dispositivo (apaga o registro no logout). */
export async function leaveSession(): Promise<void> {
  const sid = getSid();
  if (!sid) return;
  const token = await bearer();
  if (!token) return;
  try {
    await fetch(`/api/account/sessions?sid=${encodeURIComponent(sid)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    resetSessionClock();
  } catch {
    /* melhor esforço — o registro envelhece sozinho */
  }
}

/** Zera o throttle para a próxima visita registrar de novo (logout/exclusão). */
export function resetSessionClock(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SID_AT_KEY);
  } catch {
    /* melhor esforço */
  }
}
