import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

print("=== TEST 1: Request to gsvr /api/ciclos (proxy via Host 1) ===")
cmd = "curl -i -s -H 'Host: gsvr.45.234.245.204.nip.io:36419' http://127.0.0.1/api/ciclos | head -n 15"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

print("=== TEST 2: Request to api /api/ciclos (proxy via Host 2) ===")
cmd = "curl -i -s -H 'Host: api.45.234.245.204.nip.io:36419' http://127.0.0.1/api/ciclos | head -n 15"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

print("=== TEST 3: Login POST test to api.45.234.245.204.nip.io:36419 ===")
cmd = "curl -i -s -X POST -H 'Host: api.45.234.245.204.nip.io:36419' -H 'Content-Type: application/json' -d '{\"cpf\":\"02715243405\",\"password\":\"wrongpassword\"}' http://127.0.0.1/api/auth/login"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

print("=== TEST 4: Login POST test to gsvr.45.234.245.204.nip.io:36419 ===")
cmd = "curl -i -s -X POST -H 'Host: gsvr.45.234.245.204.nip.io:36419' -H 'Content-Type: application/json' -d '{\"cpf\":\"02715243405\",\"password\":\"wrongpassword\"}' http://127.0.0.1/api/auth/login"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

ssh.close()

