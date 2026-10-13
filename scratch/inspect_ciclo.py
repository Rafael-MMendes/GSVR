import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

sql = "SELECT id_ciclo, data_inicio, data_fim, status, ativo FROM CICLOS ORDER BY id_ciclo DESC LIMIT 5;"
cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("=== CICLOS ===")
print(stdout.read().decode('utf-8'))

ssh.close()
