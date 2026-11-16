import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "grep -rn 'hsts' /home/vps_9bpm/projetos/nginx-npm/data/nginx/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('HSTS in nginx:')
print(stdout.read().decode('utf-8'))

cmd = "grep -rn 'ssl' /home/vps_9bpm/projetos/nginx-npm/data/nginx/proxy_host/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('SSL in proxy_host confs:')
print(stdout.read().decode('utf-8'))

ssh.close()

