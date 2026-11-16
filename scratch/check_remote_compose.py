import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "ls -la '/home/vps_9bpm/projetos/GSVR - prod/'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

cmd = "cd '/home/vps_9bpm/projetos/GSVR - prod/' && docker compose ps"
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

ssh.close()

