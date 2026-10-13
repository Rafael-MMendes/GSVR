import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

sql = """
SELECT ep.id_militar, e.matricula, e.nome_guerra, ep.data_servico, ep.horario_servico, ep.nome_recurso, ep.funcao, ep.id_ciclo
FROM ESCALA_PLANEJAMENTO ep
JOIN EFETIVO e ON ep.id_militar = e.id_militar
WHERE ep.data_servico = '2026-10-15' AND ep.funcao = 'Patrulheiro' AND ep.nome_recurso ILIKE '%DELMIRO%';
"""
cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("=== USER IN SCREENSHOT ===")
print(stdout.read().decode('utf-8'))

ssh.close()
