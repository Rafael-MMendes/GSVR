import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{query}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode()

print("=== OUT OF BOUNDS IN CICLO 7 AND 8 ===")
print(run_sql("""
SELECT r.id_ciclo, c.data_inicio, c.data_fim, e.id_militar, e.nome_guerra, min(d.dia_mes) as menor_dia, max(d.dia_mes) as maior_dia, count(*) as turnos
FROM DISPONIBILIDADE_REQUERIMENTO d
JOIN REQUERIMENTOS r ON d.id_requerimento = r.id_requerimento
JOIN CICLOS c ON r.id_ciclo = c.id_ciclo
JOIN EFETIVO e ON r.id_militar = e.id_militar
WHERE (r.id_ciclo IN (7, 8)) AND (d.dia_mes < c.data_inicio OR d.dia_mes > c.data_fim)
GROUP BY r.id_ciclo, c.data_inicio, c.data_fim, e.id_militar, e.nome_guerra
ORDER BY r.id_ciclo, e.nome_guerra;
"""))

ssh.close()

