import psycopg
import pytest

from app import queue
from app.config import Settings
from app.main import process_one, run_cycle
from app.scheduler import enqueue_due_tasks


def _settings() -> Settings:
    return Settings("", 30, 900, "INFO", None)  # type: ignore[arg-type]


def test_enqueue_claim_succeed(conn: psycopg.Connection):
    job_id = queue.enqueue(conn, "noop", {"x": 1})
    job = queue.claim_next(conn)
    assert job["id"] == job_id and job["status"] == "running" and job["attempts"] == 1
    assert queue.claim_next(conn) is None
    queue.mark_succeeded(conn, job_id)
    assert conn.execute("SELECT status FROM jobs").fetchone()[0] == "succeeded"


def test_dedupe_blocks_active_duplicate(conn: psycopg.Connection):
    assert queue.enqueue(conn, "noop", dedupe_key="k") is not None
    assert queue.enqueue(conn, "noop", dedupe_key="k") is None


def test_failure_backoff_then_dead(conn: psycopg.Connection):
    job_id = queue.enqueue(conn, "noop", max_attempts=2)
    queue.claim_next(conn)
    assert queue.mark_failed(conn, job_id, "boom") == "queued"
    # backoff: ainda não elegível
    assert queue.claim_next(conn) is None
    conn.execute("UPDATE jobs SET run_at = now()")
    queue.claim_next(conn)
    assert queue.mark_failed(conn, job_id, "boom") == "dead"


def test_unknown_kind_fails_without_crashing(conn: psycopg.Connection):
    queue.enqueue(conn, "nao_existe", max_attempts=1)
    assert process_one(conn) is True
    assert conn.execute("SELECT status FROM jobs").fetchone()[0] == "dead"


def test_skip_locked_with_two_connections(conn: psycopg.Connection):
    import os

    queue.enqueue(conn, "noop")
    queue.enqueue(conn, "noop")
    schema = conn.execute("SHOW search_path").fetchone()[0]
    with psycopg.connect(os.environ["TEST_DATABASE_URL"]) as c2:
        c2.execute(f"SET search_path TO {schema}")
        with conn.transaction():
            a = queue.claim_next(conn)
            b = queue.claim_next(c2)
        assert a["id"] != b["id"]


def test_stale_running_job_is_requeued(conn: psycopg.Connection):
    queue.enqueue(conn, "noop")
    queue.claim_next(conn)
    conn.execute("UPDATE jobs SET locked_at = now() - interval '1 hour'")
    assert queue.requeue_stale(conn, 900) == 1
    assert conn.execute("SELECT status FROM jobs").fetchone()[0] == "queued"


def test_recurring_task_enqueues_once_per_interval(conn: psycopg.Connection):
    conn.execute(
        "INSERT INTO recurring_tasks (name, kind, interval_seconds) VALUES ('t', 'noop', 900)"
    )
    assert enqueue_due_tasks(conn) == 1
    assert enqueue_due_tasks(conn) == 0  # próxima execução ainda no futuro


def test_run_cycle_processes_scheduled_jobs(conn: psycopg.Connection):
    conn.execute(
        "INSERT INTO recurring_tasks (name, kind, interval_seconds) VALUES ('t', 'noop', 900)"
    )
    assert run_cycle(conn, _settings()) == 1
    assert conn.execute("SELECT status FROM jobs").fetchone()[0] == "succeeded"
