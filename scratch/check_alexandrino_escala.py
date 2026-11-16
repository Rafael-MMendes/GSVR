import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    return stdout.read().decode()

print("=== ESCALA_PLANEJAMENTO FOR ALEXANDRINO REQ 695 ===")
print(run_sql("""
SELECT ep.id_escala, ep.id_ciclo, ep.data_escala, ep.turno, ep.funcao, ep.id_disponibilidade, ep.status
FROM escala_planejamento ep
JOIN disponibilidade_requerimento dr ON ep.id_disponibilidade = dr.id_disponibilidade
WHERE dr.id_requerimento = 695;
"""))

print("=== DIRECT ESCALA_PLANEJAMENTO FOR ALEXANDRINO (id_militar = 271) IN CICLO 7 ===")
print(run_sql("""
SELECT ep.id_escala, ep.id_ciclo, ep.data_escala, ep.turno, ep.funcao, ep.id_disponibilidade, ep.status
FROM escala_planejamento ep
WHERE ep.id_militar = 271 AND ep.id_ciclo = 7;
"""))

ssh.close()

