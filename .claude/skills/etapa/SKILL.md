---
name: etapa
description: Conduz o ciclo completo de uma etapa do ROADMAP, do plano ao pedido de merge, passando pelos checkpoints.
argument-hint: "[id da etapa, ex.: E3]"
disable-model-invocation: true
---

# Ciclo de uma etapa

Etapa pedida: $ARGUMENTS

Se nenhuma etapa foi informada, use a etapa atual de `docs/STATUS.md` e confirme com o usuário antes de começar.

## 1. Situar
Leia `docs/STATUS.md`, a etapa no `ROADMAP.md`, `docs/DECISOES.md` e `docs/CHECKPOINTS.md`. Rode `git status` e confirme que a árvore está limpa. Se houver mudança não commitada, pare e pergunte.

## 2. Plano (CP0)
Divida a etapa em tarefas pequenas. Para a primeira tarefa, apresente:
- objetivo em uma frase;
- arquivos que serão criados ou alterados;
- testes previstos;
- riscos e o que não será verificado localmente;
- dependências novas, se houver, com justificativa;
- ações que só o usuário pode fazer (segredos, console de nuvem).

Peça ao subagente `juiz-escopo` uma revisão do plano. Depois **pare e espere a aprovação do usuário**. Não escreva código antes disso.

## 3. Implementar (CP1)
Crie a branch `etapa/<id>-<descricao-curta>` e delegue a tarefa ao subagente `developer`, com o plano aprovado.

## 4. Julgar (CP2)
Acione os subagentes `juiz-seguranca`, `juiz-qualidade` e `juiz-escopo` sobre `git diff main...HEAD`. Mostre os três vereditos ao usuário, sem resumir achados bloqueantes.

- Se houver achado bloqueante ou importante, devolva ao `developer` com a lista exata e julgue de novo.
- Limite de duas rodadas de correção. Se ainda houver reprovação, pare e peça decisão ao usuário.

## 5. Entregar (CP3 e CP4)
Rode a skill `pre-commit`. Depois apresente:
- resumo do que mudou;
- vereditos finais e ressalvas pendentes;
- o que não foi verificado e depende do CI ou do Codespace;
- os comandos para o usuário enviar a branch e abrir o pull request.

**Não faça push para `main` e não faça merge.** O push da branch só acontece com a confirmação do usuário.

## 6. Registrar (CP5)
Depois que o usuário informar que o CI passou e o merge foi feito, proponha a atualização de `docs/STATUS.md` e do `ROADMAP.md`, e faça a pergunta de verificação da etapa. A etapa só é marcada como `[x]` quando o usuário responder.

## Sempre
Uma tarefa por vez. Ao fim de cada tarefa, pergunte se segue para a próxima.
