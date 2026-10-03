import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

stdin, stdout, stderr = ssh.exec_command('docker inspect ft-frontend --format "{{json .Mounts}}"')
print('Mounts:\n', stdout.read().decode('utf-8'))

stdin, stdout, stderr = ssh.exec_command('find /home/vps_9bpm -maxdepth 3 -name ".env" -o -name "docker-compose*.yml"')
print('Compose/env:\n', stdout.read().decode('utf-8'))

ssh.close()
