import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{query}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode()

print("=== CONSTRAINTS ON DISPONIBILIDADE_REQUERIMENTO ===")
print(run_sql("""
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'DISPONIBILIDADE_REQUERIMENTO'::regclass;
"""))

ssh.close()

