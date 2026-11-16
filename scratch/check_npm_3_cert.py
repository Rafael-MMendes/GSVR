import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "ls -la /home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/npm-3/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('npm-3 files:')
print(stdout.read().decode('utf-8'))

cmd = "openssl x509 -in /home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/npm-3/fullchain.pem -text -noout | head -n 30"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('npm-3 cert details:')
print(stdout.read().decode('utf-8'))

ssh.close()

