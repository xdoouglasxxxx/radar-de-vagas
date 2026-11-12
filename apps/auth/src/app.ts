import { pkceChallenge, randomToken, safeEqual, sha256, toHex } from "./crypto";
import type { GoogleIdentity } from "./google";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Acesso ao banco injetável: Neon em produção, PGlite (Postgres em memória) nos testes. */
export interface Db {
  query(text: string, params?: unknown[]): Promise<Row[]>;
}

/** Provedor Google injetável: o real em produção, um simulado nos testes. */
export interface GoogleProvider {
  authorizationUrl(state: string, challenge: string): string;
  /** Troca o code (com PKCE) e valida o ID token. Lança em qualquer falha. */
  exchangeAndVerify(code: string, verifier: string): Promise<GoogleIdentity>;
}

export interface AppConfig {
  APP_ORIGIN: string; // única origem permitida (CORS) e destino do redirect pós-login
  TERMS_VERSION: string; // versão atual do termo de leitura do CV
}

const SESSION_COOKIE = "rv_session";
const OAUTH_COOKIE = "rv_oauth";
const SESSION_SECONDS = 14 * 24 * 3600;
const DELETE_CONFIRMATION = "EXCLUIR";

function cookie(name: string, value: string, maxAge: number, path = "/"): string {
  return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=${path}; Max-Age=${maxAge}`;
}

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export function createApp(cfg: AppConfig, db: Db, google: GoogleProvider) {
  async function currentUser(req: Request) {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return null;
    const rows = await db.query(
      `SELECT u.id, u.email, u.name, u.terms_version
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = decode($1, 'hex') AND s.revoked_at IS NULL AND s.expires_at > now()`,
      [toHex(await sha256(token))],
    );
    return rows[0] ?? null;
  }

  /** Defesa extra contra CSRF em métodos que alteram estado (além de SameSite=Lax). */
  const originOk = (req: Request) => req.headers.get("origin") === cfg.APP_ORIGIN;

  async function start(): Promise<Response> {
    const state = randomToken();
    const verifier = randomToken(48);
    return new Response(null, {
      status: 302,
      headers: {
        location: google.authorizationUrl(state, await pkceChallenge(verifier)),
        // httpOnly, curto (10 min), restrito ao caminho do callback
        "set-cookie": cookie(OAUTH_COOKIE, `${state}.${verifier}`, 600, "/auth/google"),
        "cache-control": "no-store",
      },
    });
  }

  async function callback(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const clear = cookie(OAUTH_COOKIE, "", 0, "/auth/google");
    const [state, verifier] = readCookie(req, OAUTH_COOKIE)?.split(".") ?? [];
    const code = url.searchParams.get("code");
    const qState = url.searchParams.get("state");
    if (!state || !verifier || !code || !qState || !safeEqual(state, qState)) {
      return json({ error: "invalid_state" }, 400, { "set-cookie": clear });
    }

    let identity: GoogleIdentity;
    try {
      identity = await google.exchangeAndVerify(code, verifier);
    } catch {
      // Sem detalhes na resposta nem nos logs (podem conter tokens).
      return json({ error: "login_failed" }, 401, { "set-cookie": clear });
    }

    const [user] = await db.query(
      `INSERT INTO users (google_sub, email, name) VALUES ($1, $2, $3)
       ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
       RETURNING id`,
      [identity.sub, identity.email, identity.name],
    );
    const token = randomToken();
    await db.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, decode($2, 'hex'), now() + make_interval(secs => $3))`,
      [user.id, toHex(await sha256(token)), SESSION_SECONDS],
    );

    const headers = new Headers({ location: `${cfg.APP_ORIGIN}/`, "cache-control": "no-store" });
    headers.append("set-cookie", cookie(SESSION_COOKIE, token, SESSION_SECONDS));
    headers.append("set-cookie", clear);
    return new Response(null, { status: 302, headers });
  }

  async function api(req: Request, pathname: string): Promise<Response> {
    const m = req.method;

    if (m === "GET" && pathname === "/api/session") {
      const u = await currentUser(req);
      if (!u) return json({ error: "unauthorized" }, 401);
      return json({
        id: u.id,
        email: u.email,
        name: u.name,
        consent_pending: u.terms_version !== cfg.TERMS_VERSION,
      });
    }

    if (m === "POST" && pathname === "/api/consent") {
      if (!originOk(req)) return json({ error: "forbidden" }, 403);
      const u = await currentUser(req);
      if (!u) return json({ error: "unauthorized" }, 401);
      const body = (await req.json().catch(() => null)) as { version?: string } | null;
      // O aceite precisa ser da versão ATUAL do termo.
      if (body?.version !== cfg.TERMS_VERSION) return json({ error: "version_mismatch" }, 400);
      await db.query("UPDATE users SET terms_version = $1, terms_accepted_at = now() WHERE id = $2", [
        cfg.TERMS_VERSION,
        u.id,
      ]);
      return json({ ok: true });
    }

    if (m === "POST" && pathname === "/api/logout") {
      if (!originOk(req)) return json({ error: "forbidden" }, 403);
      const token = readCookie(req, SESSION_COOKIE);
      if (token) {
        await db.query(
          "UPDATE sessions SET revoked_at = now() WHERE token_hash = decode($1, 'hex') AND revoked_at IS NULL",
          [toHex(await sha256(token))],
        );
      }
      return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, "", 0) });
    }

    if (m === "DELETE" && pathname === "/api/account") {
      if (!originOk(req)) return json({ error: "forbidden" }, 403);
      const u = await currentUser(req);
      if (!u) return json({ error: "unauthorized" }, 401);
      const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
      if (body?.confirm !== DELETE_CONFIRMATION) return json({ error: "confirmation_required" }, 400);
      // Remoção real: as sessões (e futuras tabelas com ON DELETE CASCADE) saem junto.
      // TODO(CV): ao existir upload, apagar também os objetos do R2 do usuário.
      await db.query("DELETE FROM users WHERE id = $1", [u.id]);
      return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, "", 0) });
    }

    return json({ error: "not_found" }, 404);
  }

  /** CORS: somente a origem do apps/web, sem curinga. */
  function withCors(req: Request, res: Response): Response {
    if (req.headers.get("origin") !== cfg.APP_ORIGIN) return res;
    const h = new Headers(res.headers);
    h.set("access-control-allow-origin", cfg.APP_ORIGIN);
    h.set("access-control-allow-credentials", "true");
    h.append("vary", "Origin");
    return new Response(res.body, { status: res.status, headers: h });
  }

  return async function handle(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);

    if (pathname.startsWith("/api/")) {
      if (req.method === "OPTIONS") {
        if (req.headers.get("origin") !== cfg.APP_ORIGIN) return new Response(null, { status: 403 });
        return withCors(
          req,
          new Response(null, {
            status: 204,
            headers: {
              "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
              "access-control-allow-headers": "content-type",
              "access-control-max-age": "600",
            },
          }),
        );
      }
      return withCors(req, await api(req, pathname));
    }
    if (req.method === "GET" && pathname === "/auth/google/start") return start();
    if (req.method === "GET" && pathname === "/auth/google/callback") return callback(req);
    return json({ error: "not_found" }, 404);
  };
}
