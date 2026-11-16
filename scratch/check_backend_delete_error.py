import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

stdin, stdout, stderr = ssh.exec_command('docker logs --tail 50 ft-backend')
print("=== DOCKER LOGS FT-BACKEND ===")
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()

