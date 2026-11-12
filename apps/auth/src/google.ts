import { b64urlDecode } from "./crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleEnv {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string | null;
}

export function authorizationUrl(env: GoogleEnv, state: string, challenge: string): string {
  const u = new URL(AUTH_URL);
  u.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile", // nenhum outro escopo
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return u.toString();
}

export async function exchangeCode(env: GoogleEnv, code: string, verifier: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`token endpoint ${res.status}`);
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("sem id_token");
  // access_token/refresh_token são ignorados e nunca armazenados.
  return data.id_token;
}

interface Jwk extends JsonWebKey {
  kid: string;
}
let jwksCache: { keys: Jwk[]; at: number } | null = null;

async function getKey(kid: string): Promise<CryptoKey> {
  const fresh = jwksCache && Date.now() - jwksCache.at < 3_600_000;
  if (!fresh || !jwksCache!.keys.some((k) => k.kid === kid)) {
    const res = await fetch(JWKS_URL);
    if (!res.ok) throw new Error("jwks indisponível");
    jwksCache = { keys: ((await res.json()) as { keys: Jwk[] }).keys, at: Date.now() };
  }
  const jwk = jwksCache!.keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error("kid desconhecido");
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

/** Valida assinatura (RS256), iss, aud, exp e email_verified. */
export async function verifyIdToken(
  idToken: string,
  clientId: string,
  now = Date.now() / 1000,
  keyLoader: (kid: string) => Promise<CryptoKey> = getKey,
): Promise<GoogleIdentity> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("jwt malformado");
  const [h, p, s] = parts;
  const dec = new TextDecoder();
  const header = JSON.parse(dec.decode(b64urlDecode(h))) as { alg: string; kid: string };
  if (header.alg !== "RS256") throw new Error("alg inválido");

  const key = await keyLoader(header.kid);
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlDecode(s),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!ok) throw new Error("assinatura inválida");

  const c = JSON.parse(dec.decode(b64urlDecode(p))) as Record<string, unknown>;
  if (!ISSUERS.includes(c.iss as string)) throw new Error("iss inválido");
  if (c.aud !== clientId) throw new Error("aud inválido");
  if (typeof c.exp !== "number" || c.exp <= now) throw new Error("token expirado");
  if (c.email_verified !== true) throw new Error("e-mail não verificado");
  if (typeof c.sub !== "string" || typeof c.email !== "string") throw new Error("claims ausentes");
  return { sub: c.sub, email: c.email, name: typeof c.name === "string" ? c.name : null };
}
