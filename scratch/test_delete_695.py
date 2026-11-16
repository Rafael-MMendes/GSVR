import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out or err

print("=== CHECK REQUERIMENTO 695 ===")
print(run_sql("SELECT * FROM REQUERIMENTOS WHERE id_requerimento = 695;"))

print("=== ATTEMPT DELETE 695 IN TRANSACTION (ROLLBACK) ===")
print(run_sql("BEGIN; DELETE FROM REQUERIMENTOS WHERE id_requerimento = 695; ROLLBACK;"))

ssh.close()

