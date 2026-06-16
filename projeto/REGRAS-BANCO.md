REGRAS DE BANCO DE DADOS



1\. Nunca apagar tabelas existentes sem autorização.



2\. Sempre criar migrations.



3\. Sempre executar:



npx prisma migrate dev



antes de:



npx prisma generate



4\. Não alterar campos críticos sem backup.



5\. Sempre manter compatibilidade com SQLite.



6\. Futuramente permitir migração para PostgreSQL.



