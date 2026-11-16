import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "docker exec nginx-proxy-manager ls -la /data/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('NPM /data content:')
print(stdout.read().decode('utf-8'))

cmd = "docker exec nginx-proxy-manager sqlite3 /data/database.sqlite 'SELECT id, domain_names, forward_host, forward_port FROM proxy_host;'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('NPM proxy_host table:')
print(stdout.read().decode('utf-8'))

ssh.close()

