import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "curl -i -s -X POST -H 'Host: api.45.234.245.204.nip.io:36419' -H 'Content-Type: application/json' -d '{\"cpf\":\"02715243405\",\"password\":\"wrongpassword\"}' http://127.0.0.1/api/login"
_, stdout, _ = ssh.exec_command(cmd)
print('api.45.234.245.204.nip.io:36419 /api/login:')
print(stdout.read().decode('utf-8'))

cmd = "curl -i -s -X POST -H 'Host: gsvr.45.234.245.204.nip.io:36419' -H 'Content-Type: application/json' -d '{\"cpf\":\"02715243405\",\"password\":\"wrongpassword\"}' http://127.0.0.1/api/login"
_, stdout, _ = ssh.exec_command(cmd)
print('gsvr.45.234.245.204.nip.io:36419 /api/login:')
print(stdout.read().decode('utf-8'))

ssh.close()

