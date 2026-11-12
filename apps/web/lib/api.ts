// URL do apps/auth (Worker). Em produção, idealmente no mesmo site (ex.: auth.seudominio),
// pois o cookie é SameSite=Lax.
export const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:8787";

export interface Session {
  id: string;
  email: string;
  name: string | null;
  consent_pending: boolean;
}

/** Retorna a sessão, ou null se não autenticado (401). */
export async function getSession(): Promise<Session | null> {
  const res = await fetch(`${AUTH_URL}/api/session`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`session ${res.status}`);
  return (await res.json()) as Session;
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${AUTH_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const acceptTerms = (version: string) => send("POST", "/api/consent", { version });
export const logout = () => send("POST", "/api/logout");
export const deleteAccount = () => send("DELETE", "/api/account", { confirm: "EXCLUIR" });
