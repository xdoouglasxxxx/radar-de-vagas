"use client";

import { useEffect, useState } from "react";
import { AUTH_URL, getSession, logout, type Session } from "../lib/api";

type State = { status: "loading" } | { status: "anon" } | { status: "error" } | { status: "ok"; session: Session };

export default function Home() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    getSession()
      .then((session) => {
        if (!session) return setState({ status: "anon" });
        // Sem consentimento aceito, o upload não é liberado.
        if (session.consent_pending) return window.location.replace("/consentimento/");
        setState({ status: "ok", session });
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  if (state.status === "loading") return <p className="muted">Carregando…</p>;
  if (state.status === "error") return <p className="error">Não foi possível falar com o servidor. Tente novamente.</p>;

  if (state.status === "anon") {
    return (
      <section className="card">
        <h1>Radar de Vagas</h1>
        <p className="muted">Entre para montar seu perfil e receber vagas com match.</p>
        <a className="btn" href={`${AUTH_URL}/auth/google/start`}>
          Entrar com Google
        </a>
        <p className="muted">Pedimos apenas seu nome e e-mail. Não guardamos senha nem acessamos outros dados da sua conta Google.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>Olá, {state.session.name ?? state.session.email}</h1>
      <p className="muted">Consentimento registrado. O envio de CV será liberado na próxima etapa.</p>
      <button
        className="btn secondary"
        onClick={() => logout().then(() => window.location.replace("/"))}
      >
        Sair
      </button>
    </section>
  );
}
