"use client";

import { useEffect, useState } from "react";
import { acceptTerms, getSession } from "../../lib/api";
import { TERMS_VERSION } from "../../lib/terms";

export default function Consentimento() {
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSession()
      .then((s) => {
        if (!s) return window.location.replace("/");
        if (!s.consent_pending) return window.location.replace("/");
        setReady(true);
      })
      .catch(() => setError("Não foi possível carregar. Tente novamente."));
  }, []);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await acceptTerms(TERMS_VERSION);
      if (!res.ok) throw new Error(String(res.status));
      window.location.replace("/");
    } catch {
      setError("Não foi possível registrar o aceite. Atualize a página e tente de novo.");
      setBusy(false);
    }
  }

  if (!ready) return error ? <p className="error">{error}</p> : <p className="muted">Carregando…</p>;

  return (
    <section className="card">
      <h1>Antes de enviar seu CV</h1>
      <p className="muted">
        Versão do termo: {TERMS_VERSION}. Texto em rascunho, sujeito a revisão jurídica antes de abrir a usuários externos.
      </p>
      <h2>O que lemos</h2>
      <p>Formação, experiência, habilidades, idiomas e localização (cidade/UF) do seu CV, para montar seu perfil e calcular o match com vagas.</p>
      <h2>O que descartamos</h2>
      <p>CPF, RG, data de nascimento, endereço completo e foto não são guardados.</p>
      <h2>Com quem compartilhamos</h2>
      <p>O texto do CV (já sem os dados descartados) é enviado à API do Claude (Anthropic) para extrair as informações. Armazenamos o arquivo e o perfil criptografados.</p>
      <h2>Seus direitos</h2>
      <p>Você pode exportar seus dados e excluir o CV ou a conta, com remoção real, quando quiser.</p>

      <label style={{ display: "block", margin: "1rem 0" }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> Li e aceito o termo de leitura do CV.
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={!agreed || busy} onClick={accept}>
        Aceitar e continuar
      </button>
    </section>
  );
}
