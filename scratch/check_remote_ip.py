import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

print('=== DOCKER PS ===')
_, stdout, _ = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
print(stdout.read().decode('utf-8'))

print('=== GREP IP IN GSVR ===')
cmd = "grep -rn '192.168.1.' '/home/vps_9bpm/projetos/GSVR - prod/' --exclude-dir=node_modules --exclude-dir=.git"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

print('=== NGINX PROXY MANAGER OR NGINX ===')
cmd = "docker ps -a | grep -i nginx"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

ssh.close()

