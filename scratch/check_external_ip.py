import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

# Check which NPM host received requests for gsvr.45.234.245.204.nip.io
cmd = "grep -rn '45.234.245.204' /home/vps_9bpm/projetos/nginx-npm/data/logs/"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Logs with 45.234.245.204:')
print(stdout.read().decode('utf-8'))

ssh.close()

