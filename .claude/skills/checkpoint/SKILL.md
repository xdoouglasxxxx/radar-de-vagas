---
name: checkpoint
description: Roda os três juízes (segurança, qualidade e escopo) sobre o diff atual ou sobre caminhos informados e consolida os vereditos. Não altera arquivos.
argument-hint: "[caminhos opcionais, ex.: apps/auth apps/web]"
disable-model-invocation: true
---

# Checkpoint dos juízes

Alvo: $ARGUMENTS

1. Se nenhum caminho foi informado, o alvo é `git diff main...HEAD`. Se a branch atual for `main` e não houver diff, peça os caminhos ao usuário.
2. Acione os subagentes `juiz-seguranca`, `juiz-qualidade` e `juiz-escopo` com o mesmo alvo.
3. Consolide em uma tabela: juiz, veredito, número de achados por severidade.
4. Liste todos os achados bloqueantes e importantes na íntegra, com arquivo e linha.
5. Diga o resultado do portão CP2: passa só se nenhum juiz reprovou e não há achado bloqueante.
6. Liste o que nenhum juiz conseguiu verificar.

Não edite arquivos nem corrija nada nesta skill. Se o usuário quiser as correções, ele pede em seguida.
