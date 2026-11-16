import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')
stdin, stdout, stderr = ssh.exec_command('docker exec ft-postgres psql -U postgres -d escala_ft -c "SELECT u.id, u.numero_ordem, u.cpf, r.nome FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id LEFT JOIN roles r ON ur.role_id = r.id WHERE u.id = 2036;"')
print(stdout.read().decode('utf-8'))
ssh.close()

