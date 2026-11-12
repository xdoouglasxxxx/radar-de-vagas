# Checkpoints

Toda tarefa passa por estes portões, em ordem. Um portão reprovado devolve a tarefa ao passo anterior.

| Portão | O que é | Quem decide |
|---|---|---|
| **CP0 — Plano** | Plano curto: objetivo, arquivos tocados, testes previstos, riscos, dependências novas (se houver) | Usuário aprova |
| **CP1 — Implementação** | Código e testes em branch `etapa/E<n>-...`; checagens locais leves passam | developer |
| **CP2 — Juízes** | Veredito dos três juízes sobre o diff | juízes |
| **CP3 — CI** | Pull request aberto e CI verde, sem testes pulados que deveriam rodar | GitHub Actions |
| **CP4 — Merge** | Usuário lê o resumo, revisa o diff e faz o merge | Usuário |
| **CP5 — Registro** | `docs/STATUS.md` e `ROADMAP.md` atualizados; decisão nova registrada em `docs/DECISOES.md` | Claude propõe, usuário confirma |

## Regras dos juízes (CP2)
- Veredito: `APROVADO`, `APROVADO COM RESSALVAS` ou `REPROVADO`.
- Cada achado traz severidade (`bloqueante`, `importante`, `sugestão`), arquivo e linha, e a correção proposta.
- Um achado bloqueante de qualquer juiz reprova a tarefa.
- Limite de duas rodadas de correção. Na terceira reprovação, parar e chamar o usuário.
- Ressalvas não corrigidas viram item em `docs/STATUS.md`.

## Definição de pronto
- Testes novos cobrem o caminho feliz e as falhas esperadas.
- Nenhum segredo, dado pessoal ou dado real no diff.
- Logs sem conteúdo sensível.
- Documentação do que mudou (README da pasta ou comentário onde a lógica não é óbvia).
- A pergunta de verificação da etapa foi respondida pelo usuário com as próprias palavras.

## Paradas obrigatórias
O Claude para e pergunta quando a tarefa exigir: segredo ou credencial, deploy, recurso em nuvem, mudança em `main`, migration destrutiva, dependência nova não prevista no plano, ou qualquer limite, preço ou termo não verificado.

## Proteção da branch (ação do usuário, uma vez)
Em **Settings > Branches**, proteger `main`: exigir pull request e exigir o check `ci` verde antes do merge.
