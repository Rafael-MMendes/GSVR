import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "cat /home/vps_9bpm/projetos/nginx-npm/data/nginx/proxy_host/1.conf"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('=== 1.conf (gsvr) ===')
print(stdout.read().decode('utf-8'))

cmd = "cat /home/vps_9bpm/projetos/nginx-npm/data/nginx/proxy_host/8.conf"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('=== 8.conf (nextcloud) ===')
print(stdout.read().decode('utf-8'))

ssh.close()

