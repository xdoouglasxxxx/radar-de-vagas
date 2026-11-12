// Fluxo completo com Google SIMULADO (nenhuma chamada de rede) e Postgres real em memória (PGlite).
// Todos os dados abaixo são fictícios.
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import migration from "../../../db/migrations/0002_users_and_sessions.sql?raw";
import { createApp, type Db, type GoogleProvider } from "../src/app";
import { pkceChallenge, randomToken } from "../src/crypto";
import type { GoogleIdentity } from "../src/google";

const ORIGIN = "https://app.test";
const TERMS = "termo-v1";
const BASE = "https://auth.test";
const PERSON: GoogleIdentity = { sub: "sub-1", email: "fulana@example.test", name: "Fulana Teste" };

function fakeGoogle() {
  const challenges = new Map<string, string>(); // state -> code_challenge
  const codes = new Map<string, { identity: GoogleIdentity; challenge: string }>();
  const provider: GoogleProvider = {
    authorizationUrl(state, challenge) {
      challenges.set(state, challenge);
      return `https://google.test/auth?state=${state}`;
    },
    async exchangeAndVerify(code, verifier) {
      const entry = codes.get(code);
      if (!entry) throw new Error("invalid_grant"); // code inexistente ou já usado
      codes.delete(code); // uso único
      if ((await pkceChallenge(verifier)) !== entry.challenge) throw new Error("pkce");
      return entry.identity;
    },
  };
  const issue = (state: string, identity: GoogleIdentity = PERSON) => {
    const code = randomToken();
    codes.set(code, { identity, challenge: challenges.get(state)! });
    return code;
  };
  return { provider, issue };
}

let pg: PGlite;
let db: Db;
let google: ReturnType<typeof fakeGoogle>;
let app: (r: Request) => Promise<Response>;

beforeEach(async () => {
  pg = new PGlite();
  await pg.exec(migration);
  db = { query: async (t, p) => (await pg.query(t, p as unknown[])).rows as Record<string, any>[] };
  google = fakeGoogle();
  app = createApp({ APP_ORIGIN: ORIGIN, TERMS_VERSION: TERMS }, db, google.provider);
});

const cookieValue = (res: Response, name: string) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith(`${name}=`));

async function begin() {
  const res = await app(new Request(`${BASE}/auth/google/start`));
  const state = new URL(res.headers.get("location")!).searchParams.get("state")!;
  return { res, state, oauthCookie: cookieValue(res, "rv_oauth")! };
}

async function login(identity = PERSON) {
  const { state, oauthCookie } = await begin();
  const code = google.issue(state, identity);
  const res = await app(
    new Request(`${BASE}/auth/google/callback?code=${code}&state=${state}`, {
      headers: { cookie: oauthCookie },
    }),
  );
  return { res, session: cookieValue(res, "rv_session")! };
}

const call = (method: string, path: string, session?: string, body?: unknown, origin = ORIGIN) =>
  app(
    new Request(`${BASE}${path}`, {
      method,
      headers: { ...(session ? { cookie: session } : {}), origin, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

describe("fluxo de login", () => {
  it("start: redireciona com PKCE e guarda state em cookie httpOnly curto", async () => {
    const { res } = await begin();
    expect(res.status).toBe(302);
    const setCookie = res.headers.getSetCookie()[0];
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Max-Age=600/);
  });

  it("callback cria sessão; /api/session devolve usuário com consent_pending", async () => {
    const { res, session } = await login();
    expect(res.status).toBe(302);
    const cookieHeader = res.headers.getSetCookie().find((c) => c.startsWith("rv_session="))!;
    expect(cookieHeader).toMatch(/HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=1209600/);

    const s = await call("GET", "/api/session", session);
    expect(s.status).toBe(200);
    expect(s.headers.get("cache-control")).toBe("no-store");
    const body = (await s.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ email: PERSON.email, name: PERSON.name, consent_pending: true });
  });

  it("no banco guarda só o hash do token (nunca o token)", async () => {
    const { session } = await login();
    const token = session.split("=")[1];
    const rows = (await pg.query("SELECT encode(token_hash, 'hex') AS h FROM sessions")).rows as { h: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].h).not.toContain(token);
    expect(rows[0].h).toHaveLength(64);
  });

  it("sem sessão: 401", async () => {
    expect((await call("GET", "/api/session")).status).toBe(401);
  });
});

describe("falhas de login retornam 4xx", () => {
  it("state inválido", async () => {
    const { state, oauthCookie } = await begin();
    const code = google.issue(state);
    const res = await app(
      new Request(`${BASE}/auth/google/callback?code=${code}&state=outro`, { headers: { cookie: oauthCookie } }),
    );
    expect(res.status).toBe(400);
    expect(cookieValue(res, "rv_session")).toBeUndefined();
  });

  it("sem cookie de state", async () => {
    const { state } = await begin();
    const code = google.issue(state);
    const res = await app(new Request(`${BASE}/auth/google/callback?code=${code}&state=${state}`));
    expect(res.status).toBe(400);
  });

  it("code reutilizado", async () => {
    const { state, oauthCookie } = await begin();
    const code = google.issue(state);
    const url = `${BASE}/auth/google/callback?code=${code}&state=${state}`;
    expect((await app(new Request(url, { headers: { cookie: oauthCookie } }))).status).toBe(302);
    const second = await app(new Request(url, { headers: { cookie: oauthCookie } }));
    expect(second.status).toBe(401);
  });

  it("falha do provedor (aud/iss errados ou token expirado) vira 401 sem sessão", async () => {
    // A validação de aud, iss, exp e assinatura é testada em auth.test.ts (verifyIdToken).
    const failing: GoogleProvider = {
      authorizationUrl: google.provider.authorizationUrl,
      exchangeAndVerify: async () => {
        throw new Error("aud inválido");
      },
    };
    const a = createApp({ APP_ORIGIN: ORIGIN, TERMS_VERSION: TERMS }, db, failing);
    const start = await a(new Request(`${BASE}/auth/google/start`));
    const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
    const res = await a(
      new Request(`${BASE}/auth/google/callback?code=x&state=${state}`, {
        headers: { cookie: cookieValue(start, "rv_oauth")! },
      }),
    );
    expect(res.status).toBe(401);
    expect(cookieValue(res, "rv_session")).toBeUndefined();
    expect(await res.text()).not.toContain("aud");
  });
});

describe("sessão", () => {
  it("logout revoga: a sessão deixa de autenticar", async () => {
    const { session } = await login();
    expect((await call("POST", "/api/logout", session)).status).toBe(200);
    expect((await call("GET", "/api/session", session)).status).toBe(401);
  });

  it("sessão expirada não autentica", async () => {
    const { session } = await login();
    await pg.exec("UPDATE sessions SET expires_at = now() - interval '1 second'");
    expect((await call("GET", "/api/session", session)).status).toBe(401);
  });

  it("expiração absoluta de 14 dias", async () => {
    await login();
    const r = (await pg.query(
      "SELECT extract(epoch FROM (expires_at - created_at)) AS s FROM sessions",
    )).rows as { s: number }[];
    expect(Math.round(Number(r[0].s) / 86400)).toBe(14);
  });

  it("logout/consent/delete exigem a origem do front (CSRF)", async () => {
    const { session } = await login();
    expect((await call("POST", "/api/logout", session, undefined, "https://evil.test")).status).toBe(403);
    expect((await call("POST", "/api/consent", session, { version: TERMS }, "https://evil.test")).status).toBe(403);
    expect((await call("DELETE", "/api/account", session, { confirm: "EXCLUIR" }, "https://evil.test")).status).toBe(403);
    expect((await call("GET", "/api/session", session)).status).toBe(200);
  });
});

describe("consentimento", () => {
  it("aceite grava versão/data e limpa consent_pending", async () => {
    const { session } = await login();
    expect((await call("POST", "/api/consent", session, { version: TERMS })).status).toBe(200);
    const body = (await (await call("GET", "/api/session", session)).json()) as Record<string, unknown>;
    expect(body.consent_pending).toBe(false);
    const u = (await pg.query("SELECT terms_version, terms_accepted_at FROM users")).rows[0] as Record<string, unknown>;
    expect(u.terms_version).toBe(TERMS);
    expect(u.terms_accepted_at).not.toBeNull();
  });

  it("versão desatualizada é recusada", async () => {
    const { session } = await login();
    expect((await call("POST", "/api/consent", session, { version: "antigo" })).status).toBe(400);
  });

  it("nova versão do termo volta a exigir consentimento", async () => {
    const { session } = await login();
    await call("POST", "/api/consent", session, { version: TERMS });
    const v2 = createApp({ APP_ORIGIN: ORIGIN, TERMS_VERSION: "termo-v2" }, db, google.provider);
    const res = await v2(new Request(`${BASE}/api/session`, { headers: { cookie: session } }));
    expect(((await res.json()) as Record<string, unknown>).consent_pending).toBe(true);
  });

  it("sem sessão: 401", async () => {
    expect((await call("POST", "/api/consent", undefined, { version: TERMS })).status).toBe(401);
  });
});

describe("exclusão de conta", () => {
  it("exige confirmação no corpo", async () => {
    const { session } = await login();
    expect((await call("DELETE", "/api/account", session, {})).status).toBe(400);
    expect((await call("GET", "/api/session", session)).status).toBe(200);
  });

  it("remove usuário e sessões e invalida o cookie", async () => {
    const { session } = await login();
    await login(); // segunda sessão do mesmo usuário
    expect((await call("DELETE", "/api/account", session, { confirm: "EXCLUIR" })).status).toBe(200);
    expect(((await pg.query("SELECT count(*)::int AS n FROM users")).rows[0] as { n: number }).n).toBe(0);
    expect(((await pg.query("SELECT count(*)::int AS n FROM sessions")).rows[0] as { n: number }).n).toBe(0);
    expect((await call("GET", "/api/session", session)).status).toBe(401);
  });

  it("não afeta outros usuários", async () => {
    const { session } = await login();
    const other = await login({ sub: "sub-2", email: "outro@example.test", name: null });
    await call("DELETE", "/api/account", session, { confirm: "EXCLUIR" });
    expect((await call("GET", "/api/session", other.session)).status).toBe(200);
  });

  it("sem sessão: 401", async () => {
    expect((await call("DELETE", "/api/account", undefined, { confirm: "EXCLUIR" })).status).toBe(401);
  });
});

describe("CORS", () => {
  it("só a origem do front, sem curinga, com credenciais", async () => {
    const ok = await call("GET", "/api/session");
    expect(ok.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(ok.headers.get("access-control-allow-credentials")).toBe("true");
    const bad = await call("GET", "/api/session", undefined, undefined, "https://evil.test");
    expect(bad.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("preflight: permitido para a origem do front, 403 para outras", async () => {
    const pre = (origin: string) =>
      app(new Request(`${BASE}/api/account`, { method: "OPTIONS", headers: { origin } }));
    expect((await pre(ORIGIN)).status).toBe(204);
    expect((await pre("https://evil.test")).status).toBe(403);
  });

  it("todas as respostas de /api/* têm Cache-Control: no-store", async () => {
    for (const [m, p] of [["GET", "/api/session"], ["POST", "/api/logout"], ["GET", "/api/nada"]]) {
      expect((await call(m, p)).headers.get("cache-control")).toBe("no-store");
    }
  });
});
