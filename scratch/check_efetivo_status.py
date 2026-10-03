import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    
    # 1. Total de militares e contagem por status_ativo
    cmd1 = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT status_ativo, COUNT(*) FROM EFETIVO GROUP BY status_ativo;\""
    stdin, stdout, stderr = ssh.exec_command(cmd1)
    print("Contagem por status_ativo:\n" + stdout.read().decode())

    # 2. Total geral de militares
    cmd2 = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT COUNT(*) as total_militar FROM EFETIVO;\""
    stdin, stdout, stderr = ssh.exec_command(cmd2)
    print("Total geral:\n" + stdout.read().decode())

    # 3. Listar os 24 militares inativos
    cmd3 = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT id_militar, posto_graduacao, nome_guerra, matricula, cpf, status_ativo FROM EFETIVO WHERE status_ativo = FALSE ORDER BY id_militar;\""
    stdin, stdout, stderr = ssh.exec_command(cmd3)
    print("Militares Inativos:\n" + stdout.read().decode('ascii', errors='replace'))

finally:
    ssh.close()
