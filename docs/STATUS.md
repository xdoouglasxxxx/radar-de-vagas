# Onde estamos

Atualizado em: 2026-11-16

## Agora
- **Etapa atual:** E3 — Login restrito ao dono e correções (`[~]`). Projeto passou a ser de uso pessoal (D18 a D22).
- **Último commit validado:** `adaa65b` (E1: 8 testes passando no Codespace e no CI).
- **Situação:** `/checkpoint` feito em 2026-11-16 (segurança e escopo: aprovado com ressalvas; qualidade: reprovado). O código ainda está em `main` sem testes executados no CI. O plano pessoal foi aprovado com ressalvas pelo `juiz-escopo`, com 3 decisões do usuário pendentes (ver abaixo).

## Próxima ação
1. `/checkpoint` da E3 feito em 2026-11-16: segurança e escopo aprovaram com ressalvas; qualidade reprovou (cookie entre sites e testes fracos). Achados incorporados à E3 e à E4 do ROADMAP.
2. Implementar a E3 (allowlist, CI do TypeScript, correções dos testes) e depois a E4 (mesma origem).
3. Novo `/checkpoint` e pull request.

## Bloqueios e ações do usuário
- Decidir E12: contato intermediado com captcha (serviço externo) ou link de e-mail simples; e confirmar que publicar CV com contato mascarado, com repositório público, é decisão sua.
- Definir a allowlist (e-mail) como secret do Wrangler e fazer o `wrangler deploy` da E4.
- Criar o cliente OAuth no Google Cloud e cadastrar as redirect URIs.
- Ativar proteção da branch `main` (pull request obrigatório e CI verde).
- Criar o arquivo `.env.example` à mão (a escrita em `.env*` é bloqueada para o Claude).

## Fila sugerida
E3 → E4 → E2 → E5 → E6 → E7 → E8 → E9 → E10 → E11 → E12 → E13

## Histórico
- 2026-11-12 — E0 e E1 concluídas. CI verde no commit `adaa65b`.
