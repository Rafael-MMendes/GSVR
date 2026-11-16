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

print("=== COLUMNS OF CICLOS ===")
print(run_sql("\d CICLOS"))

print("=== ALL CICLOS ===")
print(run_sql("SELECT * FROM CICLOS ORDER BY id_ciclo;"))

print("=== REQUERIMENTOS WDSON (id_militar=255) ===")
print(run_sql("SELECT * FROM REQUERIMENTOS WHERE id_militar = 255;"))

print("=== DISPONIBILIDADES WDSON ===")
print(run_sql("""
SELECT d.id_disponibilidade, d.id_requerimento, r.id_ciclo, d.dia_mes, d.horario_turno, d.marcado_disponivel, d.ativo
FROM DISPONIBILIDADE_REQUERIMENTO d
JOIN REQUERIMENTOS r ON d.id_requerimento = r.id_requerimento
WHERE r.id_militar = 255
ORDER BY d.dia_mes;
"""))

ssh.close()

