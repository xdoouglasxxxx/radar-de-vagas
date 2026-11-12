"""Ponto de entrada do worker.

    python -m app.main --migrate   # aplica migrações
    python -m app.main --once      # um ciclo: agenda tarefas vencidas e processa a fila
    python -m app.main             # laço contínuo (desenvolvimento)
"""

import argparse
import logging
import time

import psycopg

from app import handlers, queue
from app.config import Settings, load_settings
from app.migrate import apply_migrations
from app.scheduler import enqueue_due_tasks

log = logging.getLogger("worker")


def process_one(conn: psycopg.Connection) -> bool:
    """Processa um job. Retorna False se a fila estava vazia."""
    job = queue.claim_next(conn)
    if job is None:
        return False
    job_id, kind = job["id"], job["kind"]
    handler = handlers.HANDLERS.get(kind)
    try:
        if handler is None:
            raise LookupError(f"sem handler para kind={kind}")
        handler(job["payload"])
    except Exception as exc:  # noqa: BLE001 - falha de um job não derruba o ciclo
        status = queue.mark_failed(conn, job_id, f"{type(exc).__name__}: {exc}")
        log.warning("job %s (%s) falhou -> %s", job_id, kind, status)
    else:
        queue.mark_succeeded(conn, job_id)
        log.info("job %s (%s) ok", job_id, kind)
    return True


def run_cycle(conn: psycopg.Connection, settings: Settings) -> int:
    """Um ciclo completo, limitado por `max_seconds`. Retorna jobs processados."""
    deadline = time.monotonic() + settings.max_seconds
    recovered = queue.requeue_stale(conn, settings.stale_after_seconds)
    scheduled = enqueue_due_tasks(conn)
    if recovered or scheduled:
        log.info("recuperados=%d agendados=%d", recovered, scheduled)
    processed = 0
    while time.monotonic() < deadline and process_one(conn):
        processed += 1
    return processed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--migrate", action="store_true")
    args = parser.parse_args()

    settings = load_settings()
    logging.basicConfig(
        level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s"
    )

    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        if args.migrate:
            applied = apply_migrations(conn, settings.migrations_dir)
            log.info("migrações aplicadas: %s", applied or "nenhuma")
            return
        if args.once:
            n = run_cycle(conn, settings)
            log.info("ciclo concluído: %d job(s)", n)
            return
        while True:
            if run_cycle(conn, settings) == 0:
                time.sleep(15)


if __name__ == "__main__":
    main()
