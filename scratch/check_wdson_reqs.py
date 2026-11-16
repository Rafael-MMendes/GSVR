import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{query}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode()

print("=== REQ 724 (Ciclo 7: 16/10 a 15/11) ===")
print(run_sql("SELECT id_disponibilidade, dia_mes, horario_turno, ativo FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = 724 ORDER BY dia_mes;"))

print("=== REQ 802 (Ciclo 8: 16/11 a 15/12) ===")
print(run_sql("SELECT id_disponibilidade, dia_mes, horario_turno, ativo FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = 802 ORDER BY dia_mes;"))

ssh.close()

