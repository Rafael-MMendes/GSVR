import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    
    cmd_del = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"DELETE FROM EFETIVO WHERE cpf IN ('00000000000', '99988877766'); DELETE FROM users WHERE numero_ordem IN ('999888', '99988877766');\""
    stdin, stdout, stderr = ssh.exec_command(cmd_del)
    print("Delete:\n" + stdout.read().decode('ascii', errors='replace'))

    cmd1 = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT status_ativo, COUNT(*) FROM EFETIVO GROUP BY status_ativo;\""
    stdin, stdout, stderr = ssh.exec_command(cmd1)
    print("Contagem por status_ativo:\n" + stdout.read().decode('ascii', errors='replace'))

    cmd2 = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT COUNT(*) as total_militar FROM EFETIVO;\""
    stdin, stdout, stderr = ssh.exec_command(cmd2)
    print("Total geral:\n" + stdout.read().decode('ascii', errors='replace'))

finally:
    ssh.close()
