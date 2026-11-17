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
| D16 | Nesta máquina, as regras de permissão do projeto são ignoradas (somente regras gerenciadas). As proteções efetivas são a proteção da branch main, o secret scanning e os checkpoints. | Configuração gerenciada da máquina corporativa |
| D17 | No CP0, se o `juiz-escopo` aprovar o plano (sem bloqueante e sem decisão pendente para o usuário) e nenhuma parada obrigatória se aplicar, o Claude pode implementar sem esperar a aprovação do usuário. Merge, segredo, deploy, recurso em nuvem, migration destrutiva e dependência nova continuam exigindo o usuário | Reduz pausas em tarefas rotineiras sem abrir mão dos juízes e do merge |
| D18 | Uso exclusivamente pessoal (2026-11-16): sem freemium, cotas por plano, paywall, afiliados, métricas de produto, termos para terceiros ou múltiplos usuários | Escolha do usuário; reduz escopo |
| D19 | Login Google OAuth restrito a um e-mail (allowlist no Wrangler); consentimento versionado e tela de termos removidos do fluxo; colunas `terms_*` ficam sem uso (migration `0002` inalterada, nenhuma coluna nova de consentimento) | Só o dono usa; evita `DROP COLUMN` |
| D20 | Um único Worker serve o site estático e a API na mesma origem (Workers Static Assets, `workers.dev`); sem domínio próprio | Cookie `SameSite=Lax` funciona sem custo; elimina CORS |
| D21 | Vitrine pública mantida completa, com um só dono (moderação = painel do dono); nunca exibe dados da Adzuna | Escolha do usuário; publicar é opt-in por seção, com e-mail e telefone mascarados por padrão |
| D22 | Adzuna entra como fonte da Fase 1, só para uso pessoal (D13), com atribuição visível | D18 elimina o bloqueio comercial |

## Gatilho de revisão
Primeiro usuário externo, primeira cobrança ou primeiro recrutador interessado: revisar D02, D03, D06, D13, D18 a D22, os termos dos planos gratuitos e a LGPD (com apoio jurídico).
