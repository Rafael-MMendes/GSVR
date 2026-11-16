import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234', timeout=5)
stdin, stdout, stderr = ssh.exec_command('find "/home/vps_9bpm/projetos/GSVR - prod" -maxdepth 2 -name "*.md"')
print(stdout.read().decode())
ssh.close()

