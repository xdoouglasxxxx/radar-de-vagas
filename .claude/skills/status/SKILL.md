---
name: status
description: Mostra onde o projeto está no roadmap, o que falta e a próxima ação. Com o argumento "atualizar", propõe e grava a atualização de docs/STATUS.md.
argument-hint: "[atualizar]"
disable-model-invocation: true
---

# Status do projeto

Argumento: $ARGUMENTS

1. Leia `docs/STATUS.md` e `ROADMAP.md`. Rode `git status`, `git branch --show-current` e `git log --oneline -10`.
2. Responda em até 12 linhas:
   - etapa atual e estado;
   - último commit validado;
   - branch atual e se há mudanças não commitadas;
   - próxima ação concreta;
   - bloqueios e ações que dependem do usuário;
   - divergências entre o que os arquivos dizem e o que o Git mostra.
3. Não afirme que algo foi testado sem evidência no histórico ou no relato do usuário.

Se o argumento for `atualizar`:
- mostre a alteração proposta para `docs/STATUS.md` (e para a tabela do `ROADMAP.md`, se uma etapa mudou de estado);
- espere a confirmação do usuário antes de gravar;
- marque uma etapa como `[x]` só com CI verde informado pelo usuário e pergunta de verificação respondida.
