import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

print("=== CICLOS ===")
_, stdout, _ = ssh.exec_command('docker exec ft-postgres psql -U postgres -d escala_ft -c "SELECT id_ciclo, data_inicio, data_fim, status, ativo FROM CICLOS ORDER BY id_ciclo;"')
print(stdout.read().decode('utf-8'))

print("=== SERVICOS_EXECUTADOS BY CICLO ===")
_, stdout, _ = ssh.exec_command('docker exec ft-postgres psql -U postgres -d escala_ft -c "SELECT id_ciclo, COUNT(*), MIN(data_execucao), MAX(data_execucao), SUM(valor_remuneracao) FROM SERVICOS_EXECUTADOS GROUP BY id_ciclo ORDER BY id_ciclo;"')
print(stdout.read().decode('utf-8'))

ssh.close()

