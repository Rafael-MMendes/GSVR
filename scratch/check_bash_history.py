import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "tail -n 100 /home/vps_9bpm/.bash_history | grep -iE 'openssl|cert|ssl|npm'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Bash history:')
print(stdout.read().decode('utf-8'))

ssh.close()

