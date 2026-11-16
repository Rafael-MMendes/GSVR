import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "docker exec nginx-proxy-manager tail -n 50 /data/logs/fallback_http_access.log 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('fallback_http_access.log:')
print(stdout.read().decode('utf-8'))

cmd = "docker exec nginx-proxy-manager tail -n 30 /data/logs/fallback_http_error.log 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('fallback_http_error.log:')
print(stdout.read().decode('utf-8'))

cmd = "ls -la /home/vps_9bpm/projetos/nginx-npm/data/logs/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('logs in NPM:')
print(stdout.read().decode('utf-8'))

ssh.close()

