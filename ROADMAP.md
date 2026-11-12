# Roadmap — Radar de Vagas

Legenda: `[x]` concluída e validada · `[~]` em andamento ou escrita sem validação · `[ ]` não iniciada.
O estado detalhado do momento fica em `docs/STATUS.md`. Cada etapa só fecha depois dos checkpoints de `docs/CHECKPOINTS.md`.

## Visão geral

| Etapa | Tema | Estado |
|---|---|---|
| E0 | Fundação: repositório, CI, Codespace, Neon de dev | [x] |
| E1 | Fila e agendamento no Postgres | [x] |
| E2 | Menor privilégio no banco (roles) | [ ] |
| E3 | Login com Google (OAuth + PKCE) e sessões | [~] |
| E4 | Consentimento versionado e exclusão de conta | [~] |
| E5 | Criptografia de envelope e armazenamento (R2) | [ ] |
| E6 | Upload e leitura de CV (dados fictícios) | [ ] |
| E7 | Revisão e confirmação do perfil | [ ] |
| E8 | Fontes de vagas, normalização e deduplicação | [ ] |
| E9 | Embeddings e match preliminar | [ ] |
| E10 | Explicação por IA com orçamento | [ ] |
| E11 | Feed e detalhe da vaga | [ ] |
| E12 | Vitrine pública (rascunho privado, publicar) | [ ] |
| E13 | Operação: backup, consumo, deploy, runbook | [ ] |

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

## E3 — Login com Google e sessões `[~]`
- **Situação:** código de `apps/auth`, `apps/web` e a migration `0002` estão em `main`, mas **sem revisão dos juízes e sem testes no CI**.
- **Entregas:** testes de `apps/auth` rodando no CI; revisão dos três juízes; correções; README do fluxo OAuth.
- **Aceite:** state inválido, code reutilizado, `aud`/`iss` errados e token expirado falham com 4xx; sessão revogada ou expirada não autentica; cookie `httpOnly`, `Secure`, `SameSite=Lax`; só o hash do token no banco; nenhum token do Google armazenado.
- **Ação do usuário:** criar o cliente OAuth no Google Cloud (escopos `openid email profile`), cadastrar redirect URIs e guardar o secret no Wrangler.
- **Pergunta de verificação:** que ataque o `state` evita, e que ataque o PKCE evita?

## E4 — Consentimento e exclusão de conta `[~]`
- **Situação:** tela de consentimento existe em `apps/web`; falta validar o fluxo completo.
- **Entregas:** versão do termo registrada; upload bloqueado enquanto `consent_pending`; exclusão real de conta e sessões.
- **Aceite:** teste cobre aceite, bloqueio sem aceite e exclusão com remoção dos dados.
- **Pergunta de verificação:** por que o consentimento de leitura do CV é separado do de publicação da vitrine?

## E5 — Criptografia de envelope e R2 `[ ]`
- **Objetivo:** arquivos cifrados pela aplicação antes de irem ao armazenamento.
- **Entregas:** chave por arquivo protegida por chave-mestra; rotação sem regravar arquivos; cliente R2 (S3-compatível) com implementação falsa para testes.
- **Aceite:** teste de ida e volta, teste de rotação, teste de falha com chave errada; chave-mestra nunca em log.
- **Ação do usuário:** criar o bucket de dev e guardar uma cópia offline da chave-mestra.
- **Pergunta de verificação:** o que se perde se a chave-mestra sumir, e o que a rotação protege?

## E6 — Upload e leitura de CV `[ ]`
- **Entregas:** validação de tipo real e tamanho; extração de texto nativo (PDF, DOCX, TXT); mascaramento de CPF, telefone, e-mail, endereço e data de nascimento antes de qualquer envio à IA; parser com schema validado, repetição limitada e confiança por campo; jobs assíncronos com estados visíveis.
- **Fora do escopo inicial:** OCR e antivírus (dependem de memória do runner, ainda não verificada).
- **Aceite:** suíte com CVs fictícios (simples, duas colunas, tabela, inglês); campos ausentes viram `null`; nenhum dado mascarado chega ao cliente de IA (teste com cliente falso).
- **Pergunta de verificação:** por que mascarar antes de enviar, e não depois de receber?

## E7 — Revisão do perfil `[ ]`
- **Entregas:** tela lado a lado (texto original e campos extraídos), destaque de baixa confiança, preferências, botão "Confirmar perfil".
- **Aceite:** nada alimenta o radar antes da confirmação.

## E8 — Fontes de vagas `[ ]`
- **Entregas:** interface `Connector`; conectores Remote OK e Greenhouse/Lever; normalização; deduplicação; campo de escopo de licença por fonte; retenção de 30 a 60 dias.
- **Antes de codar:** conferir os termos de cada fonte e registrar em `docs/DECISOES.md`.
- **Aceite:** testes com respostas gravadas fictícias; a mesma vaga em duas fontes vira um registro.
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

## E12 — Vitrine pública `[ ]`
- **Entregas:** rascunho privado, visibilidade por seção, publicar e despublicar, `noindex`, esquema público por lista de campos permitidos.
- **Aceite:** requisição anônima a perfil privado ou seção oculta não retorna dado nenhum (teste automatizado).

## E13 — Operação `[ ]`
- **Entregas:** `pg_dump` semanal cifrado para o R2 com teste de restauração; medição das horas de computação do Neon; deploy documentado; runbook de incidentes.

---

## Pendências transversais (não verificadas)
- Expiração do refresh token do Google no modo "Testing".
- Armazenamento do Neon Free (fontes divergem entre 0,5 GB e 1 GB) e consumo real de computação com ciclo de 15 minutos.
- Memória dos runners gratuitos do GitHub para embeddings.
- Termos de uso dos planos gratuitos (Cloudflare, Neon, R2, GitHub) antes de qualquer usuário externo.
- Conexão do Worker ao Neon dentro do limite de conexões do plano gratuito.
