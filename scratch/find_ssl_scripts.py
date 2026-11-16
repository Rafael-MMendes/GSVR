import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "find /home/vps_9bpm/ -name '*.sh' -o -name '*.py' | xargs grep -l 'nip.io' 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Scripts with nip.io:')
print(stdout.read().decode('utf-8'))

ssh.close()

