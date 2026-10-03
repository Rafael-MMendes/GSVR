import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')
stdin, stdout, stderr = ssh.exec_command('cat "/home/vps_9bpm/projetos/GSVR - prod/docker-compose.yml"')
print(stdout.read().decode())
ssh.close()
