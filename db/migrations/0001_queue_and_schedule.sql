-- Fila de jobs e tarefas recorrentes (Postgres puro, sem Redis/Celery).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE jobs (
    id            bigserial PRIMARY KEY,
    kind          text        NOT NULL,
    payload       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    status        text        NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'dead')),
    attempts      integer     NOT NULL DEFAULT 0,
    max_attempts  integer     NOT NULL DEFAULT 5 CHECK (max_attempts >= 1),
    run_at        timestamptz NOT NULL DEFAULT now(),
    locked_at     timestamptz,
    last_error    text,
    dedupe_key    text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Consulta de "próximo job" do worker
CREATE INDEX jobs_claim_idx ON jobs (run_at, id) WHERE status = 'queued';

-- Impede duplicar um job ainda ativo com a mesma chave (ex.: tarefa recorrente)
CREATE UNIQUE INDEX jobs_dedupe_active_idx ON jobs (dedupe_key)
    WHERE dedupe_key IS NOT NULL AND status IN ('queued', 'running');

CREATE TABLE recurring_tasks (
    id                 bigserial PRIMARY KEY,
    name               text        NOT NULL UNIQUE,
    kind               text        NOT NULL,
    payload            jsonb       NOT NULL DEFAULT '{}'::jsonb,
    interval_seconds   integer     NOT NULL CHECK (interval_seconds >= 60),
    next_run_at        timestamptz NOT NULL DEFAULT now(),
    enabled            boolean     NOT NULL DEFAULT true,
    last_enqueued_at   timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recurring_tasks_due_idx ON recurring_tasks (next_run_at) WHERE enabled;
