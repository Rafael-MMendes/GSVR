import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = """
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
"""

stdin, stdout, stderr = ssh.exec_command(f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"')
print("--- COLUNAS USERS ---")
print(stdout.read().decode('utf-8', errors='replace'))

sql_c = """
SELECT conname, contype, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'users'::regclass;
"""
stdin, stdout, stderr = ssh.exec_command(f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql_c}"')
print("--- CONSTRAINTS USERS ---")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
