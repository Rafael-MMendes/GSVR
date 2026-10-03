import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = """
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'efetivo'
ORDER BY ordinal_position;
"""

stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft')
stdin.write(sql)
stdin.channel.shutdown_write()

out = stdout.read().decode('utf-8', errors='replace')
print("--- COLUNAS DA TABELA EFETIVO ---")
print(out)

# Checar constraints / índices da tabela EFETIVO
sql_constraints = """
SELECT conname, contype, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'efetivo'::regclass;
"""
stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft')
stdin.write(sql_constraints)
stdin.channel.shutdown_write()
out_cons = stdout.read().decode('utf-8', errors='replace')
print("\n--- CONSTRAINTS DA TABELA EFETIVO ---")
print(out_cons)

# Checar total de militares e se tem duplicados no banco
sql_dups = """
SELECT COUNT(*) as total_militar,
       COUNT(DISTINCT matricula) as distinct_mat,
       COUNT(DISTINCT cpf) as distinct_cpf,
       COUNT(DISTINCT numero_ordem) as distinct_ordem
FROM EFETIVO;
"""
stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft')
stdin.write(sql_dups)
stdin.channel.shutdown_write()
out_dups = stdout.read().decode('utf-8', errors='replace')
print("\n--- CONTAGEM E UNICIDADE NO BANCO ---")
print(out_dups)

ssh.close()
