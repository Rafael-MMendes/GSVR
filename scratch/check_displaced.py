import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{query}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode()

print("=== CHECK DISPLACED BETWEEN 7 AND 8 ===")
sql_check = """
SELECT 
    'Ciclo 7 contendo datas de Ciclo 8' as situacao,
    count(*) as total_registros,
    count(distinct r.id_militar) as total_militares
FROM DISPONIBILIDADE_REQUERIMENTO d
JOIN REQUERIMENTOS r ON d.id_requerimento = r.id_requerimento
WHERE r.id_ciclo = 7 AND d.dia_mes >= '2026-11-16'
UNION ALL
SELECT 
    'Ciclo 8 contendo datas de Ciclo 7' as situacao,
    count(*) as total_registros,
    count(distinct r.id_militar) as total_militares
FROM DISPONIBILIDADE_REQUERIMENTO d
JOIN REQUERIMENTOS r ON d.id_requerimento = r.id_requerimento
WHERE r.id_ciclo = 8 AND d.dia_mes <= '2026-11-15';
"""
print(run_sql(sql_check))

ssh.close()

