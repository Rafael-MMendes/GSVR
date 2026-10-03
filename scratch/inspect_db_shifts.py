import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    cmd = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT id_ciclo, data_inicio, data_fim, valor_total_previsto, valor_contingencia, status, ativo FROM CICLOS ORDER BY id_ciclo DESC;\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out.encode('ascii', errors='replace').decode('ascii'))
finally:
    ssh.close()
