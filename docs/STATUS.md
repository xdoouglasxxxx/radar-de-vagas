# Onde estamos

Atualizado em: 2026-11-17

## Agora
- **Etapa atual:** CI-TS (`chore/ci-typescript`), depois E3a. Projeto de uso pessoal (D18 a D29).
- **Último commit validado:** `adaa65b` (E1: 8 testes passando no Codespace e no CI).
- **Situação:** `/checkpoint` feito em 2026-11-16 (segurança e escopo: aprovado com ressalvas; qualidade: reprovado). Os testes de `apps/auth` rodaram pela primeira vez no Codespace com Node 24 e as dependências já atualizadas (`vitest` 4): 32 passaram (23 em `app.test.ts` e 9 em `auth.test.ts`). No web, `typecheck` e `build` passaram. O `typecheck` do auth acusou 2 erros em `test/auth.test.ts`, corrigidos na `chore/ci-typescript`; a correção e os jobs novos do CI ainda não foram executados. Os 8 testes de banco da fila (E1) passaram no Codespace e no CI, commit `adaa65b`. Decisões registradas nas D23 a D29.

## Próxima ação
1. `/checkpoint` da E3 feito em 2026-11-16: segurança e escopo aprovaram com ressalvas; qualidade reprovou (cookie entre sites e testes fracos). Achados incorporados à E3 e à E4 do ROADMAP.
2. CI-TS (`chore/ci-typescript`), depois E3a (plano aprovado em 2026-11-16, com ajustes), E3b e E4.
3. Novo `/checkpoint` e pull request.

## Bloqueios e ações do usuário
- CI-TS: rodar `npm run typecheck` do auth no Codespace (ou ver o CI do pull request) para confirmar a correção; recriar o container do Codespace para o Node 24 do devcontainer valer; incluir os jobs `auth` e `web` nos checks obrigatórios da proteção da `main` (o `audit` fica de fora).
- Tarefa separada (pendente): fixar as actions por SHA nos workflows, começando pelos que têm secret (`worker` em `ci.yml` e `worker-cycle.yml`).
- Antes da E8: criar a conta Adzuna, configurar `ADZUNA_APP_ID` e `ADZUNA_APP_KEY` e conferir cobertura no Brasil, limites e texto de atribuição.
- Definir a allowlist (e-mail) como secret do Wrangler e fazer o `wrangler deploy` da E4.
- Criar o cliente OAuth no Google Cloud e cadastrar as redirect URIs.
- Ativar proteção da branch `main` (pull request obrigatório e CI verde).
- Criar o arquivo `.env.example` à mão (a escrita em `.env*` é bloqueada para o Claude).

## Fila sugerida
CI-TS → E3a → E3b → E4 → E5 → E6 → E7 → E8 → E9 → E11 → (E2, E10, E13 recomendadas) → E12 opcional

## Histórico
- 2026-11-17 — CI-TS: lockfiles e dependências atualizadas pelo dono; primeira execução dos testes de `apps/auth` (32 passaram no Codespace); Node 24 fixado no devcontainer e no CI (D29); jobs `auth` e `web` no CI e workflow `audit` não obrigatório. Checkpoint dos três juízes: aprovado com ressalvas, sem bloqueante.
- 2026-11-16 — D27: Adzuna fora da E10 até o dono conferir os termos; cobertura fraca no Brasil para a E8 e reavaliar; retenção de 30 dias. D28: regra de não usar MCP e conectores corporativos.
- 2026-11-16 — Plano da E3a aprovado; D26 (riscos aceitos, CI do TypeScript antecipado, ações do usuário movidas para o fim da E4).
- 2026-11-16 — D25: Adzuna é o primeiro conector da E8; Remote OK e Greenhouse/Lever opcionais.
- 2026-11-16 — Projeto passa a uso pessoal (D18 a D24): E3 dividida, E12 opcional e por último, caminho mínimo marcado no ROADMAP.
- 2026-11-12 — E0 e E1 concluídas. CI verde no commit `adaa65b`.
