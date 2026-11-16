import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "grep -rn '192.168.1.' /home/vps_9bpm/projetos/dasboard/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Dashboard IP usages:')
print(stdout.read().decode('utf-8'))

ssh.close()

