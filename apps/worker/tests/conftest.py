"""Testes de integração usam TEST_DATABASE_URL (Neon DEV, nunca produção).

Cada teste roda em um schema temporário, removido ao final. Sem a variável, os testes
que dependem de banco são ignorados.
"""

import os
import uuid
from pathlib import Path

import psycopg
import pytest

from app.migrate import apply_migrations

MIGRATIONS = Path(__file__).resolve().parents[3] / "db" / "migrations"


@pytest.fixture
def conn():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL não definida")
    schema = f"test_{uuid.uuid4().hex[:12]}"
    # A extensão 'vector' fica no schema public; o search_path inclui ambos.
    with psycopg.connect(url, autocommit=True) as c:
        c.execute(f"CREATE SCHEMA {schema}")
        c.execute(f"SET search_path TO {schema}, public")
        try:
            apply_migrations(c, MIGRATIONS)
            yield c
        finally:
            c.execute(f"DROP SCHEMA {schema} CASCADE")
