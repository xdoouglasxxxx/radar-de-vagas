---
name: pre-commit
description: "Verificação antes de commitar ou de pedir push. Confere segredos, dados pessoais, arquivos fora de escopo e checagens locais leves. Não faz push."
disable-model-invocation: true
---

# Verificação antes do commit

1. Rode `git status --short` e liste os arquivos alterados e não rastreados.
2. Recuse seguir se aparecer qualquer um destes: `.env*`, PDF, DOC, DOCX, dump, chave, pasta `secrets`, arquivo fora de `apps/`, `db/`, `docs/`, `.github/`, `.claude/`, `.devcontainer/` ou da raiz conhecida (`README.md`, `ROADMAP.md`, `CLAUDE.md`, `.gitignore`).
3. Procure padrões de segredo no diff (`git diff` e `git diff --cached`): `sk-ant-`, `postgres://` ou `postgresql://` com usuário e senha, `client_secret` com valor, `AKIA`, `BEGIN ... PRIVATE KEY`, tokens longos em base64. Nome de variável sem valor não é segredo.
4. Procure dados pessoais ou reais: e-mails que não sejam de exemplo, telefones, CPF, nomes de empresas reais em fixtures.
5. Rode as checagens leves que existirem: `python -m compileall -q apps/worker` e `ruff check apps/worker`.
6. Confirme que a branch atual não é `main`.

Relate:
- **Pode commitar:** sim ou não;
- **Motivos**, se não;
- **Avisos** que não bloqueiam.

Não rode `git push`. Não altere arquivos para "limpar" um achado sem o usuário pedir.
