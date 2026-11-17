# Roadmap — Radar de Vagas

Legenda: `[x]` concluída e validada · `[~]` em andamento ou escrita sem validação · `[ ]` não iniciada.
O estado detalhado do momento fica em `docs/STATUS.md`. Cada etapa só fecha depois dos checkpoints de `docs/CHECKPOINTS.md`.

## Visão geral

| Etapa | Tema | Estado | Caminho |
|---|---|---|---|
| E0 | Fundação: repositório, CI, Codespace, Neon de dev | [x] | Mínimo |
| E1 | Fila e agendamento no Postgres | [x] | Mínimo |
| E2 | Menor privilégio no banco (roles; atenção: da E5 em diante o worker lida com CV real usando a credencial do dono do banco) | [ ] | Recomendado |
| E3a | Login Google restrito ao dono; sem consentimento; apagar meus dados | [~] | Mínimo |
| E3b | CI do TypeScript, lockfiles e correções de testes dos juízes | [ ] | Mínimo |
| E4 | Mesma origem: um Worker serve o site estático e a API | [ ] | Mínimo |
| E5 | Criptografia de envelope e armazenamento (R2) | [ ] | Mínimo |
| E6 | Upload e leitura de CV (testes com dados fictícios) | [ ] | Mínimo |
| E7 | Revisão e confirmação do perfil | [ ] | Mínimo |
| E8 | Fontes de vagas, normalização e deduplicação | [ ] | Mínimo |
| E9 | Embeddings e match preliminar | [ ] | Mínimo |
| E10 | Explicação por IA com orçamento | [ ] | Recomendado |
| E11 | Feed e detalhe da vaga | [ ] | Mínimo |
| E13 | Operação: backup, consumo, deploy, runbook | [ ] | Recomendado |
| E12 | Vitrine pública (opcional, por último) | [ ] | Opcional |

**Caminho mínimo até "radar funcionando para mim":** E3a, E3b, E4, E5, E6, E7, E8, E9 e E11 (E0 e E1 já feitas). **Recomendado:** E2 (roles), E10 (explicação por IA; sem ela o feed usa só o score preliminar) e E13 (backup e runbook). **Opcional:** E12. Nada foi cortado: a marcação só ordena a prioridade, e a ordem de execução continua sendo a do `docs/STATUS.md`.


---

## E0 — Fundação `[x]`
- **Entregas:** repositório público, `.gitignore`, CI (`ci.yml`), Codespace, projeto Neon `radar-dev`, secrets de Codespaces e de Actions.
- **Aceite:** CI verde em `main`.

## E1 — Fila e agendamento `[x]`
- **Entregas:** migration `0001`, `queue.py`, `scheduler.py`, `main.py` (`--once`, `--migrate`), 8 testes.
- **Aceite:** 8 testes passando no Codespace e no CI, sem testes pulados (commit `adaa65b`).
- **Pergunta de verificação:** por que `FOR UPDATE SKIP LOCKED` impede dois workers de pegarem o mesmo job?

## E2 — Menor privilégio no banco `[ ]`
- **Objetivo:** o worker deixa de usar o dono do banco.
- **Entregas:** script SQL documentado para os roles `radar_migrator` (migrations) e `radar_worker` (leitura e escrita só nas tabelas que usa); README explicando qual role cada secret usa.
- **Aceite:** `--once` funciona com `radar_worker`; `DROP TABLE` com `radar_worker` falha; nenhuma senha no repositório.
- **Ação do usuário:** criar os roles no Neon e atualizar os secrets.
- **Pergunta de verificação:** o que um invasor conseguiria fazer com a senha de cada role?

## E3a — Login restrito ao dono `[~]`
- **Mudança (D18, D19):** uso pessoal. Só o e-mail do dono entra (allowlist em variável do Wrangler). Consentimento versionado e termos saem do fluxo; as colunas `terms_*` ficam sem uso (não há `DROP COLUMN`).
- **Entregas:**
  - allowlist de um e-mail no callback (qualquer outro recebe 403 e nenhuma linha é criada em `users`). Regras: só vale com `email_verified` verdadeiro; comparação sem diferenciar maiúsculas e minúsculas; o e-mail vem de variável do Wrangler (segredo), nunca de `wrangler.toml`, testes ou README (repositório público, D14);
  - remover `consent_pending`, `/api/consent`, a tela de consentimento e as referências a `terms_*` no código (a migration `0002` não muda e nenhuma coluna nova é criada);
  - tela e rota de "apagar meus dados" (exclusão real, com confirmação); a E5 estende a exclusão aos objetos e chaves do R2.
- **Aceite:** state inválido, code reutilizado, `aud`/`iss` errados e token expirado falham com 4xx; e-mail fora da allowlist e `email_verified=false` recebem 403 sem criar usuário (testes); sessão revogada ou expirada não autentica; cookie `httpOnly`, `Secure`, `SameSite=Lax`; só o hash do token no banco; nenhum token do Google armazenado.
- **Ação do usuário:** criar o cliente OAuth no Google Cloud (escopos `openid email profile`), cadastrar redirect URIs, guardar o secret e o e-mail permitido no Wrangler.
- **Pergunta de verificação:** que ataque o `state` evita, e que ataque o PKCE evita?

## E3b — CI do TypeScript e correções de testes `[ ]`
- **Entregas:**
  - job de CI para `apps/auth` e `apps/web` (`typecheck`, testes, `next build`), com `package-lock.json` e `npm ci`;
  - testes dos juízes: hash exato do token, atributos do cookie e consistência do `state` em `start`, `verifyIdToken` (alg diferente de RS256, kid desconhecido, malformado, claims ausentes, mensagens específicas), reentrada do mesmo usuário, login após exclusão, `Max-Age=0` no logout, PKCE com verifier errado;
  - `readFileSync` no lugar de `?raw`; PGlite criado uma vez; `engines` Node 20+;
  - tratar falha do banco no callback e `?error=` do Google; `Vary: Origin` sempre; `no-store` no preflight;
  - limpeza de sessões expiradas ou revogadas (job do worker, `DELETE` com `WHERE`, em migration ou handler revisado) e índice em `expires_at`;
  - README do fluxo OAuth com a resposta da pergunta de verificação.
- **Aceite:** CI verde com os testes do TypeScript, sem testes pulados.

## E4 — Mesma origem `[ ]`
- **Objetivo (D20):** o cookie `SameSite=Lax` funcionar em produção sem domínio próprio.
- **Entregas:** `apps/auth` passa a servir o site estático de `apps/web` (Workers Static Assets) e as rotas `/auth/*` e `/api/*` na mesma origem; CORS deixa de ser necessário; CSP final sem placeholder; `[env.production]` explícito no `wrangler.toml`; falha de build se faltar `NEXT_PUBLIC_AUTH_URL` (ou URL relativa).
- **Aceite:** teste de roteamento (estático vs API); tamanho do bundle (3 MiB) medido; as rotas de API não fazem trabalho pesado e os arquivos estáticos não passam pelo código do Worker (10 ms de CPU).
- **Riscos não verificados:** limites e suporte dos assets do Workers Static Assets no plano gratuito; limite de conexões do Neon com login e API num só Worker (verificar antes da E4). Plano de reversão: `wrangler rollback` (não verificado).
- **Ação do usuário:** `wrangler deploy`, definir a allowlist e os secrets no Wrangler e conferência do login no navegador (nenhum juiz consegue verificar).
- **Pergunta de verificação:** por que o cookie não era enviado entre `pages.dev` e `workers.dev`?

## E5 — Criptografia de envelope e R2 `[ ]`
- **Objetivo:** arquivos cifrados pela aplicação antes de irem ao armazenamento.
- **Entregas:** chave por arquivo protegida por chave-mestra; rotação sem regravar arquivos; cliente R2 (S3-compatível) com implementação falsa para testes.
- **Aceite:** teste de ida e volta, teste de rotação, teste de falha com chave errada; chave-mestra nunca em log; "apagar meus dados" remove os objetos e as chaves do R2.
- **Ação do usuário:** criar o bucket de dev e guardar uma cópia offline da chave-mestra.
- **Pergunta de verificação:** o que se perde se a chave-mestra sumir, e o que a rotação protege?

## E6 — Upload e leitura de CV `[ ]`
- **Mudança (D19):** sem tela de consentimento; o upload exige sessão do dono (e-mail da allowlist), com teste para usuário fora dela.
- **Entregas:** validação de tipo real e tamanho; extração de texto nativo (PDF, DOCX, TXT); mascaramento de CPF, telefone, e-mail, endereço e data de nascimento antes de qualquer envio à IA (mantido: reduz o que sai para a API); parser com schema validado, repetição limitada e confiança por campo; jobs assíncronos com estados visíveis.
- **Fora do escopo inicial:** OCR e antivírus (dependem de memória do runner, ainda não verificada).
- **Aceite:** suíte com CVs fictícios (simples, duas colunas, tabela, inglês); campos ausentes viram `null`; nenhum dado mascarado chega ao cliente de IA (teste com cliente falso).
- **Pergunta de verificação:** por que mascarar antes de enviar, e não depois de receber?

## E7 — Revisão do perfil `[ ]`
- **Entregas:** tela lado a lado (texto original e campos extraídos), destaque de baixa confiança, preferências, botão "Confirmar perfil".
- **Aceite:** nada alimenta o radar antes da confirmação.

## E8 — Fontes de vagas `[ ]`
- **Entregas:** interface `Connector`; conectores Adzuna (D13, uso pessoal; atribuição visível), Remote OK e Greenhouse/Lever; normalização; deduplicação; campo de escopo de licença por fonte; retenção de 30 a 60 dias.
- **Antes de codar:** conferir os termos de cada fonte e registrar em `docs/DECISOES.md`.
- **Aceite:** testes com respostas gravadas fictícias; a mesma vaga em duas fontes vira um registro; nenhum campo da Adzuna chega ao esquema público (usa o escopo de licença por fonte).
- **Atenção:** a tabela de vagas não pode se chamar `jobs` (nome já usado pela fila).

## E9 — Embeddings e match preliminar `[ ]`
- **Pendência de decisão:** onde o modelo de embeddings roda (memória dos runners gratuitos não verificada).
- **Entregas:** embeddings de perfil e de vagas, filtros eliminatórios, score ponderado, sem IA generativa.
- **Aceite:** teste determinístico de ordenação com dados fictícios; consumo de armazenamento medido.

## E10 — Explicação por IA com orçamento `[ ]`
- **Entregas:** top N, score mínimo, orçamento por ciclo, teto diário e mensal, cache por hash (perfil + vaga), fallback para o score preliminar.
- **Aceite:** teste prova que o orçamento nunca é ultrapassado e que o feed funciona com a IA indisponível.

## E11 — Feed e detalhe `[ ]`
- **Entregas:** páginas estáticas que leem a API; faixas ≥85 / 70–84 / 50–69; estados vazio e carregando.

## E12 — Vitrine pública `[ ]` (opcional, por último)
- **Decisão (D23):** não é necessária para o radar funcionar. Só será feita se o dono decidir publicar, depois das demais etapas. Nenhum dado do CV do dono entra no repositório.
- **Entregas (se for feita):** rascunho privado, visibilidade por seção, publicar e despublicar, `noindex`, esquema público por lista de campos permitidos, PDF por folha de impressão e **um único link de contato** (LinkedIn ou e-mail) que o dono escolhe na hora. Sem formulário, captcha, denúncia nem serviço externo.
- **Aceite:** requisição anônima a perfil privado ou seção oculta não retorna dado nenhum (teste automatizado); e-mail e telefone mascarados por padrão; nenhum campo da Adzuna no esquema público (D13).

## E13 — Operação `[ ]`
- **Entregas:** `pg_dump` semanal cifrado para o R2 com teste de restauração; medição das horas de computação do Neon; deploy documentado; runbook de incidentes.

---

## Pendências transversais (não verificadas)
- Expiração do refresh token do Google no modo "Testing".
- Armazenamento do Neon Free (fontes divergem entre 0,5 GB e 1 GB) e consumo real de computação com ciclo de 15 minutos.
- Memória dos runners gratuitos do GitHub para embeddings.
- Termos de uso dos planos gratuitos (Cloudflare, Neon, R2, GitHub) antes de qualquer usuário externo.
- Conexão do Worker ao Neon dentro do limite de conexões do plano gratuito.

## Fora de escopo (uso pessoal, D18)
Plano freemium, cotas por plano, paywall e lista "quero assinar"; cursos com afiliados; termos de uso e revisão jurídica para terceiros; métricas de produto; múltiplos usuários. Reabrir só se o projeto deixar de ser pessoal (gatilho de revisão em `docs/DECISOES.md`).
