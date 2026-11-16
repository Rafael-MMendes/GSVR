import paramiko
import json
import urllib.request

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

# Obter usuário superuser para teste
stdin, stdout, stderr = ssh.exec_command('docker exec ft-postgres psql -U postgres -d escala_ft -t -c "SELECT u.cpf, r.nome FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.nome = \'SUPERUSER\' LIMIT 1;"')
res = stdout.read().decode('utf-8').strip()
print("Superuser query result:", res)
ssh.close()

