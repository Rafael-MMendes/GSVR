import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{query}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out or err

print("=== CHECK OUT-OF-BOUNDS DISPONIBILIDADES IN DATABASE ===")
print(run_sql("""
SELECT r.id_ciclo, c.data_inicio, c.data_fim, e.nome_guerra, d.dia_mes, count(*) as total_turnos
FROM DISPONIBILIDADE_REQUERIMENTO d
JOIN REQUERIMENTOS r ON d.id_requerimento = r.id_requerimento
JOIN CICLOS c ON r.id_ciclo = c.id_ciclo
JOIN EFETIVO e ON r.id_militar = e.id_militar
WHERE d.dia_mes < c.data_inicio OR d.dia_mes > c.data_fim
GROUP BY r.id_ciclo, c.data_inicio, c.data_fim, e.nome_guerra, d.dia_mes
ORDER BY r.id_ciclo, d.dia_mes;
"""))

ssh.close()

