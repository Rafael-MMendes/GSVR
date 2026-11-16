import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

print("=== 1. RUNNING TEST_MODULAR_ROUTES.JS INSIDE ft-backend ===")
stdin, stdout, stderr = ssh.exec_command('docker exec ft-backend node test_modular_routes.js')
print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))

print("\n=== 2. RESTARTING ft-backend ===")
stdin, stdout, stderr = ssh.exec_command('docker restart ft-backend')
print("Restart output:", stdout.read().decode('utf-8'))

import time
time.sleep(3)

print("\n=== 3. CHECKING CONTAINER STATUS AND RECENT LOGS ===")
stdin, stdout, stderr = ssh.exec_command('docker logs --tail 25 ft-backend')
print(stdout.read().decode('utf-8'))

print("\n=== 4. LIVE API HEALTHCHECK ===")
stdin, stdout, stderr = ssh.exec_command('curl -s -i http://127.0.0.1:3001/api/ciclos | head -n 15')
print(stdout.read().decode('utf-8'))

ssh.close()

