import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "docker logs --tail 25 ft-frontend"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('ft-frontend logs:')
print(stdout.read().decode('utf-8'))

cmd = "docker logs --tail 25 ft-backend"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('ft-backend logs:')
print(stdout.read().decode('utf-8'))

ssh.close()

