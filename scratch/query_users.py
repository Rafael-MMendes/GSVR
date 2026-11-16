import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')
stdin, stdout, stderr = ssh.exec_command('docker exec ft-postgres psql -U postgres -d escala_ft -c "SELECT id, numero_ordem, cpf, is_admin FROM users LIMIT 5;"')
print(stdout.read().decode('utf-8'))
ssh.close()

