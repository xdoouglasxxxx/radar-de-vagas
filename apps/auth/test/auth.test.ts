import { describe, expect, it } from "vitest";
import { b64url, pkceChallenge, safeEqual, sha256, toHex } from "../src/crypto";
import { verifyIdToken } from "../src/google";

const CLIENT = "client-id";

async function makeToken(claims: Record<string, unknown>, tamper = false) {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const h = enc({ alg: "RS256", kid: "k1" });
  const p = enc(claims);
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${h}.${p}`)),
  );
  if (tamper) sig[0] ^= 1;
  return { token: `${h}.${p}.${b64url(sig)}`, loader: async () => pair.publicKey };
}

const good = () => ({
  iss: "https://accounts.google.com",
  aud: CLIENT,
  exp: Math.floor(Date.now() / 1000) + 600,
  email_verified: true,
  sub: "123",
  email: "a@example.com",
  name: "Fulana Teste",
});

describe("crypto", () => {
  it("PKCE S256 bate com o vetor da RFC 7636", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
  it("hash de sessão é SHA-256 em hex", async () => {
    expect(toHex(await sha256("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("safeEqual", () => {
    expect(safeEqual("a", "a")).toBe(true);
    expect(safeEqual("a", "b")).toBe(false);
    expect(safeEqual("a", "ab")).toBe(false);
  });
});

describe("verifyIdToken", () => {
  it("aceita token válido", async () => {
    const { token, loader } = await makeToken(good());
    const id = await verifyIdToken(token, CLIENT, undefined, loader);
    expect(id.sub).toBe("123");
  });
  it.each([
    ["assinatura adulterada", {}, true],
    ["aud errado", { aud: "outro" }, false],
    ["iss errado", { iss: "https://evil.example" }, false],
    ["expirado", { exp: 1 }, false],
    ["e-mail não verificado", { email_verified: false }, false],
  ])("rejeita %s", async (_n, override, tamper) => {
    const { token, loader } = await makeToken({ ...good(), ...override }, tamper as boolean);
    await expect(verifyIdToken(token, CLIENT, undefined, loader)).rejects.toThrow();
  });
});
