import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "curl -k -v https://nextcloud.192.168.1.18.nip.io --resolve nextcloud.192.168.1.18.nip.io:443:127.0.0.1"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Stderr:', stderr.read().decode('utf-8'))
print('Stdout:', stdout.read().decode('utf-8'))

ssh.close()

