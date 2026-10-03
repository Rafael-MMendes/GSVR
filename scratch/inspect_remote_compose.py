import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

cmd = "grep -rn '192.168.1' '/home/vps_9bpm/projetos/GSVR - prod/' --exclude-dir=node_modules --exclude-dir=.git"
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
print("Occurrences of 192.168.1 on remote:\n", out.encode('ascii', errors='replace').decode('ascii'))

ssh.close()
