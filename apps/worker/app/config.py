"""Configuração via variáveis de ambiente. Nenhum segredo é logado."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    database_url: str
    max_seconds: int
    stale_after_seconds: int
    log_level: str
    migrations_dir: Path


def load_settings() -> Settings:
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        raise RuntimeError("DATABASE_URL não definida (veja .env.example)")
    default_migrations = Path(__file__).resolve().parents[3] / "db" / "migrations"
    return Settings(
        database_url=database_url,
        max_seconds=int(os.environ.get("WORKER_MAX_SECONDS", "600")),
        stale_after_seconds=int(os.environ.get("WORKER_STALE_AFTER_SECONDS", "900")),
        log_level=os.environ.get("WORKER_LOG_LEVEL", "INFO"),
        migrations_dir=Path(os.environ.get("MIGRATIONS_DIR", str(default_migrations))),
    )
