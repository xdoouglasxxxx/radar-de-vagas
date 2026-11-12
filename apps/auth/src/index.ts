import { neon } from "@neondatabase/serverless";
import { createApp, type Db } from "./app";
import { authorizationUrl, exchangeCode, verifyIdToken, type GoogleEnv } from "./google";

interface Env extends GoogleEnv {
  DATABASE_URL: string;
  APP_ORIGIN: string;
  TERMS_VERSION: string;
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const sql = neon(env.DATABASE_URL);
    const db: Db = { query: (text, params) => sql.query(text, params ?? []) as Promise<Record<string, any>[]> };
    const app = createApp(env, db, {
      authorizationUrl: (state, challenge) => authorizationUrl(env, state, challenge),
      exchangeAndVerify: async (code, verifier) =>
        verifyIdToken(await exchangeCode(env, code, verifier), env.GOOGLE_CLIENT_ID),
    });
    return app(req);
  },
} satisfies ExportedHandler<Env>;
