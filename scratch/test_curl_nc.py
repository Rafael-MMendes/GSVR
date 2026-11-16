import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "curl -k -v https://127.0.0.1 -H 'Host: nextcloud.192.168.1.18.nip.io'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Stderr:', stderr.read().decode('utf-8'))
print('Stdout:', stdout.read().decode('utf-8'))

ssh.close()

