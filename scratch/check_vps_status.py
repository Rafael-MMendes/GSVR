import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
print("=== DOCKER CONTAINERS ===")
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('ls -la "/home/vps_9bpm/projetos/GSVR - prod"')
print("=== GSVR PROD DIR ===")
print(stdout.read().decode())

ssh.close()

