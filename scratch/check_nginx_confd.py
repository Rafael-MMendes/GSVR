import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "docker exec nginx-proxy-manager ls -la /etc/nginx/conf.d/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('nginx conf.d:')
print(stdout.read().decode('utf-8'))

cmd = "docker exec nginx-proxy-manager cat /etc/nginx/conf.d/default.conf"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('nginx default.conf:')
print(stdout.read().decode('utf-8'))

ssh.close()

