import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    return stdout.read().decode()

print("=== ALL CONSTRAINTS INVOLVING REQUERIMENTOS OR DISPONIBILIDADE ===")
print(run_sql("""
SELECT 
    conrelid::regclass AS from_table,
    conname,
    confrelid::regclass AS to_table,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE confrelid::regclass::text IN ('requerimentos', 'disponibilidade_requerimento')
   OR conrelid::regclass::text IN ('requerimentos', 'disponibilidade_requerimento');
"""))

ssh.close()

