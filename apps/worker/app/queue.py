"""Fila de jobs em Postgres (SELECT ... FOR UPDATE SKIP LOCKED)."""

from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

BACKOFF_BASE_SECONDS = 30
BACKOFF_MAX_SECONDS = 3600


def enqueue(
    conn: psycopg.Connection,
    kind: str,
    payload: dict[str, Any] | None = None,
    *,
    dedupe_key: str | None = None,
    max_attempts: int = 5,
    delay_seconds: int = 0,
) -> int | None:
    """Enfileira um job. Retorna o id, ou None se já existe um ativo com a mesma dedupe_key."""
    row = conn.execute(
        "INSERT INTO jobs (kind, payload, dedupe_key, max_attempts, run_at) "
        "VALUES (%s, %s, %s, %s, now() + make_interval(secs => %s)) "
        "ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL "
        "AND status IN ('queued', 'running') DO NOTHING RETURNING id",
        (kind, Jsonb(payload or {}), dedupe_key, max_attempts, delay_seconds),
    ).fetchone()
    return row[0] if row else None


def claim_next(conn: psycopg.Connection) -> dict[str, Any] | None:
    """Reserva o próximo job elegível. Pode ser chamado por vários workers ao mesmo tempo."""
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "WITH next AS ("
            "  SELECT id FROM jobs WHERE status = 'queued' AND run_at <= now() "
            "  ORDER BY run_at, id FOR UPDATE SKIP LOCKED LIMIT 1) "
            "UPDATE jobs SET status = 'running', attempts = attempts + 1, "
            "  locked_at = now(), updated_at = now() "
            "FROM next WHERE jobs.id = next.id RETURNING jobs.*"
        )
        return cur.fetchone()


def mark_succeeded(conn: psycopg.Connection, job_id: int) -> None:
    conn.execute(
        "UPDATE jobs SET status = 'succeeded', locked_at = NULL, last_error = NULL, "
        "updated_at = now() WHERE id = %s",
        (job_id,),
    )


def mark_failed(conn: psycopg.Connection, job_id: int, error: str) -> str:
    """Reagenda com backoff exponencial ou marca como 'dead' ao esgotar tentativas.

    `error` deve ser uma mensagem curta sem dados pessoais.
    """
    row = conn.execute(
        "UPDATE jobs SET "
        "  status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'queued' END, "
        "  run_at = now() + make_interval(secs => LEAST(%s * power(2, attempts - 1), %s)), "
        "  locked_at = NULL, last_error = left(%s, 500), updated_at = now() "
        "WHERE id = %s RETURNING status",
        (BACKOFF_BASE_SECONDS, BACKOFF_MAX_SECONDS, error, job_id),
    ).fetchone()
    return row[0]


def requeue_stale(conn: psycopg.Connection, stale_after_seconds: int) -> int:
    """Devolve à fila jobs 'running' abandonados (worker caiu no meio)."""
    cur = conn.execute(
        "UPDATE jobs SET status = 'queued', locked_at = NULL, "
        "  last_error = 'abandonado: worker interrompido', updated_at = now() "
        "WHERE status = 'running' AND locked_at < now() - make_interval(secs => %s)",
        (stale_after_seconds,),
    )
    return cur.rowcount
