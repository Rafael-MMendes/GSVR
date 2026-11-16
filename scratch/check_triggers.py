import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out or err

print("=== TRIGGERS ON REQUERIMENTOS ===")
print(run_sql("SELECT tgname, tgtype, tgdeferrable, tginitdeferred, proname FROM pg_trigger JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid WHERE tgrelid = 'requerimentos'::regclass;"))

print("=== TRIGGERS ON DISPONIBILIDADE_REQUERIMENTO ===")
print(run_sql("SELECT tgname, tgtype, tgdeferrable, tginitdeferred, proname FROM pg_trigger JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid WHERE tgrelid = 'disponibilidade_requerimento'::regclass;"))

ssh.close()

