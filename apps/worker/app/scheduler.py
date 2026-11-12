"""Converte tarefas recorrentes vencidas em jobs."""

import psycopg

from app.queue import enqueue


def enqueue_due_tasks(conn: psycopg.Connection) -> int:
    """Enfileira cada tarefa vencida e agenda a próxima execução. Retorna quantas enfileirou."""
    count = 0
    with conn.transaction():
        due = conn.execute(
            "SELECT id, name, kind, payload, interval_seconds FROM recurring_tasks "
            "WHERE enabled AND next_run_at <= now() ORDER BY next_run_at "
            "FOR UPDATE SKIP LOCKED"
        ).fetchall()
        for task_id, name, kind, payload, interval in due:
            # dedupe_key = nome: se o ciclo anterior ainda não terminou, não duplica
            if enqueue(conn, kind, payload, dedupe_key=f"recurring:{name}") is not None:
                count += 1
            conn.execute(
                "UPDATE recurring_tasks SET last_enqueued_at = now(), "
                "next_run_at = now() + make_interval(secs => %s) WHERE id = %s",
                (interval, task_id),
            )
    return count
