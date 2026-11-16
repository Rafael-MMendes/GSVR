import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    # run inside ft-postgres or using psql
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{query}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out or err

print("=== EFETIVO WDSON ===")
print(run_sql("SELECT id_militar, posto_graduacao, nome_completo, nome_guerra, numero_ordem, matricula, cpf, status_ativo FROM EFETIVO WHERE nome_completo ILIKE '%WDSON%' OR nome_guerra ILIKE '%WDSON%' OR cpf = '06747113438';"))

print("=== CICLOS ===")
print(run_sql("SELECT id_ciclo, nome_ciclo, data_inicio, data_fim, mes_ano, status FROM CICLOS ORDER BY id_ciclo DESC LIMIT 6;"))

print("=== REQUERIMENTOS WDSON ===")
print(run_sql("""
SELECT r.id_requerimento, r.id_militar, r.id_ciclo, c.nome_ciclo, r.numero_requerimento, count(d.id_disponibilidade) as total_dias
FROM REQUERIMENTOS r
JOIN EFETIVO e ON r.id_militar = e.id_militar
JOIN CICLOS c ON r.id_ciclo = c.id_ciclo
LEFT JOIN DISPONIBILIDADE_REQUERIMENTO d ON r.id_requerimento = d.id_requerimento
WHERE e.nome_completo ILIKE '%WDSON%' OR e.cpf = '06747113438'
GROUP BY r.id_requerimento, r.id_militar, r.id_ciclo, c.nome_ciclo, r.numero_requerimento;
"""))

print("=== DISPONIBILIDADES WDSON ===")
print(run_sql("""
SELECT d.id_disponibilidade, r.id_ciclo, c.nome_ciclo, d.dia_mes, d.horario_turno, d.marcado_disponivel, d.ativo
FROM DISPONIBILIDADE_REQUERIMENTO d
JOIN REQUERIMENTOS r ON d.id_requerimento = r.id_requerimento
JOIN EFETIVO e ON r.id_militar = e.id_militar
JOIN CICLOS c ON r.id_ciclo = c.id_ciclo
WHERE e.nome_completo ILIKE '%WDSON%' OR e.cpf = '06747113438'
ORDER BY d.dia_mes;
"""))

ssh.close()

