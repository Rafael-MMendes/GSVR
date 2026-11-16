import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

stdin, stdout, stderr = ssh.exec_command('docker inspect ft-backend --format "{{json .Mounts}}"')
print("=== FT-BACKEND MOUNTS ===")
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker inspect ft-frontend --format "{{json .Mounts}}"')
print("=== FT-FRONTEND MOUNTS ===")
print(stdout.read().decode())

ssh.close()

