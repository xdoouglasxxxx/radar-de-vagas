"""Registro de handlers por `kind`. Handlers reais (coleta, CV, embeddings, ClamAV) entram depois.

Regra: handlers e logs nunca devem registrar conteúdo de CV nem dados pessoais.
"""

from collections.abc import Callable
from typing import Any

Handler = Callable[[dict[str, Any]], None]

HANDLERS: dict[str, Handler] = {}


def register(kind: str) -> Callable[[Handler], Handler]:
    def deco(fn: Handler) -> Handler:
        HANDLERS[kind] = fn
        return fn

    return deco


@register("noop")
def _noop(payload: dict[str, Any]) -> None:
    """Handler de teste de fumaça: não faz nada."""
