# Radar de Vagas

Lê o CV, monta o perfil e recomenda vagas por match score. Repositório **público**: nunca
commite segredos, CVs reais ou dados pessoais. Testes usam apenas dados fictícios.

## Estrutura

```
apps/worker/   Worker Python 3.12 (psycopg): fila, agendamento, handlers
db/migrations/ Migrações SQL (Neon Postgres + pgvector)
.github/       CI e ciclo do worker (a cada 15 min)
```

`apps/api` (Workers em TypeScript) e `apps/web` serão criados depois do módulo de auth.

## Arquitetura (Fase 1)

Cloudflare Pages + Workers · Neon (projetos separados dev/prod) · R2 com criptografia em
envelope · fila na tabela `jobs` (`FOR UPDATE SKIP LOCKED`) · tarefas em `recurring_tasks` ·
worker por ciclos (`python -m app.main --once`) disparados pelo GitHub Actions.

## Desenvolvimento (Codespaces + Neon dev)

1. Abra no Codespaces (o devcontainer instala o worker).
2. Crie um projeto Neon **de dev** e defina `DATABASE_URL` e `TEST_DATABASE_URL` como
   secrets do Codespace ou em `.env` (ignorado pelo git; modelo em `.env.example`).
3. Migrar e rodar:

```
cd apps/worker
python -m app.main --migrate
python -m app.main --once
pytest
```

## GitHub Actions

- `ci`: ruff + pytest (testes de banco só com o secret `TEST_DATABASE_URL`, Neon dev).
- `worker-cycle`: roda com `vars.WORKER_ENABLED=true` e o secret `DATABASE_URL`.
  Use o banco de produção só após passar por staging e com registro da mudança.

## Fontes de vagas

Adzuna: **uso pessoal apenas** na Fase 1, sem cobrança e sem vitrine com dados dela, até
existir licença comercial. Dados da Adzuna levam `license_scope = personal_only`.
