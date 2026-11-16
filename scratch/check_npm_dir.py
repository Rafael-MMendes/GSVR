import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "ls -la /home/vps_9bpm/projetos/nginx-npm/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('nginx-npm contents:')
print(stdout.read().decode('utf-8'))

ssh.close()

