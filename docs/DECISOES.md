# Registro de decisões

Decisões vigentes. Para mudar uma delas, o usuário pede e a mudança é registrada aqui com data.

| # | Decisão | Motivo |
|---|---|---|
| D01 | Projeto pessoal de estudo; arquitetura mantida para aprendizado | Escolha do usuário |
| D02 | Custo zero enquanto for uso pessoal | Escolha do usuário |
| D03 | Repositório público no GitHub (`xdoouglasxxxx/radar-de-vagas`) | Minutos ilimitados de Actions em repositório público |
| D04 | Banco: Neon (Postgres + pgvector); dev e produção em projetos separados | Plano gratuito, pgvector incluído |
| D05 | Fila em tabela do Postgres com `SKIP LOCKED`; sem Redis, Celery ou LISTEN/NOTIFY | Menos serviços |
| D06 | Worker executado em ciclos pelo GitHub Actions a cada 15 minutos (`--once`) | Sem servidor ligado o tempo todo |
| D07 | Atraso de até 15 minutos em jobs e alertas; upload de CV pode levar até 30 minutos | Consequência de D06 |
| D08 | Login somente com Google OAuth; sem senha | Limite de 10 ms de CPU no Workers gratuito inviabiliza hash de senha |
| D09 | `apps/auth` é Worker em TypeScript; `apps/web` é Next.js exportado como estático; sem OpenNext | Limites de CPU e de tamanho do plano gratuito |
| D10 | Arquivos no Cloudflare R2, cifrados pela aplicação (envelope) | Controle da chave |
| D11 | Sem Docker; desenvolvimento local + testes no Codespace e no CI | Máquina corporativa não permite instalar programas |
| D12 | Testes só com dados fictícios; CV real apenas em execução manual do usuário, nunca commitado | Privacidade |
| D13 | Adzuna só para uso pessoal; sem cobrança, vitrine ou redistribuição com dados dela | Termos da API exigem licença para uso comercial |
| D14 | Segredos só em Secrets do GitHub, do Codespaces e do Wrangler; `.env*` nunca é lido nem escrito pelo Claude | Repositório público |
| D15 | Merge em `main` só por pull request, com CI verde e aprovação do usuário | Checkpoints |

## Gatilho de revisão
Primeiro usuário externo, primeira cobrança ou primeiro recrutador interessado: revisar D02, D03, D06, D13, os termos dos planos gratuitos e a LGPD (com apoio jurídico).
