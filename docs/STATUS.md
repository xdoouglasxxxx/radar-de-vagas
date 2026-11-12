# Onde estamos

Atualizado em: 2026-11-12

## Agora
- **Etapa atual:** E3 — Login com Google e sessões (`[~]`).
- **Último commit validado:** `adaa65b` (E1: 8 testes passando no Codespace e no CI).
- **Situação:** o código de `apps/auth` e `apps/web` está em `main` sem revisão dos juízes e sem testes no CI.

## Próxima ação
1. Rodar `/checkpoint` sobre `apps/auth`, `apps/web` e a migration `0002`.
2. Incluir os testes de `apps/auth` no `ci.yml` (pull request).
3. Corrigir o que os juízes apontarem e fechar a E3 com os checkpoints.

## Bloqueios e ações do usuário
- Criar o cliente OAuth no Google Cloud e cadastrar as redirect URIs.
- Ativar proteção da branch `main` (pull request obrigatório e CI verde).
- Criar o arquivo `.env.example` à mão (a escrita em `.env*` é bloqueada para o Claude).

## Fila sugerida
E3 → E4 → E2 → E5 → E6 → E7 → E8 → E9 → E10 → E11 → E12 → E13

## Histórico
- 2026-11-12 — E0 e E1 concluídas. CI verde no commit `adaa65b`.
