"""Aplicador simples de migrações SQL (arquivos NNNN_nome.sql em ordem)."""

import logging
from pathlib import Path

import psycopg

log = logging.getLogger(__name__)


def apply_migrations(conn: psycopg.Connection, migrations_dir: Path) -> list[str]:
    """Aplica migrações pendentes, cada uma em sua transação. Retorna as aplicadas."""
    with conn.transaction():
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
        )
        # Evita duas execuções simultâneas de migração
        conn.execute("SELECT pg_advisory_xact_lock(727001)")
        done = {r[0] for r in conn.execute("SELECT name FROM schema_migrations")}
        applied: list[str] = []
        for path in sorted(migrations_dir.glob("*.sql")):
            if path.name in done:
                continue
            log.info("aplicando migração %s", path.name)
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations (name) VALUES (%s)", (path.name,))
            applied.append(path.name)
    return applied
