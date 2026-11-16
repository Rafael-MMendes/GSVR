import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    return stdout.read().decode()

print("=== DISPONIBILIDADE 64427 ===")
print(run_sql("SELECT * FROM disponibilidade_requerimento WHERE id_disponibilidade = 64427;"))

print("=== ESCALA_PLANEJAMENTO FOR 64427 ===")
print(run_sql("SELECT * FROM escala_planejamento WHERE id_disponibilidade = 64427;"))

ssh.close()

