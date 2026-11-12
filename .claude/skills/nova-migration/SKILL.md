---
name: nova-migration
description: Convenções para criar ou revisar migrations SQL do Radar de Vagas. Use quando a tarefa envolver esquema de banco, tabelas, índices, roles ou arquivos em db/migrations.
---

# Migrations do Radar de Vagas

## Convenções
- Arquivo em `db/migrations/NNNN_descricao_curta.sql`, com numeração sequencial de quatro dígitos. Confira o último número antes de criar.
- Migration aplicada nunca é editada. Correção é uma migration nova.
- Idempotente: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`.
- Cada migration em uma transação, salvo comandos que não permitem.
- Nomes em inglês e `snake_case`, como nas tabelas existentes. A fila já usa `jobs`: vagas de emprego precisam de outro nome (por exemplo `job_postings`).
- Toda tabela com dados de pessoa tem `user_id` e regra de exclusão definida (`ON DELETE CASCADE` ou justificativa).
- Índice para toda consulta nova que filtra ou ordena.
- Colunas de data com `TIMESTAMPTZ`. Segredos nunca em coluna: só hash.
- Tabela que cresce sem limite precisa de política de retenção descrita no comentário do arquivo (o armazenamento do plano gratuito é pequeno).

## Proibido sem aprovação explícita do usuário
`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE` ou `UPDATE` sem `WHERE`, mudança de tipo que perde dados, e qualquer `GRANT` para o role do worker além de leitura e escrita nas tabelas que ele usa.

## Passos
1. Escreva a migration e, no mesmo commit, o teste que depende dela.
2. Explique no relato como desfazer a mudança.
3. Não aplique a migration em banco nenhum. Quem roda `python -m app.main --migrate` é o usuário, no Codespace, contra o banco de dev.
4. Antes de migration destrutiva aprovada, lembre o usuário de criar um branch de backup no Neon.
