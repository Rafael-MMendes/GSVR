import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "grep -rn '192.168.1.104' /home/vps_9bpm/projetos/ --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=logs --exclude='*.backup' --exclude='*.sql'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('All occurrences of 192.168.1.104 in /home/vps_9bpm/projetos/:')
print(stdout.read().decode('utf-8'))

ssh.close()

