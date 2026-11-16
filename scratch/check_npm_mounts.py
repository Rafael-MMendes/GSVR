import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "docker inspect nginx-proxy-manager | grep -A 10 'Mounts'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('NPM Mounts:')
print(stdout.read().decode('utf-8'))

ssh.close()

