import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "docker exec nginx-proxy-manager grep -rn '192.168.1.104' /data/nginx/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('NPM occurrences of 192.168.1.104:')
print(stdout.read().decode('utf-8'))

ssh.close()

